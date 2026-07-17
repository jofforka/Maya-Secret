/**
 * Maya's Secret Business OS v5.0
 * catalog.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const Catalog = {
    version: "5.0.1",
    initialized: false,
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
    if (!product) return "";

    if (product.image) return product.image;
    if (product.imageUrl) return product.imageUrl;

    if (Array.isArray(product.images) && product.images.length) {
      const first = product.images[0];

      if (typeof first === "string") return first;
      if (first && first.url) return first.url;
      if (first && first.imageUrl) return first.imageUrl;
    }

    return "";
  }

  function getProductPrice(product) {
    if (!product) return 0;

    if (product.price !== undefined) return toNumber(product.price);
    if (product.salePrice !== undefined) return toNumber(product.salePrice);
    if (product.amount !== undefined) return toNumber(product.amount);

    return 0;
  }

  function isProductVisible(product) {
    const status = normalize(product && product.status);

    if (!status) return true;

    return (
      status === "active" ||
      status === "published" ||
      status === "available"
    );
  }

  function extractProducts(response) {
    if (Array.isArray(response)) return response;

    if (response && Array.isArray(response.products)) {
      return response.products;
    }

    if (response && response.data && Array.isArray(response.data.products)) {
      return response.data.products;
    }

    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

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
        error && error.message
          ? error.message
          : "Unable to load products.",
        "error"
      );
    }

    emit("catalog:error", {
      error: error
    });
  }

  function buildProductCard(product) {
    const card = createElement("article", "product-card");
    card.dataset.productId = product.id || "";

    const media = createElement("button", "product-card-media");
    media.type = "button";
    media.setAttribute(
      "aria-label",
      "View " + (product.name || "product")
    );

    const imageUrl = getProductImage(product);

    if (imageUrl) {
      const image = createElement("img", "product-card-image");
      image.src = imageUrl;
      image.alt = product.name || "Product";
      image.loading = "lazy";
      image.decoding = "async";
      media.appendChild(image);
    } else {
      const placeholder = createElement(
        "div",
        "product-card-placeholder",
        "No image"
      );
      media.appendChild(placeholder);
    }

    if (product.featured === true) {
      const badge = createElement(
        "span",
        "product-card-badge",
        "Featured"
      );
      media.appendChild(badge);
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

    const price = createElement(
      "p",
      "product-card-price",
      formatMoney(getProductPrice(product))
    );

    const actions = createElement("div", "product-card-actions");

    const viewButton = createElement(
      "button",
      "product-card-view",
      "View"
    );
    viewButton.type = "button";
    viewButton.dataset.catalogAction = "view";
    viewButton.dataset.productId = product.id || "";

    const cartButton = createElement(
      "button",
      "product-card-cart",
      "Add to cart"
    );
    cartButton.type = "button";
    cartButton.dataset.catalogAction = "add-to-cart";
    cartButton.dataset.productId = product.id || "";

    actions.appendChild(viewButton);
    actions.appendChild(cartButton);

    body.appendChild(title);

    if (product.category) {
      body.appendChild(category);
    }

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

    if (!grid) {
      return false;
    }

    grid.innerHTML = "";

    const empty = getEmptyState();
    const items = Array.isArray(products) ? products : [];

    if (!items.length) {
      if (empty) {
        empty.hidden = false;
      }

      grid.hidden = false;
      return true;
    }

    if (empty) {
      empty.hidden = true;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(function (product) {
      fragment.appendChild(buildProductCard(product));
    });

    grid.appendChild(fragment);
    grid.hidden = false;

    emit("catalog:rendered", {
      count: items.length
    });

    return true;
  }

  function extractCategories(products) {
    const categories = [];

    (products || []).forEach(function (product) {
      const category = String(product.category || "").trim();

      if (
        category &&
        categories.indexOf(category) === -1
      ) {
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

    select.value =
      Array.from(select.options).some(function (option) {
        return option.value === currentValue;
      })
        ? currentValue
        : "all";
  }

  function applyFilters() {
    const search = normalize(Catalog.state.search);
    const category = Catalog.state.category || "all";
    const sort = Catalog.state.sort || "featured";

    let products = Catalog.products.filter(function (product) {
      const matchesSearch =
        !search ||
        normalize(product.name).includes(search) ||
        normalize(product.category).includes(search) ||
        normalize(product.description).includes(search);

      const matchesCategory =
        category === "all" ||
        normalize(product.category) === normalize(category);

      return matchesSearch && matchesCategory;
    });

    products.sort(function (a, b) {
      if (sort === "price-low") {
        return getProductPrice(a) - getProductPrice(b);
      }

      if (sort === "price-high") {
        return getProductPrice(b) - getProductPrice(a);
      }

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
    document.addEventListener("click", function (event) {
      const button =
        event.target && event.target.closest
          ? event.target.closest("[data-catalog-action]")
          : null;

      if (!button) return;

      const productId = button.dataset.productId;
      const action = button.dataset.catalogAction;

      if (action === "view") {
        Catalog.openProduct(productId);
      }

      if (action === "add-to-cart") {
        Catalog.addToCart(productId);
      }
    });
  }

  Catalog.load = async function () {
    if (!getCatalogGrid()) {
      return [];
    }

    const Cloud = getCloud();

    if (!Cloud || typeof Cloud.getProducts !== "function") {
      throw new Error("Cloud product service is unavailable.");
    }

    if (typeof Cloud.init === "function") {
      await Cloud.init();
    }

    setLoading(true);

    try {
      const response = await Cloud.getProducts();

      Catalog.products = extractProducts(response)
        .filter(isProductVisible);

      Catalog.categories = extractCategories(Catalog.products);

      renderCategoryOptions();
      applyFilters();

      emit("catalog:loaded", {
        count: Catalog.products.length,
        products: Catalog.products
      });

      return Catalog.products;
    } catch (error) {
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

    emit("catalog:productSelected", {
      product: product
    });

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
      product.url ||
      product.detailUrl ||
      product.productUrl;

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
      emit("catalog:addToCart", {
        product: product
      });
    }

    const UI = getUI();

    if (UI && typeof UI.toast === "function") {
      UI.toast(
        (product.name || "Product") + " added to cart.",
        "success"
      );
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
    if (!getCatalogGrid()) {
      return Catalog;
    }

    if (Catalog.initialized) {
      return Catalog;
    }

    Catalog.initialized = true;

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
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})(window, document);
