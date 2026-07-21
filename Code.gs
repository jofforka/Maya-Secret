/**
 * Maya's Secret Cloud Backend v7.0
 * Replace the contents of the existing Apps Script Code.gs with this file.
 * Then create a new deployment version of the existing Web App deployment.
 */

const MAYA_DB_NAME = 'Maya Secret Business Database';
const MAYA_VERSION = '7.0.0';
const MAYA_CACHE_SECONDS = 60;
const MAYA_BACKUP_FOLDER = 'Maya Secret Backups';
const COLLECTIONS = ['Products', 'Orders', 'Bookings', 'Customers', 'Logs'];

function doGet(e) {
  return routeRequest_((e && e.parameter) || {});
}

function doPost(e) {
  let payload = {};
  try {
    const contents = e && e.postData && e.postData.contents;
    if (!contents) throw new Error('Request body is empty.');
    payload = JSON.parse(contents);
  } catch (error) {
    return json_({ success: false, error: 'Invalid JSON payload.', details: error.message });
  }
  return routeRequest_(payload);
}

function routeRequest_(request) {
  const requestId = uniqueId_('REQ');
  const startedAt = Date.now();
  try {
    request = request && typeof request === 'object' ? request : {};
    const action = String(request.action || 'health').trim();
    console.log(JSON.stringify({ level: 'INFO', event: 'request.start', requestId: requestId, action: action }));
    switch (action) {
      case 'health': return json_({ success: true, status: 'ok', version: MAYA_VERSION, timestamp: isoNow_() });
      case 'version': return json_({ success: true, version: MAYA_VERSION });
      case 'getProducts': return json_({ success: true, products: getAll_('Products') });
      case 'saveProduct': return saveProductResponse_(request.product || {});
      case 'deleteProduct': return deleteRecordResponse_('Products', request.productId || request.id || (request.product && (request.product.id || request.product.productId)), 'product');
      case 'getOrders': return json_({ success: true, orders: getAll_('Orders') });
      case 'saveOrder': return saveOrder_(request.order);
      case 'updateOrder': return updateRecordResponse_('Orders', request.order, 'order');
      case 'getBookings': return json_({ success: true, bookings: getAll_('Bookings') });
      case 'saveBooking': return saveBooking_(request.booking);
      case 'updateBooking': return updateRecordResponse_('Bookings', request.booking, 'booking');
      case 'getCustomers': return json_({ success: true, customers: getAll_('Customers') });
      case 'saveCustomer': return saveCustomer_(request.customer);
      case 'getSettings': return json_({ success: true, settings: getSettings_() });
      case 'saveSettings': return saveSettings_(request.settings);
      case 'getDashboard': return json_(dashboard_());
      case 'getReports': return json_(reports_(request.filters || {}));
      case 'getLogs': return json_({ success: true, logs: getAll_('Logs') });
      case 'createBackup': return json_({ success: true, backup: createBackup_() });
      default: return json_({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR', event: 'request.failed', requestId: requestId,
      durationMs: Date.now() - startedAt,
      error: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : ''
    }));
    return json_({ success: false, requestId: requestId, error: error && error.message ? error.message : String(error) });
  }
}

function saveOrder_(raw) {
  const order = normalizeOrder_(raw || {});
  const saved = upsert_('Orders', order);
  upsertCustomerFromRecord_(saved, 'Product order');
  log_('Order saved', saved.id, saved.customerName || 'Guest', moneyText_(saved.total));
  return json_({ success: true, order: saved });
}

function saveBooking_(raw) {
  const booking = normalizeBooking_(raw || {});
  const saved = upsert_('Bookings', booking);
  upsertCustomerFromRecord_(saved, 'Spa booking');
  log_('Spa booking saved', saved.id, saved.customerName || 'Guest', moneyText_(saved.total));
  return json_({ success: true, booking: saved });
}

function saveCustomer_(raw) {
  const customer = normalizeCustomer_(raw || {});
  const saved = upsert_('Customers', customer);
  log_('Customer saved', saved.id, saved.name || 'Customer', saved.phone || saved.email || '');
  return json_({ success: true, customer: saved });
}

function saveProductResponse_(raw) {
  const incoming = validateProduct_(raw || {});
  const id = recordId_(incoming);
  let product;

  if (id) {
    const existing = findById_('Products', id);
    if (!existing) throw new Error('Product not found. ID=' + id);
    product = mergeDefined_(existing, incoming);
    product.id = id;
    product.productId = id;
    product.createdAt = existing.createdAt || product.createdAt;
  } else {
    product = incoming;
    product.id = uniqueId_('PRD');
    product.productId = product.id;
    product.createdAt = isoNow_();
  }

  product.updatedAt = isoNow_();
  const saved = upsert_('Products', product);
  log_(id ? 'Product updated' : 'Product created', saved.id, 'Admin', saved.name || '');
  return json_({ success: true, product: saved });
}

function validateProduct_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Product payload is required.');
  const product = Object.assign({}, raw);
  product.id = text_(raw.id || raw.productId);
  product.productId = product.id;
  product.name = text_(raw.name || raw.title);
  product.category = text_(raw.category) || 'Face Care';
  product.price = number_(raw.price);
  product.size = text_(raw.size);
  product.badge = text_(raw.badge);
  product.description = text_(raw.description || raw.desc || raw.shortDescription);
  product.use = text_(raw.use || raw.howToUse);
  product.image = text_(raw.image || raw.imageUrl);
  product.status = text_(raw.status) || 'Available';
  product.tone = text_(raw.tone) || 'plum';
  product.featured = raw.featured === true || raw.featured === 1 || /^(true|on|yes|1)$/i.test(text_(raw.featured));
  product.gallery = Array.isArray(raw.gallery) ? raw.gallery.map(text_).filter(Boolean).slice(0, 12) : [];
  product.benefits = Array.isArray(raw.benefits) ? raw.benefits.map(text_).filter(Boolean).slice(0, 30) : text_(raw.benefits).split(/\r?\n/).map(text_).filter(Boolean).slice(0, 30);
  if (!product.name) throw new Error('Product name is required.');
  if (!(product.price > 0)) throw new Error('Product price must be greater than zero.');
  return product;
}

function mergeDefined_(existing, incoming) {
  const result = Object.assign({}, existing);
  Object.keys(incoming || {}).forEach(function (key) {
    const value = incoming[key];
    if (value !== undefined && value !== null) {
      // Preserve an existing image when an edit form submits an empty image field.
      if (key === 'image' && value === '' && result.image) return;
      result[key] = value;
    }
  });
  return result;
}

function saveRecordResponse_(collection, raw, key) {
  const record = normalizeGeneric_(raw || {}, key.toUpperCase());
  const saved = upsert_(collection, record);
  log_(key + ' saved', saved.id, 'Admin', saved.name || '');
  const response = { success: true };
  response[key] = saved;
  return json_(response);
}

function updateRecordResponse_(collection, raw, key) {
  if (!raw || !recordId_(raw)) throw new Error('A valid ' + key + ' ID is required.');
  const existing = findById_(collection, recordId_(raw));
  if (!existing) throw new Error(capitalize_(key) + ' not found.');
  const merged = Object.assign({}, existing, raw, { id: recordId_(raw), updatedAt: isoNow_() });
  if (key === 'order') Object.assign(merged, normalizeOrder_(merged));
  if (key === 'booking') Object.assign(merged, normalizeBooking_(merged));
  const saved = upsert_(collection, merged);
  upsertCustomerFromRecord_(saved, key === 'order' ? 'Product order' : 'Spa booking');
  log_(capitalize_(key) + ' updated', saved.id, 'Admin', (saved.status || '') + ' / ' + (saved.paymentStatus || ''));
  const response = { success: true };
  response[key] = saved;
  return json_(response);
}

function deleteRecordResponse_(collection, id, key) {
  if (!id) throw new Error('A valid ' + key + ' ID is required.');
  const removed = removeById_(collection, id);
  if (!removed) throw new Error(capitalize_(key) + ' not found. ID=' + id);
  log_(capitalize_(key) + ' deleted', id, 'Admin', '');
  return json_({ success: true, deleted: removed });
}

function normalizeOrder_(raw) {
  const customer = raw.customer && typeof raw.customer === 'object' ? raw.customer : {};
  const id = recordId_(raw) || uniqueId_('MS');
  const items = Array.isArray(raw.items) ? raw.items.map(function (item) {
    const qty = number_(item.qty || item.quantity || 1);
    const price = number_(item.price);
    return Object.assign({}, item, { qty: qty, quantity: qty, price: price, subtotal: number_(item.subtotal || price * qty) });
  }) : [];
  const total = number_(raw.total || raw.grandTotal || raw.amount || items.reduce(function (sum, item) { return sum + item.subtotal; }, 0));
  const createdAt = validDateText_(raw.createdAt || raw.timestamp || raw.date) || isoNow_();
  return Object.assign({}, raw, {
    id: id,
    orderId: id,
    customerName: text_(raw.customerName || raw.name || customer.name) || 'Guest',
    customerPhone: text_(raw.customerPhone || raw.phone || customer.phone),
    customerEmail: text_(raw.customerEmail || raw.email || customer.email).toLowerCase(),
    customer: {
      name: text_(raw.customerName || raw.name || customer.name) || 'Guest',
      phone: text_(raw.customerPhone || raw.phone || customer.phone),
      email: text_(raw.customerEmail || raw.email || customer.email).toLowerCase()
    },
    items: items,
    total: total,
    grandTotal: total,
    status: text_(raw.status) || 'Pending',
    paymentStatus: text_(raw.paymentStatus || raw.payment_status) || 'Unpaid',
    source: text_(raw.source) || 'Website checkout',
    createdAt: createdAt,
    updatedAt: isoNow_()
  });
}

function normalizeBooking_(raw) {
  const customer = raw.customer && typeof raw.customer === 'object' ? raw.customer : {};
  const id = recordId_(raw) || uniqueId_('SPA');
  const createdAt = validDateText_(raw.createdAt || raw.timestamp || raw.date) || isoNow_();
  return Object.assign({}, raw, {
    id: id,
    bookingId: id,
    customerName: text_(raw.customerName || raw.name || raw.fullName || customer.name) || 'Guest',
    customerPhone: text_(raw.customerPhone || raw.phone || customer.phone),
    customerEmail: text_(raw.customerEmail || raw.email || customer.email).toLowerCase(),
    customer: {
      name: text_(raw.customerName || raw.name || raw.fullName || customer.name) || 'Guest',
      phone: text_(raw.customerPhone || raw.phone || customer.phone),
      email: text_(raw.customerEmail || raw.email || customer.email).toLowerCase()
    },
    total: number_(raw.total || raw.grandTotal || raw.amount),
    status: text_(raw.status) || 'Pending',
    paymentStatus: text_(raw.paymentStatus || raw.payment_status) || 'Unpaid',
    source: text_(raw.source) || 'Website spa booking',
    createdAt: createdAt,
    updatedAt: isoNow_()
  });
}

function normalizeCustomer_(raw) {
  const customer = raw.customer && typeof raw.customer === 'object' ? raw.customer : {};
  const name = text_(raw.name || raw.customerName || raw.fullName || customer.name) || 'Unnamed customer';
  const phone = text_(raw.phone || raw.customerPhone || customer.phone);
  const email = text_(raw.email || raw.customerEmail || customer.email).toLowerCase();
  const id = recordId_(raw) || customerId_(phone, email, name);
  return Object.assign({}, raw, {
    id: id,
    customerId: id,
    name: name,
    customerName: name,
    phone: phone,
    customerPhone: phone,
    email: email,
    customerEmail: email,
    createdAt: validDateText_(raw.createdAt || raw.timestamp || raw.date) || isoNow_(),
    updatedAt: isoNow_()
  });
}

function normalizeGeneric_(raw, prefix) {
  const id = recordId_(raw) || uniqueId_(prefix || 'REC');
  return Object.assign({}, raw, { id: id, createdAt: validDateText_(raw.createdAt) || isoNow_(), updatedAt: isoNow_() });
}

function upsertCustomerFromRecord_(record, source) {
  const customer = normalizeCustomer_({
    name: record.customerName || (record.customer && record.customer.name),
    phone: record.customerPhone || record.phone || (record.customer && record.customer.phone),
    email: record.customerEmail || record.email || (record.customer && record.customer.email),
    source: source,
    lastActivityAt: record.createdAt || isoNow_()
  });
  const existing = findCustomer_(customer.phone, customer.email, customer.name);
  const merged = Object.assign({}, existing || {}, customer, {
    id: existing ? existing.id : customer.id,
    createdAt: existing ? existing.createdAt : customer.createdAt,
    updatedAt: isoNow_(),
    lastActivityAt: record.createdAt || isoNow_(),
    interactions: number_((existing && existing.interactions) || 0) + 1
  });
  upsert_('Customers', merged);
}

function findCustomer_(phone, email, name) {
  const phoneKey = digits_(phone);
  const emailKey = text_(email).toLowerCase();
  const nameKey = text_(name).toLowerCase();
  return getAll_('Customers').find(function (c) {
    return (phoneKey && digits_(c.phone || c.customerPhone) === phoneKey) ||
      (emailKey && text_(c.email || c.customerEmail).toLowerCase() === emailKey) ||
      (!phoneKey && !emailKey && nameKey && text_(c.name || c.customerName).toLowerCase() === nameKey);
  }) || null;
}

function getSettings_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('maya:v7:Settings');
  if (cached) { try { return JSON.parse(cached); } catch (error) {} }
  const sheet = sheet_('Settings');
  const last = sheet.getLastRow();
  if (last < 2) return { commissionRate: 15, currency: 'NGN' };
  try {
    const settings = JSON.parse(String(sheet.getRange(2, 2).getValue() || '{}'));
    cache.put('maya:v7:Settings', JSON.stringify(settings), MAYA_CACHE_SECONDS);
    return settings;
  } catch (error) { return { commissionRate: 15, currency: 'NGN' }; }
}

function saveSettings_(settings) {
  ensureDailyBackup_();
  const value = Object.assign({ commissionRate: 15, currency: 'NGN' }, settings || {}, { updatedAt: isoNow_() });
  const sheet = sheet_('Settings');
  if (sheet.getLastRow() < 2) sheet.appendRow(['settings', JSON.stringify(value), isoNow_(), isoNow_()]);
  else sheet.getRange(2, 1, 1, 4).setValues([['settings', JSON.stringify(value), sheet.getRange(2, 3).getValue() || isoNow_(), isoNow_()]]);
  invalidateCache_('Settings');
  log_('Settings updated', 'settings', 'Admin', 'Commission: ' + number_(value.commissionRate || 15) + '%');
  return json_({ success: true, settings: value });
}

function dashboard_() {
  const orders = getAll_('Orders');
  const bookings = getAll_('Bookings');
  const customers = getAll_('Customers');
  const products = getAll_('Products');
  const settings = getSettings_();
  const rate = number_(settings.commissionRate || 15);
  const paidOrders = orders.filter(isApprovedOrder_);
  const approvedBookings = bookings.filter(isApprovedBooking_);
  const paidRevenue = paidOrders.reduce(sumTotal_, 0) + approvedBookings.reduce(sumTotal_, 0);
  const pendingRevenue = orders.filter(isPendingActive_).reduce(sumTotal_, 0) + bookings.filter(isPendingActive_).reduce(sumTotal_, 0);
  return {
    success: true,
    metrics: {
      paidRevenue: paidRevenue,
      pendingRevenue: pendingRevenue,
      commission: paidRevenue * rate / 100,
      totalOrders: orders.length,
      totalBookings: bookings.length,
      totalCustomers: customers.length,
      totalProducts: products.length
    },
    recentOrders: orders.slice(0, 10),
    recentBookings: bookings.slice(0, 10)
  };
}

function reports_(filters) {
  const settings = getSettings_();
  const rate = number_(settings.commissionRate || 15);
  const start = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
  const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
  const transactions = [];
  getAll_('Orders').forEach(function (o) { transactions.push(transaction_(o, 'Product order', isApprovedOrder_(o), rate)); });
  getAll_('Bookings').forEach(function (b) { transactions.push(transaction_(b, 'Spa booking', isApprovedBooking_(b), rate)); });
  const rows = transactions.filter(function (x) {
    if (isCancelled_(x)) return false;
    const d = new Date(x.createdAt);
    if (isNaN(d.getTime())) return !start && !end;
    return (!start || d >= start) && (!end || d <= end);
  }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return {
    success: true,
    transactions: rows,
    metrics: {
      transactionValue: rows.reduce(sumTotal_, 0),
      approvedTransactions: rows.filter(function (x) { return x.approved; }).length,
      commissionRate: rate,
      commissionDue: rows.filter(function (x) { return x.approved; }).reduce(function (s, x) { return s + x.commission; }, 0),
      pendingCommission: rows.filter(function (x) { return !x.approved; }).reduce(function (s, x) { return s + x.commission; }, 0)
    }
  };
}

function transaction_(record, type, approved, rate) {
  const total = number_(record.total || record.grandTotal || record.amount);
  return {
    id: recordId_(record),
    reference: recordId_(record),
    type: type,
    customer: text_(record.customerName || record.name || (record.customer && record.customer.name)) || 'Guest',
    total: total,
    status: record.status || 'Pending',
    paymentStatus: record.paymentStatus || 'Unpaid',
    approved: approved,
    commission: total * rate / 100,
    createdAt: validDateText_(record.createdAt || record.timestamp || record.date || record.bookingDate) || ''
  };
}

function getAll_(collection) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'maya:v7:' + collection;
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (error) { cache.remove(cacheKey); }
  }

  const sheet = sheet_(collection);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const records = sheet.getRange(2, 1, last - 1, 4).getValues().map(function (row) {
    try {
      const value = JSON.parse(String(row[1] || '{}'));
      if (!value.id) value.id = String(row[0] || '');
      return value;
    } catch (error) {
      console.error('Invalid JSON row in ' + collection + ': ' + error.message);
      return null;
    }
  }).filter(Boolean).sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  try { cache.put(cacheKey, JSON.stringify(records), MAYA_CACHE_SECONDS); } catch (error) {}
  return records;
}

function findById_(collection, id) {
  const key = String(id || '');
  return getAll_(collection).find(function (record) { return String(recordId_(record)) === key; }) || null;
}

function upsert_(collection, record) {
  ensureDailyBackup_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = sheet_(collection);
    const id = recordId_(record) || uniqueId_(collection.slice(0, 3).toUpperCase());
    record.id = id;
    const now = isoNow_();
    record.createdAt = validDateText_(record.createdAt) || now;
    record.updatedAt = now;
    const last = sheet.getLastRow();
    let rowIndex = -1;
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) { rowIndex = i + 2; break; }
    }
    const values = [id, JSON.stringify(record), record.createdAt, record.updatedAt];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, 4).setValues([values]);
    else sheet.appendRow(values);
    invalidateCache_(collection);
    return record;
  } finally { lock.releaseLock(); }
}

function removeById_(collection, id) {
  ensureDailyBackup_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = sheet_(collection);
    const last = sheet.getLastRow();
    if (last < 2) return false;
    const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 2);
        invalidateCache_(collection);
        return true;
      }
    }
    return false;
  } finally { lock.releaseLock(); }
}

function sheet_(name) {
  const ss = database_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(['ID', 'JSON', 'Created At', 'Updated At']);
  return sheet;
}

function database_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('MAYA_DATABASE_ID');
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (error) { ss = null; }
  }
  if (!ss) {
    const files = DriveApp.getFilesByName(MAYA_DB_NAME);
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) { ss = SpreadsheetApp.open(file); break; }
    }
  }
  if (!ss) ss = SpreadsheetApp.create(MAYA_DB_NAME);
  props.setProperty('MAYA_DATABASE_ID', ss.getId());
  COLLECTIONS.concat(['Settings']).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(['ID', 'JSON', 'Created At', 'Updated At']);
  });
  return ss;
}

function log_(action, record, user, details) {
  try {
    upsert_('Logs', {
      id: uniqueId_('LOG'), action: action, record: record || '—', recordId: record || '—',
      user: user || 'System', actor: user || 'System', details: details || '', createdAt: isoNow_()
    });
  } catch (error) { console.error('Log write failed', error); }
}

function invalidateCache_(collection) {
  CacheService.getScriptCache().remove('maya:v7:' + collection);
}

function ensureDailyBackup_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (props.getProperty('MAYA_LAST_AUTO_BACKUP') === today) return;
  try {
    createBackup_('auto');
    props.setProperty('MAYA_LAST_AUTO_BACKUP', today);
  } catch (error) {
    console.error('Automatic backup failed: ' + error.message);
  }
}

function backupFolder_() {
  const folders = DriveApp.getFoldersByName(MAYA_BACKUP_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(MAYA_BACKUP_FOLDER);
}

function createBackup_(reason) {
  const payload = { version: MAYA_VERSION, createdAt: isoNow_(), settings: getSettings_() };
  COLLECTIONS.forEach(function (name) { payload[name.toLowerCase()] = getAll_(name); });
  payload.reason = reason || 'manual';
  const file = backupFolder_().createFile('maya-secret-backup-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '.json', JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  return { fileId: file.getId(), name: file.getName(), url: file.getUrl() };
}

function isApprovedOrder_(r) { return /(paid|completed|complete|successful|success)/i.test(String(r.paymentStatus || r.status || '')); }
function isApprovedBooking_(r) { return /(confirmed|completed|complete|paid)/i.test(String(r.paymentStatus || r.status || '')); }
function isCancelled_(r) { return /cancel/i.test(String(r.status || '')); }
function isPendingActive_(r) { return !isCancelled_(r) && !isApprovedOrder_(r) && !isApprovedBooking_(r); }
function sumTotal_(sum, r) { return sum + number_(r.total || r.grandTotal || r.amount); }
function recordId_(r) { return text_(r && (r.id || r.orderId || r.bookingId || r.customerId || r.productId)); }
function customerId_(phone, email, name) { return 'CUS-' + Utilities.base64EncodeWebSafe(digits_(phone) || text_(email).toLowerCase() || text_(name).toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 18); }
function uniqueId_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase(); }
function validDateText_(v) { if (!v) return ''; const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toISOString(); }
function isoNow_() { return new Date().toISOString(); }
function text_(v) { return String(v == null ? '' : v).trim(); }
function digits_(v) { return text_(v).replace(/\D/g, ''); }
function number_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function moneyText_(v) { return 'NGN ' + number_(v).toFixed(2); }
function capitalize_(v) { v = String(v || ''); return v.charAt(0).toUpperCase() + v.slice(1); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
