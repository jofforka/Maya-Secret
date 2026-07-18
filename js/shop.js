/**
 * Maya's Secret Business OS v5.2
 * shop.js — Cloud Production Edition
 *
 * Requirements:
 *   1. config.js must load before cloud.js
 *   2. cloud.js must load before this file
 */

(function (window, document) {
  "use strict";

  let PRODUCTS = [];
  let currentCatalog = [];
  let activeFilter = "all";
  let toastTimer = null;
  let loadingProducts = null;

  let cart = readCart();

  const FALLBACK_IMAGE = "assets/products/placeholder.jpg";
  const WHATSAPP_NUMBER = "2348109044321";

  /* =========================================================
     GENERAL HELPERS
     ========================================================= */

  function readCart() {
    try {
      const stored = JSON.parse(localStorage.getItem("mayaCart") || "[]");
      return Array.isArray(stored)
        ? stored
            .filter(item => item && item.id)
            .map(item => ({
              id: String(item.id),
              qty: Math.max(1, Number(item.qty) || 1)
            }))
        : [];
    } catch (error) {
      console.warn("Unable to read cart:", error);
      return [];
    }
  }

  function money(value) {
    return `₦${Number(value || 0).toLocaleString("en-NG")}`;
  }

  function text(value, fallback = "") {
    const result = String(value == null ? "" : value).trim();
    return result || fallback;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}_${window.crypto.randomUUID().replace(/-/g, "")}`;
    }

    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function normalizeCategory(value) {
    const category = text(value).toLowerCase();

    if (category.includes("face")) return "face";
    if (category.includes("body")) return "body";
    if (
      category.includes("gift") ||
      category.includes("set") ||
      category.includes("bundle") ||
      category.includes("collection")
    ) {
      return "sets";
    }

    return category
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other";
  }

  function isVisibleProduct(product) {
    if (!product || !text(product.id) || !text(product.name)) return false;

    const status = text(product.status, "available").toLowerCase();

    return ![
      "archived",
      "inactive",
      "draft",
      "deleted",
      "unavailable",
      "hidden"
    ].includes(status);
  }

  function normalizeProduct(raw) {
    const benefits = Array.isArray(raw.benefits)
      ? raw.benefits.filter(Boolean).map(String)
      : [];

    const gallery = Array.isArray(raw.gallery)
      ? raw.gallery.filter(Boolean).map(String)
      : [];

    return {
      ...raw,
      id: text(raw.id),
      name: text(raw.name, "Untitled Product"),
      category: text(raw.category, "Other"),
      categoryKey: normalizeCategory(raw.category),
      label: text(raw.label, raw.category || "Maya's Secret"),
      price: Math.max(0, Number(raw.price) || 0),
      size: text(raw.size),
      badge: text(raw.badge),
      desc: text(raw.desc || raw.description || raw.summary),
      summary: text(raw.summary || raw.desc || raw.description),
      tone: text(raw.tone, "plum").toLowerCase(),
      form: text(raw.form, "product").toLowerCase(),
      image: text(raw.image || raw.imageUrl || raw.photo, FALLBACK_IMAGE),
      gallery,
      benefits,
      use: text(raw.use || raw.howToUse),
      featured:
        raw.featured === true ||
        String(raw.featured).toLowerCase() === "true",
      status: text(raw.status, "available")
    };
  }

  function getProduct(id) {
    return PRODUCTS.find(product => product.id === String(id)) || null;
  }

  function extractProducts(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.products)) return response.products;
    if (response && Array.isArray(response.data)) return response.data;
    return [];
  }

  /* =========================================================
     CLOUD PRODUCT LOADING
     ========================================================= */

  async function ensureCloudReady() {
    const cloud = window.BusinessCloud || window.MayaCloud;

    if (!cloud) {
      throw new Error(
        "BusinessCloud is unavailable. Make sure cloud.js loads before shop.js."
      );
    }

    if (typeof cloud.init === "function") {
      await cloud.init();
    }

    return cloud;
  }

  async function loadProducts(force = false) {
    if (loadingProducts && !force) return loadingProducts;

    loadingProducts = (async function () {
      setCatalogLoading(true);

      try {
        const cloud = await ensureCloudReady();
        const response = await cloud.getProducts();
        const rawProducts = extractProducts(response);

        PRODUCTS = rawProducts
          .filter(isVisibleProduct)
          .map(normalizeProduct);

        currentCatalog = [...PRODUCTS];
        sanitizeCart();
        applyCatalogControls();
        renderProductPage();
        updateCart();

        document.dispatchEvent(
          new CustomEvent("business:shop:products-loaded", {
            detail: { products: PRODUCTS }
          })
        );

        return PRODUCTS;
      } catch (error) {
        console.error("Unable to load products:", error);
        showCatalogError(error.message);
        showToast("Products could not be loaded. Please refresh.", "error");
        throw error;
      } finally {
        setCatalogLoading(false);
        loadingProducts = null;
      }
    })();

    return loadingProducts;
  }

  function setCatalogLoading(loading) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    grid.setAttribute("aria-busy", loading ? "true" : "false");

    if (loading && !PRODUCTS.length) {
      grid.innerHTML = `
        <div class="catalog-loading" role="status">
          <span class="catalog-loader" aria-hidden="true"></span>
          <p>Loading the collection…</p>
        </div>
      `;
    }
  }

  function showCatalogError(message) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    grid.innerHTML = `
      <div class="catalog-empty catalog-error" role="alert">
        <h3>We could not load the collection</h3>
        <p>${escapeHtml(message || "Please check your connection and try again.")}</p>
        <button class="button button-gold" id="retryProducts" type="button">
          Try again
        </button>
      </div>
    `;
  }

  /* =========================================================
     PRODUCT CARDS AND CATALOG
     ========================================================= */

  function imageMarkup(product, image, className = "catalog-art") {
    const src = text(image, FALLBACK_IMAGE);

    return `
      <div class="${className} tone-${escapeHtml(product.tone)}">
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
          decoding="async"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
        >
      </div>
    `;
  }

  function productArt(product, compact = false) {
    return imageMarkup(
      product,
      product.image,
      compact ? "catalog-art compact-art" : "catalog-art"
    );
  }

  function productCard(product) {
    const badge = product.badge
      ? `<span class="catalog-badge">${escapeHtml(product.badge)}</span>`
      : "";

    const size = product.size
      ? `<span>${escapeHtml(product.size)}</span>`
      : `<span aria-hidden="true">&nbsp;</span>`;

    return `
      <article
        class="catalog-card"
        data-category="${escapeHtml(product.categoryKey)}"
        data-price="${product.price}"
        data-name="${escapeHtml(product.name)}"
      >
        <a
          class="catalog-image-link"
          href="product.html?id=${encodeURIComponent(product.id)}"
          aria-label="View ${escapeHtml(product.name)}"
        >
          ${productArt(product)}
          ${badge}
          <span class="view-product">View details ↗</span>
        </a>

        <div class="catalog-card-info">
          <div>
            <p>${escapeHtml(product.label)}</p>
            <h3>
              <a href="product.html?id=${encodeURIComponent(product.id)}">
                ${escapeHtml(product.name)}
              </a>
            </h3>
            ${size}
          </div>
          <strong>${money(product.price)}</strong>
        </div>

        <button
          class="quick-add"
          data-add="${escapeHtml(product.id)}"
          type="button"
          aria-label="Add ${escapeHtml(product.name)} to bag"
        >
          Add to bag <span aria-hidden="true">+</span>
        </button>
      </article>
    `;
  }

  function renderCatalog(list = currentCatalog) {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = `
        <div class="catalog-empty">
          <h3>No products found</h3>
          <p>Try another category or sorting option.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(productCard).join("");
  }

  function applyCatalogControls() {
    let list = [...PRODUCTS];

    if (activeFilter !== "all") {
      list = list.filter(product => product.categoryKey === activeFilter);
    }

    const sort = document.getElementById("sortProducts")?.value || "featured";

    if (sort === "low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "high") {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          a.name.localeCompare(b.name)
      );
    }

    currentCatalog = list;
    renderCatalog(list);
  }

  /* =========================================================
     CART
     ========================================================= */

  function sanitizeCart() {
    const validIds = new Set(PRODUCTS.map(product => product.id));

    cart = cart.filter(item => validIds.has(item.id) && item.qty > 0);
    localStorage.setItem("mayaCart", JSON.stringify(cart));
  }

  function saveCart() {
    localStorage.setItem("mayaCart", JSON.stringify(cart));
    updateCart();

    document.dispatchEvent(
      new CustomEvent("business:shop:cart-updated", {
        detail: { cart: [...cart] }
      })
    );
  }

  function addToCart(id, qty = 1) {
    const product = getProduct(id);
    if (!product) return;

    const amount = Math.max(1, Number(qty) || 1);
    const existing = cart.find(item => item.id === id);

    if (existing) {
      existing.qty += amount;
    } else {
      cart.push({ id, qty: amount });
    }

    saveCart();
    showToast(`${product.name} added to your bag`);
  }

  function changeQty(id, delta) {
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    item.qty += Number(delta) || 0;

    if (item.qty <= 0) {
      cart = cart.filter(entry => entry.id !== id);
    }

    saveCart();
  }

  function removeItem(id) {
    const product = getProduct(id);
    cart = cart.filter(entry => entry.id !== id);
    saveCart();

    if (product) showToast(`${product.name} removed`);
  }

  function updateCart() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);

    document
      .querySelectorAll("#cartCount, [data-cart-count]")
      .forEach(element => {
        element.textContent = count;
        element.setAttribute("aria-label", `${count} items in bag`);
      });

    const items = document.getElementById("cartItems");
    const empty = document.getElementById("cartEmpty");
    const footer = document.getElementById("cartFooter");

    if (!items) return;

    if (!cart.length) {
      items.innerHTML = "";
      if (empty) empty.hidden = false;
      if (footer) footer.hidden = true;

      const totalElement = document.getElementById("cartTotal");
      if (totalElement) totalElement.textContent = money(0);
      return;
    }

    if (empty) empty.hidden = true;
    if (footer) footer.hidden = false;

    items.innerHTML = cart
      .map(item => {
        const product = getProduct(item.id);
        if (!product) return "";

        return `
          <div class="cart-line">
            ${productArt(product, true)}

            <div class="cart-line-copy">
              <p>${escapeHtml(product.label)}</p>
              <h3>${escapeHtml(product.name)}</h3>
              <strong>${money(product.price * item.qty)}</strong>

              <div class="qty-control" aria-label="Quantity controls">
                <button
                  data-minus="${escapeHtml(product.id)}"
                  type="button"
                  aria-label="Reduce ${escapeHtml(product.name)} quantity"
                >−</button>

                <span>${item.qty}</span>

                <button
                  data-plus="${escapeHtml(product.id)}"
                  type="button"
                  aria-label="Increase ${escapeHtml(product.name)} quantity"
                >+</button>
              </div>
            </div>

            <button
              class="remove-line"
              data-remove="${escapeHtml(product.id)}"
              type="button"
              aria-label="Remove ${escapeHtml(product.name)}"
            >×</button>
          </div>
        `;
      })
      .join("");

    const total = getCartTotal();
    const totalElement = document.getElementById("cartTotal");

    if (totalElement) totalElement.textContent = money(total);
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => {
      const product = getProduct(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function openCart() {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    drawer?.classList.add("open");
    overlay?.classList.add("open");
    drawer?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");

    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  /* =========================================================
     CLOUD ORDER + WHATSAPP CHECKOUT
     ========================================================= */

  function createOrderPayload() {
    const items = cart
      .map(item => {
        const product = getProduct(item.id);
        if (!product) return null;

        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: item.qty,
          quantity: item.qty,
          subtotal: product.price * item.qty,
          image: product.image
        };
      })
      .filter(Boolean);

    const now = new Date().toISOString();

    return {
      id: makeId("ORD"),
      source: "Website WhatsApp",
      channel: "WhatsApp",
      status: "Pending Confirmation",
      paymentStatus: "Unpaid",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      items,
      subtotal: getCartTotal(),
      deliveryFee: 0,
      total: getCartTotal(),
      currency: "NGN",
      createdAt: now,
      updatedAt: now
    };
  }

  function createWhatsAppMessage(order) {
    const lines = order.items
      .map(
        item =>
          `• ${item.name} × ${item.qty} — ${money(item.subtotal)}`
      )
      .join("\n");

    return [
      "Hello Maya's Secret, I would like to order:",
      "",
      lines,
      "",
      `Estimated total: ${money(order.total)}`,
      `Order reference: ${order.id}`,
      "",
      "Please confirm availability and delivery."
    ].join("\n");
  }

  async function checkout() {
    if (!cart.length) {
      showToast("Your bag is empty.", "error");
      return;
    }

    const order = createOrderPayload();
    const message = createWhatsAppMessage(order);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;

    // Open immediately to avoid browser popup blocking while the order saves.
    const whatsappWindow = window.open("", "_blank", "noopener");

    const button = document.getElementById("checkoutBtn");
    const originalText = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "Preparing order…";
    }

    try {
      const cloud = await ensureCloudReady();

      if (typeof cloud.saveOrder === "function") {
        const response = await cloud.saveOrder(order);

        if (
          response &&
          response.order &&
          response.order.id &&
          response.order.id !== order.id
        ) {
          order.id = response.order.id;
        }
      }

      showToast("Order recorded. Opening WhatsApp…");
    } catch (error) {
      console.error("Order could not be saved before WhatsApp:", error);
      showToast(
        "WhatsApp will open, but the order could not be recorded automatically.",
        "error"
      );
    } finally {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href = url;
      } else {
        window.location.href = url;
      }

      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Checkout";
      }
    }
  }

  /* =========================================================
     PRODUCT DETAIL PAGE
     ========================================================= */

  function renderProductPage() {
    const mount = document.getElementById("productDetail");
    if (!mount || !PRODUCTS.length) return;

    const id = new URLSearchParams(window.location.search).get("id");
    const product = getProduct(id);

    if (!product) {
      mount.innerHTML = `
        <div class="catalog-empty">
          <h2>Product not found</h2>
          <p>This item may no longer be available.</p>
          <a class="button button-gold" href="shop.html">Back to collection</a>
        </div>
      `;
      return;
    }

    document.title = `${product.name} | Maya's Secret`;

    const galleryImages = [
      product.image,
      ...product.gallery.filter(image => image !== product.image)
    ].filter(Boolean);

    const thumbnails =
      galleryImages.length > 1
        ? `
          <div class="product-thumbnails" aria-label="Product images">
            ${galleryImages
              .map(
                (image, index) => `
                  <button
                    class="product-thumb ${index === 0 ? "active" : ""}"
                    data-gallery-image="${escapeHtml(image)}"
                    type="button"
                    aria-label="View image ${index + 1}"
                  >
                    <img
                      src="${escapeHtml(image)}"
                      alt=""
                      loading="lazy"
                      onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
                    >
                  </button>
                `
              )
              .join("")}
          </div>
        `
        : "";

    const benefits = product.benefits.length
      ? `
        <div class="benefit-list">
          ${product.benefits
            .map(
              benefit => `
                <div><span aria-hidden="true">✦</span>${escapeHtml(benefit)}</div>
              `
            )
            .join("")}
        </div>
      `
      : "";

    const useText =
      product.use ||
      "Use as directed on clean skin. Contact Maya's Secret for personalised guidance.";

    mount.innerHTML = `
      <section class="product-detail">
        <div class="product-gallery">
          <a class="back-shop" href="shop.html">← Back to collection</a>

          <div class="product-main-image tone-${escapeHtml(product.tone)}">
            <img
              id="productMainImage"
              src="${escapeHtml(product.image)}"
              alt="${escapeHtml(product.name)}"
              onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
            >
          </div>

          ${thumbnails}

          ${
            product.badge
              ? `<span class="detail-badge">${escapeHtml(product.badge)}</span>`
              : ""
          }
        </div>

        <div class="product-copy">
          <p class="eyebrow">${escapeHtml(product.label)}</p>
          <h1>${escapeHtml(product.name)}</h1>

          <div class="product-price">
            <strong>${money(product.price)}</strong>
            ${product.size ? `<span>${escapeHtml(product.size)}</span>` : ""}
          </div>

          ${
            product.summary
              ? `<p class="product-summary">${escapeHtml(product.summary)}</p>`
              : ""
          }

          ${benefits}

          <div class="purchase-row">
            <div class="detail-qty">
              <button id="detailMinus" type="button" aria-label="Reduce quantity">−</button>
              <span id="detailQty">1</span>
              <button id="detailPlus" type="button" aria-label="Increase quantity">+</button>
            </div>

            <button
              class="button button-gold"
              id="detailAdd"
              type="button"
            >
              Add to bag
            </button>
          </div>

          <div class="product-accordion">
            <details open>
              <summary>How to use <span aria-hidden="true">+</span></summary>
              <p>${escapeHtml(useText)}</p>
            </details>

            <details>
              <summary>Product guidance <span aria-hidden="true">+</span></summary>
              <p>
                Skin needs vary. Contact Maya's Secret for personalised guidance,
                especially when introducing active products or managing a specific concern.
              </p>
            </details>

            <details>
              <summary>Delivery & confirmation <span aria-hidden="true">+</span></summary>
              <p>
                Orders are confirmed directly on WhatsApp. Product availability,
                Abuja delivery timing and any delivery fee are agreed before payment.
              </p>
            </details>
          </div>
        </div>
      </section>
    `;

    let qty = 1;
    const qtyLabel = document.getElementById("detailQty");

    document.getElementById("detailMinus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      if (qtyLabel) qtyLabel.textContent = qty;
    });

    document.getElementById("detailPlus")?.addEventListener("click", () => {
      qty += 1;
      if (qtyLabel) qtyLabel.textContent = qty;
    });

    document.getElementById("detailAdd")?.addEventListener("click", () => {
      addToCart(product.id, qty);
      openCart();
    });

    const related = document.getElementById("relatedGrid");

    if (related) {
      const relatedProducts = PRODUCTS.filter(
        candidate =>
          candidate.id !== product.id &&
          candidate.categoryKey === product.categoryKey
      )
        .concat(
          PRODUCTS.filter(
            candidate =>
              candidate.id !== product.id &&
              candidate.categoryKey !== product.categoryKey
          )
        )
        .slice(0, 3);

      related.innerHTML = relatedProducts.map(productCard).join("");
    }
  }

  /* =========================================================
     EVENT BINDING
     ========================================================= */

  function bindEvents() {
    document.addEventListener("click", event => {
      const retry = event.target.closest("#retryProducts");
      if (retry) {
        loadProducts(true);
        return;
      }

      const add = event.target.closest("[data-add]");
      if (add) {
        addToCart(add.dataset.add);
        return;
      }

      const plus = event.target.closest("[data-plus]");
      if (plus) {
        changeQty(plus.dataset.plus, 1);
        return;
      }

      const minus = event.target.closest("[data-minus]");
      if (minus) {
        changeQty(minus.dataset.minus, -1);
        return;
      }

      const remove = event.target.closest("[data-remove]");
      if (remove) {
        removeItem(remove.dataset.remove);
        return;
      }

      const galleryButton = event.target.closest("[data-gallery-image]");
      if (galleryButton) {
        const mainImage = document.getElementById("productMainImage");

        if (mainImage) {
          mainImage.src = galleryButton.dataset.galleryImage;
        }

        document
          .querySelectorAll(".product-thumb")
          .forEach(button => button.classList.remove("active"));

        galleryButton.classList.add("active");
      }
    });

    document
      .getElementById("cartTrigger")
      ?.addEventListener("click", openCart);

    document
      .getElementById("cartClose")
      ?.addEventListener("click", closeCart);

    document
      .getElementById("cartOverlay")
      ?.addEventListener("click", closeCart);

    document
      .getElementById("checkoutBtn")
      ?.addEventListener("click", checkout);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeCart();
    });

    document.querySelectorAll(".filter-btn").forEach(button => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-btn")
          .forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        activeFilter = normalizeCategory(button.dataset.filter || "all");

        if (String(button.dataset.filter).toLowerCase() === "all") {
          activeFilter = "all";
        }

        const sort = document.getElementById("sortProducts");
        if (sort) sort.value = "featured";

        applyCatalogControls();
      });
    });

    document
      .getElementById("sortProducts")
      ?.addEventListener("change", applyCatalogControls);
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function init() {
    bindEvents();
    updateCart();

    try {
      await loadProducts();
    } catch (error) {
      // Error state is already rendered by loadProducts().
    }
  }

  window.MayaShop = {
    init,
    loadProducts,
    renderCatalog,
    addToCart,
    openCart,
    closeCart,
    checkout,
    getProducts: () => [...PRODUCTS],
    getCart: () => [...cart]
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
