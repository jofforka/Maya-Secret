/**
 * Maya's Secret Business OS v7.0
 * config.js
 * Complete replacement file
 */

(function (window) {
  "use strict";

  const CONFIG = {
    app: {
      name: "Maya's Secret Business OS",
      version: "7.0.0",
      environment:
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "development"
          : "production",
      currency: "NGN",
      currencySymbol: "₦",
      timezone: "Africa/Lagos",
      language: "en-NG"
    },

    commission: {
      rate: 0.15,
      calculation: "paid_sales_only"
    },

    storage: {
      products: "maya_products",
      orders: "maya_orders",
      bookings: "maya_spa_bookings",
      customers: "maya_customers",
      settings: "maya_settings",
      logs: "maya_activity_logs",
      session: "maya_admin_session",
      cache: "maya_cloud_cache"
    },

    api: {
      appsScriptUrl:
        "https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec",
      timeout: 30000,
      retries: 3
    },

    cloud: {
      enabled: true,
      autoSync: true,
      syncInterval: 300000
    },

    ui: {
      mobileBreakpoint: 900,
      toastDuration: 3500,
      pageSize: 20,
      theme: "light"
    },

    features: {
      products: true,
      orders: true,
      spa: true,
      reports: true,
      customers: true,
      activityLogs: true,
      cloudSync: true,
      csvExport: true,
      imageUpload: true
    }
  };

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") {
      return target;
    }

    Object.keys(source).forEach(function (key) {
      const value = source[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        if (
          !target[key] ||
          typeof target[key] !== "object" ||
          Array.isArray(target[key])
        ) {
          target[key] = {};
        }

        deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    });

    return target;
  }

  const BusinessConfig = {
    get: function () {
      return CONFIG;
    },

    update: function (values) {
      deepMerge(CONFIG, values || {});
      return CONFIG;
    },

    setAppsScriptUrl: function (url) {
      CONFIG.api.appsScriptUrl =
        String(url || "").trim();

      BusinessConfig.api = CONFIG.api;
      BusinessConfig.appsScriptUrl =
        CONFIG.api.appsScriptUrl;

      return CONFIG.api.appsScriptUrl;
    },

    getAppsScriptUrl: function () {
      return String(
        CONFIG.api.appsScriptUrl || ""
      ).trim();
    },

    currency: function (value) {
      return new Intl.NumberFormat(
        CONFIG.app.language,
        {
          style: "currency",
          currency: CONFIG.app.currency,
          maximumFractionDigits: 0
        }
      ).format(Number(value || 0));
    },

    isDevelopment: function () {
      return (
        CONFIG.app.environment === "development"
      );
    }
  };

  /*
   * Direct property aliases are intentionally exposed because
   * different frontend modules may read either:
   *
   * BusinessConfig.get().api.appsScriptUrl
   * BusinessConfig.api.appsScriptUrl
   * BusinessConfig.appsScriptUrl
   * BusinessConfig.getAppsScriptUrl()
   */
  BusinessConfig.app = CONFIG.app;
  BusinessConfig.api = CONFIG.api;
  BusinessConfig.cloud = CONFIG.cloud;
  BusinessConfig.ui = CONFIG.ui;
  BusinessConfig.features = CONFIG.features;
  BusinessConfig.storage = CONFIG.storage;
  BusinessConfig.commission = CONFIG.commission;
  BusinessConfig.appsScriptUrl =
    CONFIG.api.appsScriptUrl;

  window.BusinessConfig = BusinessConfig;
  window.MayaConfig = BusinessConfig;
  window.MAYA_CONFIG = CONFIG;
})(window);
