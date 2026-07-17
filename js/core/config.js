(function (window) {
  "use strict";

  const CONFIG = {
    app: {
      name: "Maya's Secret Business OS",
      version: "5.0.0",
      environment:
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1"
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
      appsScriptUrl: "https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec",
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
    Object.keys(source).forEach(key => {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  }

  window.BusinessConfig = {
    get() {
      return CONFIG;
    },

    update(values = {}) {
      deepMerge(CONFIG, values);
      return CONFIG;
    },

    setAppsScriptUrl(url) {
      CONFIG.api.appsScriptUrl = String(url || "").trim();
    },

    getAppsScriptUrl() {
      return CONFIG.api.appsScriptUrl;
    },

    currency(value) {
      return new Intl.NumberFormat(CONFIG.app.language, {
        style: "currency",
        currency: CONFIG.app.currency,
        maximumFractionDigits: 0
      }).format(Number(value || 0));
    },

    isDevelopment() {
      return CONFIG.app.environment === "development";
    }
  };

})(window);

