(function (window, document) {
  "use strict";

  const Utils = window.BusinessUtils || window.MayaUtils || {};
  const Config =
    window.BusinessConfig && typeof window.BusinessConfig.get === "function"
      ? window.BusinessConfig.get()
      : {};

  const DEFAULTS = Object.freeze({
    sessionKey:
      Config?.storage?.session ||
      "mayaAdminSession",
    legacySessionKey: "mayaAdminSession",
    sessionValue: "yes",
    passcode: "maya2026",
    sessionDuration: 8 * 60 * 60 * 1000,
    idleTimeout: 60 * 60 * 1000,
    rememberDuration: 7 * 24 * 60 * 60 * 1000,
    maximumAttempts: 5,
    lockDuration: 5 * 60 * 1000
  });

  const STATE = {
    initialized: false,
    authenticated: false,
    session: null,
    idleTimer: null,
    lastActivityWrite: 0,
    options: { ...DEFAULTS }
  };

  const SELECTORS = Object.freeze({
    login: "#adminLogin",
    panel: "#adminPanel",
    form: "#loginForm",
    password: "#adminPassword",
    toggle: "#togglePassword",
    error: "#loginError",
    submit: "[data-login-submit]",
    submitText: "[data-login-text]",
    submitSpinner: "[data-login-spinner]",
    logout:
      "#adminLogout, [data-admin-logout], [data-logout], .admin-logout"
  });

  function query(selector, root = document) {
    if (typeof Utils.query === "function") {
      return Utils.query(selector, root);
    }
    return root?.querySelector?.(selector) || null;
  }

  function queryAll(selector, root = document) {
    if (typeof Utils.queryAll === "function") {
      return Utils.queryAll(selector, root);
    }
    return Array.from(root?.querySelectorAll?.(selector) || []);
  }

  function now() {
    return Date.now();
  }

  function safeParse(value, fallback = null) {
    if (!value) return fallback;

    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function getStorage(type = "session") {
    try {
      const storage =
        type === "local" ? window.localStorage : window.sessionStorage;

      const key = "__maya_auth_storage_test__";
      storage.setItem(key, "1");
      storage.removeItem(key);

      return storage;
    } catch (_) {
      return null;
    }
  }

  function getPasscode() {
    const runtimePasscode =
      window.MAYA_ADMIN_PASSCODE ||
      window.MayaAdminPasscode ||
      Config?.auth?.passcode ||
      STATE.options.passcode;

    return String(runtimePasscode || "").trim();
  }

  function constantTimeEqual(left, right) {
    const a = String(left ?? "");
    const b = String(right ?? "");
    const maximumLength = Math.max(a.length, b.length);

    let difference = a.length ^ b.length;

    for (let index = 0; index < maximumLength; index += 1) {
      difference |=
        (a.charCodeAt(index) || 0) ^
        (b.charCodeAt(index) || 0);
    }

    return difference === 0;
  }

  function createSession(remember = false) {
    const createdAt = now();
    const duration = remember
      ? STATE.options.rememberDuration
      : STATE.options.sessionDuration;

    return {
      authenticated: true,
      value: STATE.options.sessionValue,
      createdAt,
      lastActivityAt: createdAt,
      expiresAt: createdAt + duration,
      remember: Boolean(remember),
      version: "5.0.0"
    };
  }

  function writeSession(session) {
    const sessionStorage = getStorage("session");
    const localStorage = getStorage("local");
    const serialized = JSON.stringify(session);

    if (session.remember) {
      localStorage?.setItem(STATE.options.sessionKey, serialized);
      sessionStorage?.removeItem(STATE.options.sessionKey);
    } else {
      sessionStorage?.setItem(STATE.options.sessionKey, serialized);
      localStorage?.removeItem(STATE.options.sessionKey);
    }

    /*
     * Keep the legacy value expected by the current admin.js.
     * This prevents the old controller from hiding the dashboard after
     * authentication while the Core Framework is being introduced.
     */
    sessionStorage?.setItem(
      STATE.options.legacySessionKey,
      STATE.options.sessionValue
    );

    STATE.session = session;
    STATE.authenticated = true;
  }

  function removeSession() {
    const sessionStorage = getStorage("session");
    const localStorage = getStorage("local");

    sessionStorage?.removeItem(STATE.options.sessionKey);
    localStorage?.removeItem(STATE.options.sessionKey);
    sessionStorage?.removeItem(STATE.options.legacySessionKey);
    localStorage?.removeItem(STATE.options.legacySessionKey);

    STATE.session = null;
    STATE.authenticated = false;
  }

  function normalizeStoredSession(raw, remember = false) {
    if (!raw) return null;

    /*
     * Support the earlier `mayaAdminSession = "yes"` implementation.
     */
    if (raw === STATE.options.sessionValue || raw === "yes") {
      const session = createSession(remember);
      return session;
    }

    const parsed = safeParse(raw);

    if (!parsed || parsed.authenticated !== true) {
      return null;
    }

    return {
      authenticated: true,
      value: parsed.value || STATE.options.sessionValue,
      createdAt: Number(parsed.createdAt || now()),
      lastActivityAt: Number(
        parsed.lastActivityAt ||
        parsed.createdAt ||
        now()
      ),
      expiresAt: Number(
        parsed.expiresAt ||
        now() + STATE.options.sessionDuration
      ),
      remember: Boolean(parsed.remember ?? remember),
      version: parsed.version || "5.0.0"
    };
  }

  function readSession() {
    const sessionStorage = getStorage("session");
    const localStorage = getStorage("local");

    const sessionRaw =
      sessionStorage?.getItem(STATE.options.sessionKey) ||
      sessionStorage?.getItem(STATE.options.legacySessionKey);

    const localRaw =
      localStorage?.getItem(STATE.options.sessionKey) ||
      localStorage?.getItem(STATE.options.legacySessionKey);

    return (
      normalizeStoredSession(sessionRaw, false) ||
      normalizeStoredSession(localRaw, true)
    );
  }

  function isSessionValid(session) {
    if (!session?.authenticated) return false;

    const currentTime = now();

    if (session.expiresAt && currentTime >= session.expiresAt) {
      return false;
    }

    if (
      STATE.options.idleTimeout > 0 &&
      session.lastActivityAt &&
      currentTime - session.lastActivityAt >=
        STATE.options.idleTimeout
    ) {
      return false;
    }

    return true;
  }

  function attemptsKey() {
    return `${STATE.options.sessionKey}:attempts`;
  }

  function getAttemptState() {
    const localStorage = getStorage("local");
    const parsed = safeParse(
      localStorage?.getItem(attemptsKey()),
      {}
    );

    return {
      count: Number(parsed?.count || 0),
      lockedUntil: Number(parsed?.lockedUntil || 0)
    };
  }

  function setAttemptState(state) {
    const localStorage = getStorage("local");

    try {
      localStorage?.setItem(
        attemptsKey(),
        JSON.stringify(state)
      );
    } catch (_) {
      // Authentication still works when local storage is unavailable.
    }
  }

  function clearAttemptState() {
    getStorage("local")?.removeItem(attemptsKey());
  }

  function registerFailure() {
    const state = getAttemptState();
    const count = state.count + 1;

    if (count >= STATE.options.maximumAttempts) {
      const lockedUntil = now() + STATE.options.lockDuration;

      setAttemptState({
        count: 0,
        lockedUntil
      });

      return {
        locked: true,
        lockedUntil,
        attemptsRemaining: 0
      };
    }

    setAttemptState({
      count,
      lockedUntil: 0
    });

    return {
      locked: false,
      lockedUntil: 0,
      attemptsRemaining:
        STATE.options.maximumAttempts - count
    };
  }

  function lockMessage(lockedUntil) {
    const remainingMilliseconds = Math.max(
      0,
      lockedUntil - now()
    );

    const remainingMinutes = Math.max(
      1,
      Math.ceil(remainingMilliseconds / 60000)
    );

    return `Too many unsuccessful attempts. Try again in ${remainingMinutes} minute${
      remainingMinutes === 1 ? "" : "s"
    }.`;
  }

  function showError(message = "") {
    const errorElement = query(SELECTORS.error);

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = !message;
    }

    const password = query(SELECTORS.password);

    if (password) {
      if (message) {
        password.setAttribute("aria-invalid", "true");
      } else {
        password.removeAttribute("aria-invalid");
      }
    }
  }

  function setSubmitting(active, label = "Signing in…") {
    const submit = query(SELECTORS.submit);
    const text = query(SELECTORS.submitText);
    const spinner = query(SELECTORS.submitSpinner);

    if (submit) {
      submit.disabled = Boolean(active);
      submit.setAttribute(
        "aria-busy",
        active ? "true" : "false"
      );
    }

    if (text) {
      if (!text.dataset.defaultText) {
        text.dataset.defaultText =
          text.textContent || "Sign in";
      }

      text.textContent = active
        ? label
        : text.dataset.defaultText;
    }

    if (spinner) {
      spinner.hidden = !active;
    }
  }

  function setAuthenticatedUi(authenticated) {
    const login = query(SELECTORS.login);
    const panel = query(SELECTORS.panel);

    if (login) {
      login.hidden = Boolean(authenticated);
      login.setAttribute(
        "aria-hidden",
        authenticated ? "true" : "false"
      );
    }

    if (panel) {
      panel.hidden = !authenticated;
      panel.setAttribute(
        "aria-hidden",
        authenticated ? "false" : "true"
      );
    }

    document.documentElement.classList.toggle(
      "is-admin-authenticated",
      Boolean(authenticated)
    );

    document.documentElement.classList.toggle(
      "is-admin-guest",
      !authenticated
    );
  }

  function dispatch(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        detail
      })
    );
  }

  function focusPassword() {
    window.setTimeout(() => {
      query(SELECTORS.password)?.focus();
    }, 0);
  }

  function updateActivity() {
    if (!STATE.authenticated || !STATE.session) return;

    const currentTime = now();

    /*
     * Limit storage writes while mousemove and scroll events fire.
     */
    if (currentTime - STATE.lastActivityWrite < 30000) {
      return;
    }

    STATE.lastActivityWrite = currentTime;
    STATE.session.lastActivityAt = currentTime;

    const duration = STATE.session.remember
      ? STATE.options.rememberDuration
      : STATE.options.sessionDuration;

    STATE.session.expiresAt = currentTime + duration;
    writeSession(STATE.session);
    scheduleIdleCheck();
  }

  function scheduleIdleCheck() {
    window.clearTimeout(STATE.idleTimer);

    if (
      !STATE.authenticated ||
      !STATE.session ||
      STATE.options.idleTimeout <= 0
    ) {
      return;
    }

    const elapsed =
      now() -
      Number(
        STATE.session.lastActivityAt ||
        STATE.session.createdAt ||
        now()
      );

    const remaining =
      STATE.options.idleTimeout - elapsed;

    if (remaining <= 0) {
      Auth.logout({
        reload: false,
        reason: "idle"
      });
      return;
    }

    STATE.idleTimer = window.setTimeout(() => {
      const current = readSession();

      if (!isSessionValid(current)) {
        Auth.logout({
          reload: false,
          reason: "idle"
        });
      } else {
        STATE.session = current;
        scheduleIdleCheck();
      }
    }, Math.min(remaining + 100, 2147483647));
  }

  function bindActivityTracking() {
    const events = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart"
    ];

    events.forEach(eventName => {
      document.addEventListener(
        eventName,
        updateActivity,
        {
          passive: true
        }
      );
    });
  }

  function handleStorageChange(event) {
    if (
      event.key !== STATE.options.sessionKey &&
      event.key !== STATE.options.legacySessionKey
    ) {
      return;
    }

    const session = readSession();

    if (isSessionValid(session)) {
      STATE.session = session;
      STATE.authenticated = true;
      setAuthenticatedUi(true);
      scheduleIdleCheck();
    } else if (STATE.authenticated) {
      Auth.logout({
        reload: false,
        reason: "remote"
      });
    }
  }

  async function handleLoginSubmit(event) {
    event?.preventDefault?.();

    /*
     * admin.js in the existing project also listens to this form.
     * Preventing immediate propagation avoids duplicate sign-in actions
     * once this Core Framework module is installed.
     */
    event?.stopImmediatePropagation?.();

    const attemptState = getAttemptState();

    if (
      attemptState.lockedUntil &&
      attemptState.lockedUntil > now()
    ) {
      showError(lockMessage(attemptState.lockedUntil));
      return false;
    }

    if (
      attemptState.lockedUntil &&
      attemptState.lockedUntil <= now()
    ) {
      clearAttemptState();
    }

    const password = query(SELECTORS.password);
    const enteredPasscode = String(
      password?.value || ""
    ).trim();

    if (!enteredPasscode) {
      showError("Enter the admin passcode.");
      focusPassword();
      return false;
    }

    setSubmitting(true);
    showError("");

    /*
     * A short delay gives clear visual feedback and makes rapid brute-force
     * attempts less convenient without delaying normal use noticeably.
     */
    await new Promise(resolve => {
      window.setTimeout(resolve, 180);
    });

    const result = Auth.login(enteredPasscode, {
      remember:
        Boolean(
          query(
            '[name="remember"], #rememberAdmin, [data-auth-remember]'
          )?.checked
        )
    });

    setSubmitting(false);

    if (!result.ok) {
      showError(result.message);
      if (password) {
        password.value = "";
        password.focus();
      }
      return false;
    }

    if (password) {
      password.value = "";
    }

    showError("");
    return true;
  }

  function bindForm() {
    const form = query(SELECTORS.form);

    if (form && !form.dataset.coreAuthBound) {
      form.dataset.coreAuthBound = "true";

      /*
       * Capture mode ensures this runs before the old admin.js handler.
       */
      form.addEventListener(
        "submit",
        handleLoginSubmit,
        true
      );
    }

    const password = query(SELECTORS.password);

    password?.addEventListener("input", () => {
      showError("");
    });
  }

  function bindPasswordToggle() {
    const button = query(SELECTORS.toggle);
    const password = query(SELECTORS.password);

    if (
      !button ||
      !password ||
      button.dataset.coreAuthBound
    ) {
      return;
    }

    button.dataset.coreAuthBound = "true";

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const reveal = password.type === "password";

        password.type = reveal ? "text" : "password";
        button.textContent = reveal ? "Hide" : "Show";
        button.setAttribute(
          "aria-label",
          reveal ? "Hide passcode" : "Show passcode"
        );
      },
      true
    );
  }

  function bindLogout() {
    queryAll(SELECTORS.logout).forEach(button => {
      if (button.dataset.coreAuthBound) return;

      button.dataset.coreAuthBound = "true";

      button.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopImmediatePropagation();

          Auth.logout({
            reload: false,
            reason: "manual"
          });
        },
        true
      );
    });
  }

  function restore() {
    const session = readSession();

    if (!isSessionValid(session)) {
      removeSession();
      setAuthenticatedUi(false);
      focusPassword();
      return false;
    }

    /*
     * Convert legacy session values into the structured v5 session.
     */
    writeSession(session);
    STATE.session = session;
    STATE.authenticated = true;
    setAuthenticatedUi(true);
    scheduleIdleCheck();

    dispatch("maya:auth:restored", {
      session: Auth.getSession()
    });

    return true;
  }

  const Auth = {
    version: "5.0.0",

    init(options = {}) {
      STATE.options = {
        ...DEFAULTS,
        ...(Config?.auth || {}),
        ...(options || {})
      };

      bindForm();
      bindPasswordToggle();
      bindLogout();

      if (!STATE.initialized) {
        STATE.initialized = true;
        bindActivityTracking();
        window.addEventListener(
          "storage",
          handleStorageChange
        );
      }

      return restore();
    },

    login(passcode, options = {}) {
      const attemptState = getAttemptState();

      if (
        attemptState.lockedUntil &&
        attemptState.lockedUntil > now()
      ) {
        return {
          ok: false,
          locked: true,
          message: lockMessage(
            attemptState.lockedUntil
          )
        };
      }

      const valid = constantTimeEqual(
        String(passcode || "").trim(),
        getPasscode()
      );

      if (!valid) {
        const failure = registerFailure();

        const message = failure.locked
          ? lockMessage(failure.lockedUntil)
          : `Incorrect passcode. ${
              failure.attemptsRemaining
            } attempt${
              failure.attemptsRemaining === 1
                ? ""
                : "s"
            } remaining.`;

        dispatch("maya:auth:failed", {
          locked: failure.locked,
          attemptsRemaining:
            failure.attemptsRemaining
        });

        return {
          ok: false,
          ...failure,
          message
        };
      }

      clearAttemptState();

      const session = createSession(
        Boolean(options.remember)
      );

      writeSession(session);
      setAuthenticatedUi(true);
      scheduleIdleCheck();

      const hashView =
        window.location.hash.replace("#", "") ||
        "dashboard";

      if (
        window.BusinessUI &&
        typeof window.BusinessUI.showView ===
          "function"
      ) {
        window.BusinessUI.showView(hashView);
      }

      dispatch("maya:auth:signed-in", {
        session: Auth.getSession()
      });

      return {
        ok: true,
        session: Auth.getSession()
      };
    },

    logout({
      reload = false,
      reason = "manual"
    } = {}) {
      window.clearTimeout(STATE.idleTimer);
      removeSession();
      setAuthenticatedUi(false);
      showError("");

      const password = query(SELECTORS.password);

      if (password) {
        password.value = "";
        password.type = "password";
      }

      const toggle = query(SELECTORS.toggle);

      if (toggle) {
        toggle.textContent = "Show";
        toggle.setAttribute(
          "aria-label",
          "Show passcode"
        );
      }

      dispatch("maya:auth:signed-out", {
        reason
      });

      if (
        reason === "idle" &&
        window.BusinessUI?.toast
      ) {
        window.BusinessUI.toast(
          "Your admin session expired. Sign in again.",
          "warning",
          5000
        );
      }

      if (reload) {
        window.location.reload();
      } else {
        focusPassword();
      }

      return true;
    },

    restore,

    isAuthenticated() {
      if (!STATE.authenticated) {
        return false;
      }

      const session =
        STATE.session || readSession();

      if (!isSessionValid(session)) {
        removeSession();
        setAuthenticatedUi(false);
        return false;
      }

      return true;
    },

    requireAuth({
      redirect = false
    } = {}) {
      const authenticated =
        Auth.isAuthenticated();

      if (!authenticated) {
        setAuthenticatedUi(false);
        focusPassword();

        if (redirect) {
          window.location.hash = "";
        }
      }

      return authenticated;
    },

    getSession() {
      return STATE.session
        ? { ...STATE.session }
        : null;
    },

    refresh() {
      if (!Auth.isAuthenticated()) {
        return false;
      }

      updateActivity();
      return true;
    },

    setPasscode(passcode) {
      /*
       * Runtime only. Do not use this to store a sensitive production
       * passcode in localStorage.
       */
      window.MAYA_ADMIN_PASSCODE =
        String(passcode || "").trim();
      return Boolean(window.MAYA_ADMIN_PASSCODE);
    },

    configure(options = {}) {
      STATE.options = {
        ...STATE.options,
        ...(options || {})
      };

      return { ...STATE.options };
    },

    getOptions() {
      return { ...STATE.options };
    }
  };

  window.BusinessAuth = Auth;
  window.MayaAuth = Auth;
  window.MSAuth = Auth;

  function boot() {
    Auth.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})(window, document);
