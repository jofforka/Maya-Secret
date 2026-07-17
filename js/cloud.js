/**
 * Maya's Secret Business OS v5.0
 * cloud.js
 * Complete replacement file
 */

(function (window, document) {
  "use strict";

  const Cloud = {
    version: "5.0.0",
    initialized: false,
    connected: false,
    endpoint: "",
    state: "idle"
  };

  function getConfig() {
    const configModule = window.BusinessConfig || window.MayaConfig;

    if (configModule && typeof configModule.get === "function") {
      return configModule.get() || {};
    }

    return {};
  }

  function getUI() {
    return window.BusinessUI || window.MayaUI || null;
  }

  function getAPI() {
    return window.BusinessAPI || window.MayaAPI || null;
  }

  function emit(name, detail) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function setState(state, label) {
    Cloud.state = state;
    Cloud.connected = state === "connected";

    const UI = getUI();

    if (UI && typeof UI.updateCloudStatus === "function") {
      UI.updateCloudStatus(state, label || state);
    }

    const Framework = window.BusinessFramework || window.MayaFramework;

    if (
      Framework &&
      typeof Framework.setCloudState === "function"
    ) {
      Framework.setCloudState(state, label || state);
    }

    emit("business:cloud:state", {
      state: state,
      label: label || ""
    });
  }

  function normalizeEndpoint(value) {
    return String(value || "").trim();
  }

  function getEndpointFromConfig() {

  const configModule = window.BusinessConfig || window.MayaConfig;

  /* Preferred source */
  if (configModule) {

    if (typeof configModule.getAppsScriptUrl === "function") {
      const url = normalizeEndpoint(
        configModule.getAppsScriptUrl()
      );

      if (url) {
        return url;
      }
    }

    if (
      configModule.api &&
      configModule.api.appsScriptUrl
    ) {
      return normalizeEndpoint(
        configModule.api.appsScriptUrl
      );
    }

    if (configModule.appsScriptUrl) {
      return normalizeEndpoint(
        configModule.appsScriptUrl
      );
    }
  }

  /* Fallback */
  const config = getConfig();

  return normalizeEndpoint(

    (config.api &&
      config.api.appsScriptUrl) ||

    config.appsScriptUrl ||

    config.cloudUrl ||

    config.apiUrl ||

    config.endpoint ||

    (config.cloud &&
      (
        config.cloud.url ||
        config.cloud.endpoint ||
        config.cloud.apiUrl
      )) ||

    ""
  );
}
  function buildUrl(action, params) {
    if (!Cloud.endpoint) {
      throw new Error("Cloud endpoint is not configured.");
    }

    const query = new URLSearchParams();
    query.set("action", action);

    Object.keys(params || {}).forEach(function (key) {
      const value = params[key];

      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });

    return Cloud.endpoint +
      (Cloud.endpoint.indexOf("?") >= 0 ? "&" : "?") +
      query.toString();
  }

  async function parseResponse(response) {
    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error(
        "Cloud returned an invalid JSON response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Cloud request failed with status " + response.status + "."
      );
    }

    if (data && data.success === false) {
      throw new Error(
        data.error ||
        data.message ||
        "Cloud request was not successful."
      );
    }

    return data;
  }

  async function request(action, options) {
    options = options || {};

    const method = String(options.method || "GET").toUpperCase();
    const params = options.params || {};
    const payload = options.payload || {};

    if (!action) {
      throw new Error("Cloud action is required.");
    }

    let response;

    if (method === "GET") {
      response = await fetch(buildUrl(action, params), {
        method: "GET",
        cache: "no-store",
        redirect: "follow"
      });
    } else {
      response = await fetch(Cloud.endpoint, {
        method: method,
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(
          Object.assign(
            {
              action: action
            },
            payload
          )
        ),
        redirect: "follow"
      });
    }

    return parseResponse(response);
  }

  Cloud.request = request;

  Cloud.init = async function () {
    if (Cloud.initialized) return Cloud;

    Cloud.endpoint = getEndpointFromConfig();

    if (!Cloud.endpoint) {
      setState("offline", "Cloud not configured");
      Cloud.initialized = true;

      emit("business:cloud:ready", {
        connected: false,
        configured: false
      });

      return Cloud;
    }

    setState("connecting", "Connecting to cloud...");

    try {
      const health = await Cloud.health();

      setState("connected", "Cloud connected");
      Cloud.initialized = true;

      emit("business:cloud:ready", {
        connected: true,
        configured: true,
        health: health
      });

      return Cloud;
    } catch (error) {
      setState("error", "Cloud connection failed");
      Cloud.initialized = true;

      emit("business:cloud:error", {
        error: error
      });

      const UI = getUI();

      if (UI && typeof UI.toast === "function") {
        UI.toast(error.message, "error");
      }

      return Cloud;
    }
  };

  Cloud.health = function () {
    return request("health", {
      method: "GET"
    });
  };

  Cloud.versionInfo = function () {
    return request("version", {
      method: "GET"
    });
  };

  Cloud.refresh = async function () {
    setState("connecting", "Refreshing cloud data...");

    try {
      const result = await Cloud.health();
      setState("connected", "Cloud connected");

      emit("business:cloud:refreshed", {
        result: result
      });

      return result;
    } catch (error) {
      setState("error", "Cloud refresh failed");
      throw error;
    }
  };

  Cloud.getProducts = function () {
    return request("getProducts", {
      method: "GET"
    });
  };

  Cloud.saveProduct = function (product) {
    return request("saveProduct", {
      method: "POST",
      payload: {
        product: product
      }
    });
  };

  Cloud.deleteProduct = function (productId) {
    return request("deleteProduct", {
      method: "POST",
      payload: {
        productId: productId
      }
    });
  };

  Cloud.getOrders = function () {
    return request("getOrders", {
      method: "GET"
    });
  };

  Cloud.saveOrder = function (order) {
    return request("saveOrder", {
      method: "POST",
      payload: {
        order: order
      }
    });
  };

  Cloud.updateOrder = function (order) {
    return request("updateOrder", {
      method: "POST",
      payload: {
        order: order
      }
    });
  };

  Cloud.getBookings = function () {
    return request("getBookings", {
      method: "GET"
    });
  };

  Cloud.saveBooking = function (booking) {
    return request("saveBooking", {
      method: "POST",
      payload: {
        booking: booking
      }
    });
  };

  Cloud.updateBooking = function (booking) {
    return request("updateBooking", {
      method: "POST",
      payload: {
        booking: booking
      }
    });
  };

  Cloud.getCustomers = function () {
    return request("getCustomers", {
      method: "GET"
    });
  };

  Cloud.getSettings = function () {
    return request("getSettings", {
      method: "GET"
    });
  };

  Cloud.saveSettings = function (settings) {
    return request("saveSettings", {
      method: "POST",
      payload: {
        settings: settings
      }
    });
  };

  Cloud.getDashboard = function () {
    return request("getDashboard", {
      method: "GET"
    });
  };

  Cloud.getReports = function (filters) {
    return request("getReports", {
      method: "POST",
      payload: {
        filters: filters || {}
      }
    });
  };

  Cloud.getLogs = function () {
    return request("getLogs", {
      method: "GET"
    });
  };

  Cloud.createBackup = function () {
    return request("createBackup", {
      method: "POST"
    });
  };

  Cloud.restoreBackup = function (backupId) {
    return request("restoreBackup", {
      method: "POST",
      payload: {
        backupId: backupId
      }
    });
  };

  Cloud.uploadImage = function (payload) {
    return request("uploadImage", {
      method: "POST",
      payload: payload || {}
    });
  };

  Cloud.publish = async function () {
    const result = await Cloud.refresh();

    emit("business:cloud:published", {
      result: result
    });

    return result;
  };

  window.BusinessCloud = Cloud;
  window.MayaCloud = Cloud;
  window.MAYA_CLOUD = Cloud;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        Cloud.init();
      },
      { once: true }
    );
  } else {
    Cloud.init();
  }
})(window, document);
