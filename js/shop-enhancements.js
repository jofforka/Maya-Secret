(function(window,document){
  'use strict';
  function apply(settings){
    if(!settings || typeof settings!=='object') return;
    const phone=String(settings.phone||'').replace(/\D/g,'');
    if(settings.announcement){ const bar=document.querySelector('.announce'); if(bar) bar.textContent=settings.announcement; }
    if(settings.businessName){ document.querySelectorAll('[data-business-name]').forEach(x=>x.textContent=settings.businessName); }
    if(settings.email){ document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.href='mailto:'+settings.email; a.textContent=settings.email;}); }
    if(settings.location){ const footer=document.querySelector('.footer'); const p=footer && Array.from(footer.querySelectorAll('p')).find(x=>/Abuja, Nigeria/i.test(x.textContent)); if(p) p.textContent=settings.location; }
    if(phone){ document.querySelectorAll('a[href*="wa.me"],a[href^="tel:"]').forEach(a=>{ if(a.href.includes('wa.me')) a.href=a.href.replace(/wa\.me\/\d+/, 'wa.me/'+phone.replace(/^0/,'234')); else {a.href='tel:+'+phone.replace(/^0/,'234'); a.textContent=settings.phone;} }); }
  }
  try{ apply(JSON.parse(localStorage.getItem('mayaBusinessSettings')||'{}')); }catch(e){}
  document.addEventListener('DOMContentLoaded', async()=>{
    try{ if(window.BusinessCloud?.getSettings){ const r=await BusinessCloud.getSettings(); const s=r?.settings||r?.data?.settings||r?.data||r; apply(s); if(s&&typeof s==='object') localStorage.setItem('mayaBusinessSettings',JSON.stringify(s)); } }catch(e){ console.info('Using saved business settings.'); }
  });
})(window,document);
