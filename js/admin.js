/**
 * Maya's Secret Business OS v5.0.2
 * admin.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const Admin = {
    version: "5.0.0",
    initialized: false,
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
    if (response && response.data && Array.isArray(response.data[key])) {
      return response.data[key];
    }
    if (response && Array.isArray(response.data)) return response.data;

    return [];
  }

  function getResponseObject(response, key) {
    if (!response) return {};
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
    if (
      response.data &&
      response.data[key] &&
      typeof response.data[key] === "object"
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
    }
  }

  function hideLoading() {
    const UI = getUI();

    if (UI && typeof UI.loading === "function") {
      UI.loading(false);
    }
  }

  function toast(message, type) {
    const UI = getUI();

    if (UI && typeof UI.toast === "function") {
      UI.toast(message, type || "info");
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
      throw new Error(
        "Cloud method is unavailable: " + methodName
      );
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

console.log("Raw getProducts() response:", response);

Admin.state.products = getResponseArray(response, "products");

console.log("Products array:", Admin.state.products);

renderProducts();

console.log("Products Loaded:", Admin.state.products.length);
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
      return Admin.state.bookings;
    } catch (error) {
      handleError(error, "loadBookings");
      return [];
    }
  }

  async function loadCustomers() {
    try {
      const response = await callCloud("getCustomers");
      Admin.state.customers = getResponseArray(response, "customers");
      renderCustomers();
      return Admin.state.customers;
    } catch (error) {
      handleError(error, "loadCustomers");
      return [];
    }
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
      Admin.state.orders.length || metrics.totalOrders || 0
    );
    setText(
      "[data-dashboard-products]",
      Admin.state.products.length || metrics.totalProducts || 0
    );
    setText(
      "[data-dashboard-customers]",
      Admin.state.customers.length || metrics.totalCustomers || 0
    );
    setText(
      "[data-dashboard-bookings]",
      Admin.state.bookings.length || metrics.totalBookings || 0
    );

    renderRecentOrders(data.recentOrders || []);
    renderRecentBookings(data.recentBookings || []);
  }

  function renderRecentOrders(orders) {
    const body =
      $("[data-recent-orders-body]") ||
      $("#recentOrdersBody");

    if (!body) return;

    body.innerHTML = "";

    safeArray(orders).slice(0, 10).forEach(function (order) {
      const row = document.createElement("tr");

      [
        order.id || "—",
        order.customerName ||
          (order.customer && order.customer.name) ||
          "Guest",
        formatMoney(order.total || order.grandTotal || 0),
        order.paymentStatus || "Unpaid",
        order.status || "Pending"
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
    $("[data-products-body]") ||
    $("#productsTableBody") ||
    $("#adminProductList");
    console.log("Container:", container);
console.log("Container ID:", container?.id);
console.log("Container Tag:", container?.tagName);

  if (!container) {
    console.error(
      "[Admin] Product display container was not found."
    );
    return;
  }

  container.innerHTML = "";

  if (!Admin.state.products.length) {
    if (
      container.tagName === "TBODY" ||
      container.tagName === "TABLE"
    ) {
      container.innerHTML =
        '<tr><td colspan="5">No products found.</td></tr>';
    } else {
      container.innerHTML =
        '<div class="admin-empty-state">No products found.</div>';
    }

    return;
  }

  Admin.state.products.forEach(function (product) {
    const isTable =
      container.tagName === "TBODY" ||
      container.tagName === "TABLE";

    if (isTable) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" +
        escapeHtml(product.name || "Unnamed product") +
        "</td>" +
        "<td>" +
        escapeHtml(product.category || "—") +
        "</td>" +
        "<td>" +
        escapeHtml(formatMoney(product.price || 0)) +
        "</td>" +
        "<td>" +
        escapeHtml(product.status || "Active") +
        "</td>" +
        '<td class="table-actions">' +
        '<button type="button" data-admin-action="edit-product" data-id="' +
        escapeAttribute(product.id || "") +
        '">Edit</button>' +
        '<button type="button" data-admin-action="delete-product" data-id="' +
        escapeAttribute(product.id || "") +
        '">Delete</button>' +
        "</td>";

      container.appendChild(row);
      return;
    }

    const card = document.createElement("article");
    card.className = "admin-product-card";

    card.innerHTML =
      '<div class="admin-product-card__image">' +
      (product.image
        ? '<img src="' +
          escapeAttribute(product.image) +
          '" alt="' +
          escapeAttribute(product.name || "Product") +
          '">'
        : '<div class="admin-product-placeholder">No image</div>') +
      "</div>" +
      '<div class="admin-product-card__content">' +
      "<h3>" +
      escapeHtml(product.name || "Unnamed product") +
      "</h3>" +
      "<p>" +
      escapeHtml(product.category || "Uncategorized") +
      "</p>" +
      "<strong>" +
      escapeHtml(formatMoney(product.price || 0)) +
      "</strong>" +
      '<span class="admin-product-status">' +
      escapeHtml(product.status || "Active") +
      "</span>" +
      '<div class="admin-product-actions">' +
      '<button type="button" data-admin-action="edit-product" data-id="' +
      escapeAttribute(product.id || "") +
      '">Edit</button>' +
      '<button type="button" data-admin-action="delete-product" data-id="' +
      escapeAttribute(product.id || "") +
      '">Delete</button>' +
      "</div>" +
      "</div>";

    container.appendChild(card);
    console.log("Rendered:", product.name);
  });
}

  function renderOrders() {
    const body =
      $("[data-orders-body]") ||
      $("#ordersTableBody");

    if (!body) return;

    body.innerHTML = "";

    Admin.state.orders.forEach(function (order) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" + escapeHtml(order.id || "—") + "</td>" +
        "<td>" +
        escapeHtml(
          order.customerName ||
          (order.customer && order.customer.name) ||
          "Guest"
        ) +
        "</td>" +
        "<td>" + escapeHtml(formatMoney(order.total || 0)) + "</td>" +
        "<td>" + escapeHtml(order.paymentStatus || "Unpaid") + "</td>" +
        "<td>" + escapeHtml(order.status || "Pending") + "</td>" +
        "<td>" + escapeHtml(formatDate(order.createdAt)) + "</td>";

      body.appendChild(row);
    });
  }

  function renderBookings() {
    const body =
      $("[data-bookings-body]") ||
      $("#bookingsTableBody");

    if (!body) return;

    body.innerHTML = "";

    Admin.state.bookings.forEach(function (booking) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" + escapeHtml(booking.id || "—") + "</td>" +
        "<td>" +
        escapeHtml(
          booking.customerName ||
          (booking.customer && booking.customer.name) ||
          "Guest"
        ) +
        "</td>" +
        "<td>" +
        escapeHtml(booking.date || booking.bookingDate || "—") +
        "</td>" +
        "<td>" + escapeHtml(formatMoney(booking.total || 0)) + "</td>" +
        "<td>" + escapeHtml(booking.status || "Pending") + "</td>";

      body.appendChild(row);
    });
  }

  function renderCustomers() {
    const body =
      $("[data-customers-body]") ||
      $("#customersTableBody");

    if (!body) return;

    body.innerHTML = "";

    Admin.state.customers.forEach(function (customer) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" + escapeHtml(customer.name || "Unnamed customer") + "</td>" +
        "<td>" + escapeHtml(customer.email || "—") + "</td>" +
        "<td>" + escapeHtml(customer.phone || "—") + "</td>" +
        "<td>" + escapeHtml(formatDate(customer.createdAt)) + "</td>";

      body.appendChild(row);
    });
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
      $("[data-logs-body]") ||
      $("#logsTableBody");

    if (!body) return;

    body.innerHTML = "";

    Admin.state.logs.forEach(function (log) {
      const row = document.createElement("tr");

      row.innerHTML =
        "<td>" + escapeHtml(formatDate(log.timestamp)) + "</td>" +
        "<td>" + escapeHtml(log.module || "—") + "</td>" +
        "<td>" + escapeHtml(log.action || "—") + "</td>" +
        "<td>" + escapeHtml(log.record || "—") + "</td>";

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
      data[key] = value;
    });

    $$("input[type='checkbox']", form).forEach(function (input) {
      data[input.name] = input.checked;
    });

    return data;
  }

  async function handleProductSubmit(form) {
    const product = serializeForm(form);

    if (product.price !== undefined) {
      product.price = toNumber(product.price);
    }

    showLoading("Saving product...");

    try {
      await callCloud("saveProduct", product);
      toast("Product saved successfully.", "success");
      await loadProducts();
      form.reset();

      const UI = getUI();

      if (UI && UI.modal && typeof UI.modal.close === "function") {
        UI.modal.close(form.closest(".modal")?.id || "productModal");
      }
    } catch (error) {
      handleError(error, "saveProduct");
    } finally {
      hideLoading();
    }
  }

  async function handleSettingsSubmit(form) {
    const settings = serializeForm(form);

    if (settings.commissionRate !== undefined) {
      settings.commissionRate = toNumber(settings.commissionRate);
    }

    showLoading("Saving settings...");

    try {
      await callCloud("saveSettings", settings);
      Admin.state.settings = Object.assign(
        {},
        Admin.state.settings,
        settings
      );
      toast("Settings saved successfully.", "success");
    } catch (error) {
      handleError(error, "saveSettings");
    } finally {
      hideLoading();
    }
  }

  async function deleteProduct(productId) {
    const UI = getUI();
    let confirmed = true;

    if (UI && typeof UI.confirm === "function") {
      confirmed = await UI.confirm("Delete this product?");
    } else {
      confirmed = window.confirm("Delete this product?");
    }

    if (!confirmed) return;

    showLoading("Deleting product...");

    try {
      await callCloud("deleteProduct", productId);
      toast("Product deleted.", "success");
      await loadProducts();
    } catch (error) {
      handleError(error, "deleteProduct");
    } finally {
      hideLoading();
    }
  }

  function editProduct(productId) {
    const product = Admin.state.products.find(function (item) {
      return String(item.id) === String(productId);
    });

    if (!product) {
      toast("Product not found.", "error");
      return;
    }

    const form =
      $("#productForm") ||
      $("[data-product-form]");

    if (!form) {
      emit("admin:editProduct", {
        product: product
      });
      return;
    }

    Object.keys(product).forEach(function (key) {
      const field = $('[name="' + escapeSelectorValue(key) + '"]', form);

      if (!field) return;

      if (field.type === "checkbox") {
        field.checked = Boolean(product[key]);
      } else if (
        product[key] !== undefined &&
        typeof product[key] !== "object"
      ) {
        field.value = product[key];
      }
    });

    const UI = getUI();

    if (UI && UI.modal && typeof UI.modal.open === "function") {
      const modal = form.closest(".modal");
      UI.modal.open(modal ? modal.id : "productModal");
    }
  }

  function bindForms() {
    const productForm =
      $("#productForm") ||
      $("[data-product-form]");

    if (productForm) {
      productForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleProductSubmit(productForm);
      });
    }

    const settingsForm =
      $("#settingsForm") ||
      $("[data-settings-form]");

    if (settingsForm) {
      settingsForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleSettingsSubmit(settingsForm);
      });
    }
  }

  function bindActions() {
    const refreshBtn = document.getElementById("refreshCloud");

if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
        Admin.refresh();
    });
  const exportBtn = document.getElementById("exportProducts");

if (exportBtn) {
    exportBtn.addEventListener("click", function () {
        createBackup();
    });
}
  const importBtn = document.getElementById("importProducts");

if (importBtn) {

    importBtn.addEventListener("click", async function(){

        try{

            await callCloud("importBackup");

            toast("Backup imported.","success");

            Admin.refresh();

        }catch(e){

            handleError(e,"importBackup");

        }

    });

}
  const resetBtn=document.getElementById("resetProducts");

if(resetBtn){

    resetBtn.addEventListener("click",async function(){

        try{

            await callCloud("resetProducts");

            toast("Cloud reset successfully.","success");

            Admin.refresh();

        }catch(e){

            handleError(e,"resetProducts");

        }

    });

}
}
    document.addEventListener("click", function (event) {
      const button =
        event.target && event.target.closest
          ? event.target.closest("[data-admin-action]")
          : null;

      if (!button) return;

      const action = button.dataset.adminAction;
      const id = button.dataset.id;

      if (action === "refresh") {
        Admin.refresh();
      }

      if (action === "edit-product") {
        editProduct(id);
      }

      if (action === "delete-product") {
        deleteProduct(id);
      }

      if (action === "create-backup") {
        createBackup();
      }

      if (action === "open-product-modal") {
        const UI = getUI();

        if (UI && UI.modal && typeof UI.modal.open === "function") {
          UI.modal.open(button.dataset.modal || "productModal");
        }
      }
    });
  }

  async function createBackup() {
    showLoading("Creating backup...");

    try {
      await callCloud("createBackup");
      toast("Backup created successfully.", "success");
    } catch (error) {
      handleError(error, "createBackup");
    } finally {
      hideLoading();
    }
  }

  async function loadView(viewName) {
    Admin.state.currentView = viewName;

    if (viewName === "dashboard") {
      await loadDashboard();
    } else if (viewName === "products") {
      await loadProducts();
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
        loadDashboard(),
        loadProducts(),
        loadOrders(),
        loadBookings(),
        loadCustomers(),
        loadLogs()
      ]);

      toast("Admin data refreshed.", "success");

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
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})(window, document);
