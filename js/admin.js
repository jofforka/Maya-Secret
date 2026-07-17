js = r'''/*!
 * Maya's Secret Business OS v5.0
 * Admin controller connected to the Core Framework
 * File: js/admin.js
 */

(function (window, document) {
  "use strict";

  const Config = window.BusinessConfig;
  const Utils = window.BusinessUtils || window.MayaUtils || {};
  const UI = window.BusinessUI || window.MayaUI || {};
  const Auth = window.BusinessAuth || window.MayaAuth || {};
  const API = window.BusinessAPI || window.MayaAPI || {};
  const Framework = window.BusinessFramework || window.MayaFramework || {};

  const KEYS = {
    products: "maya_products_v5",
    orders: "maya_orders_v5",
    bookings: "maya_spa_bookings_v5",
    settings: "mayaBusinessSettingsV5",
    logs: "maya_activity_logs_v5"
  };

  const state = {
    initialized: false,
    products: [],
    orders: [],
    bookings: [],
    customers: [],
    logs: [],
    settings: { commissionRate: 15 },
    cloudReady: false,
    productQuery: "",
    productCategory: "All",
    orderQuery: "",
    orderStatus: "All",
    orderPayment: "All",
    bookingQuery: "",
    bookingStatus: "All",
    customerQuery: "",
    logQuery: "",
    logType: "All",
    reportRows: []
  };

  const $ = id => document.getElementById(id);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function clone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {}
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function safe(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function money(value) {
    if (typeof Utils.money === "function") {
      return Utils.money(value);
    }

    if (typeof Utils.currency === "function") {
      return Utils.currency(value);
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    if (typeof Utils.escapeHtml === "function") {
      return Utils.escapeHtml(value);
    }

    return String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[character]));
  }

  function formatDate(value) {
    if (typeof Utils.formatDateTime === "function") {
      return Utils.formatDateTime(value);
    }

    if (typeof Utils.formatDate === "function") {
      return Utils.formatDate(value);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-NG", {
          dateStyle: "medium",
          timeStyle: "short"
        });
  }

  function slugify(value) {
    if (typeof Utils.slugify === "function") {
      return Utils.slugify(value);
    }

    return (
      safe(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `product-${Date.now()}`
    );
  }

  function read(key, fallback = []) {
    if (Utils.storage?.get) {
      return Utils.storage.get(key, clone(fallback));
    }

    if (Utils.local?.get) {
      return Utils.local.get(key, clone(fallback));
    }

    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (_) {
      return clone(fallback);
    }
  }

  function write(key, value) {
    if (Utils.storage?.set) {
      Utils.storage.set(key, value);
      return;
    }

    if (Utils.local?.set) {
      Utils.local.set(key, value);
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function toast(message, type = "info") {
    if (typeof UI.toast === "function") {
      UI.toast(message, type);
      return;
    }

    const element = $("adminToast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    window.clearTimeout(toast.timer);

    toast.timer = window.setTimeout(() => {
      element.classList.remove("show");
    }, 2600);
  }

  function setLoading(active, label = "Loading…") {
    if (typeof UI.loading === "function") {
      UI.loading(Boolean(active), label);
    }
  }

  function confirmAction(message) {
    if (typeof UI.confirm === "function") {
      return UI.confirm(message);
    }

    return Promise.resolve(window.confirm(message));
  }

  function defaults() {
    return (window.MAYA_DEFAULT_PRODUCTS || []).map(product => ({
      ...product,
      gallery: [...(product.gallery || [])],
      benefits: [...(product.benefits || [])]
    }));
  }

  function normaliseProducts(list) {
    return (Array.isArray(list) ? list : []).map((product, index) => ({
      id:
        safe(product?.id) ||
        slugify(product?.name || `product-${index + 1}`),
      name: safe(product?.name) || `Product ${index + 1}`,
      category: safe(product?.category) || "Uncategorised",
      price: Number(product?.price || 0),
      size: safe(product?.size),
      badge: safe(product?.badge),
      desc: safe(product?.desc || product?.description),
      tone: safe(product?.tone) || "plum",
      status: (safe(product?.status) || "available").toLowerCase(),
      featured: Boolean(product?.featured),
      image: safe(product?.image),
      gallery: Array.isArray(product?.gallery)
        ? product.gallery.filter(Boolean)
        : [],
      benefits: Array.isArray(product?.benefits)
        ? product.benefits.filter(Boolean)
        : [],
      use: safe(product?.use || product?.directions)
    }));
  }

  function normaliseOrders(list) {
    return (Array.isArray(list) ? list : []).map((order, index) => ({
      id:
        safe(order?.id || order?.orderId) ||
        `MS-${String(index + 1).padStart(4, "0")}`,
      date: order?.date || order?.createdAt || new Date().toISOString(),
      customerName:
        safe(order?.customerName || order?.name) || "Customer",
      phone: safe(order?.phone),
      email: safe(order?.email),
      items: Array.isArray(order?.items) ? order.items : [],
      total: Number(order?.total || 0),
      paymentStatus:
        safe(order?.paymentStatus || order?.payment) || "Unconfirmed",
      status: safe(order?.status) || "Pending"
    }));
  }

  function normaliseBookings(list) {
    return (Array.isArray(list) ? list : []).map((booking, index) => ({
      id:
        safe(booking?.id || booking?.bookingId) ||
        `SPA-${String(index + 1).padStart(4, "0")}`,
      createdAt:
        booking?.createdAt ||
        booking?.date ||
        new Date().toISOString(),
      customerName:
        safe(booking?.customerName || booking?.name) || "Customer",
      phone: safe(booking?.phone),
      email: safe(booking?.email),
      services: Array.isArray(booking?.services)
        ? booking.services
        : safe(booking?.service)
          ? [booking.service]
          : [],
      total: Number(booking?.total || 0),
      appointmentDate:
        booking?.appointmentDate || booking?.preferredDate || "",
      status: safe(booking?.status) || "Pending"
    }));
  }

  function setCloud(stateName, text) {
    if (typeof UI.updateCloudStatus === "function") {
      UI.updateCloudStatus(stateName, text);
    }

    const element = $("cloudStatus");

    if (!element) return;

    element.dataset.state = stateName;

    const strong = element.querySelector("strong");

    if (strong) {
      strong.textContent = text;
    }
  }

  function log(type, action, record = "", details = "") {
    state.logs.unshift({
      date: new Date().toISOString(),
      type,
      action,
      record,
      user: "Admin",
      details
    });

    state.logs = state.logs.slice(0, 500);
    write(KEYS.logs, state.logs);
    renderLogs();

    if (state.cloudReady && typeof API.writeLog === "function") {
      API.writeLog({
        date: new Date().toISOString(),
        type,
        action,
        record,
        user: "Admin",
        details
      }).catch(() => {});
    }
  }

  function loadLocal() {
    const localProducts = read(KEYS.products, []);

    state.products = localProducts.length
      ? normaliseProducts(localProducts)
      : defaults();

    state.orders = normaliseOrders(read(KEYS.orders, []));
    state.bookings = normaliseBookings(read(KEYS.bookings, []));
    state.settings = {
      commissionRate: 15,
      ...read(KEYS.settings, {})
    };
    state.logs = read(KEYS.logs, []);
  }

  function unwrapList(value, key) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data?.[key])) return value.data[key];
    if (Array.isArray(value?.data)) return value.data;
    return [];
  }

  async function getCloudProducts() {
    if (typeof API.getProducts === "function") {
      return API.getProducts();
    }

    return [];
  }

  async function getCloudOrders() {
    if (typeof API.getOrders === "function") {
      return API.getOrders();
    }

    return [];
  }

  async function getCloudBookings() {
    if (typeof API.getBookings === "function") {
      return API.getBookings();
    }

    return [];
  }

  async function getCloudSettings() {
    if (typeof API.getSettings === "function") {
      return API.getSettings();
    }

    return {};
  }

  async function loadBusinessData(showMessage = false) {
    if (!Auth.isAuthenticated?.()) return;

    setCloud("loading", "Connecting to cloud…");
    setLoading(true, "Loading business data…");

    let success = false;

    try {
      const [products, orders, bookings, settings] =
        await Promise.allSettled([
          getCloudProducts(),
          getCloudOrders(),
          getCloudBookings(),
          getCloudSettings()
        ]);

      if (products.status === "fulfilled") {
        const list = unwrapList(products.value, "products");

        if (list.length || products.value) {
          state.products = normaliseProducts(list);
          write(KEYS.products, state.products);
          success = true;
        }
      }

      if (orders.status === "fulfilled") {
        state.orders = normaliseOrders(
          unwrapList(orders.value, "orders")
        );
        write(KEYS.orders, state.orders);
        success = true;
      }

      if (bookings.status === "fulfilled") {
        state.bookings = normaliseBookings(
          unwrapList(bookings.value, "bookings")
        );
        write(KEYS.bookings, state.bookings);
        success = true;
      }

      if (
        settings.status === "fulfilled" &&
        settings.value
      ) {
        state.settings = {
          ...state.settings,
          ...(settings.value.settings ||
            settings.value.data ||
            settings.value)
        };

        write(KEYS.settings, state.settings);
        success = true;
      }

      if (!success) {
        throw new Error("No cloud endpoint responded.");
      }

      state.cloudReady = true;
      setCloud("online", "Cloud connected");
      updateCloudDetails(true);

      if (showMessage) {
        toast("Business data refreshed.", "success");
      }
    } catch (error) {
      console.warn("Cloud unavailable:", error);

      state.cloudReady = false;
      loadLocal();
      setCloud(
        "offline",
        "Cloud unavailable — local data shown"
      );
      updateCloudDetails(false);

      if (showMessage) {
        toast(
          "Cloud unavailable. Local data loaded.",
          "warning"
        );
      }
    } finally {
      renderAll();
      setLoading(false);
    }
  }

  function updateCloudDetails(online) {
    const values = {
      api: online ? "Online" : "Unavailable",
      products: `${state.products.length} loaded`,
      orders: `${state.orders.length} loaded`,
      lastSync: new Date().toLocaleString("en-NG"),
      lastBackup:
        localStorage.getItem("mayaLastBackup") || "—"
    };

    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(
        `[data-cloud-detail="${key}"]`
      );

      if (element) {
        element.textContent = value;
      }
    });
  }

  const VIEW_META = {
    dashboard: [
      "Dashboard",
      "Monitor cloud activity, paid sales and business performance."
    ],
    orders: [
      "Orders",
      "Review sales, payment confirmations and fulfilment status."
    ],
    products: [
      "Products",
      "Manage the catalogue shown across the website."
    ],
    "spa-bookings": [
      "Spa bookings",
      "Review and manage appointment requests."
    ],
    customers: [
      "Customers",
      "View customer history and paid sales value."
    ],
    reports: [
      "Reports",
      "Generate confirmed-paid-sales and commission reports."
    ],
    settings: [
      "Settings",
      "Manage shared business information."
    ],
    logs: [
      "Activity logs",
      "Review administrative and cloud activity."
    ]
  };

  function switchView(name) {
    if (!VIEW_META[name]) return;

    if (typeof UI.showView === "function") {
      UI.showView(name);
    } else {
      $$("[data-admin-section]").forEach(section => {
        const active =
          section.dataset.adminSection === name;

        section.hidden = !active;
        section.classList.toggle("active", active);
      });

      $$("[data-admin-view]").forEach(button => {
        const active =
          button.dataset.adminView === name;

        button.classList.toggle("active", active);

        if (active) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });
    }

    const [title, subtitle] = VIEW_META[name];
    const titleElement = document.querySelector(
      "[data-admin-page-title]"
    );
    const subtitleElement = document.querySelector(
      "[data-admin-page-subtitle]"
    );

    if (titleElement) titleElement.textContent = title;
    if (subtitleElement) subtitleElement.textContent = subtitle;

    closeSidebar();

    if (window.location.hash !== `#${name}`) {
      history.replaceState(null, "", `#${name}`);
    }

    state.currentView = name;

    document.dispatchEvent(
      new CustomEvent("admin:viewChanged", {
        detail: { view: name },
        bubbles: true
      })
    );
  }

  function openSidebar() {
    if (typeof UI.openSidebar === "function") {
      UI.openSidebar();
      return;
    }

    $("adminSidebar")?.classList.add("open");
    document
      .querySelector("[data-admin-overlay]")
      ?.removeAttribute("hidden");
    document.body.classList.add(
      "admin-sidebar-open"
    );
  }

  function closeSidebar() {
    if (typeof UI.closeSidebar === "function") {
      UI.closeSidebar();
      return;
    }

    $("adminSidebar")?.classList.remove("open");
    document
      .querySelector("[data-admin-overlay]")
      ?.setAttribute("hidden", "");
    document.body.classList.remove(
      "admin-sidebar-open"
    );
  }

  function isPaid(order) {
    const paymentStatus = String(
      order.paymentStatus || ""
    ).toLowerCase();

    const status = String(order.status || "").toLowerCase();

    return (
      ["paid", "completed"].includes(paymentStatus) ||
      status === "completed"
    );
  }

  function deriveCustomers() {
    const map = new Map();

    state.orders.forEach(order => {
      const key = (
        order.phone ||
        order.email ||
        order.customerName
      ).toLowerCase();

      const item = map.get(key) || {
        name: order.customerName,
        phone: order.phone,
        email: order.email,
        orders: 0,
        paidValue: 0,
        lastActivity: order.date
      };

      item.orders += 1;

      if (isPaid(order)) {
        item.paidValue += order.total;
      }

      if (
        new Date(order.date) >
        new Date(item.lastActivity)
      ) {
        item.lastActivity = order.date;
      }

      map.set(key, item);
    });

    state.customers = [...map.values()].sort(
      (left, right) =>
        new Date(right.lastActivity) -
        new Date(left.lastActivity)
    );
  }

  function setMetric(name, value) {
    const element = document.querySelector(
      `[data-metric="${name}"]`
    );

    if (element) {
      element.textContent = value;
    }
  }

  function renderDashboard() {
    const paid = state.orders.filter(isPaid);
    const pending = state.orders.filter(
      order =>
        !isPaid(order) &&
        String(order.status).toLowerCase() !==
          "cancelled"
    );

    const paidSales = paid.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const pendingSales = pending.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const rate = Number(
      state.settings.commissionRate || 15
    );

    setMetric("paid-sales", money(paidSales));
    setMetric("pending-sales", money(pendingSales));
    setMetric(
      "commission",
      money((paidSales * rate) / 100)
    );
    setMetric("paid-orders", String(paid.length));
    setMetric(
      "spa-bookings",
      String(state.bookings.length)
    );
    setMetric(
      "customers",
      String(state.customers.length)
    );

    const rateElement = document.querySelector(
      "[data-commission-rate]"
    );

    if (rateElement) {
      rateElement.textContent = `${rate}%`;
    }

    const body = document.querySelector(
      "[data-dashboard-orders]"
    );

    if (!body) return;

    const rows = state.orders.slice(0, 5);

    body.innerHTML = rows.length
      ? rows
          .map(
            order => `
              <tr>
                <td><strong>${escapeHtml(order.id)}</strong></td>
                <td>${escapeHtml(order.customerName)}</td>
                <td>${money(order.total)}</td>
                <td>
                  <span class="status-pill ${escapeHtml(
                    String(order.status).toLowerCase()
                  )}">
                    ${escapeHtml(order.status)}
                  </span>
                </td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="4">No orders loaded yet.</td></tr>';
  }

  function filteredProducts() {
    return state.products.filter(product => {
      const haystack = [
        product.name,
        product.category,
        product.badge,
        product.status
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!state.productQuery ||
          haystack.includes(state.productQuery)) &&
        (state.productCategory === "All" ||
          product.category === state.productCategory)
      );
    });
  }

  function renderProducts() {
    const statistics = {
      statTotal: state.products.length,
      statFace: state.products.filter(
        product => product.category === "Face Care"
      ).length,
      statBody: state.products.filter(
        product => product.category === "Body Care"
      ).length,
      statGifts: state.products.filter(
        product => product.category === "Gift Sets"
      ).length,
      statFeatured: state.products.filter(
        product => product.featured
      ).length,
      statSoldOut: state.products.filter(
        product => product.status === "soldout"
      ).length
    };

    Object.entries(statistics).forEach(
      ([id, value]) => {
        if ($(id)) $(id).textContent = value;
      }
    );

    const list = filteredProducts();

    if ($("productCountText")) {
      $("productCountText").textContent =
        `${list.length} of ${state.products.length} products`;
    }

    if ($("adminEmptyState")) {
      $("adminEmptyState").hidden =
        list.length > 0;
    }

    const container = $("adminProductList");

    if (!container) return;

    container.innerHTML = list
      .map(
        product => `
          <article class="admin-item">
            ${
              product.image
                ? `
                  <div class="cart-thumb product-art product-photo">
                    <img src="${escapeHtml(product.image)}" alt="">
                  </div>
                `
                : `
                  <div class="cart-thumb product-art tone-${escapeHtml(
                    product.tone
                  )}">
                    <div class="product-pack">MS</div>
                  </div>
                `
            }
            <div>
              <div class="admin-item-meta">
                <span>${escapeHtml(product.category)}</span>
                ${
                  product.badge
                    ? `<span>${escapeHtml(product.badge)}</span>`
                    : ""
                }
                ${
                  product.featured
                    ? "<span>Featured</span>"
                    : ""
                }
              </div>
              <h3>${escapeHtml(product.name)}</h3>
              <p>
                ${money(product.price)}
                ${
                  product.size
                    ? ` · ${escapeHtml(product.size)}`
                    : ""
                }
              </p>
              ${
                product.desc
                  ? `<small>${escapeHtml(product.desc)}</small>`
                  : ""
              }
            </div>
            <div class="admin-item-actions">
              <button type="button" data-edit="${escapeHtml(
                product.id
              )}">Edit</button>
              <button type="button" data-duplicate="${escapeHtml(
                product.id
              )}">Duplicate</button>
              <button type="button" class="delete" data-delete="${escapeHtml(
                product.id
              )}">Delete</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function clearForm() {
    $("productForm")?.reset();

    if ($("productId")) $("productId").value = "";
    if ($("productCategory")) {
      $("productCategory").value = "Face Care";
    }
    if ($("productTone")) {
      $("productTone").value = "plum";
    }
    if ($("productStatus")) {
      $("productStatus").value = "available";
    }

    [
      "productImage",
      "gallery1",
      "gallery2",
      "gallery3"
    ].forEach(id => {
      if ($(id)) $(id).value = "";
    });

    if ($("formMode")) {
      $("formMode").textContent = "NEW PRODUCT";
    }

    if ($("formTitle")) {
      $("formTitle").textContent = "Add product";
    }

    if ($("cancelEdit")) {
      $("cancelEdit").hidden = true;
    }

    updatePreview();
  }

  function updatePreview() {
    if (!$("previewArt")) return;

    const image =
      $("productImage")?.value.trim() || "";
    const badge =
      $("productBadge")?.value.trim() || "New";
    const art = $("previewArt");

    art.className = image
      ? "product-art product-photo"
      : `product-art tone-${
          $("productTone")?.value || "plum"
        }`;

    art.innerHTML = image
      ? `
        <span class="product-badge">${escapeHtml(
          badge
        )}</span>
        <img src="${escapeHtml(image)}" alt="">
      `
      : `
        <span class="product-badge">${escapeHtml(
          badge
        )}</span>
        <div class="product-pack">MS</div>
      `;

    if ($("previewCategory")) {
      $("previewCategory").textContent =
        $("productCategory")?.value || "Face Care";
    }

    if ($("previewName")) {
      $("previewName").textContent =
        $("productName")?.value.trim() ||
        "Your product";
    }

    if ($("previewSize")) {
      $("previewSize").textContent =
        $("productSize")?.value.trim() || "Size";
    }

    if ($("previewPrice")) {
      $("previewPrice").textContent = money(
        $("productPrice")?.value
      );
    }

    if ($("descCount")) {
      $("descCount").textContent =
        $("productDesc")?.value.length || 0;
    }
  }

  async function saveProduct(product) {
    if (
      state.cloudReady &&
      typeof API.saveProduct === "function"
    ) {
      const response = await API.saveProduct(product);

      if (response?.products) {
        state.products = normaliseProducts(
          response.products
        );
      } else {
        const index = state.products.findIndex(
          item => item.id === product.id
        );

        if (index >= 0) {
          state.products[index] = product;
        } else {
          state.products.unshift(product);
        }
      }
    } else {
      const index = state.products.findIndex(
        item => item.id === product.id
      );

      if (index >= 0) {
        state.products[index] = product;
      } else {
        state.products.unshift(product);
      }
    }

    write(KEYS.products, state.products);
  }

  function renderOrders() {
    const list = state.orders.filter(order => {
      const haystack = [
        order.id,
        order.customerName,
        order.phone,
        order.email
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!state.orderQuery ||
          haystack.includes(state.orderQuery)) &&
        (state.orderStatus === "All" ||
          order.status === state.orderStatus) &&
        (state.orderPayment === "All" ||
          order.paymentStatus ===
            state.orderPayment)
      );
    });

    const count = document.querySelector(
      "[data-orders-count]"
    );

    if (count) {
      count.textContent = `${list.length} orders`;
    }

    const body = document.querySelector(
      "[data-order-list]"
    );

    if (!body) return;

    body.innerHTML = list.length
      ? list
          .map(
            order => `
              <tr>
                <td><strong>${escapeHtml(order.id)}</strong></td>
                <td>${formatDate(order.date)}</td>
                <td>
                  ${escapeHtml(order.customerName)}
                  <br>
                  <small>${escapeHtml(
                    order.phone ||
                      order.email ||
                      "—"
                  )}</small>
                </td>
                <td>${order.items.length}</td>
                <td>${money(order.total)}</td>
                <td>
                  <select data-order-payment-change="${escapeHtml(
                    order.id
                  )}">
                    ${[
                      "Unconfirmed",
                      "Paid",
                      "Refunded"
                    ]
                      .map(
                        value => `
                          <option ${
                            value === order.paymentStatus
                              ? "selected"
                              : ""
                          }>${value}</option>
                        `
                      )
                      .join("")}
                  </select>
                </td>
                <td>
                  <select data-order-status-change="${escapeHtml(
                    order.id
                  )}">
                    ${[
                      "Pending",
                      "Paid",
                      "Preparing",
                      "Completed",
                      "Cancelled"
                    ]
                      .map(
                        value => `
                          <option ${
                            value === order.status
                              ? "selected"
                              : ""
                          }>${value}</option>
                        `
                      )
                      .join("")}
                  </select>
                </td>
                <td>
                  <button type="button" data-delete-order="${escapeHtml(
                    order.id
                  )}">Delete</button>
                </td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="8">No orders found.</td></tr>';
  }

  function renderBookings() {
    const list = state.bookings.filter(
      booking => {
        const haystack = [
          booking.id,
          booking.customerName,
          booking.phone,
          booking.email
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!state.bookingQuery ||
            haystack.includes(
              state.bookingQuery
            )) &&
          (state.bookingStatus === "All" ||
            booking.status ===
              state.bookingStatus)
        );
      }
    );

    const count = document.querySelector(
      "[data-spa-bookings-count]"
    );

    if (count) {
      count.textContent =
        `${list.length} booking requests`;
    }

    const body = document.querySelector(
      "[data-spa-booking-list]"
    );

    if (!body) return;

    body.innerHTML = list.length
      ? list
          .map(
            booking => `
              <tr>
                <td><strong>${escapeHtml(
                  booking.id
                )}</strong></td>
                <td>${formatDate(
                  booking.createdAt
                )}</td>
                <td>
                  ${escapeHtml(
                    booking.customerName
                  )}
                  <br>
                  <small>${escapeHtml(
                    booking.phone ||
                      booking.email ||
                      "—"
                  )}</small>
                </td>
                <td>${escapeHtml(
                  booking.services.join(", ") ||
                    "—"
                )}</td>
                <td>${money(booking.total)}</td>
                <td>${escapeHtml(
                  booking.appointmentDate || "—"
                )}</td>
                <td>
                  <select data-booking-status-change="${escapeHtml(
                    booking.id
                  )}">
                    ${[
                      "Pending",
                      "Confirmed",
                      "Completed",
                      "Cancelled"
                    ]
                      .map(
                        value => `
                          <option ${
                            value === booking.status
                              ? "selected"
                              : ""
                          }>${value}</option>
                        `
                      )
                      .join("")}
                  </select>
                </td>
                <td>
                  <button type="button" data-delete-booking="${escapeHtml(
                    booking.id
                  )}">Delete</button>
                </td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="8">No spa bookings found.</td></tr>';
  }

  function renderCustomers() {
    const list = state.customers.filter(
      customer => {
        const haystack = [
          customer.name,
          customer.phone,
          customer.email
        ]
          .join(" ")
          .toLowerCase();

        return (
          !state.customerQuery ||
          haystack.includes(state.customerQuery)
        );
      }
    );

    const count = document.querySelector(
      "[data-customers-count]"
    );

    if (count) {
      count.textContent =
        `${list.length} customers`;
    }

    const body = document.querySelector(
      "[data-customer-list]"
    );

    if (!body) return;

    body.innerHTML = list.length
      ? list
          .map(
            customer => `
              <tr>
                <td><strong>${escapeHtml(
                  customer.name
                )}</strong></td>
                <td>${escapeHtml(
                  customer.phone ||
                    customer.email ||
                    "—"
                )}</td>
                <td>${customer.orders}</td>
                <td>${money(
                  customer.paidValue
                )}</td>
                <td>${formatDate(
                  customer.lastActivity
                )}</td>
                <td></td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="6">No customers found.</td></tr>';
  }

  function renderReport() {
    const startValue = document.querySelector(
      "[data-report-start]"
    )?.value;

    const endValue = document.querySelector(
      "[data-report-end]"
    )?.value;

    const start = startValue
      ? new Date(`${startValue}T00:00:00`)
      : new Date("1970-01-01");

    const end = endValue
      ? new Date(`${endValue}T23:59:59`)
      : new Date("2999-12-31");

    const rate = Number(
      state.settings.commissionRate || 15
    );

    state.reportRows = state.orders
      .filter(order => {
        const date = new Date(order.date);

        return (
          isPaid(order) &&
          date >= start &&
          date <= end
        );
      })
      .map(order => ({
        date: order.date,
        order: order.id,
        customer: order.customerName,
        paidTotal: order.total,
        commission: (order.total * rate) / 100
      }));

    const paidSales = state.reportRows.reduce(
      (sum, row) => sum + row.paidTotal,
      0
    );

    const commissionDue =
      state.reportRows.reduce(
        (sum, row) => sum + row.commission,
        0
      );

    const metrics = {
      paidSales: money(paidSales),
      paidOrders: String(
        state.reportRows.length
      ),
      commissionRate: `${rate}%`,
      commissionDue: money(commissionDue)
    };

    Object.entries(metrics).forEach(
      ([key, value]) => {
        const element =
          document.querySelector(
            `[data-report-metric="${key}"]`
          );

        if (element) {
          element.textContent = value;
        }
      }
    );

    const body = document.querySelector(
      "[data-report-rows]"
    );

    if (!body) return;

    body.innerHTML = state.reportRows.length
      ? state.reportRows
          .map(
            row => `
              <tr>
                <td>${formatDate(row.date)}</td>
                <td>${escapeHtml(
                  row.order
                )}</td>
                <td>${escapeHtml(
                  row.customer
                )}</td>
                <td>${money(
                  row.paidTotal
                )}</td>
                <td>${money(
                  row.commission
                )}</td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="5">No confirmed paid sales found.</td></tr>';
  }

  function fillSettings() {
    const form = document.querySelector(
      "[data-settings-form]"
    );

    if (!form) return;

    Object.entries(state.settings).forEach(
      ([key, value]) => {
        const field = form.elements.namedItem(key);

        if (field) {
          field.value = value;
        }
      }
    );
  }

  function renderLogs() {
    const list = state.logs.filter(item => {
      const haystack = [
        item.type,
        item.action,
        item.record,
        item.user,
        item.details
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!state.logQuery ||
          haystack.includes(state.logQuery)) &&
        (state.logType === "All" ||
          item.type === state.logType)
      );
    });

    const body = document.querySelector(
      "[data-log-list]"
    );

    if (!body) return;

    body.innerHTML = list.length
      ? list
          .map(
            item => `
              <tr>
                <td>${formatDate(item.date)}</td>
                <td>${escapeHtml(
                  item.action
                )}</td>
                <td>${escapeHtml(
                  item.record || "—"
                )}</td>
                <td>${escapeHtml(
                  item.user || "Admin"
                )}</td>
                <td>${escapeHtml(
                  item.details || "—"
                )}</td>
              </tr>
            `
          )
          .join("")
      : '<tr class="admin-table-empty"><td colspan="5">No activity logs found.</td></tr>';
  }

  function updateCounts() {
    const values = {
      orders: state.orders.length,
      products: state.products.length,
      "spa-bookings": state.bookings.length,
      customers: state.customers.length
    };

    Object.entries(values).forEach(
      ([key, value]) => {
        const element =
          document.querySelector(
            `[data-nav-count="${key}"]`
          );

        if (element) {
          element.textContent = value;
        }
      }
    );
  }

  function renderAll() {
    deriveCustomers();
    renderDashboard();
    renderProducts();
    renderOrders();
    renderBookings();
    renderCustomers();
    renderLogs();
    fillSettings();
    updateCounts();
  }

  function download(
    filename,
    content,
    type = "text/plain"
  ) {
    if (typeof Utils.download === "function") {
      Utils.download(filename, content, type);
      return;
    }

    const blob = new Blob([content], { type });
    const objectUrl =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(objectUrl);
  }

  function exportCsv(filename, rows) {
    if (!rows.length) {
      toast("There is no data to export.", "warning");
      return;
    }

    if (typeof Utils.exportCsv === "function") {
      Utils.exportCsv(filename, rows);
      return;
    }

    const headers = [
      ...new Set(
        rows.flatMap(row => Object.keys(row))
      )
    ];

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        headers
          .map(header => {
            const value = Array.isArray(
              row[header]
            )
              ? row[header].join(" | ")
              : row[header] ?? "";

            return `"${String(value).replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
    ].join("\n");

    download(
      filename,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  async function updateOrder(
    order,
    changes
  ) {
    Object.assign(order, changes);
    write(KEYS.orders, state.orders);

    if (
      state.cloudReady &&
      typeof API.updateOrder === "function"
    ) {
      try {
        await API.updateOrder(order);
      } catch (error) {
        console.warn(
          "Order cloud update failed:",
          error
        );
        toast(
          "Order updated locally. Cloud update failed.",
          "warning"
        );
      }
    }
  }

  async function updateBooking(
    booking,
    changes
  ) {
    Object.assign(booking, changes);
    write(KEYS.bookings, state.bookings);

    if (
      state.cloudReady &&
      typeof API.updateBooking === "function"
    ) {
      try {
        await API.updateBooking(booking);
      } catch (error) {
        console.warn(
          "Booking cloud update failed:",
          error
        );
        toast(
          "Booking updated locally. Cloud update failed.",
          "warning"
        );
      }
    }
  }

  function bindNavigation() {
    document.addEventListener(
      "click",
      async event => {
        const nav = event.target.closest(
          "[data-admin-view]"
        );

        if (nav) {
          event.preventDefault();
          switchView(nav.dataset.adminView);
          return;
        }

        const viewLink =
          event.target.closest(
            "[data-admin-view-link]"
          );

        if (viewLink) {
          event.preventDefault();
          switchView(
            viewLink.dataset.adminViewLink
          );
          return;
        }

        if (
          event.target.closest(
            "[data-admin-sidebar-open]"
          )
        ) {
          openSidebar();
          return;
        }

        if (
          event.target.closest(
            "[data-admin-sidebar-close], [data-admin-overlay]"
          )
        ) {
          closeSidebar();
        }
      }
    );

    window.addEventListener(
      "hashchange",
      () => {
        const view =
          window.location.hash.replace("#", "") ||
          "dashboard";

        if (VIEW_META[view]) {
          switchView(view);
        }
      }
    );
  }

  function bindProductActions() {
    document.addEventListener(
      "click",
      async event => {
        const edit = event.target.closest(
          "[data-edit]"
        );

        if (edit) {
          const product = state.products.find(
            item => item.id === edit.dataset.edit
          );

          if (!product) return;

          $("productId").value = product.id;
          $("productName").value = product.name;
          $("productCategory").value =
            product.category;
          $("productPrice").value =
            product.price;
          $("productSize").value =
            product.size || "";
          $("productBadge").value =
            product.badge || "";
          $("productDesc").value =
            product.desc || "";
          $("productTone").value =
            product.tone || "plum";
          $("productStatus").value =
            product.status || "available";
          $("productFeatured").checked =
            Boolean(product.featured);
          $("productImage").value =
            product.image || "";
          $("gallery1").value =
            product.gallery?.[0] || "";
          $("gallery2").value =
            product.gallery?.[1] || "";
          $("gallery3").value =
            product.gallery?.[2] || "";
          $("productBenefits").value = (
            product.benefits || []
          ).join("\n");
          $("productUse").value =
            product.use || "";
          $("formMode").textContent =
            "EDITING PRODUCT";
          $("formTitle").textContent =
            "Update product";
          $("cancelEdit").hidden = false;

          updatePreview();
          return;
        }

        const duplicate =
          event.target.closest(
            "[data-duplicate]"
          );

        if (duplicate) {
          const source = state.products.find(
            item =>
              item.id ===
              duplicate.dataset.duplicate
          );

          if (!source) return;

          const copy = {
            ...clone(source),
            id: `${source.id}-copy-${Date.now()
              .toString()
              .slice(-5)}`,
            name: `${source.name} Copy`,
            featured: false
          };

          try {
            setLoading(
              true,
              "Duplicating product…"
            );

            await saveProduct(copy);
            renderAll();
            log(
              "Product",
              "Duplicated product",
              source.name
            );
            toast(
              "Product duplicated.",
              "success"
            );
          } catch (error) {
            toast(
              error.message ||
                "Unable to duplicate product.",
              "error"
            );
          } finally {
            setLoading(false);
          }

          return;
        }

        const remove = event.target.closest(
          "[data-delete]"
        );

        if (remove) {
          const product = state.products.find(
            item =>
              item.id === remove.dataset.delete
          );

          if (!product) return;

          const confirmed = await confirmAction(
            `Delete “${product.name}”?`
          );

          if (!confirmed) return;

          try {
            setLoading(
              true,
              "Deleting product…"
            );

            if (
              state.cloudReady &&
              typeof API.deleteProduct ===
                "function"
            ) {
              await API.deleteProduct(
                product.id
              );
            }

            state.products =
              state.products.filter(
                item =>
                  item.id !== product.id
              );

            write(
              KEYS.products,
              state.products
            );

            renderAll();
            log(
              "Product",
              "Deleted product",
              product.name
            );
            toast(
              "Product deleted.",
              "success"
            );
          } catch (error) {
            toast(
              error.message ||
                "Unable to delete product.",
              "error"
            );
          } finally {
            setLoading(false);
          }

          return;
        }

        const deleteOrder =
          event.target.closest(
            "[data-delete-order]"
          );

        if (deleteOrder) {
          const id =
            deleteOrder.dataset.deleteOrder;

          const confirmed = await confirmAction(
            `Delete order ${id}?`
          );

          if (!confirmed) return;

          try {
            if (
              state.cloudReady &&
              typeof API.call === "function"
            ) {
              await API.call("deleteOrder", {
                id
              });
            }

            state.orders =
              state.orders.filter(
                order => order.id !== id
              );

            write(KEYS.orders, state.orders);
            renderAll();
            log(
              "Order",
              "Deleted order",
              id
            );
            toast(
              "Order deleted.",
              "success"
            );
          } catch (error) {
            toast(
              error.message ||
                "Unable to delete order.",
              "error"
            );
          }

          return;
        }

        const deleteBooking =
          event.target.closest(
            "[data-delete-booking]"
          );

        if (deleteBooking) {
          const id =
            deleteBooking.dataset
              .deleteBooking;

          const confirmed = await confirmAction(
            `Delete booking ${id}?`
          );

          if (!confirmed) return;

          try {
            if (
              state.cloudReady &&
              typeof API.deleteBooking ===
                "function"
            ) {
              await API.deleteBooking(id);
            }

            state.bookings =
              state.bookings.filter(
                booking => booking.id !== id
              );

            write(
              KEYS.bookings,
              state.bookings
            );

            renderAll();
            log(
              "Spa",
              "Deleted booking",
              id
            );
            toast(
              "Booking deleted.",
              "success"
            );
          } catch (error) {
            toast(
              error.message ||
                "Unable to delete booking.",
              "error"
            );
          }
        }
      }
    );
  }

  function bindStatusChanges() {
    document.addEventListener(
      "change",
      async event => {
        const payment =
          event.target.closest(
            "[data-order-payment-change]"
          );

        if (payment) {
          const order = state.orders.find(
            item =>
              item.id ===
              payment.dataset
                .orderPaymentChange
          );

          if (!order) return;

          await updateOrder(order, {
            paymentStatus: payment.value
          });

          renderAll();
          log(
            "Order",
            "Updated payment status",
            order.id,
            payment.value
          );
          return;
        }

        const status =
          event.target.closest(
            "[data-order-status-change]"
          );

        if (status) {
          const order = state.orders.find(
            item =>
              item.id ===
              status.dataset
                .orderStatusChange
          );

          if (!order) return;

          await updateOrder(order, {
            status: status.value
          });

          renderAll();
          log(
            "Order",
            "Updated order status",
            order.id,
            status.value
          );
          return;
        }

        const booking =
          event.target.closest(
            "[data-booking-status-change]"
          );

        if (booking) {
          const item = state.bookings.find(
            entry =>
              entry.id ===
              booking.dataset
                .bookingStatusChange
          );

          if (!item) return;

          await updateBooking(item, {
            status: booking.value
          });

          renderAll();
          log(
            "Spa",
            "Updated booking status",
            item.id,
            booking.value
          );
        }
      }
    );
  }

  function bindForms() {
    [
      "productName",
      "productCategory",
      "productPrice",
      "productSize",
      "productBadge",
      "productDesc",
      "productTone",
      "productImage"
    ].forEach(id => {
      $(id)?.addEventListener(
        "input",
        updatePreview
      );
    });

    $("productForm")?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const name =
          $("productName").value.trim();
        const price = Number(
          $("productPrice").value
        );

        if ($("nameError")) {
          $("nameError").textContent = "";
        }

        if ($("priceError")) {
          $("priceError").textContent = "";
        }

        if (name.length < 2) {
          if ($("nameError")) {
            $("nameError").textContent =
              "Enter a clear product name.";
          }
          return;
        }

        if (
          !Number.isFinite(price) ||
          price < 1
        ) {
          if ($("priceError")) {
            $("priceError").textContent =
              "Enter a valid price.";
          }
          return;
        }

        const existingId =
          $("productId").value;
        const id =
          existingId || slugify(name);

        const product = {
          id,
          name,
          category:
            $("productCategory").value,
          price,
          size:
            $("productSize").value.trim(),
          badge:
            $("productBadge").value.trim() ||
            "New",
          desc:
            $("productDesc").value.trim(),
          tone: $("productTone").value,
          status: $("productStatus").value,
          featured:
            $("productFeatured").checked,
          image:
            $("productImage").value.trim(),
          gallery: [
            "gallery1",
            "gallery2",
            "gallery3"
          ]
            .map(
              inputId =>
                $(inputId).value.trim()
            )
            .filter(Boolean),
          benefits:
            $("productBenefits").value
              .split("\n")
              .map(value => value.trim())
              .filter(Boolean),
          use:
            $("productUse").value.trim()
        };

        try {
          setLoading(
            true,
            existingId
              ? "Updating product…"
              : "Saving product…"
          );

          await saveProduct(product);

          log(
            "Product",
            existingId
              ? "Updated product"
              : "Added product",
            name
          );

          clearForm();
          renderAll();
          toast(
            "Product saved.",
            "success"
          );
        } catch (error) {
          toast(
            error.message ||
              "Unable to save product.",
            "error"
          );
        } finally {
          setLoading(false);
        }
      }
    );

    $("clearForm")?.addEventListener(
      "click",
      clearForm
    );

    $("cancelEdit")?.addEventListener(
      "click",
      clearForm
    );

    document
      .querySelector("[data-settings-form]")
      ?.addEventListener(
        "submit",
        async event => {
          event.preventDefault();

          const data = Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

          data.commissionRate = Number(
            data.commissionRate || 15
          );

          state.settings = {
            ...state.settings,
            ...data
          };

          write(
            KEYS.settings,
            state.settings
          );

          if (
            state.cloudReady &&
            typeof API.saveSettings ===
              "function"
          ) {
            try {
              await API.saveSettings(
                state.settings
              );
            } catch (error) {
              console.warn(
                "Settings cloud update failed:",
                error
              );
              toast(
                "Settings saved locally. Cloud update failed.",
                "warning"
              );
            }
          }

          renderAll();
          log(
            "Settings",
            "Updated business settings",
            "Settings"
          );
          toast(
            "Settings saved.",
            "success"
          );
        }
      );
  }

  function bindFilters() {
    $("adminSearch")?.addEventListener(
      "input",
      event => {
        state.productQuery =
          event.target.value
            .toLowerCase()
            .trim();

        renderProducts();
      }
    );

    $("adminCategoryFilter")?.addEventListener(
      "change",
      event => {
        state.productCategory =
          event.target.value;

        renderProducts();
      }
    );

    document
      .querySelector("[data-order-search]")
      ?.addEventListener(
        "input",
        event => {
          state.orderQuery =
            event.target.value
              .toLowerCase()
              .trim();

          renderOrders();
        }
      );

    document
      .querySelector(
        "[data-order-status-filter]"
      )
      ?.addEventListener(
        "change",
        event => {
          state.orderStatus =
            event.target.value;

          renderOrders();
        }
      );

    document
      .querySelector(
        "[data-order-payment-filter]"
      )
      ?.addEventListener(
        "change",
        event => {
          state.orderPayment =
            event.target.value;

          renderOrders();
        }
      );

    document
      .querySelector(
        "[data-spa-booking-search]"
      )
      ?.addEventListener(
        "input",
        event => {
          state.bookingQuery =
            event.target.value
              .toLowerCase()
              .trim();

          renderBookings();
        }
      );

    document
      .querySelector(
        "[data-spa-booking-status-filter]"
      )
      ?.addEventListener(
        "change",
        event => {
          state.bookingStatus =
            event.target.value;

          renderBookings();
        }
      );

    document
      .querySelector(
        "[data-customer-search]"
      )
      ?.addEventListener(
        "input",
        event => {
          state.customerQuery =
            event.target.value
              .toLowerCase()
              .trim();

          renderCustomers();
        }
      );

    document
      .querySelector("[data-log-search]")
      ?.addEventListener(
        "input",
        event => {
          state.logQuery =
            event.target.value
              .toLowerCase()
              .trim();

          renderLogs();
        }
      );

    document
      .querySelector(
        "[data-log-type-filter]"
      )
      ?.addEventListener(
        "change",
        event => {
          state.logType =
            event.target.value;

          renderLogs();
        }
      );

    document
      .querySelector(
        "[data-generate-report]"
      )
      ?.addEventListener(
        "click",
        renderReport
      );
  }

  function bindCloudActions() {
    $("refreshCloud")?.addEventListener(
      "click",
      () => loadBusinessData(true)
    );

    document
      .querySelector(
        "[data-refresh-business]"
      )
      ?.addEventListener(
        "click",
        () => loadBusinessData(true)
      );

    document
      .querySelectorAll("[data-refresh]")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => loadBusinessData(true)
        );
      });
  }

  function bindExports() {
    $("exportProducts")?.addEventListener(
      "click",
      () => {
        download(
          `maya-secret-products-${new Date()
            .toISOString()
            .slice(0, 10)}.json`,
          JSON.stringify(
            state.products,
            null,
            2
          ),
          "application/json"
        );

        localStorage.setItem(
          "mayaLastBackup",
          new Date().toLocaleString(
            "en-NG"
          )
        );

        updateCloudDetails(
          state.cloudReady
        );

        toast(
          "Product backup exported.",
          "success"
        );
      }
    );

    document
      .querySelector("[data-export-orders]")
      ?.addEventListener(
        "click",
        () =>
          exportCsv(
            "maya-secret-orders.csv",
            state.orders
          )
      );

    document
      .querySelector(
        "[data-export-spa-bookings]"
      )
      ?.addEventListener(
        "click",
        () =>
          exportCsv(
            "maya-secret-spa-bookings.csv",
            state.bookings
          )
      );

    document
      .querySelector(
        "[data-export-customers]"
      )
      ?.addEventListener(
        "click",
        () =>
          exportCsv(
            "maya-secret-customers.csv",
            state.customers
          )
      );

    document
      .querySelector("[data-export-logs]")
      ?.addEventListener(
        "click",
        () =>
          exportCsv(
            "maya-secret-activity-logs.csv",
            state.logs
          )
      );

    $$("[data-export-report]").forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            if (
              button.dataset.exportReport ===
              "csv"
            ) {
              exportCsv(
                "maya-secret-commission-report.csv",
                state.reportRows
              );
            } else {
              toast(
                `${button.dataset.exportReport.toUpperCase()} export requires the cloud edition.`,
                "warning"
              );
            }
          }
        );
      }
    );
  }

  function bindFrameworkEvents() {
    document.addEventListener(
      "maya:auth:signed-in",
      () => {
        showPanel();
      }
    );

    document.addEventListener(
      "maya:auth:signed-out",
      () => {
        hidePanel();
      }
    );

    document.addEventListener(
      "maya:auth:restored",
      () => {
        showPanel();
      }
    );

    document.addEventListener(
      "framework:ready",
      event => {
        if (event.detail?.authenticated) {
          showPanel();
        }
      }
    );

    window.addEventListener(
      "online",
      () => {
        setCloud(
          "online",
          "Internet connection restored"
        );
      }
    );

    window.addEventListener(
      "offline",
      () => {
        state.cloudReady = false;
        setCloud(
          "offline",
          "Offline — local data shown"
        );
      }
    );
  }

  function bind() {
    bindNavigation();
    bindProductActions();
    bindStatusChanges();
    bindForms();
    bindFilters();
    bindCloudActions();
    bindExports();
    bindFrameworkEvents();
  }

  function showPanel() {
    if (!Auth.isAuthenticated?.()) {
      hidePanel();
      return;
    }

    if ($("adminLogin")) {
      $("adminLogin").hidden = true;
    }

    if ($("adminPanel")) {
      $("adminPanel").hidden = false;
    }

    const view =
      window.location.hash.replace("#", "") ||
      "dashboard";

    switchView(
      VIEW_META[view] ? view : "dashboard"
    );

    loadBusinessData();
  }

  function hidePanel() {
    if ($("adminLogin")) {
      $("adminLogin").hidden = false;
    }

    if ($("adminPanel")) {
      $("adminPanel").hidden = true;
    }
  }

  function exposeController() {
    window.MayaAdmin = {
      version: "5.0.0",
      state,
      refresh: () => loadBusinessData(true),
      render: renderAll,
      showView: switchView,
      clearProductForm: clearForm,
      getState: () => clone(state)
    };
  }

  function init() {
    if (state.initialized) return;

    state.initialized = true;

    loadLocal();
    bind();
    renderAll();
    updatePreview();
    exposeController();

    Auth.init?.();
    UI.init?.();

    if (Auth.isAuthenticated?.()) {
      showPanel();
    } else {
      hidePanel();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})(window, document);
