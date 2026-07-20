(function(window, document){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const money = v => '₦' + num(v).toLocaleString('en-NG',{maximumFractionDigits:0});
  const date = v => { const d=new Date(v); return Number.isNaN(d.getTime()) ? (v||'—') : d.toLocaleString(); };
  const state = () => window.BusinessAdmin?.getState?.() || window.MayaAdmin?.getState?.() || {orders:[],bookings:[],settings:{}};
  const cloud = () => window.BusinessCloud || window.MayaCloud;
  const rate = () => num(state().settings?.commissionRate || 15);
  const lower = v => String(v||'').toLowerCase();
  const isPaidOrder = o => ['paid','completed','complete','successful'].some(x => lower(o.paymentStatus||o.status).includes(x));
  const isApprovedBooking = b => ['confirmed','completed','complete','paid'].some(x => lower(b.paymentStatus||b.status).includes(x));
  const isCancelled = r => lower(r.status).includes('cancel');
  const itemText = o => Array.isArray(o.items) ? o.items.map(i=>`${i.name||'Item'} × ${i.qty||i.quantity||1}`).join(', ') : '—';
  const serviceText = b => Array.isArray(b.services) ? b.services.map(s=>typeof s==='string'?s:(s.name||s.service||'Service')).join(', ') : (b.service||b.services||'—');
  function actionButtons(type, record){
    const id=record.id||record.orderId||record.bookingId||'';
    if(type==='order') return `<div class="transaction-actions"><button data-transaction-action="approve-order" data-record-id="${esc(id)}">Approve paid</button><button data-transaction-action="pending-order" data-record-id="${esc(id)}">Pending</button><button data-transaction-action="cancel-order" data-record-id="${esc(id)}">Cancel</button></div>`;
    return `<div class="transaction-actions"><button data-transaction-action="confirm-booking" data-record-id="${esc(id)}">Confirm</button><button data-transaction-action="complete-booking" data-record-id="${esc(id)}">Complete</button><button data-transaction-action="pending-booking" data-record-id="${esc(id)}">Pending</button><button data-transaction-action="cancel-booking" data-record-id="${esc(id)}">Cancel</button></div>`;
  }
  function renderOrders(){
    const body=$('[data-order-list]'); if(!body) return;
    const rows=state().orders||[];
    body.innerHTML=rows.length?rows.map(o=>`<tr><td>${esc(o.id||o.orderId||'—')}</td><td>${esc(date(o.createdAt||o.date))}</td><td>${esc(o.customerName||o.customer?.name||'Guest')}<small>${esc(o.customerPhone||o.customer?.phone||'')}</small></td><td>${esc(itemText(o))}</td><td>${money(o.total||o.grandTotal)}</td><td><span class="status-pill ${isPaidOrder(o)?'success':'pending'}">${esc(o.paymentStatus||'Unpaid')}</span></td><td><span class="status-pill ${isCancelled(o)?'danger':isPaidOrder(o)?'success':'pending'}">${esc(o.status||'Pending')}</span></td><td>${actionButtons('order',o)}</td></tr>`).join(''):'<tr class="admin-table-empty"><td colspan="8">No orders loaded yet.</td></tr>';
    const count=$('[data-orders-count]'); if(count) count.textContent=`${rows.length} order${rows.length===1?'':'s'}`;
  }
  function renderBookings(){
    const body=$('[data-spa-booking-list]'); if(!body) return;
    const rows=state().bookings||[];
    body.innerHTML=rows.length?rows.map(b=>`<tr><td>${esc(b.id||b.bookingId||'—')}</td><td>${esc(date(b.createdAt))}</td><td>${esc(b.customerName||b.customer?.name||'Guest')}<small>${esc(b.phone||b.customerPhone||'')}</small></td><td>${esc(serviceText(b))}</td><td>${money(b.total)}</td><td>${esc((b.bookingDate||b.date||'—')+' '+(b.bookingTime||''))}</td><td><span class="status-pill ${isCancelled(b)?'danger':isApprovedBooking(b)?'success':'pending'}">${esc(b.status||'Pending')}</span></td><td>${actionButtons('booking',b)}</td></tr>`).join(''):'<tr class="admin-table-empty"><td colspan="8">No spa bookings loaded yet.</td></tr>';
  }
  function inRange(r){
    const start=$('#reportStartDate')?.value; const end=$('#reportEndDate')?.value; const d=new Date(r.createdAt||r.date||r.bookingDate);
    if(Number.isNaN(d.getTime())) return !start&&!end;
    if(start && d < new Date(start+'T00:00:00')) return false;
    if(end && d > new Date(end+'T23:59:59')) return false;
    return true;
  }
  function renderReports(){
    const r=rate();
    const tx=[...(state().orders||[]).map(o=>({type:'Product order',id:o.id||o.orderId,customer:o.customerName||o.customer?.name||'Guest',total:num(o.total||o.grandTotal),createdAt:o.createdAt,status:o.status||'Pending',approved:isPaidOrder(o),cancelled:isCancelled(o)})),...(state().bookings||[]).map(b=>({type:'Spa booking',id:b.id||b.bookingId,customer:b.customerName||b.customer?.name||'Guest',total:num(b.total),createdAt:b.createdAt||b.bookingDate,status:b.status||'Pending',approved:isApprovedBooking(b),cancelled:isCancelled(b)}))].filter(inRange).filter(x=>!x.cancelled).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const earned=tx.filter(x=>x.approved).reduce((s,x)=>s+x.total*r/100,0);
    const pending=tx.filter(x=>!x.approved).reduce((s,x)=>s+x.total*r/100,0);
    const total=tx.reduce((s,x)=>s+x.total,0);
    const map={transactionValue:money(total),approvedTransactions:tx.filter(x=>x.approved).length,commissionRate:r+'%',commissionDue:money(earned),pendingCommission:money(pending)};
    Object.entries(map).forEach(([k,v])=>{ const el=$(`[data-report-metric="${k}"]`); if(el) el.textContent=v; });
    const body=$('[data-report-rows]'); if(body) body.innerHTML=tx.length?tx.map(x=>`<tr><td>${esc(date(x.createdAt))}</td><td>${esc(x.type)}</td><td>${esc(x.id||'—')}</td><td>${esc(x.customer)}</td><td>${money(x.total)}</td><td><span class="status-pill ${x.approved?'success':'pending'}">${x.approved?'Earned':'Pending'}</span></td><td>${money(x.total*r/100)}</td></tr>`).join(''):'<tr class="admin-table-empty"><td colspan="7">No transactions in this period.</td></tr>';
    window.MayaReportRows=tx;
  }
  async function update(type,id,patch,button){
    const s=state(); const list=type==='order'?s.orders:s.bookings; const record=list.find(r=>String(r.id||r.orderId||r.bookingId)===String(id));
    if(!record) return;
    const updated=Object.assign({},record,patch,{updatedAt:new Date().toISOString()});
    button.disabled=true;
    try{
      const c=cloud(); if(!c) throw new Error('Cloud service unavailable'); if(c.init) await c.init();
      const response=await c[type==='order'?'updateOrder':'updateBooking'](updated);
      if(response?.success===false) throw new Error(response.error||response.message||'Update failed');
      Object.assign(record,updated); renderAll();
      window.BusinessUI?.toast?.(`${type==='order'?'Order':'Booking'} updated successfully.`,'success');
    }catch(e){ console.error(e); window.BusinessUI?.toast?.(e.message||'Could not update record.','error'); }
    finally{button.disabled=false;}
  }
  function renderAll(){renderOrders();renderBookings();renderReports();}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-transaction-action]');
    if(!b){ if(e.target.closest('[data-generate-report]')) setTimeout(renderReports,0); return; }
    const a=b.dataset.transactionAction,id=b.dataset.recordId;
    const actions={
      'approve-order':['order',{status:'Completed',paymentStatus:'Paid',approvedAt:new Date().toISOString()}],
      'pending-order':['order',{status:'Pending',paymentStatus:'Unpaid'}],
      'cancel-order':['order',{status:'Cancelled'}],
      'confirm-booking':['booking',{status:'Confirmed',paymentStatus:'Paid',approvedAt:new Date().toISOString()}],
      'complete-booking':['booking',{status:'Completed',paymentStatus:'Paid',completedAt:new Date().toISOString()}],
      'pending-booking':['booking',{status:'Pending',paymentStatus:'Unpaid'}],
      'cancel-booking':['booking',{status:'Cancelled'}]
    };
    const x=actions[a]; if(x) update(x[0],id,x[1],b);
  });
  document.addEventListener('admin:refreshed',()=>setTimeout(renderAll,50));
  document.addEventListener('admin:viewChanged',()=>setTimeout(renderAll,100));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(renderAll,800));
})(window,document);
