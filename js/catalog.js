:root{
  --maya-wine:#5b173e;
  --maya-plum:#341126;
  --maya-gold:#c7a36a;
  --maya-cream:#fbf7f1;
  --maya-ink:#241d22;
  --maya-muted:#766b72;
  --maya-line:rgba(52,17,38,.14);
  --maya-shadow:0 18px 45px rgba(52,17,38,.12);
}

.product-grid,
[data-product-grid],
#productGrid,
#catalogGrid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:28px 20px;
  align-items:stretch;
}

.product-card{
  display:flex;
  flex-direction:column;
  min-width:0;
  height:100%;
  overflow:hidden;
  border:1px solid var(--maya-line);
  border-radius:22px;
  background:#fff;
  box-shadow:0 8px 28px rgba(52,17,38,.07);
  transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;
}

.product-card:hover{
  transform:translateY(-6px);
  box-shadow:var(--maya-shadow);
  border-color:rgba(199,163,106,.55);
}

.product-card-media{
  position:relative;
  display:block;
  width:100%;
  aspect-ratio:1/1.08;
  padding:0;
  overflow:hidden;
  border:0;
  background:linear-gradient(145deg,#f8f1ea,#f4edf2);
  cursor:pointer;
}

.product-card-image{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
  transition:transform .45s ease;
}

.product-card:hover .product-card-image{
  transform:scale(1.035);
}

.product-card-placeholder{
  height:100%;
  display:grid;
  place-items:center;
  color:var(--maya-muted);
  font-size:.92rem;
}

.product-card-badge{
  position:absolute;
  top:14px;
  left:14px;
  z-index:2;
  padding:7px 11px;
  border-radius:999px;
  background:rgba(255,255,255,.94);
  color:var(--maya-wine);
  box-shadow:0 6px 18px rgba(52,17,38,.12);
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.06em;
  text-transform:uppercase;
}

.product-card-body{
  display:flex;
  flex-direction:column;
  flex:1;
  gap:8px;
  padding:18px;
}

.product-card-title{
  margin:0;
  color:var(--maya-ink);
  font-size:1.08rem;
  line-height:1.35;
  font-weight:700;
}

.product-card-category{
  margin:0;
  color:var(--maya-muted);
  font-size:.86rem;
}

.product-card-size{
  min-height:1.2em;
  margin:0;
  color:var(--maya-muted);
  font-size:.82rem;
}

.product-card-price{
  margin:4px 0 0;
  color:var(--maya-wine);
  font-size:1.08rem;
  font-weight:800;
}

.product-card-actions{
  display:grid;
  grid-template-columns:1fr 1.15fr;
  gap:9px;
  margin-top:auto;
  padding-top:12px;
}

.product-card-view,
.product-card-cart{
  min-height:42px;
  border-radius:12px;
  font:inherit;
  font-size:.86rem;
  font-weight:700;
  cursor:pointer;
  transition:all .2s ease;
}

.product-card-view{
  border:1px solid var(--maya-line);
  color:var(--maya-wine);
  background:#fff;
}

.product-card-view:hover{
  border-color:var(--maya-gold);
  background:var(--maya-cream);
}

.product-card-cart{
  border:1px solid var(--maya-wine);
  color:#fff;
  background:var(--maya-wine);
}

.product-card-cart:hover{
  background:var(--maya-plum);
  border-color:var(--maya-plum);
}

.catalog-empty-premium{
  grid-column:1/-1;
  padding:52px 24px;
  text-align:center;
  border:1px dashed var(--maya-line);
  border-radius:22px;
  background:var(--maya-cream);
  color:var(--maya-muted);
}

.catalog-skeleton{
  height:430px;
  border-radius:22px;
  background:linear-gradient(90deg,#f5f0ec 25%,#fff 50%,#f5f0ec 75%);
  background-size:200% 100%;
  animation:mayaShimmer 1.3s infinite;
}

@keyframes mayaShimmer{
  to{background-position:-200% 0}
}

@media (max-width:1100px){
  .product-grid,
  [data-product-grid],
  #productGrid,
  #catalogGrid{
    grid-template-columns:repeat(3,minmax(0,1fr));
  }
}

@media (max-width:760px){
  .product-grid,
  [data-product-grid],
  #productGrid,
  #catalogGrid{
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:16px 12px;
  }

  .product-card{
    border-radius:16px;
  }

  .product-card-body{
    padding:13px;
  }

  .product-card-title{
    font-size:.96rem;
  }

  .product-card-actions{
    grid-template-columns:1fr;
  }

  .product-card-view,
  .product-card-cart{
    min-height:40px;
  }
}

@media (max-width:420px){
  .product-grid,
  [data-product-grid],
  #productGrid,
  #catalogGrid{
    gap:13px 9px;
  }

  .product-card-body{
    padding:11px;
  }

  .product-card-category,
  .product-card-size{
    font-size:.76rem;
  }

  .product-card-price{
    font-size:.96rem;
  }

  .product-card-view,
  .product-card-cart{
    font-size:.8rem;
  }
}
'''

# Build a polished replacement based on the supplied API, keeping compatibility.
code = dedent(r'''
/**
 * Maya's Secret Business OS v6.0
 * catalog.js — Premium Cloud Storefront
 *
 * Keeps the existing BusinessCloud, BusinessCart and product modal contracts.
 */

(function (window, document) {
  "use strict";

  const Catalog = {
    version: "6.0.0",
    initialized: false,
    actionsBound: false,
    products: [],
    filteredProducts: [],
    categories: [],
    state: {
      search: "",
      category: "all",
      sort: "featured",
      loading: false,
      error: null
    }
  };

  const FALLBACK_IMAGE = "assets/products/placeholder.jpg";

  function getCloud() {
    return window.BusinessCloud || window.MayaCloud || window.MAYA_CLOUD || null;
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
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(value) {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
      }).format(toNumber(value));
    } catch (error) {
      return "₦" + toNumber(value).toLocaleString();
    }
  }

  function getProductImage(product) {
    if (!product) return FALLBACK_IMAGE;
    if (product.image) return product.image;
    if (product.imageUrl) return product.imageUrl;

    if (Array.isArray(product.images) && product.images.length) {
      const first = product.images[0];
      if (typeof first === "string") return first;
      if (first && first.url) return first.url;
      if (first && first.imageUrl) return first.imageUrl;
    }

    return FALLBACK_IMAGE;
  }

  function getProductPrice(product) {
    if (!product) return 0;
    if (product.price !== undefined) return toNumber(product.price);
    if (product.salePrice !== undefined) return toNumber(product.salePrice);
    if (product.amount !== undefined) return toNumber(product.amount);
    return 0;
  }

  function isProductVisible(product) {
    if (!product) return false;

    const status = normalize(product.status);
    if (!status) return true;

    return [
      "active", "available", "published", "live", "enabled",
      "instock", "in stock", "true", "1"
    ].includes(status);
  }

  function extractProducts(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.products)) return response.products;
    if (response && response.data && Array.isArray(response.data.products)) {
      return response.data.products;
    }
    if (response && Array.isArray(response.data)) return response.data;
    return [];
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function getCatalogGrid() {
    return (
      $("[data-product-grid]") ||
      $(".product-grid") ||
      $("#productGrid") ||
      $("#catalogGrid")
    );
  }

  function getEmptyState() {
    return (
      $("[data-catalog-empty]") ||
      $(".catalog-empty") ||
      $("#catalogEmpty")
    );
  }

  function getLoadingState() {
    return (
      $("[data-catalog-loading]") ||
      $(".catalog-loading") ||
      $("#catalogLoading")
    );
  }

  function injectPremiumStyles() {
    if ($("#maya-premium-catalog-styles")) return;

    const style = document.createElement("style");
    style.id = "maya-premium-catalog-styles";
    style.textContent = __PREMIUM_CSS__;
    document.head.appendChild(style);
  }

  function renderSkeletons() {
    const grid = getCatalogGrid();
    if (!grid) return;

    grid.innerHTML = Array.from({ length: 8 }, function () {
      return '<div class="catalog-skeleton" aria-hidden="true"></div>';
    }).join("");
  }

  function setLoading(show) {
    Catalog.state.loading = Boolean(show);

    const loadingElement = getLoadingState();
    if (loadingElement) {
      loadingElement.hidden = !show;
      loadingElement.classList.toggle("is-active", Boolean(show));
    }

    const grid = getCatalogGrid();
    if (grid) {
      grid.setAttribute("aria-busy", String(Boolean(show)));
      if (show && !Catalog.products.length) renderSkeletons();
    }

    const UI = getUI();
    if (UI && typeof UI.loading === "function") {
      UI.loading(Boolean(show), show ? "Loading products..." : "");
    }
  }

  function showError(error) {
    Catalog.state.error = error;

    const UI = getUI();
    if (UI && typeof UI.toast === "function") {
      UI.toast(
        error && error.message ? error.message : "Unable to load products.",
        "error"
      );
    }

    emit("catalog:error", { error: error });
  }

  function buildProductCard(product) {
    const card = createElement("article", "product-card");
    card.dataset.productId = product.id || "";

    const media = createElement("button", "product-card-media");
    media.type = "button";
    media.setAttribute("aria-label", "View " + (product.name || "product"));

    const image = createElement("img", "product-card-image");
    image.src = getProductImage(product);
    image.alt = product.name || "Product";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", function () {
      image.onerror = null;
      image.src = FALLBACK_IMAGE;
    });

    media.appendChild(image);

    if (
      product.featured === true ||
      product.featured === "true" ||
      product.featured === 1
    ) {
      media.appendChild(createElement("span", "product-card-badge", "Featured"));
    } else if (product.badge) {
      media.appendChild(
        createElement("span", "product-card-badge", product.badge)
      );
    }

    const body = createElement("div", "product-card-body");
    const title = createElement(
      "h3",
      "product-card-title",
      product.name || "Unnamed product"
    );
    const category = createElement(
      "p",
      "product-card-category",
      product.category || ""
    );
    const size = createElement(
      "p",
      "product-card-size",
      product.size || " "
    );
    const price = createElement(
      "p",
      "product-card-price",
      formatMoney(getProductPrice(product))
    );

    const actions = createElement("div", "product-card-actions");

    const viewButton = createElement(
      "button",
      "product-card-view",
      "View details"
    );
    viewButton.type = "button";
    viewButton.dataset.catalogAction = "view";
    viewButton.dataset.productId = product.id || "";

    const cartButton = createElement(
      "button",
      "product-card-cart",
      "Add to bag"
    );
    cartButton.type = "button";
    cartButton.dataset.catalogAction = "add-to-cart";
    cartButton.dataset.productId = product.id || "";

    actions.appendChild(viewButton);
    actions.appendChild(cartButton);

    body.appendChild(title);
    if (product.category) body.appendChild(category);
    body.appendChild(size);
    body.appendChild(price);
    body.appendChild(actions);

    card.appendChild(media);
    card.appendChild(body);

    media.addEventListener("click", function () {
      Catalog.openProduct(product.id);
    });

    return card;
  }

  function renderProducts(products) {
    const grid = getCatalogGrid();
    if (!grid) return false;

    grid.innerHTML = "";

    const empty = getEmptyState();
    const items = Array.isArray(products) ? products : [];

    if (!items.length) {
      if (empty) empty.hidden = false;

      const state = createElement("div", "catalog-empty-premium");
      state.innerHTML =
        "<h3>No products found</h3><p>Try another category or search term.</p>";
      grid.appendChild(state);
      grid.hidden = false;
      return true;
    }

    if (empty) empty.hidden = true;

    const fragment = document.createDocumentFragment();
    items.forEach(function (product) {
      fragment.appendChild(buildProductCard(product));
    });

    grid.appendChild(fragment);
    grid.hidden = false;

    emit("catalog:rendered", { count: items.length });
    return true;
  }

  function extractCategories(products) {
    const categories = [];

    (products || []).forEach(function (product) {
      const category = String(product.category || "").trim();
      if (category && categories.indexOf(category) === -1) {
        categories.push(category);
      }
    });

    return categories.sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function renderCategoryOptions() {
    const select =
      $("[data-catalog-category]") ||
      $("#categoryFilter") ||
      $(".catalog-category-filter");

    if (!select) return;

    const currentValue = select.value || "all";
    select.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    select.appendChild(allOption);

    Catalog.categories.forEach(function (category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

    select.value = Array.from(select.options).some(function (option) {
      return option.value === currentValue;
    }) ? currentValue : "all";
  }

  function applyFilters() {
    const search = normalize(Catalog.state.search);
    const category = Catalog.state.category || "all";
    const sort = Catalog.state.sort || "featured";

    let products = Catalog.products.filter(function (product) {
      const description = product.description || product.desc || "";
      const matchesSearch =
        !search ||
        normalize(product.name).includes(search) ||
        normalize(product.category).includes(search) ||
        normalize(description).includes(search);

      const matchesCategory =
        category === "all" ||
        normalize(product.category) === normalize(category);

      return matchesSearch && matchesCategory;
    });

    products.sort(function (a, b) {
      if (sort === "price-low") return getProductPrice(a) - getProductPrice(b);
      if (sort === "price-high") return getProductPrice(b) - getProductPrice(a);
      if (sort === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      if (sort === "newest") {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
      if (a.featured === b.featured) {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      return a.featured ? -1 : 1;
    });

    Catalog.filteredProducts = products;
    renderProducts(products);

    emit("catalog:filtered", {
      count: products.length,
      search: search,
      category: category,
      sort: sort
    });

    return products;
  }

  function bindFilters() {
    const searchInput =
      $("[data-catalog-search]") ||
      $("#catalogSearch") ||
      $(".catalog-search");

    const categorySelect =
      $("[data-catalog-category]") ||
      $("#categoryFilter") ||
      $(".catalog-category-filter");

    const sortSelect =
      $("[data-catalog-sort]") ||
      $("#catalogSort") ||
      $(".catalog-sort");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        Catalog.state.search = searchInput.value || "";
        applyFilters();
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener("change", function () {
        Catalog.state.category = categorySelect.value || "all";
        applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        Catalog.state.sort = sortSelect.value || "featured";
        applyFilters();
      });
    }
  }

  function bindProductActions() {
    if (Catalog.actionsBound) return;
    Catalog.actionsBound = true;

    document.addEventListener("click", function (event) {
      const button =
        event.target && event.target.closest
          ? event.target.closest("[data-catalog-action]")
          : null;

      if (!button) return;

      const productId = button.dataset.productId;
      const action = button.dataset.catalogAction;

      if (action === "view") Catalog.openProduct(productId);
      if (action === "add-to-cart") Catalog.addToCart(productId);
    });
  }

  Catalog.load = async function () {
    if (!getCatalogGrid()) return [];

    const Cloud = getCloud();
    if (!Cloud || typeof Cloud.getProducts !== "function") {
      throw new Error("Cloud product service is unavailable.");
    }

    if (typeof Cloud.init === "function") await Cloud.init();

    setLoading(true);

    try {
      const response = await Cloud.getProducts();

      Catalog.products = extractProducts(response)
        .filter(isProductVisible)
        .map(function (product, index) {
          if (!product.id || String(product.id).trim() === "") {
            product.id =
              normalize(product.name)
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") ||
              ("product-" + index);
          }
          return product;
        });

      Catalog.categories = extractCategories(Catalog.products);
      renderCategoryOptions();
      applyFilters();

      emit("catalog:loaded", {
        count: Catalog.products.length,
        products: Catalog.products
      });

      return Catalog.products;
    } catch (error) {
      console.error("[Catalog] Load failed:", error);
      showError(error);
      Catalog.products = [];
      Catalog.filteredProducts = [];
      renderProducts([]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  Catalog.refresh = function () {
    return Catalog.load();
  };

  Catalog.getProduct = function (productId) {
    return (
      Catalog.products.find(function (product) {
        return String(product.id) === String(productId);
      }) || null
    );
  };

  Catalog.openProduct = function (productId) {
    const product = Catalog.getProduct(productId);

    if (!product) {
      showError(new Error("Product not found."));
      return false;
    }

    emit("catalog:productSelected", { product: product });

    if (
      window.BusinessProductModal &&
      typeof window.BusinessProductModal.open === "function"
    ) {
      window.BusinessProductModal.open(product);
      return true;
    }

    if (
      window.MayaProductModal &&
      typeof window.MayaProductModal.open === "function"
    ) {
      window.MayaProductModal.open(product);
      return true;
    }

    const detailUrl =
      product.url || product.detailUrl || product.productUrl;

    if (detailUrl) {
      window.location.href = detailUrl;
      return true;
    }

    return false;
  };

  Catalog.addToCart = function (productId) {
    const product = Catalog.getProduct(productId);

    if (!product) {
      showError(new Error("Product not found."));
      return false;
    }

    if (
      window.BusinessCart &&
      typeof window.BusinessCart.add === "function"
    ) {
      window.BusinessCart.add(product);
    } else if (
      window.MayaCart &&
      typeof window.MayaCart.add === "function"
    ) {
      window.MayaCart.add(product);
    } else {
      emit("catalog:addToCart", { product: product });
    }

    const UI = getUI();
    if (UI && typeof UI.toast === "function") {
      UI.toast((product.name || "Product") + " added to bag.", "success");
    }

    return true;
  };

  Catalog.search = function (value) {
    Catalog.state.search = value || "";
    return applyFilters();
  };

  Catalog.filterByCategory = function (category) {
    Catalog.state.category = category || "all";
    return applyFilters();
  };

  Catalog.sort = function (sortValue) {
    Catalog.state.sort = sortValue || "featured";
    return applyFilters();
  };

  Catalog.init = async function () {
    if (!getCatalogGrid()) return Catalog;
    if (Catalog.initialized) return Catalog;

    Catalog.initialized = true;

    injectPremiumStyles();
    bindFilters();
    bindProductActions();

    try {
      await Catalog.load();
    } catch (error) {
      console.error("[Catalog] Initialization failed.", error);
    }

    return Catalog;
  };

  window.BusinessCatalog = Catalog;
  window.MayaCatalog = Catalog;

  function start() {
    Catalog.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window, document);
''')
