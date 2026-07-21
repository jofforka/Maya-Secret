/**
 * Maya's Secret Business OS v7.0
 * api.js
 * Complete replacement file
 */

(function (window) {
  "use strict";

  const Utils = window.BusinessUtils || window.MayaUtils || null;
  const ConfigSource = window.BusinessConfig || {};
  const Config =
    typeof ConfigSource.get === "function"
      ? ConfigSource.get() || {}
      : ConfigSource;

  const API = {};

  const defaults = {
    timeout:
      (Config.api && Number(Config.api.timeout)) ||
      30000,
    retries:
      (Config.api && Number(Config.api.retries)) ||
      3
  };

  function getEndpoint() {
    if (
      window.BusinessConfig &&
      typeof window.BusinessConfig.getAppsScriptUrl === "function"
    ) {
      const configuredUrl =
        window.BusinessConfig.getAppsScriptUrl();

      if (configuredUrl) {
        return String(configuredUrl).trim();
      }
    }

    if (
      Config.api &&
      Config.api.appsScriptUrl
    ) {
      return String(Config.api.appsScriptUrl).trim();
    }

    if (Config.appsScriptUrl) {
      return String(Config.appsScriptUrl).trim();
    }

    return "";
  }

  function wait(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  async function request(action, payload, method) {
    const endpoint = getEndpoint();
    const requestPayload = payload || {};
    const requestMethod = method || "POST";

    if (!endpoint) {
      throw new Error(
        "Google Apps Script URL has not been configured."
      );
    }

    const controller = new AbortController();
    const timer = window.setTimeout(function () {
      controller.abort();
    }, defaults.timeout);

    try {
      let requestUrl = endpoint;
      const options = {
        method: requestMethod,
        signal: controller.signal
      };

      if (requestMethod === "GET") {
        const params = new URLSearchParams();

        params.set("action", action);

        Object.keys(requestPayload).forEach(function (key) {
          const value = requestPayload[key];

          if (value !== undefined && value !== null) {
            params.set(
              key,
              typeof value === "object"
                ? JSON.stringify(value)
                : String(value)
            );
          }
        });

        requestUrl +=
          (requestUrl.indexOf("?") === -1 ? "?" : "&") +
          params.toString();
      } else {
        options.headers = {
          "Content-Type": "application/json"
        };

        options.body = JSON.stringify(
          Object.assign(
            {
              action: action
            },
            requestPayload
          )
        );
      }

      const response = await window.fetch(
        requestUrl,
        options
      );

      if (!response.ok) {
        throw new Error(
          "Cloud request failed with status " +
            response.status +
            "."
        );
      }

      const text = await response.text();
      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          throw new Error(
            "Cloud returned an invalid JSON response."
          );
        }
      }

      if (data && data.success === false) {
        throw new Error(
          data.message ||
            data.error ||
            "Operation failed."
        );
      }

      return data;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(
          "Cloud request timed out. Please try again."
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function retry(action, payload, method) {
    let lastError = null;
    const attempts = Math.max(1, defaults.retries);

    for (let index = 0; index < attempts; index += 1) {
      try {
        return await request(
          action,
          payload || {},
          method || "POST"
        );
      } catch (error) {
        lastError = error;

        if (index < attempts - 1) {
          await wait((index + 1) * 500);
        }
      }
    }

    throw lastError;
  }

  /* ---------- Health ---------- */

  API.health = function () {
    return retry("health");
  };

  API.ping = function () {
    return retry("ping");
  };

  /* ---------- Products ---------- */

  API.getProducts = function () {
    return retry("getProducts");
  };

  API.saveProduct = function (product) {
    return retry("saveProduct", {
      product: product
    });
  };

  API.updateProduct = function (product) {
    return retry("updateProduct", {
      product: product
    });
  };

  API.deleteProduct = function (id) {
    return retry("deleteProduct", {
      id: id
    });
  };

  /* ---------- Orders ---------- */

  API.getOrders = function () {
    return retry("getOrders");
  };

  API.saveOrder = function (order) {
    return retry("saveOrder", {
      order: order
    });
  };

  API.updateOrder = function (order) {
    return retry("updateOrder", {
      order: order
    });
  };

  API.updateOrderStatus = function (id, status) {
    return retry("updateOrderStatus", {
      id: id,
      status: status
    });
  };

  /* ---------- Spa ---------- */

  API.getBookings = function () {
    return retry("getBookings");
  };

  API.saveBooking = function (booking) {
    return retry("saveBooking", {
      booking: booking
    });
  };

  API.updateBooking = function (booking) {
    return retry("updateBooking", {
      booking: booking
    });
  };

  API.deleteBooking = function (id) {
    return retry("deleteBooking", {
      id: id
    });
  };

  /* ---------- Customers ---------- */

  API.getCustomers = function () {
    return retry("getCustomers");
  };

  API.saveCustomer = function (customer) {
    return retry("saveCustomer", {
      customer: customer
    });
  };

  /* ---------- Reports ---------- */

  API.getDashboard = function () {
    return retry("dashboard");
  };

  API.getSalesReport = function (filters) {
    return retry("salesReport", filters || {});
  };

  API.getCommissionReport = function (filters) {
    return retry("commissionReport", filters || {});
  };

  /* ---------- Settings ---------- */

  API.getSettings = function () {
    return retry("getSettings");
  };

  API.saveSettings = function (settings) {
    return retry("saveSettings", {
      settings: settings
    });
  };

  /* ---------- Logs ---------- */

  API.getLogs = function () {
    return retry("getLogs");
  };

  API.writeLog = function (entry) {
    return retry("writeLog", {
      entry: entry
    });
  };

  /* ---------- Images ---------- */

  API.uploadImage = async function (file) {
    if (!(file instanceof File)) {
      throw new Error("Invalid image.");
    }

    if (
      Utils &&
      typeof Utils.fileToDataUrl === "function"
    ) {
      const data = await Utils.fileToDataUrl(file);

      return retry("uploadImage", {
        filename: file.name,
        mime: file.type,
        data: data
      });
    }

    throw new Error("File helper unavailable.");
  };

  /* ---------- Backup ---------- */

  API.exportBackup = function () {
    return retry("exportBackup");
  };

  API.importBackup = function (backup) {
    return retry("importBackup", {
      backup: backup
    });
  };

  /* ---------- Sync ---------- */

  API.publishCatalogue = function () {
    return retry("publishCatalogue");
  };

  API.sync = function () {
    return retry("sync");
  };

  /* ---------- Generic ---------- */

  API.call = function (action, data) {
    return retry(action, data || {});
  };

  API.setEndpoint = function (endpoint) {
    if (
      window.BusinessConfig &&
      typeof window.BusinessConfig.setAppsScriptUrl ===
        "function"
    ) {
      window.BusinessConfig.setAppsScriptUrl(endpoint);
      return true;
    }

    return false;
  };

  API.getEndpoint = getEndpoint;
  API.request = request;

  window.BusinessAPI = API;
  window.MayaAPI = API;
})(window);
