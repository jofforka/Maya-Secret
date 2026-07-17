const AUTH_KEY = 'mayaAdminSession';
  const PASSCODE = 'maya2026';
  const KEYS = {
    products: 'maya_products_v5',
    orders: 'maya_orders_v5',
    bookings: 'maya_spa_bookings_v5',
    settings: 'mayaBusinessSettingsV5',
    logs: 'maya_activity_logs_v5'
  };

  const state = {
    products: [],
    orders: [],
    bookings: [],
    customers: [],
    logs: [],
    settings: { commissionRate: 15 },
    cloudReady: false,
    productQuery: '',
    productCategory: 'All',
    orderQuery: '',
    orderStatus: 'All',
    orderPayment: 'All',
    bookingQuery: '',
    bookingStatus: 'All',
    customerQuery: '',
    logQuery: '',
    logType: 'All',
    reportRows: []
  };

  const $ = id => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const safe = value => typeof value === 'string' ? value.trim() : '';
  const money = value => new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-NG', {
      dateStyle: 'medium', timeStyle: 'short'
    });
  };
  const slugify = value => safe(value).toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `product-${Date.now()}`;

  function read(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function defaults() {
    return (window.MAYA_DEFAULT_PRODUCTS || []).map(product => ({
      ...product,
      gallery: [...(product.gallery || [])],
      benefits: [...(product.benefits || [])]
    }));
  }

  function normaliseProducts(list) {
    return (Array.isArray(list) ? list : []).map((p, i) => ({
      id: safe(p?.id) || slugify(p?.name || `product-${i + 1}`),
      name: safe(p?.name) || `Product ${i + 1}`,
      category: safe(p?.category) || 'Uncategorised',
      price: Number(p?.price || 0),
      size: safe(p?.size),
      badge: safe(p?.badge),
      desc: safe(p?.desc || p?.description),
      tone: safe(p?.tone) || 'plum',
      status: (safe(p?.status) || 'available').toLowerCase(),
      featured: Boolean(p?.featured),
      image: safe(p?.image),
      gallery: Array.isArray(p?.gallery) ? p.gallery.filter(Boolean) : [],
      benefits: Array.isArray(p?.benefits) ? p.benefits.filter(Boolean) : [],
      use: safe(p?.use || p?.directions)
    }));
  }

  function normaliseOrders(list) {
    return (Array.isArray(list) ? list : []).map((o, i) => ({
      id: safe(o?.id || o?.orderId) || `MS-${String(i + 1).padStart(4, '0')}`,
      date: o?.date || o?.createdAt || new Date().toISOString(),
      customerName: safe(o?.customerName || o?.name) || 'Customer',
      phone: safe(o?.phone),
      email: safe(o?.email),
      items: Array.isArray(o?.items) ? o.items : [],
      total: Number(o?.total || 0),
      paymentStatus: safe(o?.paymentStatus || o?.payment) || 'Unconfirmed',
      status: safe(o?.status) || 'Pending'
    }));
  }

  function normaliseBookings(list) {
    return (Array.isArray(list) ? list : []).map((b, i) => ({
      id: safe(b?.id || b?.bookingId) || `SPA-${String(i + 1).padStart(4, '0')}`,
      createdAt: b?.createdAt || b?.date || new Date().toISOString(),
      customerName: safe(b?.customerName || b?.name) || 'Customer',
      phone: safe(b?.phone),
      email: safe(b?.email),
      services: Array.isArray(b?.services) ? b.services : safe(b?.service) ? [b.service] : [],
      total: Number(b?.total || 0),
      appointmentDate: b?.appointmentDate || b?.preferredDate || '',
      status: safe(b?.status) || 'Pending'
    }));
  }

  function cloud() {
    return window.MayaCloud || window.MAYA_CLOUD || null;
  }

  async function cloudCall(names, ...args) {
    const api = cloud();
    if (!api) throw new Error('Cloud service is not loaded.');
    for (const name of (Array.isArray(names) ? names : [names])) {
      if (typeof api[name] === 'function') return await api[name](...args);
    }
    throw new Error(`Cloud method unavailable: ${(Array.isArray(names) ? names : [names]).join(' / ')}`);
  }

  function toast(message) {
    const el = $('adminToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function setCloud(stateName, text) {
    const el = $('cloudStatus');
    if (!el) return;
    el.dataset.state = stateName;
    const strong = el.querySelector('strong');
    if (strong) strong.textContent = text;
  }

  function log(type, action, record = '', details = '') {
    state.logs.unshift({
      date: new Date().toISOString(), type, action, record, user: 'Admin', details
    });
    state.logs = state.logs.slice(0, 500);
    write(KEYS.logs, state.logs);
    renderLogs();
  }

  function loadLocal() {
    const localProducts = read(KEYS.products, []);
    state.products = localProducts.length ? normaliseProducts(localProducts) : defaults();
    state.orders = normaliseOrders(read(KEYS.orders, []));
    state.bookings = normaliseBookings(read(KEYS.bookings, []));
    state.settings = { commissionRate: 15, ...read(KEYS.settings, {}) };
    state.logs = read(KEYS.logs, []);
  }

  async function loadBusinessData(showMessage = false) {
    setCloud('loading', 'Connecting to cloud…');
    let success = false;

    try {
      const [products, orders, bookings, settings] = await Promise.allSettled([
        cloudCall(['getProducts', 'loadProducts']),
        cloudCall(['getOrders', 'loadOrders']),
        cloudCall(['getSpaBookings', 'getBookings', 'loadBookings']),
        cloudCall(['getSettings', 'loadSettings'])
      ]);

      if (products.status === 'fulfilled') {
        const value = products.value;
        state.products = normaliseProducts(Array.isArray(value) ? value : value?.products);
        write(KEYS.products, state.products);
        success = true;
      }
      if (orders.status === 'fulfilled') {
        const value = orders.value;
        state.orders = normaliseOrders(Array.isArray(value) ? value : value?.orders);
        write(KEYS.orders, state.orders);
        success = true;
      }
      if (bookings.status === 'fulfilled') {
        const value = bookings.value;
        state.bookings = normaliseBookings(Array.isArray(value) ? value : value?.bookings);
        write(KEYS.bookings, state.bookings);
        success = true;
      }
      if (settings.status === 'fulfilled' && settings.value) {
        state.settings = { ...state.settings, ...(settings.value.settings || settings.value) };
        write(KEYS.settings, state.settings);
        success = true;
      }

      if (!success) throw new Error('No cloud endpoint responded.');

      state.cloudReady = true;
      setCloud('online', 'Cloud connected');
      updateCloudDetails(true);
      if (showMessage) toast('Business data refreshed');
    } catch (error) {
      console.warn('Cloud unavailable:', error);
      state.cloudReady = false;
      loadLocal();
      setCloud('offline', 'Cloud unavailable — local data shown');
      updateCloudDetails(false);
      if (showMessage) toast('Cloud unavailable. Local data loaded.');
    }

    renderAll();
  }

  function updateCloudDetails(online) {
    const values = {
      api: online ? 'Online' : 'Unavailable',
      products: `${state.products.length} loaded`,
      orders: `${state.orders.length} loaded`,
      lastSync: new Date().toLocaleString('en-NG'),
      lastBackup: localStorage.getItem('mayaLastBackup') || '—'
    };
    Object.entries(values).forEach(([key, value]) => {
      const el = document.querySelector(`[data-cloud-detail="${key}"]`);
      if (el) el.textContent = value;
    });
  }

  const VIEW_META = {
    dashboard: ['Dashboard', 'Monitor cloud activity, paid sales and business performance.'],
    orders: ['Orders', 'Review sales, payment confirmations and fulfilment status.'],
    products: ['Products', 'Manage the catalogue shown across the website.'],
    'spa-bookings': ['Spa bookings', 'Review and manage appointment requests.'],
    customers: ['Customers', 'View customer history and paid sales value.'],
    reports: ['Reports', 'Generate confirmed-paid-sales and commission reports.'],
    settings: ['Settings', 'Manage shared business information.'],
    logs: ['Activity logs', 'Review administrative and cloud activity.']
  };

  function switchView(name) {
    if (!VIEW_META[name]) return;

    $$('[data-admin-section]').forEach(section => {
      const active = section.dataset.adminSection === name;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });

    $$('[data-admin-view]').forEach(button => {
      const active = button.dataset.adminView === name;
      button.classList.toggle('active', active);
      active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
    });

    const [title, subtitle] = VIEW_META[name];
    const titleEl = document.querySelector('[data-admin-page-title]');
    const subtitleEl = document.querySelector('[data-admin-page-subtitle]');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    closeSidebar();
    history.replaceState(null, '', `#${name}`);
  }

  function openSidebar() {
    $('adminSidebar')?.classList.add('open');
    document.querySelector('[data-admin-overlay]')?.removeAttribute('hidden');
    document.body.classList.add('admin-sidebar-open');
  }

  function closeSidebar() {
    $('adminSidebar')?.classList.remove('open');
    document.querySelector('[data-admin-overlay]')?.setAttribute('hidden', '');
    document.body.classList.remove('admin-sidebar-open');
  }

  function isPaid(order) {
    return ['paid', 'completed'].includes(order.paymentStatus.toLowerCase()) ||
      order.status.toLowerCase() === 'completed';
  }

  function deriveCustomers() {
    const map = new Map();
    state.orders.forEach(order => {
      const key = (order.phone || order.email || order.customerName).toLowerCase();
      const item = map.get(key) || {
        name: order.customerName, phone: order.phone, email: order.email,
        orders: 0, paidValue: 0, lastActivity: order.date
      };
      item.orders += 1;
      if (isPaid(order)) item.paidValue += order.total;
      if (new Date(order.date) > new Date(item.lastActivity)) item.lastActivity = order.date;
      map.set(key, item);
    });
    state.customers = [...map.values()].sort(
      (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
    );
  }

  function setMetric(name, value) {
    const el = document.querySelector(`[data-metric="${name}"]`);
    if (el) el.textContent = value;
  }

  function renderDashboard() {
    const paid = state.orders.filter(isPaid);
    const pending = state.orders.filter(order => !isPaid(order) && order.status !== 'Cancelled');
    const paidSales = paid.reduce((sum, order) => sum + order.total, 0);
    const pendingSales = pending.reduce((sum, order) => sum + order.total, 0);
    const rate = Number(state.settings.commissionRate || 15);

    setMetric('paid-sales', money(paidSales));
    setMetric('pending-sales', money(pendingSales));
    setMetric('commission', money(paidSales * rate / 100));
    setMetric('paid-orders', String(paid.length));
    setMetric('spa-bookings', String(state.bookings.length));
    setMetric('customers', String(state.customers.length));

    const rateEl = document.querySelector('[data-commission-rate]');
    if (rateEl) rateEl.textContent = `${rate}%`;

    const body = document.querySelector('[data-dashboard-orders]');
    if (body) {
      const rows = state.orders.slice(0, 5);
      body.innerHTML = rows.length ? rows.map(order => `
        <tr>
          <td><strong>${escapeHtml(order.id)}</strong></td>
          <td>${escapeHtml(order.customerName)}</td>
          <td>${money(order.total)}</td>
          <td><span class="status-pill ${escapeHtml(order.status.toLowerCase())}">${escapeHtml(order.status)}</span></td>
        </tr>
      `).join('') : '<tr class="admin-table-empty"><td colspan="4">No orders loaded yet.</td></tr>';
    }
  }

  function filteredProducts() {
    return state.products.filter(product => {
      const hay = `${product.name} ${product.category} ${product.badge} ${product.status}`.toLowerCase();
      return (!state.productQuery || hay.includes(state.productQuery)) &&
        (state.productCategory === 'All' || product.category === state.productCategory);
    });
  }

  function renderProducts() {
    const stats = {
      statTotal: state.products.length,
      statFace: state.products.filter(p => p.category === 'Face Care').length,
      statBody: state.products.filter(p => p.category === 'Body Care').length,
      statGifts: state.products.filter(p => p.category === 'Gift Sets').length,
      statFeatured: state.products.filter(p => p.featured).length,
      statSoldOut: state.products.filter(p => p.status === 'soldout').length
    };
    Object.entries(stats).forEach(([id, value]) => { if ($(id)) $(id).textContent = value; });

    const list = filteredProducts();
    if ($('productCountText')) $('productCountText').textContent =
      `${list.length} of ${state.products.length} products`;
    if ($('adminEmptyState')) $('adminEmptyState').hidden = list.length > 0;

    if ($('adminProductList')) {
      $('adminProductList').innerHTML = list.map(product => `
        <article class="admin-item">
          ${product.image
            ? `<div class="cart-thumb product-art product-photo"><img src="${escapeHtml(product.image)}" alt=""></div>`
            : `<div class="cart-thumb product-art tone-${escapeHtml(product.tone)}"><div class="product-pack">MS</div></div>`}
          <div>
            <div class="admin-item-meta">
              <span>${escapeHtml(product.category)}</span>
              ${product.badge ? `<span>${escapeHtml(product.badge)}</span>` : ''}
              ${product.featured ? '<span>Featured</span>' : ''}
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${money(product.price)}${product.size ? ` · ${escapeHtml(product.size)}` : ''}</p>
            ${product.desc ? `<small>${escapeHtml(product.desc)}</small>` : ''}
          </div>
          <div class="admin-item-actions">
            <button type="button" data-edit="${escapeHtml(product.id)}">Edit</button>
            <button type="button" data-duplicate="${escapeHtml(product.id)}">Duplicate</button>
            <button type="button" class="delete" data-delete="${escapeHtml(product.id)}">Delete</button>
          </div>
        </article>
      `).join('');
    }
  }

  function clearForm() {
    $('productForm')?.reset();
    if ($('productId')) $('productId').value = '';
    if ($('productCategory')) $('productCategory').value = 'Face Care';
    if ($('productTone')) $('productTone').value = 'plum';
    if ($('productStatus')) $('productStatus').value = 'available';
    ['productImage', 'gallery1', 'gallery2', 'gallery3'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('formMode')) $('formMode').textContent = 'NEW PRODUCT';
    if ($('formTitle')) $('formTitle').textContent = 'Add product';
    if ($('cancelEdit')) $('cancelEdit').hidden = true;
    updatePreview();
  }

  function updatePreview() {
    if (!$('previewArt')) return;
    const image = $('productImage')?.value.trim() || '';
    const badge = $('productBadge')?.value.trim() || 'New';
    const art = $('previewArt');

    art.className = image
      ? 'product-art product-photo'
      : `product-art tone-${$('productTone')?.value || 'plum'}`;

    art.innerHTML = image
      ? `<span class="product-badge">${escapeHtml(badge)}</span><img src="${escapeHtml(image)}" alt="">`
      : `<span class="product-badge">${escapeHtml(badge)}</span><div class="product-pack">MS</div>`;

    if ($('previewCategory')) $('previewCategory').textContent = $('productCategory')?.value || 'Face Care';
    if ($('previewName')) $('previewName').textContent = $('productName')?.value.trim() || 'Your product';
    if ($('previewSize')) $('previewSize').textContent = $('productSize')?.value.trim() || 'Size';
    if ($('previewPrice')) $('previewPrice').textContent = money($('productPrice')?.value);
    if ($('descCount')) $('descCount').textContent = $('productDesc')?.value.length || 0;
  }

  async function saveProduct(product) {
    if (state.cloudReady) {
      const response = await cloudCall(['saveProduct', 'upsertProduct'], product);
      const list = response?.products || await cloudCall(['getProducts', 'loadProducts']);
      state.products = normaliseProducts(list);
    } else {
      const index = state.products.findIndex(item => item.id === product.id);
      if (index >= 0) state.products[index] = product;
      else state.products.unshift(product);
      write(KEYS.products, state.products);
    }
  }

  function renderOrders() {
    const list = state.orders.filter(order => {
      const hay = `${order.id} ${order.customerName} ${order.phone} ${order.email}`.toLowerCase();
      return (!state.orderQuery || hay.includes(state.orderQuery)) &&
        (state.orderStatus === 'All' || order.status === state.orderStatus) &&
        (state.orderPayment === 'All' || order.paymentStatus === state.orderPayment);
    });

    const count = document.querySelector('[data-orders-count]');
    if (count) count.textContent = `${list.length} orders`;

    const body = document.querySelector('[data-order-list]');
    if (body) body.innerHTML = list.length ? list.map(order => `
      <tr>
        <td><strong>${escapeHtml(order.id)}</strong></td>
        <td>${formatDate(order.date)}</td>
        <td>${escapeHtml(order.customerName)}<br><small>${escapeHtml(order.phone || order.email || '—')}</small></td>
        <td>${order.items.length}</td>
        <td>${money(order.total)}</td>
        <td><select data-order-payment-change="${escapeHtml(order.id)}">
          ${['Unconfirmed', 'Paid', 'Refunded'].map(v => `<option ${v === order.paymentStatus ? 'selected' : ''}>${v}</option>`).join('')}
        </select></td>
        <td><select data-order-status-change="${escapeHtml(order.id)}">
          ${['Pending', 'Paid', 'Preparing', 'Completed', 'Cancelled'].map(v => `<option ${v === order.status ? 'selected' : ''}>${v}</option>`).join('')}
        </select></td>
        <td><button type="button" data-delete-order="${escapeHtml(order.id)}">Delete</button></td>
      </tr>
    `).join('') : '<tr class="admin-table-empty"><td colspan="8">No orders found.</td></tr>';
  }

  function renderBookings() {
    const list = state.bookings.filter(booking => {
      const hay = `${booking.id} ${booking.customerName} ${booking.phone} ${booking.email}`.toLowerCase();
      return (!state.bookingQuery || hay.includes(state.bookingQuery)) &&
        (state.bookingStatus === 'All' || booking.status === state.bookingStatus);
    });

    const count = document.querySelector('[data-spa-bookings-count]');
    if (count) count.textContent = `${list.length} booking requests`;

    const body = document.querySelector('[data-spa-booking-list]');
    if (body) body.innerHTML = list.length ? list.map(booking => `
      <tr>
        <td><strong>${escapeHtml(booking.id)}</strong></td>
        <td>${formatDate(booking.createdAt)}</td>
        <td>${escapeHtml(booking.customerName)}<br><small>${escapeHtml(booking.phone || booking.email || '—')}</small></td>
        <td>${escapeHtml(booking.services.join(', ') || '—')}</td>
        <td>${money(booking.total)}</td>
        <td>${escapeHtml(booking.appointmentDate || '—')}</td>
        <td><select data-booking-status-change="${escapeHtml(booking.id)}">
          ${['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(v => `<option ${v === booking.status ? 'selected' : ''}>${v}</option>`).join('')}
        </select></td>
        <td><button type="button" data-delete-booking="${escapeHtml(booking.id)}">Delete</button></td>
      </tr>
    `).join('') : '<tr class="admin-table-empty"><td colspan="8">No spa bookings found.</td></tr>';
  }

  function renderCustomers() {
    const list = state.customers.filter(customer => {
      const hay = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
      return !state.customerQuery || hay.includes(state.customerQuery);
    });

    const count = document.querySelector('[data-customers-count]');
    if (count) count.textContent = `${list.length} customers`;

    const body = document.querySelector('[data-customer-list]');
    if (body) body.innerHTML = list.length ? list.map(customer => `
      <tr>
        <td><strong>${escapeHtml(customer.name)}</strong></td>
        <td>${escapeHtml(customer.phone || customer.email || '—')}</td>
        <td>${customer.orders}</td>
        <td>${money(customer.paidValue)}</td>
        <td>${formatDate(customer.lastActivity)}</td>
        <td></td>
      </tr>
    `).join('') : '<tr class="admin-table-empty"><td colspan="6">No customers found.</td></tr>';
  }

  function renderReport() {
    const startValue = document.querySelector('[data-report-start]')?.value;
    const endValue = document.querySelector('[data-report-end]')?.value;
    const start = startValue ? new Date(`${startValue}T00:00:00`) : new Date('1970-01-01');
    const end = endValue ? new Date(`${endValue}T23:59:59`) : new Date('2999-12-31');
    const rate = Number(state.settings.commissionRate || 15);

    state.reportRows = state.orders.filter(order => {
      const date = new Date(order.date);
      return isPaid(order) && date >= start && date <= end;
    }).map(order => ({
      date: order.date,
      order: order.id,
      customer: order.customerName,
      paidTotal: order.total,
      commission: order.total * rate / 100
    }));

    const paidSales = state.reportRows.reduce((sum, row) => sum + row.paidTotal, 0);
    const commissionDue = state.reportRows.reduce((sum, row) => sum + row.commission, 0);
    const metrics = {
      paidSales: money(paidSales),
      paidOrders: String(state.reportRows.length),
      commissionRate: `${rate}%`,
      commissionDue: money(commissionDue)
    };
    Object.entries(metrics).forEach(([key, value]) => {
      const el = document.querySelector(`[data-report-metric="${key}"]`);
      if (el) el.textContent = value;
    });

    const body = document.querySelector('[data-report-rows]');
    if (body) body.innerHTML = state.reportRows.length ? state.reportRows.map(row => `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td>${escapeHtml(row.order)}</td>
        <td>${escapeHtml(row.customer)}</td>
        <td>${money(row.paidTotal)}</td>
        <td>${money(row.commission)}</td>
      </tr>
    `).join('') : '<tr class="admin-table-empty"><td colspan="5">No confirmed paid sales found.</td></tr>';
  }

  function fillSettings() {
    const form = document.querySelector('[data-settings-form]');
    if (!form) return;
    Object.entries(state.settings).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    });
  }

  function renderLogs() {
    const list = state.logs.filter(item => {
      const hay = `${item.type} ${item.action} ${item.record} ${item.user} ${item.details}`.toLowerCase();
      return (!state.logQuery || hay.includes(state.logQuery)) &&
        (state.logType === 'All' || item.type === state.logType);
    });

    const body = document.querySelector('[data-log-list]');
    if (body) body.innerHTML = list.length ? list.map(item => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.action)}</td>
        <td>${escapeHtml(item.record || '—')}</td>
        <td>${escapeHtml(item.user || 'Admin')}</td>
        <td>${escapeHtml(item.details || '—')}</td>
      </tr>
    `).join('') : '<tr class="admin-table-empty"><td colspan="5">No activity logs found.</td></tr>';
  }

  function updateCounts() {
    const values = {
      orders: state.orders.length,
      products: state.products.length,
      'spa-bookings': state.bookings.length,
      customers: state.customers.length
    };
    Object.entries(values).forEach(([key, value]) => {
      const el = document.querySelector(`[data-nav-count="${key}"]`);
      if (el) el.textContent = value;
    });
  }

  function renderAll() {
    deriveCustomers();
    renderDashboard();
    renderProducts();
    renderOrders();
    renderBookings();
    renderCustomers();
    renderLogs();
    fillSettings();
    updateCounts();
  }

  function download(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv(filename, rows) {
    if (!rows.length) return toast('There is no data to export.');
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const value = Array.isArray(row[header]) ? row[header].join(' | ') : row[header] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    download(filename, csv, 'text/csv;charset=utf-8');
  }

  function bind() {
    $('togglePassword')?.addEventListener('click', () => {
      const input = $('adminPassword');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('togglePassword').textContent = show ? 'Hide' : 'Show';
    });

    $('loginForm')?.addEventListener('submit', event => {
      event.preventDefault();
      if ($('adminPassword').value.trim() === PASSCODE) {
        sessionStorage.setItem(AUTH_KEY, 'yes');
        $('loginError').textContent = '';
        showPanel();
        log('Authentication', 'Signed in', 'Admin');
      } else {
        $('loginError').textContent = 'Incorrect passcode. Please try again.';
      }
    });

    $('adminLogout')?.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
    });

    document.addEventListener('click', async event => {
      const nav = event.target.closest('[data-admin-view]');
      if (nav) return switchView(nav.dataset.adminView);

      const viewLink = event.target.closest('[data-admin-view-link]');
      if (viewLink) return switchView(viewLink.dataset.adminViewLink);

      if (event.target.closest('[data-admin-sidebar-open]')) return openSidebar();
      if (event.target.closest('[data-admin-sidebar-close], [data-admin-overlay]')) return closeSidebar();

      const edit = event.target.closest('[data-edit]');
      if (edit) {
        const p = state.products.find(item => item.id === edit.dataset.edit);
        if (!p) return;
        $('productId').value = p.id;
        $('productName').value = p.name;
        $('productCategory').value = p.category;
        $('productPrice').value = p.price;
        $('productSize').value = p.size || '';
        $('productBadge').value = p.badge || '';
        $('productDesc').value = p.desc || '';
        $('productTone').value = p.tone || 'plum';
        $('productStatus').value = p.status || 'available';
        $('productFeatured').checked = !!p.featured;
        $('productImage').value = p.image || '';
        $('gallery1').value = p.gallery?.[0] || '';
        $('gallery2').value = p.gallery?.[1] || '';
        $('gallery3').value = p.gallery?.[2] || '';
        $('productBenefits').value = (p.benefits || []).join('\n');
        $('productUse').value = p.use || '';
        $('formMode').textContent = 'EDITING PRODUCT';
        $('formTitle').textContent = 'Update product';
        $('cancelEdit').hidden = false;
        updatePreview();
        return;
      }

      const duplicate = event.target.closest('[data-duplicate]');
      if (duplicate) {
        const source = state.products.find(item => item.id === duplicate.dataset.duplicate);
        if (!source) return;
        const copy = { ...clone(source), id: `${source.id}-copy-${Date.now().toString().slice(-5)}`, name: `${source.name} Copy`, featured: false };
        await saveProduct(copy);
        write(KEYS.products, state.products);
        renderAll();
        log('Product', 'Duplicated product', source.name);
        return toast('Product duplicated');
      }

      const del = event.target.closest('[data-delete]');
      if (del) {
        const product = state.products.find(item => item.id === del.dataset.delete);
        if (!product || !confirm(`Delete “${product.name}”?`)) return;
        if (state.cloudReady) {
          const response = await cloudCall(['deleteProduct', 'removeProduct'], product.id);
          state.products = normaliseProducts(response?.products || state.products.filter(item => item.id !== product.id));
        } else {
          state.products = state.products.filter(item => item.id !== product.id);
        }
        write(KEYS.products, state.products);
        renderAll();
        log('Product', 'Deleted product', product.name);
        return toast('Product deleted');
      }

      const deleteOrder = event.target.closest('[data-delete-order]');
      if (deleteOrder && confirm(`Delete order ${deleteOrder.dataset.deleteOrder}?`)) {
        state.orders = state.orders.filter(o => o.id !== deleteOrder.dataset.deleteOrder);
        write(KEYS.orders, state.orders);
        renderAll();
        return;
      }

      const deleteBooking = event.target.closest('[data-delete-booking]');
      if (deleteBooking && confirm(`Delete booking ${deleteBooking.dataset.deleteBooking}?`)) {
        state.bookings = state.bookings.filter(b => b.id !== deleteBooking.dataset.deleteBooking);
        write(KEYS.bookings, state.bookings);
        renderAll();
      }
    });

    document.addEventListener('change', event => {
      const payment = event.target.closest('[data-order-payment-change]');
      if (payment) {
        const order = state.orders.find(o => o.id === payment.dataset.orderPaymentChange);
        if (order) order.paymentStatus = payment.value;
        write(KEYS.orders, state.orders);
        return renderAll();
      }

      const status = event.target.closest('[data-order-status-change]');
      if (status) {
        const order = state.orders.find(o => o.id === status.dataset.orderStatusChange);
        if (order) order.status = status.value;
        write(KEYS.orders, state.orders);
        return renderAll();
      }

      const booking = event.target.closest('[data-booking-status-change]');
      if (booking) {
        const item = state.bookings.find(b => b.id === booking.dataset.bookingStatusChange);
        if (item) item.status = booking.value;
        write(KEYS.bookings, state.bookings);
        renderAll();
      }
    });

    ['productName','productCategory','productPrice','productSize','productBadge','productDesc','productTone','productImage']
      .forEach(id => $(id)?.addEventListener('input', updatePreview));

    $('productForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const name = $('productName').value.trim();
      const price = Number($('productPrice').value);
      if (name.length < 2) return $('nameError').textContent = 'Enter a clear product name.';
      if (!Number.isFinite(price) || price < 1) return $('priceError').textContent = 'Enter a valid price.';

      const id = $('productId').value || slugify(name);
      const product = {
        id, name,
        category: $('productCategory').value,
        price,
        size: $('productSize').value.trim(),
        badge: $('productBadge').value.trim() || 'New',
        desc: $('productDesc').value.trim(),
        tone: $('productTone').value,
        status: $('productStatus').value,
        featured: $('productFeatured').checked,
        image: $('productImage').value.trim(),
        gallery: ['gallery1','gallery2','gallery3'].map(x => $(x).value.trim()).filter(Boolean),
        benefits: $('productBenefits').value.split('\n').map(x => x.trim()).filter(Boolean),
        use: $('productUse').value.trim()
      };

      await saveProduct(product);
      write(KEYS.products, state.products);
      clearForm();
      renderAll();
      log('Product', $('productId').value ? 'Updated product' : 'Added product', name);
      toast('Product saved');
    });

    $('clearForm')?.addEventListener('click', clearForm);
    $('cancelEdit')?.addEventListener('click', clearForm);
    $('adminSearch')?.addEventListener('input', e => { state.productQuery = e.target.value.toLowerCase().trim(); renderProducts(); });
    $('adminCategoryFilter')?.addEventListener('change', e => { state.productCategory = e.target.value; renderProducts(); });
    $('refreshCloud')?.addEventListener('click', () => loadBusinessData(true));
    document.querySelector('[data-refresh-business]')?.addEventListener('click', () => loadBusinessData(true));

    document.querySelector('[data-order-search]')?.addEventListener('input', e => { state.orderQuery = e.target.value.toLowerCase().trim(); renderOrders(); });
    document.querySelector('[data-order-status-filter]')?.addEventListener('change', e => { state.orderStatus = e.target.value; renderOrders(); });
    document.querySelector('[data-order-payment-filter]')?.addEventListener('change', e => { state.orderPayment = e.target.value; renderOrders(); });
    document.querySelector('[data-spa-booking-search]')?.addEventListener('input', e => { state.bookingQuery = e.target.value.toLowerCase().trim(); renderBookings(); });
    document.querySelector('[data-spa-booking-status-filter]')?.addEventListener('change', e => { state.bookingStatus = e.target.value; renderBookings(); });
    document.querySelector('[data-customer-search]')?.addEventListener('input', e => { state.customerQuery = e.target.value.toLowerCase().trim(); renderCustomers(); });
    document.querySelector('[data-log-search]')?.addEventListener('input', e => { state.logQuery = e.target.value.toLowerCase().trim(); renderLogs(); });
    document.querySelector('[data-log-type-filter]')?.addEventListener('change', e => { state.logType = e.target.value; renderLogs(); });
    document.querySelector('[data-generate-report]')?.addEventListener('click', renderReport);

    document.querySelector('[data-settings-form]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      data.commissionRate = Number(data.commissionRate || 15);
      state.settings = { ...state.settings, ...data };
      write(KEYS.settings, state.settings);
      if (state.cloudReady) {
        try { await cloudCall(['saveSettings', 'updateSettings'], state.settings); } catch {}
      }
      renderAll();
      log('Settings', 'Updated business settings', 'Settings');
      toast('Settings saved');
    });

    $('exportProducts')?.addEventListener('click', () => {
      download(`maya-secret-products-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(state.products, null, 2), 'application/json');
      localStorage.setItem('mayaLastBackup', new Date().toLocaleString('en-NG'));
    });
    document.querySelector('[data-export-orders]')?.addEventListener('click', () => exportCsv('maya-secret-orders.csv', state.orders));
    document.querySelector('[data-export-spa-bookings]')?.addEventListener('click', () => exportCsv('maya-secret-spa-bookings.csv', state.bookings));
    document.querySelector('[data-export-customers]')?.addEventListener('click', () => exportCsv('maya-secret-customers.csv', state.customers));
    document.querySelector('[data-export-logs]')?.addEventListener('click', () => exportCsv('maya-secret-activity-logs.csv', state.logs));
    $$('[data-export-report]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.exportReport === 'csv') exportCsv('maya-secret-commission-report.csv', state.reportRows);
      else toast(`${button.dataset.exportReport.toUpperCase()} export requires the cloud edition.`);
    }));
  }

  function showPanel() {
    $('adminLogin').hidden = true;
    $('adminPanel').hidden = false;
    switchView(location.hash.replace('#', '') || 'dashboard');
    loadBusinessData();
  }

  function init() {
    loadLocal();
    bind();
    renderAll();
    updatePreview();

    if (sessionStorage.getItem(AUTH_KEY) === 'yes') {
      showPanel();
    } else {
      $('adminLogin').hidden = false;
      $('adminPanel').hidden = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
