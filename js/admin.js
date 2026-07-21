/**
 * Maya's Secret Business OS v7.0
 * admin.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const Admin = {
    version: "7.0.0",
    initialized: false,
    formsBound: false,
    actionsBound: false,
    state: {
      products: [],
      orders: [],
      bookings: [],
      customers: [],
      settings: {},
      dashboard: {},
      logs: [],
      currentView: "dashboard"
    }
  };

  function getCloud() {
    return (
      window.BusinessCloud ||
      window.MayaCloud ||
      window.MAYA_CLOUD ||
      null
    );
  }

  function getUI() {
    return window.BusinessUI || window.MayaUI || null;
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function emit(name, detail) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatMoney(value) {
    const currency =
      (Admin.state.settings && Admin.state.settings.currency) || "NGN";

    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0
      }).format(toNumber(value));
    } catch (error) {
      return "₦" + toNumber(value).toLocaleString();
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  function setText(selector, value) {
    const element = $(selector);

    if (!element) return false;

    element.textContent =
      value === undefined || value === null ? "" : String(value);

    return true;
  }

  function getResponseArray(response, key) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response[key])) return response[key];

    if (
      response &&
      response.data &&
      Array.isArray(response.data[key])
    ) {
      return response.data[key];
    }

    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  function getResponseObject(response, key) {
    if (!response) return {};

    if (
      response[key] &&
      typeof response[key] === "object" &&
      !Array.isArray(response[key])
    ) {
      return response[key];
    }

    if (
      response.data &&
      response.data[key] &&
      typeof response.data[key] === "object" &&
      !Array.isArray(response.data[key])
    ) {
      return response.data[key];
    }

    if (
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      return response.data;
    }

    return response;
  }

  function showLoading(text) {
    const UI = getUI();

    if (UI && typeof UI.loading === "function") {
      UI.loading(true, text || "Loading...");
      return;
    }

    const loader = $("[data-global-loader]");

    if (loader) {
      loader.setAttribute("aria-hidden", "false");
      loader.classList.add("active");

      const message = $("[data-loader-message]", loader);
      if (message) message.textContent = text || "Loading...";
    }
  }

  function hideLoading() {
    const UI = getUI();

    if (UI && typeof UI.loading === "function") {
      UI.loading(false);
      return;
    }

    const loader = $("[data-global-loader]");

    if (loader) {
      loader.setAttribute("aria-hidden", "true");
      loader.classList.remove("active");
    }
  }

  function toast(message, type) {
    const UI = getUI();

    if (UI && typeof UI.toast === "function") {
      UI.toast(message, type || "info");
      return;
    }

    const toastElement = $("#adminToast");

    if (toastElement) {
      toastElement.textContent = message;
      toastElement.dataset.type = type || "info";
      toastElement.classList.add("show");

      window.clearTimeout(toastElement._hideTimer);
      toastElement._hideTimer = window.setTimeout(function () {
        toastElement.classList.remove("show");
      }, 3500);

      return;
    }

    console.log("[Admin]", message);
  }

  function handleError(error, context) {
    console.error("[Admin]", context || "Error", error);

    toast(
      error && error.message
        ? error.message
        : "An unexpected error occurred.",
      "error"
    );

    emit("admin:error", {
      context: context || "unknown",
      error: error
    });
  }

  async function callCloud(methodName) {
    const Cloud = getCloud();
    const args = Array.prototype.slice.call(arguments, 1);

    if (!Cloud || typeof Cloud[methodName] !== "function") {
      throw new Error("Cloud method is unavailable: " + methodName);
    }

    return Cloud[methodName].apply(Cloud, args);
  }

  async function loadDashboard() {
    try {
      const response = await callCloud("getDashboard");
      Admin.state.dashboard = getResponseObject(response, "dashboard");
      renderDashboard();
      return Admin.state.dashboard;
    } catch (error) {
      handleError(error, "loadDashboard");
      return {};
    }
  }

  async function loadProducts() {
    try {
      const response = await callCloud("getProducts");

      console.log("[Admin] Raw getProducts() response:", response);

      Admin.state.products = getResponseArray(response, "products")
        .filter(function (product) {
          return product && typeof product === "object";
        })
        .map(function (product) {
          const backendId = String(
            product.id ||
            product.productId ||
            product.recordId ||
            product.rowId ||
            ""
          ).trim();

          return Object.assign({}, product, {
            id: backendId,
            productId: backendId,
            price: toNumber(product.price),
            gallery: Array.isArray(product.gallery)
              ? product.gallery
              : [],
            benefits: Array.isArray(product.benefits)
              ? product.benefits
              : String(product.benefits || "")
                  .split(/\r?\n|,\s*/)
                  .map(function (item) {
                    return item.trim();
                  })
                  .filter(Boolean),
            featured:
              product.featured === true ||
              product.featured === 1 ||
              normalize(product.featured) === "true"
          });
        });

      renderProducts();
      updateProductStatistics();
      updateSidebarCounters();

      console.log(
        "[Admin] Products loaded:",
        Admin.state.products.length
      );

      return Admin.state.products;
    } catch (error) {
      handleError(error, "loadProducts");
      return [];
    }
  }

  async function loadOrders() {
    try {
      const response = await callCloud("getOrders");
      Admin.state.orders = getResponseArray(response, "orders");
      renderOrders();
      updateSidebarCounters();
      return Admin.state.orders;
    } catch (error) {
      handleError(error, "loadOrders");
      return [];
    }
  }

  async function loadBookings() {
    try {
      const response = await callCloud("getBookings");
      Admin.state.bookings = getResponseArray(response, "bookings");
      renderBookings();
      updateSidebarCounters();
      return Admin.state.bookings;
    } catch (error) {
      handleError(error, "loadBookings");
      return [];
    }
  }

  function customerIdentity(record, source) {
    record =
      record && typeof record === "object"
        ? record
        : {};

    const nested =
      record.customer && typeof record.customer === "object"
        ? record.customer
        : {};

    const name = String(
      record.customerName ||
      record.fullName ||
      record.name ||
      nested.name ||
      nested.fullName ||
      ""
    ).trim();

    const email = String(
      record.customerEmail ||
      record.email ||
      nested.email ||
      ""
    ).trim().toLowerCase();

    const phone = String(
      record.customerPhone ||
      record.phone ||
      record.phoneNumber ||
      nested.phone ||
      nested.phoneNumber ||
      ""
    ).replace(/\s+/g, "").trim();

    if (!name && !email && !phone) return null;

    return {
      name: name || "Unnamed customer",
      email: email,
      phone: phone,
      createdAt:
        record.createdAt ||
        record.timestamp ||
        record.date ||
        record.bookingDate ||
        new Date().toISOString(),
      sources: [source],
      interactions: 1
    };
  }

  function mergeCustomers(cloudCustomers) {
    const people = [];

    safeArray(cloudCustomers).forEach(function (record) {
      people.push(
        customerIdentity(
          record,
          record.source || "Customer record"
        )
      );
    });

    safeArray(Admin.state.orders).forEach(function (record) {
      people.push(customerIdentity(record, "Product order"));
    });

    safeArray(Admin.state.bookings).forEach(function (record) {
      people.push(customerIdentity(record, "Spa booking"));
    });

    const unique = new Map();

    people.filter(Boolean).forEach(function (person) {
      const digits = person.phone.replace(/\D/g, "");

      const key = digits
        ? "phone:" + digits
        : person.email
          ? "email:" + person.email
          : "name:" + person.name.toLowerCase();

      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, person);
        return;
      }

      existing.name =
        existing.name === "Unnamed customer"
          ? person.name
          : existing.name;

      existing.email = existing.email || person.email;
      existing.phone = existing.phone || person.phone;
      existing.interactions += 1;

      person.sources.forEach(function (source) {
        if (existing.sources.indexOf(source) === -1) {
          existing.sources.push(source);
        }
      });

      const oldDate = new Date(existing.createdAt || 0);
      const newDate = new Date(person.createdAt || 0);

      if (
        !Number.isNaN(newDate.getTime()) &&
        (
          Number.isNaN(oldDate.getTime()) ||
          newDate < oldDate
        )
      ) {
        existing.createdAt = person.createdAt;
      }
    });

    return Array.from(unique.values()).sort(function (a, b) {
      return (
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
    });
  }

  async function loadCustomers() {
    let cloudCustomers = [];

    try {
      const response = await callCloud("getCustomers");
      cloudCustomers = getResponseArray(response, "customers");
    } catch (error) {
      console.warn(
        "[Admin] Customer endpoint unavailable; deriving customers from orders and bookings.",
        error
      );
    }

    Admin.state.customers = mergeCustomers(cloudCustomers);
    renderCustomers();
    updateSidebarCounters();

    return Admin.state.customers;
  }

  async function loadSettings() {
    try {
      const response = await callCloud("getSettings");
      Admin.state.settings = getResponseObject(response, "settings");
      renderSettings();
      return Admin.state.settings;
    } catch (error) {
      handleError(error, "loadSettings");
      return {};
    }
  }

  async function loadLogs() {
    try {
      const response = await callCloud("getLogs");
      Admin.state.logs = getResponseArray(response, "logs");
      renderLogs();
      return Admin.state.logs;
    } catch (error) {
      handleError(error, "loadLogs");
      return [];
    }
  }

  function renderDashboard() {
    const data = Admin.state.dashboard || {};
    const metrics = data.metrics || data;

    setText(
      "[data-dashboard-paid-revenue]",
      formatMoney(metrics.paidRevenue || 0)
    );

    setText(
      "[data-dashboard-pending-revenue]",
      formatMoney(metrics.pendingRevenue || 0)
    );

    setText(
      "[data-dashboard-commission]",
      formatMoney(metrics.commission || 0)
    );

    setText(
      "[data-dashboard-orders]",
      safeArray(Admin.state.orders).length ||
      metrics.totalOrders ||
      0
    );

    setText(
      "[data-dashboard-products]",
      safeArray(Admin.state.products).length ||
      metrics.totalProducts ||
      0
    );

    setText(
      "[data-dashboard-customers]",
      safeArray(Admin.state.customers).length ||
      metrics.totalCustomers ||
      0
    );

    setText(
      "[data-dashboard-bookings]",
      safeArray(Admin.state.bookings).length ||
      metrics.totalBookings ||
      0
    );

    setText(
      '[data-metric="paid-sales"]',
      formatMoney(
        metrics.paidRevenue ||
        metrics.paidSales ||
        0
      )
    );

    setText(
      '[data-metric="pending-sales"]',
      formatMoney(
        metrics.pendingRevenue ||
        metrics.pendingSales ||
        0
      )
    );

    setText(
      '[data-metric="commission"]',
      formatMoney(metrics.commission || 0)
    );

    setText(
      '[data-metric="paid-orders"]',
      metrics.paidOrders || 0
    );

    setText(
      '[data-metric="spa-bookings"]',
      safeArray(Admin.state.bookings).length
    );

    setText(
      '[data-metric="customers"]',
      safeArray(Admin.state.customers).length
    );

    renderRecentOrders(
      data.recentOrders ||
      safeArray(Admin.state.orders).slice(0, 10)
    );

    renderRecentBookings(
      data.recentBookings ||
      safeArray(Admin.state.bookings).slice(0, 10)
    );
  }

  function renderRecentOrders(orders) {
    const body =
      $("[data-dashboard-orders]") ||
      $("[data-recent-orders-body]") ||
      $("#recentOrdersBody");

    if (!body || body.tagName !== "TBODY") return;

    body.innerHTML = "";

    if (!safeArray(orders).length) {
      body.innerHTML =
        '<tr class="admin-table-empty">' +
          '<td colspan="4">No cloud orders loaded yet.</td>' +
        "</tr>";
      return;
    }

    safeArray(orders).slice(0, 10).forEach(function (order) {
      const row = document.createElement("tr");

      [
        order.id || order.reference || "—",
        order.customerName ||
          (order.customer && order.customer.name) ||
          "Guest",
        formatMoney(order.total || order.grandTotal || 0),
        order.status || order.paymentStatus || "Pending"
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      body.appendChild(row);
    });
  }

  function renderRecentBookings(bookings) {
    const body =
      $("[data-recent-bookings-body]") ||
      $("#recentBookingsBody");

    if (!body) return;

    body.innerHTML = "";

    safeArray(bookings).slice(0, 10).forEach(function (booking) {
      const row = document.createElement("tr");

      [
        booking.id || "—",
        booking.customerName ||
          (booking.customer && booking.customer.name) ||
          "Guest",
        booking.date || booking.bookingDate || "—",
        formatMoney(booking.total || 0),
        booking.status || "Pending"
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      body.appendChild(row);
    });
  }

  function renderProducts() {
    const container =
      document.querySelector("[data-products-body]") ||
      document.getElementById("productsTableBody") ||
      document.getElementById("adminProductList");

    if (!container) {
      console.error(
        "[Admin] Product display container was not found."
      );
      return;
    }

    container.innerHTML = "";

    const products = safeArray(Admin.state.products);

    if (!products.length) {
      container.innerHTML =
        '<div class="admin-empty-state">' +
          "<h3>No products found</h3>" +
          "<p>Add a product or refresh the cloud data.</p>" +
        "</div>";

      updateProductStatistics();
      return;
    }

    products.forEach(function (product) {
      const productId = String(
        product.id ||
        product.productId ||
        product.recordId ||
        product.rowId ||
        ""
      ).trim();

      const item = document.createElement("article");
      item.className = "admin-item";

      const productImage =
        product.image ||
        product.imageUrl ||
        product.photo ||
        (
          Array.isArray(product.images) &&
          product.images.length
            ? product.images[0]
            : ""
        );

      const productName =
        product.name ||
        product.title ||
        "Unnamed product";

      const productCategory =
        product.category ||
        "Uncategorized";

      const productStatus =
        product.status ||
        (
          product.available === false
            ? "Sold out"
            : "Available"
        );

      const productDescription =
        product.description ||
        product.shortDescription ||
        "";

      const statusClass =
        normalize(productStatus).includes("sold")
          ? "status-soldout"
          : "status-live";

      const actionsDisabled = productId ? "" : " disabled";

      item.innerHTML =
        '<div class="cart-thumb product-photo">' +
          (
            productImage
              ? '<img src="' +
                escapeAttribute(productImage) +
                '" alt="' +
                escapeAttribute(productName) +
                '" loading="lazy">'
              : '<div class="admin-product-placeholder">MS</div>'
          ) +
        "</div>" +

        '<div class="admin-item-content">' +
          '<div class="admin-item-meta">' +
            "<span>" +
              escapeHtml(productCategory) +
            "</span>" +
            '<span class="' +
              statusClass +
            '">' +
              escapeHtml(productStatus) +
            "</span>" +
            (
              product.featured
                ? "<span>Featured</span>"
                : ""
            ) +
          "</div>" +

          "<h3>" +
            escapeHtml(productName) +
          "</h3>" +

          "<p>" +
            escapeHtml(formatMoney(product.price || 0)) +
          "</p>" +

          (
            productDescription
              ? "<small>" +
                escapeHtml(productDescription) +
                "</small>"
              : ""
          ) +

          (
            !productId
              ? '<small class="field-error">This cloud record has no permanent ID and cannot be edited safely.</small>'
              : ""
          ) +
        "</div>" +

        '<div class="admin-item-actions">' +
          '<button type="button" ' +
            'data-admin-action="edit-product" ' +
            'data-id="' +
            escapeAttribute(productId) +
            '"' +
            actionsDisabled +
          ">" +
            "Edit" +
          "</button>" +

          '<button type="button" ' +
            'class="delete" ' +
            'data-admin-action="delete-product" ' +
            'data-id="' +
            escapeAttribute(productId) +
            '"' +
            actionsDisabled +
          ">" +
            "Delete" +
          "</button>" +
        "</div>";

      container.appendChild(item);
    });

    updateProductStatistics();

    console.log("[Admin] Products rendered:", products.length);
  }

  function updateProductStatistics() {
    const products = safeArray(Admin.state.products);

    const faceCareCount = products.filter(function (product) {
      return normalize(product.category).includes("face");
    }).length;

    const bodyCareCount = products.filter(function (product) {
      return normalize(product.category).includes("body");
    }).length;

    const giftSetCount = products.filter(function (product) {
      return normalize(product.category).includes("gift");
    }).length;

    const featuredCount = products.filter(function (product) {
      return (
        product.featured === true ||
        normalize(product.featured) === "true" ||
        product.featured === 1
      );
    }).length;

    const soldOutCount = products.filter(function (product) {
      const status = normalize(product.status);

      return (
        status === "sold out" ||
        status === "soldout" ||
        status === "out of stock" ||
        status === "inactive"
      );
    }).length;

    setText("#statTotal", products.length);
    setText("#statFace", faceCareCount);
    setText("#statBody", bodyCareCount);
    setText("#statGifts", giftSetCount);
    setText("#statFeatured", featuredCount);
    setText("#statSoldOut", soldOutCount);

    setText(
      "#productCountText",
      products.length +
        " product" +
        (products.length === 1 ? "" : "s")
    );

    setText("[data-dashboard-products]", products.length);

    updateSidebarCounters();
  }

  function updateSidebarCounters() {
    const counts = {
      orders: safeArray(Admin.state.orders).length,
      products: safeArray(Admin.state.products).length,
      "spa-bookings": safeArray(Admin.state.bookings).length,
      customers: safeArray(Admin.state.customers).length
    };

    Object.keys(counts).forEach(function (name) {
      const badge = document.querySelector(
        '[data-nav-count="' + name + '"]'
      );

      if (!badge) return;

      badge.textContent = counts[name];
      badge.hidden = false;
    });
  }

  function renderOrders() {
    if (window.MayaTransactionsActive) return;
    const body =
      $("[data-order-list]") ||
      $("[data-orders-body]") ||
      $("#ordersTableBody") ||
      $("#adminOrderList");

    if (!body) {
      console.error("[Admin] Orders table was not found.");
      return;
    }

    body.innerHTML = "";

    if (!Admin.state.orders.length) {
      body.innerHTML =
        '<tr class="admin-table-empty">' +
          '<td colspan="8">No orders loaded yet.</td>' +
        "</tr>";
      return;
    }

    Admin.state.orders.forEach(function (order) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" +
          escapeHtml(order.id || order.reference || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(formatDate(order.createdAt || order.date)) +
        "</td>" +
        "<td>" +
          escapeHtml(
            order.customerName ||
            (order.customer && order.customer.name) ||
            "Guest"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(
            Array.isArray(order.items)
              ? order.items.length
              : order.itemCount || "—"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(
            formatMoney(order.total || order.grandTotal || 0)
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(order.paymentStatus || "Unconfirmed") +
        "</td>" +
        "<td>" +
          escapeHtml(order.status || "Pending") +
        "</td>" +
        "<td>" +
'<button class="btn btn-success" data-admin-action="approve-order" data-id="' + escapeHtml(order.id) + '">Approve</button>' +
'<button class="btn btn-primary" data-admin-action="mark-order-paid" data-id="' + escapeHtml(order.id) + '">Paid</button>' +
'<button class="btn btn-danger" data-admin-action="cancel-order" data-id="' + escapeHtml(order.id) + '">Cancel</button>' +
"</td>";

      body.appendChild(row);
    });
  }

  function renderBookings() {
    if (window.MayaTransactionsActive) return;
    const body =
      $("[data-spa-booking-list]") ||
      $("[data-bookings-body]") ||
      $("#bookingsTableBody");

    if (!body) {
      console.error(
        "[Admin] Spa booking table was not found."
      );
      return;
    }

    body.innerHTML = "";

    if (!Admin.state.bookings.length) {
      body.innerHTML =
        '<tr class="admin-table-empty">' +
          '<td colspan="8">No spa bookings loaded yet.</td>' +
        "</tr>";
    }

    Admin.state.bookings.forEach(function (booking) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" +
          escapeHtml(booking.id || booking.reference || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(
            formatDate(
              booking.createdAt ||
              booking.dateRequested
            )
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(
            booking.customerName ||
            (booking.customer && booking.customer.name) ||
            "Guest"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(
            Array.isArray(booking.services)
              ? booking.services
                  .map(function (service) {
                    return service.name || service;
                  })
                  .join(", ")
              : booking.service || "—"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(formatMoney(booking.total || 0)) +
        "</td>" +
        "<td>" +
          escapeHtml(
            booking.appointmentDate ||
            booking.bookingDate ||
            "—"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(booking.status || "Pending") +
        "</td>" +
        "<td>" +
'<button class="btn btn-success" data-admin-action="confirm-booking" data-id="' + escapeHtml(booking.id) + '">Confirm</button>' +
'<button class="btn btn-primary" data-admin-action="complete-booking" data-id="' + escapeHtml(booking.id) + '">Complete</button>' +
'<button class="btn btn-danger" data-admin-action="cancel-booking" data-id="' + escapeHtml(booking.id) + '">Cancel</button>' +
"</td>";

      body.appendChild(row);
    });

    setText(
      "[data-spa-bookings-count]",
      Admin.state.bookings.length +
        " booking request" +
        (Admin.state.bookings.length === 1 ? "" : "s")
    );

    updateSidebarCounters();
  }

  function renderCustomers() {
    const body =
      $("[data-customer-list]") ||
      $("[data-customers-body]") ||
      $("#customersTableBody");

    if (!body) {
      console.error("[Admin] Customer table was not found.");
      return;
    }

    body.innerHTML = "";

    const table = body.closest("table");
    const heading = table && table.querySelector("thead tr");

    if (heading) {
      heading.innerHTML =
        "<th>Customer</th>" +
        "<th>Email</th>" +
        "<th>Phone</th>" +
        "<th>Source</th>" +
        "<th>Activity</th>" +
        "<th>First activity</th>";
    }

    if (!Admin.state.customers.length) {
      body.innerHTML =
        '<tr class="admin-table-empty">' +
          '<td colspan="6">' +
            "No customers yet. Customers appear automatically after a product order or spa booking." +
          "</td>" +
        "</tr>";
    }

    Admin.state.customers.forEach(function (customer) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" +
          escapeHtml(customer.name || "Unnamed customer") +
        "</td>" +
        "<td>" +
          escapeHtml(customer.email || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(customer.phone || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(
            safeArray(customer.sources).join(" + ") ||
            customer.source ||
            "—"
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(customer.interactions || 1) +
        "</td>" +
        "<td>" +
          escapeHtml(formatDate(customer.createdAt)) +
        "</td>";

      body.appendChild(row);
    });

    setText(
      "[data-customers-count]",
      Admin.state.customers.length +
        " customer" +
        (Admin.state.customers.length === 1 ? "" : "s")
    );

    updateSidebarCounters();
  }

  function renderSettings() {
    const settings = Admin.state.settings || {};

    Object.keys(settings).forEach(function (key) {
      const field = $('[name="' + escapeSelectorValue(key) + '"]');

      if (!field) return;

      if (field.type === "checkbox") {
        field.checked = Boolean(settings[key]);
      } else if (
        typeof settings[key] !== "object" &&
        settings[key] !== undefined
      ) {
        field.value = settings[key];
      }
    });
  }

  function renderLogs() {
    const body =
      $("[data-log-list]") ||
      $("[data-logs-body]") ||
      $("#logsTableBody");

    if (!body) return;

    body.innerHTML = "";

    if (!Admin.state.logs.length) {
      body.innerHTML =
        '<tr class="admin-table-empty">' +
          '<td colspan="5">No activity logs loaded yet.</td>' +
        "</tr>";
      return;
    }

    Admin.state.logs.forEach(function (log) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" +
          escapeHtml(
            formatDate(log.timestamp || log.createdAt)
          ) +
        "</td>" +
        "<td>" +
          escapeHtml(log.action || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(log.record || log.recordId || "—") +
        "</td>" +
        "<td>" +
          escapeHtml(log.user || log.actor || "Admin") +
        "</td>" +
        "<td>" +
          escapeHtml(log.details || log.module || "—") +
        "</td>";

      body.appendChild(row);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function escapeSelectorValue(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function serializeForm(form) {
    const data = {};
    const formData = new FormData(form);

    formData.forEach(function (value, key) {
      if (!key) return;
      if (value instanceof File) return;

      data[key] = value;
    });

    $$("input[type='checkbox'][name]", form).forEach(function (input) {
      data[input.name] = input.checked;
    });

    return data;
  }

  function resetProductEditor(form) {
    form = form || document.getElementById("productForm");

    if (!form) return;

    form.reset();

    const productId = document.getElementById("productId");

    if (productId) {
      productId.value = "";
    }

    setText("#formMode", "NEW PRODUCT");
    setText("#formTitle", "Add product");
    setText("#descCount", "0");

    const cancelEdit = document.getElementById("cancelEdit");

    if (cancelEdit) {
      cancelEdit.hidden = true;
    }

    const previewBadge = document.getElementById("previewBadge");
    const previewName = document.getElementById("previewName");
    const previewCategory = document.getElementById("previewCategory");
    const previewSize = document.getElementById("previewSize");
    const previewPrice = document.getElementById("previewPrice");
    const previewArt = document.getElementById("previewArt");

    if (previewBadge) previewBadge.textContent = "New";
    if (previewName) previewName.textContent = "Your product";
    if (previewCategory) previewCategory.textContent = "Face Care";
    if (previewSize) previewSize.textContent = "Size";
    if (previewPrice) previewPrice.textContent = "₦0";

    if (previewArt) {
      previewArt.className = "product-art tone-plum";
    }

    emit("admin:productEditorReset", {});
  }

  async function handleProductSubmit(form) {
    const product = serializeForm(form);
    const hiddenProductId = document.getElementById("productId");
    console.log("[Admin] Preparing product save");
console.log(
  "[Admin] Form product ID:",
  product.id || product.productId || ""
);
console.log(
  "[Admin] Hidden product ID:",
  hiddenProductId ? hiddenProductId.value : "missing"
);

    product.id = String(
      product.id ||
      product.productId ||
      (hiddenProductId && hiddenProductId.value) ||
      ""
    ).trim();

    product.productId = product.id;

    product.name = String(product.name || "").trim();
    product.category = String(
      product.category || "Face Care"
    ).trim();

    product.price = toNumber(product.price);
    product.size = String(product.size || "").trim();
    product.badge = String(product.badge || "").trim();
    product.status = String(
      product.status || "available"
    ).trim();

    product.image = String(product.image || "").trim();

    product.description = String(
      product.description || ""
    ).trim();

    product.use = String(product.use || "").trim();
    product.tone = String(
      product.tone || "plum"
    ).trim();

    product.featured =
      product.featured === true ||
      product.featured === "true" ||
      product.featured === "on" ||
      Boolean(
        document.getElementById("productFeatured") &&
        document.getElementById("productFeatured").checked
      );

    product.gallery = [
      String(product.gallery1 || "").trim(),
      String(product.gallery2 || "").trim(),
      String(product.gallery3 || "").trim()
    ].filter(Boolean);

    product.benefits = Array.isArray(product.benefits)
      ? product.benefits
      : String(product.benefits || "")
          .split(/\r?\n/)
          .map(function (item) {
            return item.trim();
          })
          .filter(Boolean);

    delete product.gallery1;
    delete product.gallery2;
    delete product.gallery3;
    delete product.productImageFile;
    delete product.galleryFile1;
    delete product.galleryFile2;
    delete product.galleryFile3;

    if (!product.name) {
      toast("Enter the product name.", "error");

      const nameField =
        document.getElementById("productName");

      if (nameField) nameField.focus();
      return;
    }

    if (
      !Number.isFinite(product.price) ||
      product.price <= 0
    ) {
      toast("Enter a valid product price.", "error");

      const priceField =
        document.getElementById("productPrice");

      if (priceField) priceField.focus();
      return;
    }

    const isEditing = Boolean(product.id);

    showLoading(
      isEditing
        ? "Updating product..."
        : "Adding product..."
    );

    try {
      const response = await callCloud(
        "saveProduct",
        product
      );

      console.log(
        "[Admin] saveProduct response:",
        response
      );

      if (response && response.success === false) {
        throw new Error(
          response.message ||
          response.error ||
          "The product could not be saved."
        );
      }

      toast(
        isEditing
          ? "Product updated successfully."
          : "Product added successfully.",
        "success"
      );

      await loadProducts();
      resetProductEditor(form);

      const UI = getUI();

      if (
        UI &&
        UI.modal &&
        typeof UI.modal.close === "function"
      ) {
        const modal = form.closest(".modal");

        if (modal && modal.id) {
          UI.modal.close(modal.id);
        }
      }
    } catch (error) {

    console.error("[Admin] Save Product Error:", error);

    handleError(error, "saveProduct");

    throw error;

} finally {

    hideLoading();

}
  }

  async function handleSettingsSubmit(form) {
    const settings = serializeForm(form);

    if (settings.commissionRate !== undefined) {
      settings.commissionRate =
        toNumber(settings.commissionRate);
    }

    showLoading("Saving settings...");

    try {
      await callCloud("saveSettings", settings);

      Admin.state.settings = Object.assign(
        {},
        Admin.state.settings,
        settings
      );

      toast(
        "Settings saved successfully.",
        "success"
      );
    } catch (error) {
      handleError(error, "saveSettings");
    } finally {
      hideLoading();
    }
  }

  async function deleteProduct(productId) {
    productId = String(productId || "").trim();

    if (!productId) {
      toast(
        "This product does not have a permanent cloud ID.",
        "error"
      );
      return;
    }

    const UI = getUI();
    let confirmed = true;

    if (UI && typeof UI.confirm === "function") {
      confirmed = await UI.confirm(
        "Delete this product?"
      );
    } else {
      confirmed = window.confirm(
        "Delete this product?"
      );
    }

    if (!confirmed) return;

    showLoading("Deleting product...");

    try {
      const response = await callCloud(
        "deleteProduct",
        productId
      );

      if (response && response.success === false) {
        throw new Error(
          response.message ||
          response.error ||
          "The product could not be deleted."
        );
      }

      toast("Product deleted.", "success");
      await loadProducts();
      resetProductEditor();
    } catch (error) {
      handleError(error, "deleteProduct");
    } finally {
      hideLoading();
    }
  }
async function approveOrder(id) {
    const order = Admin.state.orders.find(o => o.id === id);
    if (!order) return;

    order.status = "Approved";

    await callCloud("updateOrder", order);

    await loadOrders();
    await loadDashboard();
}
  async function markOrderPaid(id) {
    const order = Admin.state.orders.find(o => o.id === id);
    if (!order) return;

    order.paymentStatus = "Paid";
    order.status = "Completed";

    await callCloud("updateOrder", order);

    await loadOrders();
    await loadDashboard();
}
  async function cancelOrder(id) {
    const order = Admin.state.orders.find(o => o.id === id);
    if (!order) return;

    order.status = "Cancelled";

    await callCloud("updateOrder", order);

    await loadOrders();
    await loadDashboard();
}
  async function confirmBooking(id) {
    const booking = Admin.state.bookings.find(b => b.id === id);
    if (!booking) return;

    booking.status = "Confirmed";

    await callCloud("updateBooking", booking);

    await loadBookings();
    await loadDashboard();
}
  async function completeBooking(id) {
    const booking = Admin.state.bookings.find(b => b.id === id);
    if (!booking) return;

    booking.status = "Completed";
    booking.paymentStatus = "Paid";

    await callCloud("updateBooking", booking);

    await loadBookings();
    await loadDashboard();
}
  async function cancelBooking(id) {
    const booking = Admin.state.bookings.find(b => b.id === id);
    if (!booking) return;

    booking.status = "Cancelled";

    await callCloud("updateBooking", booking);

    await loadBookings();
    await loadDashboard();
}
  
  function editProduct(productId) {
    productId = String(productId || "").trim();

    if (!productId) {
      toast(
        "This product does not have a permanent cloud ID.",
        "error"
      );
      return;
    }

    const product = Admin.state.products.find(
      function (item) {
        const itemId = String(
          item.id ||
          item.productId ||
          item.recordId ||
          item.rowId ||
          ""
        ).trim();

        return itemId === productId;
      }
    );

    if (!product) {
      toast("Product not found.", "error");
      return;
    }

    function setValue(id, value) {
      const field = document.getElementById(id);

      if (!field) return;

      field.value =
        value === undefined || value === null
          ? ""
          : value;
    }

    setValue(
      "productId",
      product.id ||
      product.productId ||
      product.recordId ||
      product.rowId ||
      ""
    );

    setValue("productName", product.name);
    setValue("productCategory", product.category);
    setValue("productPrice", product.price);
    setValue("productSize", product.size);
    setValue("productBadge", product.badge);

    setValue(
      "productDesc",
      product.description ||
      product.desc ||
      product.shortDescription ||
      ""
    );

    setValue(
      "productTone",
      product.tone || "plum"
    );

    setValue(
      "productStatus",
      product.status || "available"
    );

    setValue(
      "productImage",
      product.image ||
      product.imageUrl ||
      ""
    );

    const previewArt = document.getElementById("previewArt");
    const editImage = product.image || product.imageUrl || "";
    if (previewArt) {
      previewArt.className = "product-art tone-" + (product.tone || "plum");
      previewArt.innerHTML = editImage
        ? '<img src="' + escapeAttribute(editImage) + '" alt="' + escapeAttribute(product.name || "Product") + '">' +
          '<span class="product-badge" id="previewBadge">' + escapeHtml(product.badge || "New") + '</span>'
        : '<span class="product-badge" id="previewBadge">' + escapeHtml(product.badge || "New") + '</span><div class="product-pack">MS</div>';
    }
    setText("#previewName", product.name || "Your product");
    setText("#previewCategory", product.category || "Face Care");
    setText("#previewSize", product.size || "Size");
    setText("#previewPrice", formatMoney(product.price || 0));

    const gallery = Array.isArray(product.gallery)
      ? product.gallery
      : [];

    setValue("gallery1", gallery[0] || "");
    setValue("gallery2", gallery[1] || "");
    setValue("gallery3", gallery[2] || "");

    setValue(
      "productBenefits",
      Array.isArray(product.benefits)
        ? product.benefits.join("\n")
        : product.benefits || ""
    );

    setValue(
      "productUse",
      product.use ||
      product.howToUse ||
      ""
    );

    const featuredField =
      document.getElementById("productFeatured");

    if (featuredField) {
      featuredField.checked =
        product.featured === true ||
        product.featured === 1 ||
        normalize(product.featured) === "true";
    }

    setText("#formMode", "EDITING PRODUCT");
    setText("#formTitle", "Edit product");

    const cancelEdit =
      document.getElementById("cancelEdit");

    if (cancelEdit) {
      cancelEdit.hidden = false;
    }

    const description = String(
      product.description ||
      product.desc ||
      product.shortDescription ||
      ""
    );

    setText("#descCount", description.length);

    const editor =
      document.querySelector(".admin-editor");

    if (editor) {
      editor.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    emit("admin:editProduct", {
      product: product
    });
  }

  function bindForms() {
  if (Admin.formsBound) return;

  Admin.formsBound = true;

  document.addEventListener("submit", function (event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (
      form.id === "productForm" ||
      form.hasAttribute("data-product-form")
    ) {
      event.preventDefault();
      event.stopPropagation();

      console.log("[Admin] Product form submitted");
      console.log(
        "[Admin] Hidden product ID:",
        document.getElementById("productId")
          ? document.getElementById("productId").value
          : "productId field missing"
      );

      (async function () {
    try {
        await handleProductSubmit(form);
    } catch (error) {
        console.error(error);
    }
})();
      return;
    }

    if (
      form.id === "settingsForm" ||
      form.hasAttribute("data-settings-form")
    ) {
      event.preventDefault();
      event.stopPropagation();

      handleSettingsSubmit(form);
    }
  });

  document.addEventListener("click", function (event) {
    const saveButton = event.target.closest(
      "#saveProduct, [data-save-product]"
    );

    if (!saveButton) return;

    const form =
      document.getElementById("productForm") ||
      document.querySelector("[data-product-form]");

    if (!form) {
      console.error("[Admin] Product form was not found.");
      toast("Product form was not found.", "error");
      return;
    }

    if (
      saveButton.type === "submit" &&
      saveButton.form === form
    ) {
      return;
    }

    event.preventDefault();

    console.log("[Admin] Save button clicked directly");

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      handleProductSubmit(form);
    }
  });
}

  function bindActions() {
    if (Admin.actionsBound) return;

    Admin.actionsBound = true;

    document.addEventListener(
      "click",
      function (event) {
        const button =
          event.target.closest("[data-admin-action]");

        if (button) {
          const action = button.dataset.adminAction;
          const id = button.dataset.id;

          switch (action) {
            case "refresh":
              Admin.refresh();
              break;

            case "edit-product":
              editProduct(id);
              break;

            case "delete-product":
              deleteProduct(id);
              break;

            case "create-backup":
              createBackup();
              break;

            case "open-product-modal": {
              const UI = getUI();

              if (
                UI &&
                UI.modal &&
                typeof UI.modal.open === "function"
              ) {
                UI.modal.open(
                  button.dataset.modal ||
                  "productModal"
                );
              }

              break;
            }

              case "approve-order":
    approveOrder(id);
    break;

case "mark-order-paid":
    markOrderPaid(id);
    break;

case "cancel-order":
    cancelOrder(id);
    break;

case "confirm-booking":
    confirmBooking(id);
    break;

case "complete-booking":
    completeBooking(id);
    break;

case "cancel-booking":
    cancelBooking(id);
    break;

            default:
              break;
          }

          return;
        }

        if (event.target.closest("#cancelEdit")) {
          resetProductEditor();
          return;
        }

        if (event.target.closest("#clearForm")) {
          resetProductEditor();
          return;
        }

        if (event.target.closest("#refreshCloud")) {
          Admin.refresh();
          return;
        }

        if (
          event.target.closest(
            "[data-refresh-business]"
          )
        ) {
          Admin.refresh();
          return;
        }

        const viewButton =
          event.target.closest("[data-admin-view]");

        if (viewButton) {
          loadView(viewButton.dataset.adminView);
        }
      }
    );
  }

  async function createBackup() {
    showLoading("Creating backup...");

    try {
      await callCloud("createBackup");

      toast(
        "Backup created successfully.",
        "success"
      );
    } catch (error) {
      handleError(error, "createBackup");
    } finally {
      hideLoading();
    }
  }

  function showAdminView(viewName) {
    const views =
      document.querySelectorAll(".admin-view");

    views.forEach(function (view) {
      const sectionName =
        view.dataset.adminSection ||
        view.dataset.view ||
        view.id
          .replace(/^admin-/, "")
          .replace(/View$/, "");

      const isActive = sectionName === viewName;

      view.hidden = !isActive;
      view.classList.toggle("active", isActive);
      view.style.display = isActive ? "block" : "none";
    });

    $$("[data-admin-view]").forEach(function (button) {
      const isActive =
        button.dataset.adminView === viewName;

      button.classList.toggle("active", isActive);

      if (isActive) {
        button.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const activeButton =
      $('[data-admin-view="' +
        escapeSelectorValue(viewName) +
      '"]');

    if (activeButton) {
      const titleElement =
        $("[data-admin-page-title]");

      if (titleElement) {
        titleElement.textContent =
          activeButton.textContent
            .replace(/\d+/g, "")
            .trim();
      }
    }
  }

  async function loadView(viewName) {
    Admin.state.currentView = viewName;
    showAdminView(viewName);

    if (viewName === "dashboard") {
      await loadDashboard();
    } else if (viewName === "products") {
      await loadProducts();
      updateProductStatistics();
    } else if (viewName === "orders") {
      await loadOrders();
    } else if (
      viewName === "spa" ||
      viewName === "bookings" ||
      viewName === "spa-bookings"
    ) {
      await loadBookings();
    } else if (viewName === "customers") {
      await loadCustomers();
    } else if (viewName === "settings") {
      await loadSettings();
    } else if (viewName === "logs") {
      await loadLogs();
    }
  }

  Admin.refresh = async function () {
    showLoading("Refreshing admin data...");

    try {
      await Promise.all([
        loadSettings(),
        loadProducts(),
        loadOrders(),
        loadBookings(),
        loadLogs()
      ]);

      await loadCustomers();
      await loadDashboard();

      toast(
        "Admin data refreshed.",
        "success"
      );

      emit("admin:refreshed", {
        state: Admin.state
      });

      return Admin.state;
    } catch (error) {
      handleError(error, "refresh");
      return Admin.state;
    } finally {
      hideLoading();
    }
  };

  Admin.getState = function () {
    return Admin.state;
  };

  Admin.loadView = loadView;
  Admin.loadDashboard = loadDashboard;
  Admin.loadProducts = loadProducts;
  Admin.loadOrders = loadOrders;
  Admin.loadBookings = loadBookings;
  Admin.loadCustomers = loadCustomers;
  Admin.loadSettings = loadSettings;
  Admin.loadLogs = loadLogs;
  Admin.editProduct = editProduct;
  Admin.deleteProduct = deleteProduct;
  Admin.resetProductEditor = resetProductEditor;

  Admin.init = async function () {
    if (Admin.initialized) return Admin;

    Admin.initialized = true;

    bindForms();
    bindActions();

    document.addEventListener(
      "admin:viewChanged",
      function (event) {
        const view =
          event && event.detail
            ? event.detail.view
            : "dashboard";

        loadView(view);
      }
    );

    try {
      await Admin.refresh();

      emit("admin:ready", {
        version: Admin.version,
        state: Admin.state
      });
    } catch (error) {
      handleError(error, "init");
    }

    return Admin;
  };

  window.BusinessAdmin = Admin;
  window.MayaAdmin = Admin;

  function start() {
    Admin.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})(window, document);
