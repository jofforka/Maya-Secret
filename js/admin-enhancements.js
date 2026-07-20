(function (window, document) {
  'use strict';

  const Admin = window.BusinessAdmin || window.MayaAdmin || window.Admin;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const safe = v => Array.isArray(v) ? v : [];
  const text = v => String(v == null ? '' : v).trim();
  const lower = v => text(v).toLowerCase();
  const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const dateValue = v => {
    const d = new Date(v || 0);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const esc = v => text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function state(){
    if (Admin && typeof Admin.getState === 'function') return Admin.getState();
    return Admin && Admin.state ? Admin.state : {};
  }

  function personFrom(record, source){
    const customer = record && typeof record.customer === 'object' ? record.customer : {};
    const name = text(record.customerName || record.name || record.fullName || customer.name || customer.fullName);
    const email = lower(record.customerEmail || record.email || customer.email);
    const phone = text(record.customerPhone || record.phone || record.phoneNumber || customer.phone || customer.phoneNumber).replace(/\s+/g,'');
    if (!name && !email && !phone) return null;
    const createdAt = record.createdAt || record.timestamp || record.date || record.bookingDate || new Date().toISOString();
    return { name: name || 'Unnamed customer', email, phone, createdAt, source, interactions: 1 };
  }

  function customerKey(person){
    if (person.phone) return 'p:' + person.phone.replace(/\D/g,'');
    if (person.email) return 'e:' + person.email;
    return 'n:' + lower(person.name);
  }

  function deriveCustomers(){
    const s = state();
    const all = [];
    safe(s.customers).forEach(c => all.push(personFrom(c, c.source || 'Customer record')));
    safe(s.orders).forEach(o => all.push(personFrom(o, 'Product order')));
    safe(s.bookings).forEach(b => all.push(personFrom(b, 'Spa booking')));
    const map = new Map();
    all.filter(Boolean).forEach(person => {
      const key = customerKey(person);
      if (!key || key === 'n:') return;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {...person, sources: [person.source]});
      } else {
        existing.name = existing.name === 'Unnamed customer' ? person.name : existing.name;
        existing.email = existing.email || person.email;
        existing.phone = existing.phone || person.phone;
        existing.interactions += 1;
        if (!existing.sources.includes(person.source)) existing.sources.push(person.source);
        const a = dateValue(existing.createdAt), b = dateValue(person.createdAt);
        if (a && b && b < a) existing.createdAt = person.createdAt;
      }
    });
    return Array.from(map.values()).sort((a,b) => (dateValue(b.createdAt)?.getTime()||0) - (dateValue(a.createdAt)?.getTime()||0));
  }

  function renderCustomers(){
    const customers = deriveCustomers();
    const s = state();
    s.customers = customers;
    const body = $('[data-customer-list], [data-customers-body], #customersTableBody');
    if (body) {
      body.innerHTML = customers.length ? customers.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.email || '—')}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.sources.join(' + '))}</td><td>${c.interactions}</td><td>${esc(dateValue(c.createdAt)?.toLocaleString() || '—')}</td></tr>`).join('') : '<tr class="admin-table-empty"><td colspan="6">No customers yet. Customers appear automatically after a product order or spa booking.</td></tr>';
      const table = body.closest('table');
      if (table) {
        const head = table.querySelector('thead tr');
        if (head && head.children.length !== 6) head.innerHTML = '<th>Customer</th><th>Email</th><th>Phone</th><th>Source</th><th>Activity</th><th>First activity</th>';
      }
    }
    $$('[data-dashboard-customers], [data-nav-count="customers"]').forEach(el => { el.textContent = customers.length; el.hidden = false; });
    const count = $('[data-customers-count]');
    if (count) count.textContent = `${customers.length} unique customer${customers.length === 1 ? '' : 's'}`;
  }

  function isPaid(order){
    const status = lower(order.paymentStatus || order.payment_status || order.status);
    return ['paid','confirmed paid','payment confirmed','completed','complete','successful','success'].some(x => status.includes(x));
  }

  function commissionRate(){
    const s = state();
    return number(s.settings?.commissionRate || 15);
  }

  function filteredPaidOrders(){
    const start = dateValue($('#reportStartDate')?.value);
    const end = dateValue($('#reportEndDate')?.value);
    if (end) end.setHours(23,59,59,999);
    return safe(state().orders).filter(isPaid).filter(o => {
      const d = dateValue(o.createdAt || o.date || o.timestamp);
      if (!d) return !start && !end;
      return (!start || d >= start) && (!end || d <= end);
    });
  }

  function renderReports(){
    const orders = filteredPaidOrders();
    const rate = commissionRate();
    const paidSales = orders.reduce((sum,o) => sum + number(o.total || o.grandTotal || o.amount), 0);
    const commission = paidSales * rate / 100;
    const money = v => '₦' + number(v).toLocaleString('en-NG', {maximumFractionDigits:0});
    const values = {paidSales: money(paidSales), paidOrders: orders.length, commissionRate: `${rate}%`, commissionDue: money(commission)};
    Object.entries(values).forEach(([key,value]) => { const el=$(`[data-report-metric="${key}"]`); if(el) el.textContent=value; });
    const body = $('[data-report-rows]');
    if (body) body.innerHTML = orders.length ? orders.map(o => {
      const total = number(o.total || o.grandTotal || o.amount);
      const customer = o.customerName || o.name || o.customer?.name || 'Guest';
      return `<tr><td>${esc(dateValue(o.createdAt || o.date)?.toLocaleDateString() || '—')}</td><td>${esc(o.id || o.orderId || '—')}</td><td>${esc(customer)}</td><td>${money(total)}</td><td>${money(total*rate/100)}</td></tr>`;
    }).join('') : '<tr class="admin-table-empty"><td colspan="5">No confirmed paid sales in this period.</td></tr>';
    window.MayaReportRows = orders;
  }

  function activityRows(){
    const s = state();
    const rows = [];
    safe(s.logs).forEach(log => rows.push({date:log.timestamp||log.createdAt, action:log.action||'Cloud activity', record:log.record||log.recordId||'—', user:log.user||log.actor||'System', details:log.details||log.module||''}));
    safe(s.orders).forEach(o => rows.push({date:o.createdAt||o.date, action:'Product order', record:o.id||o.orderId||'Order', user:o.customerName||o.customer?.name||'Guest', details:`${o.status||'Pending'} · ${o.paymentStatus||'Unpaid'}`}));
    safe(s.bookings).forEach(b => rows.push({date:b.createdAt||b.date||b.bookingDate, action:'Spa booking', record:b.id||b.bookingId||'Booking', user:b.customerName||b.name||b.customer?.name||'Guest', details:`${b.service||b.services||'Spa service'} · ${b.status||'Pending'}`}));
    safe(s.products).forEach(p => rows.push({date:p.updatedAt||p.createdAt, action:'Product catalogue', record:p.name||p.id, user:'Admin', details:p.status||'Available'}));
    return rows.sort((a,b)=>(dateValue(b.date)?.getTime()||0)-(dateValue(a.date)?.getTime()||0));
  }

  function renderLogs(){
    const query = lower($('[data-log-search]')?.value);
    const type = lower($('[data-log-type-filter]')?.value);
    let rows = activityRows();
    if (query) rows = rows.filter(r => lower(Object.values(r).join(' ')).includes(query));
    if (type && type !== 'all' && type !== 'all activity') rows = rows.filter(r => lower(r.action).includes(type.replace('product','product').replace('booking','spa booking')));
    const body = $('[data-log-list], [data-logs-body], #logsTableBody');
    if (body) body.innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(dateValue(r.date)?.toLocaleString() || '—')}</td><td>${esc(r.action)}</td><td>${esc(r.record)}</td><td>${esc(r.user)}</td><td>${esc(r.details)}</td></tr>`).join('') : '<tr class="admin-table-empty"><td colspan="5">No matching activity found.</td></tr>';
  }

  function applySettingsPreview(settings){
    const notice = $('[data-settings-reflection]');
    if (notice) notice.innerHTML = `<strong>Currently reflected:</strong> business name, WhatsApp number, email, location and announcement on the Shop page; currency and commission rate in Admin reports. Changes require the Shop page to be refreshed.`;
    localStorage.setItem('mayaBusinessSettings', JSON.stringify(settings || state().settings || {}));
  }

  function sync(){
    renderCustomers();
    renderReports();
    renderLogs();
    applySettingsPreview(state().settings || {});
  }

  document.addEventListener('admin:ready', sync);
  document.addEventListener('admin:refreshed', sync);
  document.addEventListener('click', e => {
    if (e.target.closest('[data-generate-report]')) renderReports();
    if (e.target.closest('[data-refresh-logs]')) renderLogs();
    if (e.target.closest('[data-reload-settings]')) setTimeout(sync, 500);
  });
  document.addEventListener('input', e => { if (e.target.matches('[data-log-search], [data-log-type-filter]')) renderLogs(); });
  document.addEventListener('submit', e => { if (e.target.matches('[data-settings-form], #settingsForm')) setTimeout(() => applySettingsPreview(state().settings), 600); });
  document.addEventListener('admin:viewChanged', e => setTimeout(() => { const v=e.detail?.view; if(v==='customers') renderCustomers(); if(v==='reports') renderReports(); if(v==='logs') renderLogs(); }, 150));
  setTimeout(sync, 1600);
})(window, document);
