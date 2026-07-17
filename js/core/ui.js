/**
 * Maya's Secret Business OS v5.0
 * ui.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const U = window.BusinessUtils || window.MayaUtils || {};
  const CFG =
    (window.BusinessConfig &&
      typeof window.BusinessConfig.get === "function" &&
      window.BusinessConfig.get()) ||
    {};

  const UI = {};

  let toastEl = null;
  let overlay = null;
  let loader = null;
  let initialized = false;

  function $(selector, root) {
    root = root || document;

    if (U && typeof U.query === "function") {
      return U.query(selector, root);
    }

    return root.querySelector(selector);
  }

  function $$(selector, root) {
    root = root || document;

    if (U && typeof U.queryAll === "function") {
      return U.queryAll(selector, root);
    }

    return Array.from(root.querySelectorAll(selector));
  }

  function getMobileBreakpoint() {
    return Number(
      CFG &&
      CFG.ui &&
      CFG.ui.mobileBreakpoint
        ? CFG.ui.mobileBreakpoint
        : 900
    );
  }

  function safeText(element, value) {
    if (!element) return false;
    element.textContent = value == null ? "" : String(value);
    return true;
  }

  function safeToggle(element, className, active) {
    if (!element || !element.classList) return;
    element.classList.toggle(className, Boolean(active));
  }

  UI.init = function () {
    if (initialized) return UI;

    initialized = true;

    createOverlay();
    createToast();
    createLoader();

    setupSidebar();
    setupViews();
    setupPasswordToggle();
    bindGlobal();

    document.dispatchEvent(
      new CustomEvent("business-ui:ready", {
        detail: {
          initialized: true
        }
      })
    );

    return UI;
  };

  function bindGlobal() {
    window.addEventListener("resize", closeSidebarDesktop);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        UI.closeSidebar();
        closeOpenModals();
      }
    });
  }

  function closeSidebarDesktop() {
    if (window.innerWidth > getMobileBreakpoint()) {
      UI.closeSidebar();
    }
  }

  function setupSidebar() {
    const sidebar = $(".admin-sidebar");
    const openBtn = $(".admin-mobile-menu");
    const closeBtn = $(".admin-sidebar-toggle");

    if (openBtn) {
      openBtn.addEventListener("click", function () {
        if (sidebar) {
          sidebar.classList.add("open");
        }

        document.body.classList.add("admin-sidebar-open");

        if (overlay) {
          overlay.hidden = false;
          overlay.classList.add("is-active");
        }

        openBtn.setAttribute("aria-expanded", "true");
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", UI.closeSidebar);
    }

    if (overlay) {
      overlay.addEventListener("click", UI.closeSidebar);
    }

    $$(".admin-nav button, [data-admin-view-link]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const view =
          btn.dataset.adminView ||
          btn.dataset.adminViewLink ||
          btn.dataset.adminSection;

        if (view) {
          UI.showView(view);
        }

        if (window.innerWidth <= getMobileBreakpoint()) {
          UI.closeSidebar();
        }
      });
    });
  }

  UI.closeSidebar = function () {
    const sidebar = $(".admin-sidebar");
    const openBtn = $(".admin-mobile-menu");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    if (openBtn) {
      openBtn.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("admin-sidebar-open");

    if (overlay) {
      overlay.hidden = true;
      overlay.classList.remove("is-active");
    }
  };

  function setupViews() {
    const first = $(".admin-view.active") || $(".admin-view");

    if (!first) return;

    const viewName =
      first.dataset.adminSection ||
      first.id ||
      first.dataset.adminView ||
      first.dataset.view ||
      "dashboard";

    UI.showView(viewName);
  }

  UI.showView = function (name) {
    if (!name) return false;

    const escapedName =
      window.CSS && typeof window.CSS.escape === "function"
        ? window.CSS.escape(String(name))
        : String(name).replace(/["\\]/g, "\\$&");

    const target =
      document.getElementById(name) ||
      $('.admin-view[data-admin-section="' + escapedName + '"]') ||
      $('.admin-view[data-admin-view="' + escapedName + '"]') ||
      $('.admin-view[data-view="' + escapedName + '"]');

    if (!target) {
      console.warn('[BusinessUI] View not found: "' + name + '"');
      return false;
    }

    $$(".admin-view").forEach(function (view) {
      const active = view === target;
      view.classList.toggle("active", active);
      view.hidden = !active;
      view.setAttribute("aria-hidden", String(!active));
    });

    $$(".admin-nav button, [data-admin-view-link]").forEach(function (button) {
      const active =
        button.dataset.adminView === name ||
        button.dataset.adminViewLink === name ||
        button.dataset.adminSection === name;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    document.dispatchEvent(
      new CustomEvent("admin:viewChanged", {
        detail: {
          view: name,
          element: target
        }
      })
    );

    return true;
  };

  function setupPasswordToggle() {
    const buttons = $$(
      "[data-password-toggle], #togglePassword"
    );

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const field = button.closest(".password-field");
        const input = field ? field.querySelector("input") : null;

        if (!input) return;

        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";

        button.textContent = showPassword ? "Hide" : "Show";
        button.setAttribute(
          "aria-label",
          showPassword ? "Hide password" : "Show password"
        );
        button.setAttribute("aria-pressed", String(showPassword));
      });
    });
  }

  function createToast() {
    toastEl = $(".admin-toast");

    if (toastEl) return toastEl;

    toastEl = document.createElement("div");
    toastEl.className = "admin-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastEl);

    return toastEl;
  }

  UI.toast = function (message, type, duration) {
    createToast();

    type = type || "info";
    duration = Number(
      duration ||
      (CFG && CFG.ui && CFG.ui.toastDuration) ||
      3500
    );

    safeText(toastEl, message);
    toastEl.dataset.type = type;
    toastEl.classList.add("show");

    window.clearTimeout(UI._toastTimer);

    UI._toastTimer = window.setTimeout(function () {
      if (toastEl) {
        toastEl.classList.remove("show");
      }
    }, duration);
  };

  function createLoader() {
    loader = $(".global-loader");

    if (!loader) {
      loader = document.createElement("div");
      loader.className = "global-loader";
      loader.hidden = true;
      loader.setAttribute("role", "status");
      loader.setAttribute("aria-live", "polite");
      loader.setAttribute("aria-busy", "false");
      loader.innerHTML =
        '<div class="spinner" aria-hidden="true"></div>' +
        '<strong class="global-loader-text">Loading...</strong>';

      document.body.appendChild(loader);
    }

    let textElement = loader.querySelector(
      ".global-loader-text, [data-loader-message], [data-loader-text], strong, p, span"
    );

    if (!textElement) {
      textElement = document.createElement("strong");
      textElement.className = "global-loader-text";
      textElement.textContent = "Loading...";
      loader.appendChild(textElement);
    }

    return loader;
  }

  UI.loading = function (show, text) {
    if (show === undefined) show = true;
    if (text === undefined) text = "Loading...";

    createLoader();

    if (!loader) {
      console.warn("[BusinessUI] Loader could not be created.");
      return false;
    }

    const textElement = loader.querySelector(
      ".global-loader-text, [data-loader-message], [data-loader-text], strong, p, span"
    );

    if (textElement && text) {
      safeText(textElement, text);
    }

    loader.hidden = !show;
    loader.setAttribute("aria-busy", String(Boolean(show)));
    safeToggle(loader, "is-active", show);

    return true;
  };

  UI.showLoading = function (text) {
    return UI.loading(true, text || "Loading...");
  };

  UI.hideLoading = function () {
    return UI.loading(false);
  };

  function createOverlay() {
    overlay = $(".admin-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "admin-overlay";
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }

    return overlay;
  }

  UI.confirm = function (message) {
    return Promise.resolve(window.confirm(String(message || "")));
  };

  UI.alert = function (message) {
    window.alert(String(message || ""));
  };

  UI.updateCloudStatus = function (state, label) {
    const normalizedState = state || "unknown";

    $$(".cloud-status, .cloud-indicator").forEach(function (element) {
      element.dataset.state = normalizedState;
      element.setAttribute(
        "aria-label",
        label || "Cloud status: " + normalizedState
      );

      const textElement =
        element.querySelector("[data-cloud-status-text]") ||
        element.querySelector(".cloud-indicator-label") ||
        element.querySelector("strong") ||
        element.querySelector("small") ||
        element.querySelector("span:last-child");

      if (textElement && label !== undefined) {
        safeText(textElement, label);
      }
    });
  };

  UI.setTitle = function (title, subtitle) {
    const heading =
      $("[data-admin-page-title]") ||
      $(".admin-topbar-main h1");

    const subtitleElement =
      $("[data-admin-page-subtitle]") ||
      $(".admin-subtitle");

    if (title !== undefined) {
      safeText(heading, title);
    }

    if (subtitle !== undefined) {
      safeText(subtitleElement, subtitle);
    }
  };

  UI.modal = {
    open: function (id) {
      const modal = document.getElementById(id);

      if (!modal) {
        console.warn('[BusinessUI] Modal not found: "' + id + '"');
        return false;
      }

      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");

      const focusTarget = modal.querySelector(
        "[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );

      if (focusTarget && typeof focusTarget.focus === "function") {
        window.setTimeout(function () {
          focusTarget.focus();
        }, 0);
      }

      return true;
    },

    close: function (id) {
      const modal = document.getElementById(id);

      if (!modal) return false;

      modal.hidden = true;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");

      return true;
    }
  };

  function closeOpenModals() {
    $$(".modal.open, [role='dialog'].open").forEach(function (modal) {
      modal.hidden = true;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  document.addEventListener("click", function (event) {
    const target =
      event.target && event.target.closest
        ? event.target.closest("[data-close-modal]")
        : null;

    if (!target) return;

    const modal = target.closest(".modal, [role='dialog']");

    if (!modal) return;

    modal.hidden = true;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });

  window.BusinessUI = UI;
  window.MayaUI = UI;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", UI.init, { once: true });
  } else {
    UI.init();
  }
})(window, document);
