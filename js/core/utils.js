(function (window, document) {
  "use strict";

  const rootConfig =
    window.BusinessConfig && typeof window.BusinessConfig.get === "function"
      ? window.BusinessConfig.get()
      : {};

  const DEFAULT_LOCALE = rootConfig?.app?.language || "en-NG";
  const DEFAULT_CURRENCY = rootConfig?.app?.currency || "NGN";
  const DEFAULT_TIMEZONE = rootConfig?.app?.timezone || "Africa/Lagos";

  const HTML_ENTITIES = Object.freeze({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  });

  function isNil(value) {
    return value === null || value === undefined;
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function isPlainObject(value) {
    if (!isObject(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (isNil(value)) return [];
    return [value];
  }

  function safeString(value, fallback = "") {
    if (isNil(value)) return fallback;
    return String(value).trim();
  }

  function toNumber(value, fallback = 0) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }

    const parsed = Number(
      String(value ?? "")
        .replace(/[₦$£€,%\s]/g, "")
        .replace(/,/g, "")
    );

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    const normalized = safeString(value).toLowerCase();

    if (["true", "yes", "1", "on", "enabled"].includes(normalized)) {
      return true;
    }

    if (["false", "no", "0", "off", "disabled"].includes(normalized)) {
      return false;
    }

    return fallback;
  }

  function clamp(value, min, max) {
    const number = toNumber(value, min);
    return Math.min(Math.max(number, min), max);
  }

  function round(value, decimalPlaces = 0) {
    const factor = 10 ** Math.max(0, decimalPlaces);
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
  }

  function sum(values, selector) {
    return toArray(values).reduce((total, item, index) => {
      const value =
        typeof selector === "function" ? selector(item, index) : item;
      return total + toNumber(value);
    }, 0);
  }

  function average(values, selector) {
    const list = toArray(values);
    return list.length ? sum(list, selector) / list.length : 0;
  }

  function percentage(part, total, decimalPlaces = 1) {
    const denominator = toNumber(total);
    if (!denominator) return 0;
    return round((toNumber(part) / denominator) * 100, decimalPlaces);
  }

  function unique(values, selector) {
    const output = [];
    const seen = new Set();

    toArray(values).forEach((item, index) => {
      const key =
        typeof selector === "function" ? selector(item, index) : item;

      if (!seen.has(key)) {
        seen.add(key);
        output.push(item);
      }
    });

    return output;
  }

  function groupBy(values, selector) {
    return toArray(values).reduce((groups, item, index) => {
      const key =
        typeof selector === "function"
          ? selector(item, index)
          : item?.[selector];

      const groupKey = safeString(key, "Uncategorised");
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    }, {});
  }

  function sortBy(values, selector, direction = "asc") {
    const multiplier = String(direction).toLowerCase() === "desc" ? -1 : 1;

    return [...toArray(values)].sort((a, b) => {
      const aValue =
        typeof selector === "function" ? selector(a) : a?.[selector];
      const bValue =
        typeof selector === "function" ? selector(b) : b?.[selector];

      if (aValue === bValue) return 0;
      if (isNil(aValue)) return 1;
      if (isNil(bValue)) return -1;

      return (
        String(aValue).localeCompare(String(bValue), DEFAULT_LOCALE, {
          numeric: true,
          sensitivity: "base"
        }) * multiplier
      );
    });
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {
        // Continue to JSON fallback.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function deepMerge(target, ...sources) {
    const output = isPlainObject(target) ? target : {};

    sources.forEach(source => {
      if (!isPlainObject(source)) return;

      Object.keys(source).forEach(key => {
        const sourceValue = source[key];

        if (isPlainObject(sourceValue)) {
          output[key] = deepMerge(
            isPlainObject(output[key]) ? output[key] : {},
            sourceValue
          );
        } else if (Array.isArray(sourceValue)) {
          output[key] = deepClone(sourceValue);
        } else {
          output[key] = sourceValue;
        }
      });
    });

    return output;
  }

  function pick(object, keys) {
    const output = {};
    toArray(keys).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(object || {}, key)) {
        output[key] = object[key];
      }
    });
    return output;
  }

  function omit(object, keys) {
    const blocked = new Set(toArray(keys));
    return Object.fromEntries(
      Object.entries(object || {}).filter(([key]) => !blocked.has(key))
    );
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      return HTML_ENTITIES[character];
    });
  }

  function stripHtml(value) {
    const element = document.createElement("div");
    element.innerHTML = String(value ?? "");
    return element.textContent || element.innerText || "";
  }

  function slugify(value, fallback = "item") {
    const slug = safeString(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || `${fallback}-${Date.now()}`;
  }

  function titleCase(value) {
    return safeString(value)
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function sentenceCase(value) {
    const text = safeString(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function truncate(value, maximumLength = 100, suffix = "…") {
    const text = safeString(value);
    if (text.length <= maximumLength) return text;
    return text.slice(0, Math.max(0, maximumLength - suffix.length)).trimEnd() + suffix;
  }

  function normalizePhone(value) {
    const raw = safeString(value);
    if (!raw) return "";

    let digits = raw.replace(/\D/g, "");

    if (digits.startsWith("2340")) {
      digits = `234${digits.slice(4)}`;
    } else if (digits.startsWith("0")) {
      digits = `234${digits.slice(1)}`;
    }

    return digits ? `+${digits}` : "";
  }

  function whatsappPhone(value) {
    return normalizePhone(value).replace(/\D/g, "");
  }

  function normalizeEmail(value) {
    return safeString(value).toLowerCase();
  }

  function isValidEmail(value) {
    const email = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function isValidPhone(value) {
    const digits = safeString(value).replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }

  function createId(prefix = "MS") {
    const cleanPrefix = safeString(prefix, "MS")
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase();

    if (window.crypto?.randomUUID) {
      return `${cleanPrefix}-${window.crypto.randomUUID()
        .split("-")[0]
        .toUpperCase()}`;
    }

    return `${cleanPrefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  function formatCurrency(
    value,
    {
      locale = DEFAULT_LOCALE,
      currency = DEFAULT_CURRENCY,
      maximumFractionDigits = 0
    } = {}
  ) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits
      }).format(toNumber(value));
    } catch (_) {
      return `₦${toNumber(value).toLocaleString(locale)}`;
    }
  }

  function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(
      toNumber(value)
    );
  }

  function parseDate(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (isNil(value) || value === "") return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(
    value,
    {
      locale = DEFAULT_LOCALE,
      timezone = DEFAULT_TIMEZONE,
      dateStyle = "medium",
      fallback = "—"
    } = {}
  ) {
    const date = parseDate(value);
    if (!date) return fallback;

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeZone: timezone
      }).format(date);
    } catch (_) {
      return date.toLocaleDateString(locale);
    }
  }

  function formatDateTime(
    value,
    {
      locale = DEFAULT_LOCALE,
      timezone = DEFAULT_TIMEZONE,
      dateStyle = "medium",
      timeStyle = "short",
      fallback = "—"
    } = {}
  ) {
    const date = parseDate(value);
    if (!date) return fallback;

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeStyle,
        timeZone: timezone
      }).format(date);
    } catch (_) {
      return date.toLocaleString(locale);
    }
  }

  function toISODate(value = new Date()) {
    const date = parseDate(value);
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function startOfDay(value = new Date()) {
    const date = parseDate(value) || new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function endOfDay(value = new Date()) {
    const date = parseDate(value) || new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }

  function isDateWithin(value, start, end) {
    const date = parseDate(value);
    const startDate = start ? startOfDay(start) : null;
    const endDate = end ? endOfDay(end) : null;

    if (!date) return false;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  }

  function relativeTime(value, base = new Date()) {
    const date = parseDate(value);
    const comparison = parseDate(base);
    if (!date || !comparison) return "—";

    const seconds = Math.round((date.getTime() - comparison.getTime()) / 1000);
    const absoluteSeconds = Math.abs(seconds);

    let amount;
    let unit;

    if (absoluteSeconds < 60) {
      amount = seconds;
      unit = "second";
    } else if (absoluteSeconds < 3600) {
      amount = Math.round(seconds / 60);
      unit = "minute";
    } else if (absoluteSeconds < 86400) {
      amount = Math.round(seconds / 3600);
      unit = "hour";
    } else if (absoluteSeconds < 2592000) {
      amount = Math.round(seconds / 86400);
      unit = "day";
    } else if (absoluteSeconds < 31536000) {
      amount = Math.round(seconds / 2592000);
      unit = "month";
    } else {
      amount = Math.round(seconds / 31536000);
      unit = "year";
    }

    try {
      return new Intl.RelativeTimeFormat(DEFAULT_LOCALE, {
        numeric: "auto"
      }).format(amount, unit);
    } catch (_) {
      return formatDateTime(date);
    }
  }

  function query(selector, root = document) {
    return root?.querySelector?.(selector) || null;
  }

  function queryAll(selector, root = document) {
    return Array.from(root?.querySelectorAll?.(selector) || []);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function createElement(tagName, attributes = {}, children = []) {
    const element = document.createElement(tagName);

    Object.entries(attributes || {}).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "text") {
        element.textContent = value;
      } else if (key === "html") {
        element.innerHTML = value;
      } else if (key === "dataset" && isObject(value)) {
        Object.assign(element.dataset, value);
      } else if (key === "style" && isObject(value)) {
        Object.assign(element.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (!isNil(value) && value !== false) {
        element.setAttribute(key, value === true ? "" : String(value));
      }
    });

    toArray(children).forEach(child => {
      if (isNil(child)) return;
      element.append(
        child instanceof Node ? child : document.createTextNode(String(child))
      );
    });

    return element;
  }

  function setText(target, value, fallback = "") {
    const element = typeof target === "string" ? query(target) : target;
    if (element) element.textContent = isNil(value) ? fallback : String(value);
    return element;
  }

  function setHtml(target, value) {
    const element = typeof target === "string" ? query(target) : target;
    if (element) element.innerHTML = String(value ?? "");
    return element;
  }

  function show(target, display = "") {
    const element = typeof target === "string" ? query(target) : target;
    if (!element) return null;
    element.hidden = false;
    if (display) element.style.display = display;
    return element;
  }

  function hide(target) {
    const element = typeof target === "string" ? query(target) : target;
    if (!element) return null;
    element.hidden = true;
    return element;
  }

  function toggle(target, force) {
    const element = typeof target === "string" ? query(target) : target;
    if (!element) return false;

    const shouldShow =
      typeof force === "boolean" ? force : Boolean(element.hidden);

    element.hidden = !shouldShow;
    return shouldShow;
  }

  function setBusy(target, busy = true, label = "Please wait…") {
    const element = typeof target === "string" ? query(target) : target;
    if (!element) return;

    if (busy) {
      if (!element.dataset.originalLabel) {
        element.dataset.originalLabel = element.innerHTML;
      }
      element.disabled = true;
      element.setAttribute("aria-busy", "true");
      element.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
    } else {
      element.disabled = false;
      element.removeAttribute("aria-busy");

      if (element.dataset.originalLabel) {
        element.innerHTML = element.dataset.originalLabel;
        delete element.dataset.originalLabel;
      }
    }
  }

  function on(target, eventName, handler, options) {
    const element = typeof target === "string" ? query(target) : target;
    if (!element?.addEventListener) return () => {};

    element.addEventListener(eventName, handler, options);
    return () => element.removeEventListener(eventName, handler, options);
  }

  function delegate(root, eventName, selector, handler, options) {
    const container = typeof root === "string" ? query(root) : root;
    if (!container) return () => {};

    const listener = event => {
      const matched = event.target.closest(selector);
      if (matched && container.contains(matched)) {
        handler.call(matched, event, matched);
      }
    };

    container.addEventListener(eventName, listener, options);
    return () => container.removeEventListener(eventName, listener, options);
  }

  function emit(target, eventName, detail = {}) {
    const element = typeof target === "string" ? query(target) : target;
    if (!element) return false;

    return element.dispatchEvent(
      new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail
      })
    );
  }

  function serializeForm(form) {
    const element = typeof form === "string" ? query(form) : form;
    if (!element) return {};

    const output = {};

    new FormData(element).forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = toArray(output[key]);
        output[key].push(value);
      } else {
        output[key] = value;
      }
    });

    queryAll('input[type="checkbox"][name]', element).forEach(input => {
      if (!Object.prototype.hasOwnProperty.call(output, input.name)) {
        output[input.name] = false;
      } else if (input.value === "on") {
        output[input.name] = input.checked;
      }
    });

    return output;
  }

  function resetForm(form) {
    const element = typeof form === "string" ? query(form) : form;
    if (!element) return;
    element.reset();
    queryAll(".field-error", element).forEach(error => {
      error.textContent = "";
    });
    queryAll("[aria-invalid='true']", element).forEach(field => {
      field.removeAttribute("aria-invalid");
    });
  }

  function storageAvailable(storage) {
    try {
      const key = "__maya_storage_test__";
      storage.setItem(key, key);
      storage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function createStorage(storage) {
    const memory = new Map();
    const available = storage && storageAvailable(storage);

    function read(key, fallback = null) {
      try {
        const raw = available ? storage.getItem(key) : memory.get(key);
        return isNil(raw) ? deepClone(fallback) : JSON.parse(raw);
      } catch (_) {
        return deepClone(fallback);
      }
    }

    function write(key, value) {
      try {
        const serialized = JSON.stringify(value);

        if (available) {
          storage.setItem(key, serialized);
        } else {
          memory.set(key, serialized);
        }

        return true;
      } catch (error) {
        console.warn(`Unable to save "${key}"`, error);
        return false;
      }
    }

    function remove(key) {
      try {
        if (available) storage.removeItem(key);
        memory.delete(key);
        return true;
      } catch (_) {
        return false;
      }
    }

    function clear(prefix = "") {
      try {
        if (available) {
          Object.keys(storage).forEach(key => {
            if (!prefix || key.startsWith(prefix)) {
              storage.removeItem(key);
            }
          });
        }

        [...memory.keys()].forEach(key => {
          if (!prefix || key.startsWith(prefix)) {
            memory.delete(key);
          }
        });

        return true;
      } catch (_) {
        return false;
      }
    }

    return Object.freeze({
      available,
      get: read,
      set: write,
      remove,
      clear,
      has(key) {
        return available ? storage.getItem(key) !== null : memory.has(key);
      }
    });
  }

  const local = createStorage(window.localStorage);
  const session = createStorage(window.sessionStorage);

  function debounce(callback, delay = 250) {
    let timer;

    return function debounced(...args) {
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(() => callback.apply(context, args), delay);
    };
  }

  function throttle(callback, interval = 250) {
    let lastRun = 0;
    let timer;

    return function throttled(...args) {
      const now = Date.now();
      const remaining = interval - (now - lastRun);
      const context = this;

      if (remaining <= 0) {
        clearTimeout(timer);
        timer = null;
        lastRun = now;
        callback.apply(context, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          lastRun = Date.now();
          timer = null;
          callback.apply(context, args);
        }, remaining);
      }
    };
  }

  function sleep(milliseconds = 0) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async function retry(
    callback,
    {
      attempts = 3,
      delay = 600,
      factor = 2,
      shouldRetry = () => true
    } = {}
  ) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await callback(attempt);
      } catch (error) {
        lastError = error;

        if (attempt >= attempts || !shouldRetry(error, attempt)) {
          throw error;
        }

        await sleep(delay * factor ** (attempt - 1));
      }
    }

    throw lastError;
  }

  function withTimeout(promise, milliseconds = 30000, message = "Request timed out.") {
    let timer;

    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    });

    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      clearTimeout(timer);
    });
  }

  function createQueue() {
    let chain = Promise.resolve();

    return function enqueue(task) {
      const result = chain.then(() => task());
      chain = result.catch(() => undefined);
      return result;
    };
  }

  function fileToDataUrl(file, maximumBytes = 8 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new TypeError("A valid file is required."));
        return;
      }

      if (file.size > maximumBytes) {
        reject(
          new Error(
            `The file is too large. Maximum size is ${formatNumber(
              maximumBytes / (1024 * 1024),
              { maximumFractionDigits: 1 }
            )} MB.`
          )
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });
  }

  function downloadBlob(blob, filename = "download") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadText(
    text,
    filename = "download.txt",
    mimeType = "text/plain;charset=utf-8"
  ) {
    downloadBlob(new Blob([text], { type: mimeType }), filename);
  }

  function downloadJson(data, filename = "maya-backup.json") {
    downloadText(
      JSON.stringify(data, null, 2),
      filename,
      "application/json;charset=utf-8"
    );
  }

  function escapeCsvCell(value) {
    let output = value;

    if (Array.isArray(output)) output = output.join("; ");
    if (isObject(output)) output = JSON.stringify(output);

    const text = String(output ?? "");

    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  function toCsv(rows, columns) {
    const list = toArray(rows);
    const definitions =
      columns?.length
        ? columns.map(column =>
            typeof column === "string"
              ? { key: column, label: titleCase(column.replace(/[_-]/g, " ")) }
              : column
          )
        : Object.keys(list[0] || {}).map(key => ({
            key,
            label: titleCase(key.replace(/[_-]/g, " "))
          }));

    const header = definitions.map(column => escapeCsvCell(column.label));
    const body = list.map(row =>
      definitions.map(column => {
        const value =
          typeof column.value === "function"
            ? column.value(row)
            : row?.[column.key];
        return escapeCsvCell(value);
      })
    );

    return [header, ...body].map(line => line.join(",")).join("\r\n");
  }

  function downloadCsv(rows, filename = "maya-export.csv", columns) {
    const csv = `\uFEFF${toCsv(rows, columns)}`;
    downloadText(csv, filename, "text/csv;charset=utf-8");
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new TypeError("A valid JSON file is required."));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || "")));
        } catch (_) {
          reject(new Error("The selected file is not valid JSON."));
        }
      };

      reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
      reader.readAsText(file);
    });
  }

  function buildWhatsAppUrl(phone, message = "") {
    const number = whatsappPhone(phone);
    const text = encodeURIComponent(String(message || ""));
    return `https://wa.me/${number}${text ? `?text=${text}` : ""}`;
  }

  function copyText(text) {
    const value = String(text ?? "");

    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      textarea.remove();
      return Promise.resolve();
    } catch (error) {
      textarea.remove();
      return Promise.reject(error);
    }
  }

  function getErrorMessage(error, fallback = "Something went wrong.") {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    return error.message || error.error || fallback;
  }

  function assert(condition, message = "Assertion failed.") {
    if (!condition) throw new Error(message);
  }

  function log(scope, ...values) {
    const prefix = `[Maya OS${scope ? `:${scope}` : ""}]`;
    console.log(prefix, ...values);
  }

  function warn(scope, ...values) {
    const prefix = `[Maya OS${scope ? `:${scope}` : ""}]`;
    console.warn(prefix, ...values);
  }

  function error(scope, ...values) {
    const prefix = `[Maya OS${scope ? `:${scope}` : ""}]`;
    console.error(prefix, ...values);
  }

  const Utils = Object.freeze({
    version: "5.0.0",

    isNil,
    isObject,
    isPlainObject,
    toArray,
    safeString,
    toNumber,
    toBoolean,
    clamp,
    round,
    sum,
    average,
    percentage,
    unique,
    groupBy,
    sortBy,
    deepClone,
    clone: deepClone,
    deepMerge,
    pick,
    omit,

    escapeHtml,
    stripHtml,
    slugify,
    titleCase,
    sentenceCase,
    truncate,
    normalizePhone,
    whatsappPhone,
    normalizeEmail,
    isValidEmail,
    isValidPhone,
    createId,

    formatCurrency,
    money: formatCurrency,
    formatNumber,
    parseDate,
    formatDate,
    formatDateTime,
    toISODate,
    startOfDay,
    endOfDay,
    isDateWithin,
    relativeTime,

    query,
    queryAll,
    byId,
    $: byId,
    $$: queryAll,
    createElement,
    setText,
    setHtml,
    show,
    hide,
    toggle,
    setBusy,
    on,
    delegate,
    emit,
    serializeForm,
    resetForm,

    local,
    session,
    createStorage,

    debounce,
    throttle,
    sleep,
    retry,
    withTimeout,
    createQueue,

    fileToDataUrl,
    downloadBlob,
    downloadText,
    downloadJson,
    escapeCsvCell,
    toCsv,
    downloadCsv,
    readJsonFile,
    buildWhatsAppUrl,
    copyText,

    getErrorMessage,
    assert,
    log,
    warn,
    error
  });

  window.BusinessUtils = Utils;
  window.MayaUtils = Utils;
  window.MSUtils = Utils;
})(window, document);
