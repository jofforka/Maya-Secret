/**
 * Maya's Secret Business OS v7.0
 * framework.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const Framework = {
    version: "7.0.0",
    initialized: false,
    booting: false,
    modules: {},
    state: {
      ready: false,
      cloud: "idle",
      currentView: null
    }
  };

  function getModule(name, aliases) {
    const names = [name].concat(aliases || []);

    for (let i = 0; i < names.length; i += 1) {
      if (window[names[i]]) return window[names[i]];
    }

    return null;
  }

  function registerModules() {
    Framework.modules.config = getModule("BusinessConfig", ["MayaConfig"]);
    Framework.modules.utils = getModule("BusinessUtils", ["MayaUtils"]);
    Framework.modules.ui = getModule("BusinessUI", ["MayaUI"]);
    Framework.modules.auth = getModule("BusinessAuth", ["MayaAuth"]);
    Framework.modules.api = getModule("BusinessAPI", ["MayaAPI"]);
    Framework.modules.cloud = getModule("BusinessCloud", [
      "MayaCloud",
      "MAYA_CLOUD"
    ]);
  }

  function callModule(moduleName, methodName) {
    const args = Array.prototype.slice.call(arguments, 2);
    const module = Framework.modules[moduleName];

    if (!module || typeof module[methodName] !== "function") {
      return Promise.resolve(null);
    }

    try {
      return Promise.resolve(module[methodName].apply(module, args));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function emit(name, detail) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function logError(error, context) {
    console.error("[BusinessFramework]", context || "Error", error);

    emit("business:framework:error", {
      context: context || "unknown",
      error: error
    });

    const UI = Framework.modules.ui;

    if (UI && typeof UI.toast === "function") {
      UI.toast(
        error && error.message
          ? error.message
          : "An unexpected error occurred.",
        "error"
      );
    }
  }

  Framework.bootstrap = async function () {
    if (Framework.initialized) return Framework;
    if (Framework.booting) return Framework;

    Framework.booting = true;
    registerModules();

    const UI = Framework.modules.ui;

    try {
      if (UI && typeof UI.loading === "function") {
        UI.loading(true, "Starting Business OS...");
      }

      await callModule("ui", "init");
      await callModule("auth", "init");
      await callModule("api", "init");
      await callModule("cloud", "init");

      Framework.initialized = true;
      Framework.state.ready = true;

      emit("business:framework:ready", {
        version: Framework.version,
        modules: Object.keys(Framework.modules)
      });

      return Framework;
    } catch (error) {
      logError(error, "bootstrap");
      throw error;
    } finally {
      Framework.booting = false;

      if (UI && typeof UI.loading === "function") {
        UI.loading(false);
      }
    }
  };

  Framework.init = Framework.bootstrap;

  Framework.refresh = async function () {
    registerModules();

    const UI = Framework.modules.ui;

    try {
      if (UI && typeof UI.loading === "function") {
        UI.loading(true, "Refreshing data...");
      }

      let result = null;

      if (
        Framework.modules.cloud &&
        typeof Framework.modules.cloud.refresh === "function"
      ) {
        result = await Framework.modules.cloud.refresh();
      } else if (
        Framework.modules.api &&
        typeof Framework.modules.api.refresh === "function"
      ) {
        result = await Framework.modules.api.refresh();
      }

      emit("business:framework:refreshed", {
        result: result
      });

      return result;
    } catch (error) {
      logError(error, "refresh");
      throw error;
    } finally {
      if (UI && typeof UI.loading === "function") {
        UI.loading(false);
      }
    }
  };

  Framework.setCloudState = function (state, label) {
    Framework.state.cloud = state || "unknown";

    const UI = Framework.modules.ui || getModule("BusinessUI", ["MayaUI"]);

    if (UI && typeof UI.updateCloudStatus === "function") {
      UI.updateCloudStatus(
        Framework.state.cloud,
        label || Framework.state.cloud
      );
    }

    emit("business:cloud:state", {
      state: Framework.state.cloud,
      label: label || ""
    });
  };

  Framework.showView = function (viewName) {
    Framework.state.currentView = viewName;

    const UI = Framework.modules.ui || getModule("BusinessUI", ["MayaUI"]);

    if (UI && typeof UI.showView === "function") {
      return UI.showView(viewName);
    }

    return false;
  };

  Framework.getModule = function (name) {
    registerModules();
    return Framework.modules[name] || null;
  };

  Framework.health = function () {
    registerModules();

    const status = {};

    Object.keys(Framework.modules).forEach(function (key) {
      status[key] = Boolean(Framework.modules[key]);
    });

    return {
      version: Framework.version,
      initialized: Framework.initialized,
      ready: Framework.state.ready,
      cloud: Framework.state.cloud,
      modules: status
    };
  };

  document.addEventListener("admin:viewChanged", function (event) {
    Framework.state.currentView =
      event && event.detail ? event.detail.view : null;
  });

  window.BusinessFramework = Framework;
  window.MayaFramework = Framework;

  function start() {
    Framework.bootstrap().catch(function () {
      // Error already handled inside bootstrap.
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window, document);
