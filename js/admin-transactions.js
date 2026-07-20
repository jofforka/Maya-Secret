(function (window, document) {
  "use strict";

  /*
   * Prevent admin.js from rendering its duplicate transaction buttons.
   * renderOrders() and renderBookings() in admin.js must check this flag.
   */
  window.MayaTransactionsActive = true;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const escapeHtml = value =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;"
        })[character]
    );

  const toNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const formatMoney = value =>
    "₦" +
    toNumber(value).toLocaleString("en-NG", {
      maximumFractionDigits: 0
    });

  const formatDate = value => {
    if (!value) return "—";

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime())
      ? String(value)
      : parsedDate.toLocaleString();
  };

  const lower = value =>
    String(value || "").toLowerCase();

  function getAdmin() {
    return window.BusinessAdmin || window.MayaAdmin || null;
  }

  function getState() {
    const admin = getAdmin();

    return (
      admin?.getState?.() || {
        orders: [],
        bookings: [],
        settings: {}
      }
    );
  }

  function getCloud() {
    return window.BusinessCloud || window.MayaCloud || null;
  }

  function getCommissionRate() {
    return toNumber(
      getState().settings?.commissionRate || 15
    );
  }

  function getRecordId(record) {
    return (
      record?.id ||
      record?.orderId ||
      record?.bookingId ||
      record?.reference ||
      ""
    );
  }

  function isPaidOrder(order) {
    const status = lower(
      order?.paymentStatus || order?.status
    );

    return [
      "paid",
      "completed",
      "complete",
      "successful",
      "success"
    ].some(value => status.includes(value));
  }

  function isApprovedBooking(booking) {
    const status = lower(
      booking?.paymentStatus || booking?.status
    );

    return [
      "confirmed",
      "completed",
      "complete",
      "paid"
    ].some(value => status.includes(value));
  }

  function isCancelled(record) {
    return lower(record?.status).includes("cancel");
  }

  function getOrderItemsText(order) {
    if (!Array.isArray(order?.items)) {
      return order?.item || "—";
    }

    if (!order.items.length) {
      return "—";
    }

    return order.items
      .map(item => {
        if (typeof item === "string") {
          return item;
        }

        const name =
          item?.name ||
          item?.productName ||
          item?.title ||
          "Item";

        const quantity =
          item?.qty ||
          item?.quantity ||
          1;

        return `${name} × ${quantity}`;
      })
      .join(", ");
  }

  function getBookingServicesText(booking) {
    if (!Array.isArray(booking?.services)) {
      return (
        booking?.service ||
        booking?.serviceName ||
        "—"
      );
    }

    if (!booking.services.length) {
      return "—";
    }

    return booking.services
      .map(service => {
        if (typeof service === "string") {
          return service;
        }

        return (
          service?.name ||
          service?.service ||
          service?.title ||
          "Service"
        );
      })
      .join(", ");
  }

  function toast(message, type = "info") {
    if (
      window.BusinessUI &&
      typeof window.BusinessUI.toast === "function"
    ) {
      window.BusinessUI.toast(message, type);
      return;
    }

    if (
      window.MayaUI &&
      typeof window.MayaUI.toast === "function"
    ) {
      window.MayaUI.toast(message, type);
      return;
    }

    console.log(`[${type}] ${message}`);
  }

  function createActionButtons(type, record) {
    const id = getRecordId(record);

    if (type === "order") {
      return `
        <div class="transaction-actions">
          <button
            type="button"
            data-transaction-action="approve-order"
            data-record-id="${escapeHtml(id)}"
            aria-label="Approve and mark order as paid"
          >
            Approve paid
          </button>

          <button
            type="button"
            data-transaction-action="pending-order"
            data-record-id="${escapeHtml(id)}"
            aria-label="Move order to pending"
          >
            Pending
          </button>

          <button
            type="button"
            data-transaction-action="cancel-order"
            data-record-id="${escapeHtml(id)}"
            aria-label="Cancel order"
          >
            Cancel
          </button>
        </div>
      `;
    }

    return `
      <div class="transaction-actions">
        <button
          type="button"
          data-transaction-action="confirm-booking"
          data-record-id="${escapeHtml(id)}"
          aria-label="Confirm spa booking"
        >
          Confirm
        </button>

        <button
          type="button"
          data-transaction-action="complete-booking"
          data-record-id="${escapeHtml(id)}"
          aria-label="Complete spa booking"
        >
          Complete
        </button>

        <button
          type="button"
          data-transaction-action="pending-booking"
          data-record-id="${escapeHtml(id)}"
          aria-label="Move spa booking to pending"
        >
          Pending
        </button>

        <button
          type="button"
          data-transaction-action="cancel-booking"
          data-record-id="${escapeHtml(id)}"
          aria-label="Cancel spa booking"
        >
          Cancel
        </button>
      </div>
    `;
  }

  function renderOrders() {
    const tableBody = $("[data-order-list]");

    if (!tableBody) return;

    const orders = Array.isArray(getState().orders)
      ? getState().orders
      : [];

    if (!orders.length) {
      tableBody.innerHTML = `
        <tr class="admin-table-empty">
          <td colspan="8">No orders loaded yet.</td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = orders
        .map(order => {
          const paid = isPaidOrder(order);
          const cancelled = isCancelled(order);

          const customerName =
            order.customerName ||
            order.customer?.name ||
            order.name ||
            "Guest";

          const customerPhone =
            order.customerPhone ||
            order.phone ||
            order.customer?.phone ||
            "";

          const total =
            order.total ||
            order.grandTotal ||
            order.amount ||
            0;

          return `
            <tr data-transaction-row="${escapeHtml(
              getRecordId(order)
            )}">
              <td>
                ${escapeHtml(
                  getRecordId(order) || "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  formatDate(
                    order.createdAt ||
                    order.date ||
                    order.timestamp
                  )
                )}
              </td>

              <td>
                ${escapeHtml(customerName)}
                ${
                  customerPhone
                    ? `<small>${escapeHtml(
                        customerPhone
                      )}</small>`
                    : ""
                }
              </td>

              <td>
                ${escapeHtml(getOrderItemsText(order))}
              </td>

              <td>${formatMoney(total)}</td>

              <td>
                <span class="status-pill ${
                  paid ? "success" : "pending"
                }">
                  ${escapeHtml(
                    order.paymentStatus || "Unpaid"
                  )}
                </span>
              </td>

              <td>
                <span class="status-pill ${
                  cancelled
                    ? "danger"
                    : paid
                      ? "success"
                      : "pending"
                }">
                  ${escapeHtml(
                    order.status || "Pending"
                  )}
                </span>
              </td>

              <td>
                ${createActionButtons("order", order)}
              </td>
            </tr>
          `;
        })
        .join("");
    }

    const count = $("[data-orders-count]");

    if (count) {
      count.textContent =
        `${orders.length} order` +
        (orders.length === 1 ? "" : "s");
    }
  }

  function renderBookings() {
    const tableBody = $("[data-spa-booking-list]");

    if (!tableBody) return;

    const bookings = Array.isArray(
      getState().bookings
    )
      ? getState().bookings
      : [];

    if (!bookings.length) {
      tableBody.innerHTML = `
        <tr class="admin-table-empty">
          <td colspan="8">
            No spa bookings loaded yet.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = bookings
        .map(booking => {
          const approved =
            isApprovedBooking(booking);

          const cancelled = isCancelled(booking);

          const customerName =
            booking.customerName ||
            booking.customer?.name ||
            booking.name ||
            "Guest";

          const customerPhone =
            booking.customerPhone ||
            booking.phone ||
            booking.customer?.phone ||
            "";

          const bookingDate =
            booking.appointmentDate ||
            booking.bookingDate ||
            booking.date ||
            "—";

          const bookingTime =
            booking.appointmentTime ||
            booking.bookingTime ||
            booking.time ||
            "";

          return `
            <tr data-transaction-row="${escapeHtml(
              getRecordId(booking)
            )}">
              <td>
                ${escapeHtml(
                  getRecordId(booking) || "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  formatDate(
                    booking.createdAt ||
                    booking.dateRequested
                  )
                )}
              </td>

              <td>
                ${escapeHtml(customerName)}
                ${
                  customerPhone
                    ? `<small>${escapeHtml(
                        customerPhone
                      )}</small>`
                    : ""
                }
              </td>

              <td>
                ${escapeHtml(
                  getBookingServicesText(booking)
                )}
              </td>

              <td>
                ${formatMoney(
                  booking.total ||
                  booking.grandTotal ||
                  booking.amount ||
                  0
                )}
              </td>

              <td>
                ${escapeHtml(
                  `${bookingDate}${
                    bookingTime
                      ? ` ${bookingTime}`
                      : ""
                  }`
                )}
              </td>

              <td>
                <span class="status-pill ${
                  cancelled
                    ? "danger"
                    : approved
                      ? "success"
                      : "pending"
                }">
                  ${escapeHtml(
                    booking.status || "Pending"
                  )}
                </span>
              </td>

              <td>
                ${createActionButtons(
                  "booking",
                  booking
                )}
              </td>
            </tr>
          `;
        })
        .join("");
    }

    const count = $(
      "[data-spa-bookings-count]"
    );

    if (count) {
      count.textContent =
        `${bookings.length} booking request` +
        (bookings.length === 1 ? "" : "s");
    }
  }

  function isInReportRange(record) {
    const startValue =
      $("#reportStartDate")?.value || "";

    const endValue =
      $("#reportEndDate")?.value || "";

    const dateValue =
      record.createdAt ||
      record.date ||
      record.bookingDate;

    const recordDate = new Date(dateValue);

    if (Number.isNaN(recordDate.getTime())) {
      return !startValue && !endValue;
    }

    if (
      startValue &&
      recordDate <
        new Date(`${startValue}T00:00:00`)
    ) {
      return false;
    }

    if (
      endValue &&
      recordDate >
        new Date(`${endValue}T23:59:59`)
    ) {
      return false;
    }

    return true;
  }

  function buildReportTransactions() {
    const currentState = getState();

    const orders = Array.isArray(
      currentState.orders
    )
      ? currentState.orders
      : [];

    const bookings = Array.isArray(
      currentState.bookings
    )
      ? currentState.bookings
      : [];

    const orderTransactions = orders.map(
      order => ({
        type: "Product order",
        id: getRecordId(order),
        customer:
          order.customerName ||
          order.customer?.name ||
          order.name ||
          "Guest",
        total: toNumber(
          order.total ||
          order.grandTotal ||
          order.amount
        ),
        createdAt:
          order.createdAt ||
          order.date ||
          order.timestamp,
        status: order.status || "Pending",
        approved: isPaidOrder(order),
        cancelled: isCancelled(order)
      })
    );

    const bookingTransactions = bookings.map(
      booking => ({
        type: "Spa booking",
        id: getRecordId(booking),
        customer:
          booking.customerName ||
          booking.customer?.name ||
          booking.name ||
          "Guest",
        total: toNumber(
          booking.total ||
          booking.grandTotal ||
          booking.amount
        ),
        createdAt:
          booking.createdAt ||
          booking.bookingDate ||
          booking.date,
        status: booking.status || "Pending",
        approved:
          isApprovedBooking(booking),
        cancelled: isCancelled(booking)
      })
    );

    return [
      ...orderTransactions,
      ...bookingTransactions
    ]
      .filter(isInReportRange)
      .filter(transaction => !transaction.cancelled)
      .sort((first, second) => {
        const firstDate = new Date(
          first.createdAt
        ).getTime();

        const secondDate = new Date(
          second.createdAt
        ).getTime();

        return (
          (Number.isFinite(secondDate)
            ? secondDate
            : 0) -
          (Number.isFinite(firstDate)
            ? firstDate
            : 0)
        );
      });
  }

  function renderReports() {
    const commissionRate =
      getCommissionRate();

    const transactions =
      buildReportTransactions();

    const approvedTransactions =
      transactions.filter(
        transaction => transaction.approved
      );

    const pendingTransactions =
      transactions.filter(
        transaction => !transaction.approved
      );

    const transactionValue =
      transactions.reduce(
        (total, transaction) =>
          total + transaction.total,
        0
      );

    const commissionDue =
      approvedTransactions.reduce(
        (total, transaction) =>
          total +
          (transaction.total *
            commissionRate) /
            100,
        0
      );

    const pendingCommission =
      pendingTransactions.reduce(
        (total, transaction) =>
          total +
          (transaction.total *
            commissionRate) /
            100,
        0
      );

    const metrics = {
      transactionValue:
        formatMoney(transactionValue),

      approvedTransactions:
        approvedTransactions.length,

      commissionRate:
        `${commissionRate}%`,

      commissionDue:
        formatMoney(commissionDue),

      pendingCommission:
        formatMoney(pendingCommission)
    };

    Object.entries(metrics).forEach(
      ([key, value]) => {
        const element = $(
          `[data-report-metric="${key}"]`
        );

        if (element) {
          element.textContent = value;
        }
      }
    );

    const tableBody = $("[data-report-rows]");

    if (tableBody) {
      tableBody.innerHTML = transactions.length
        ? transactions
            .map(transaction => {
              const commission =
                (transaction.total *
                  commissionRate) /
                100;

              return `
                <tr>
                  <td>
                    ${escapeHtml(
                      formatDate(
                        transaction.createdAt
                      )
                    )}
                  </td>

                  <td>
                    ${escapeHtml(transaction.type)}
                  </td>

                  <td>
                    ${escapeHtml(
                      transaction.id || "—"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      transaction.customer
                    )}
                  </td>

                  <td>
                    ${formatMoney(
                      transaction.total
                    )}
                  </td>

                  <td>
                    <span class="status-pill ${
                      transaction.approved
                        ? "success"
                        : "pending"
                    }">
                      ${
                        transaction.approved
                          ? "Earned"
                          : "Pending"
                      }
                    </span>
                  </td>

                  <td>
                    ${formatMoney(commission)}
                  </td>
                </tr>
              `;
            })
            .join("")
        : `
          <tr class="admin-table-empty">
            <td colspan="7">
              No transactions in this period.
            </td>
          </tr>
        `;
    }

    window.MayaReportRows = transactions;
  }

  function findRecord(type, id) {
    const currentState = getState();

    const records =
      type === "order"
        ? currentState.orders
        : currentState.bookings;

    if (!Array.isArray(records)) {
      return null;
    }

    return (
      records.find(
        record =>
          String(getRecordId(record)) ===
          String(id)
      ) || null
    );
  }

  async function refreshAdminData() {
    const admin = getAdmin();

    if (
      admin &&
      typeof admin.refresh === "function"
    ) {
      try {
        await admin.refresh();
        return;
      } catch (error) {
        console.warn(
          "[Transactions] Admin refresh failed:",
          error
        );
      }
    }

    renderAll();
  }

  async function updateRecord(
    type,
    id,
    patch,
    button
  ) {
    const record = findRecord(type, id);

    if (!record) {
      console.error(
        "[Transactions] Record not found:",
        type,
        id
      );

      toast(
        `${
          type === "order"
            ? "Order"
            : "Booking"
        } could not be found.`,
        "error"
      );

      return;
    }

    const cloudService = getCloud();

    if (!cloudService) {
      toast(
        "Cloud service is unavailable.",
        "error"
      );
      return;
    }

    const methodName =
      type === "order"
        ? "updateOrder"
        : "updateBooking";

    if (
      typeof cloudService[methodName] !==
      "function"
    ) {
      console.error(
        `[Transactions] ${methodName} is not available.`
      );

      toast(
        `${
          type === "order"
            ? "Order"
            : "Booking"
        } update service is unavailable.`,
        "error"
      );

      return;
    }

    const originalText =
      button.textContent.trim();

    const updatedRecord = {
      ...record,
      ...patch,
      id:
        record.id ||
        record.orderId ||
        record.bookingId ||
        record.reference ||
        id,
      updatedAt: new Date().toISOString()
    };

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Updating…";

    try {
      if (
        typeof cloudService.init ===
        "function"
      ) {
        await cloudService.init();
      }

      const response =
        await cloudService[methodName](
          updatedRecord
        );

      if (response?.success === false) {
        throw new Error(
          response.error ||
          response.message ||
          "Update failed."
        );
      }

      Object.assign(record, updatedRecord);

      toast(
        `${
          type === "order"
            ? "Order"
            : "Booking"
        } updated successfully.`,
        "success"
      );

      await refreshAdminData();
    } catch (error) {
      console.error(
        `[Transactions] ${methodName} failed:`,
        error
      );

      toast(
        error?.message ||
        `Could not update the ${
          type === "order"
            ? "order"
            : "booking"
        }.`,
        "error"
      );
    } finally {
      /*
       * The original button may have been removed
       * during table re-rendering.
       */
      if (button?.isConnected) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.textContent = originalText;
      }
    }
  }

  function renderAll() {
    renderOrders();
    renderBookings();
    renderReports();
  }

  const transactionActions = {
    "approve-order": {
      type: "order",
      confirmation:
        "Approve this order and mark it as paid?",
      patch: () => ({
        status: "Completed",
        paymentStatus: "Paid",
        approvedAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      })
    },

    "pending-order": {
      type: "order",
      confirmation:
        "Move this order back to pending?",
      patch: () => ({
        status: "Pending",
        paymentStatus: "Unpaid",
        approvedAt: ""
      })
    },

    "cancel-order": {
      type: "order",
      confirmation:
        "Cancel this order?",
      patch: () => ({
        status: "Cancelled",
        cancelledAt: new Date().toISOString()
      })
    },

    "confirm-booking": {
      type: "booking",
      confirmation:
        "Confirm this spa booking?",
      patch: () => ({
        status: "Confirmed",
        paymentStatus: "Paid",
        confirmedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      })
    },

    "complete-booking": {
      type: "booking",
      confirmation:
        "Mark this spa booking as completed?",
      patch: () => ({
        status: "Completed",
        paymentStatus: "Paid",
        completedAt: new Date().toISOString()
      })
    },

    "pending-booking": {
      type: "booking",
      confirmation:
        "Move this spa booking back to pending?",
      patch: () => ({
        status: "Pending",
        paymentStatus: "Unpaid",
        confirmedAt: "",
        approvedAt: ""
      })
    },

    "cancel-booking": {
      type: "booking",
      confirmation:
        "Cancel this spa booking?",
      patch: () => ({
        status: "Cancelled",
        cancelledAt: new Date().toISOString()
      })
    }
  };

  document.addEventListener(
    "click",
    function (event) {
      const transactionButton =
        event.target.closest(
          "[data-transaction-action]"
        );

      if (!transactionButton) {
        if (
          event.target.closest(
            "[data-generate-report]"
          )
        ) {
          setTimeout(renderReports, 0);
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const actionName =
        transactionButton.dataset
          .transactionAction;

      const recordId =
        transactionButton.dataset.recordId;

      if (!recordId) {
        console.error(
          "[Transactions] Missing record ID:",
          actionName
        );

        toast(
          "This transaction does not have a valid ID.",
          "error"
        );

        return;
      }

      const selectedAction =
        transactionActions[actionName];

      if (!selectedAction) {
        console.warn(
          "[Transactions] Unknown action:",
          actionName
        );
        return;
      }

      const shouldContinue =
        !selectedAction.confirmation ||
        window.confirm(
          selectedAction.confirmation
        );

      if (!shouldContinue) {
        return;
      }

      updateRecord(
        selectedAction.type,
        recordId,
        selectedAction.patch(),
        transactionButton
      );
    }
  );

  document.addEventListener(
    "change",
    function (event) {
      if (
        event.target.matches(
          "#reportStartDate, #reportEndDate"
        )
      ) {
        renderReports();
      }
    }
  );

  document.addEventListener(
    "admin:refreshed",
    function () {
      setTimeout(renderAll, 50);
    }
  );

  document.addEventListener(
    "admin:viewChanged",
    function () {
      setTimeout(renderAll, 100);
    }
  );

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      setTimeout(renderAll, 800);
    }
  );
})(window, document);
