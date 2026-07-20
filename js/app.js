const CART_KEY = 'mayaCart';
const cloneBundledProducts = () => (Array.isArray(window.MAYA_DEFAULT_PRODUCTS) ? window.MAYA_DEFAULT_PRODUCTS : []).map(p => ({...p, gallery:[...(p.gallery||[])], benefits:[...(p.benefits||[])]}));
let products = cloneBundledProducts();
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let activeProduct = null;
let modalQty = 1;
let lastCheckoutWhatsAppUrl = '';
const money = n => '₦' + Number(n || 0).toLocaleString('en-NG');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function productVisual(p, extraClass = '') {
  if (p.image) {
    return `<div class="product-art product-photo ${extraClass}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`;
  }
  return `<div class="product-art tone-${esc(p.tone || 'cream')} ${extraClass}"><div class="product-pack" aria-label="Product image unavailable"></div></div>`;
}

function card(p) {
  return `<article class="product-card" data-product-card="${esc(p.id)}">
    <button class="product-open" data-view="${esc(p.id)}" type="button" aria-label="View ${esc(p.name)} details">
      ${productVisual(p)}
      <span class="product-badge">${esc(p.badge || p.category)}</span>
      <span class="product-view-label">View product</span>
    </button>
    <div class="product-info">
      <p>${esc(p.category)}</p>
      <h3><button class="product-title-button" data-view="${esc(p.id)}" type="button">${esc(p.name)}</button></h3>
      <small>${esc(p.size || '')}</small>
      <strong>${money(p.price)}</strong>
    </div>
    <button class="add-btn" data-add="${esc(p.id)}" type="button" ${p.status==='soldout'?'disabled':''}>${p.status==='soldout'?'Sold out':'Add to bag'}</button>
  </article>`;
}

function renderFeatured() {
  document.querySelectorAll('[data-products="featured"]').forEach(el => {
    const featured = products.filter(p => p.featured && p.status !== 'soldout');
    el.innerHTML = (featured.length ? featured : products.filter(p => p.status !== 'soldout')).slice(0, 4).map(card).join('');
  });
}
function renderShop(list = products) {
  const grid = document.querySelector('#shopGrid');
  if (!grid) return;
  grid.innerHTML = list.map(card).join('');
  const noResults = document.querySelector('.no-results');
  if (noResults) noResults.hidden = !!list.length;
}

function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); drawCart(); renderCheckout(); }
function add(id, qty = 1) {
  const item = cart.find(x => x.id === id);
  item ? item.qty += qty : cart.push({ id, qty });
  saveCart();
  const product = products.find(x => x.id === id);
  toast(`${product?.name || 'Product'} added to your bag`);
}
function change(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) cart = cart.filter(x => x.id !== id);
  saveCart();
}
function drawCart() {
  document.querySelectorAll('.bag-count').forEach(x => x.textContent = cart.reduce((s, i) => s + i.qty, 0));
  const lines = document.querySelector('.cart-lines');
  const empty = document.querySelector('.cart-empty');
  const foot = document.querySelector('.cart-foot');
  if (!lines) return;
  if (!cart.length) {
    lines.innerHTML = '';
    empty.style.display = 'block';
    foot.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  foot.style.display = 'block';
  lines.innerHTML = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    if (!p) return '';
    return `<div class="cart-line">${productVisual(p, 'cart-thumb')}<div><p>${esc(p.category)}</p><h3>${esc(p.name)}</h3><strong>${money(p.price * i.qty)}</strong><div class="qty"><button data-minus="${esc(p.id)}" type="button">−</button><span>${i.qty}</span><button data-plus="${esc(p.id)}" type="button">+</button></div></div><button class="remove" data-remove="${esc(p.id)}" type="button" aria-label="Remove ${esc(p.name)}">×</button></div>`;
  }).join('');
  document.querySelector('.cart-total').textContent = money(cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0));
}
const openCart = () => {
  const cartDrawer = document.querySelector('[data-cart], .cart');
  const overlay = document.querySelector('[data-overlay], .overlay');
  if (!cartDrawer) return;
  cartDrawer.removeAttribute('inert');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartDrawer.classList.add('open');
  if (overlay) {
    overlay.hidden = false;
    overlay.classList.add('open');
  }
  document.querySelectorAll('[data-cart-toggle], .bag-toggle, .floating-bag').forEach(button => button.setAttribute('aria-expanded', 'true'));
  document.body.classList.add('no-scroll');
  cartDrawer.querySelector('[data-cart-close], .cart-close')?.focus({preventScroll:true});
};
const closeCart = () => {
  const cartDrawer = document.querySelector('[data-cart], .cart');
  const overlay = document.querySelector('[data-overlay], .overlay');
  cartDrawer?.classList.remove('open');
  cartDrawer?.setAttribute('aria-hidden', 'true');
  cartDrawer?.setAttribute('inert', '');
  document.querySelectorAll('[data-cart-toggle], .bag-toggle, .floating-bag').forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (!document.querySelector('.product-modal.open') && overlay) {
    overlay.classList.remove('open');
    window.setTimeout(() => { if (!overlay.classList.contains('open')) overlay.hidden = true; }, 320);
  }
  document.body.classList.remove('no-scroll');
};
function toast(text) {
  const node = document.querySelector('.toast');
  if (!node) return;
  node.textContent = text;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 1900);
}

function modalBenefits(p) {
  const byCategory = {
    'Face Care': ['Supports a simple daily skincare routine', 'Designed for a polished, comfortable finish', 'Easy to pair with complementary face-care products'],
    'Body Care': ['Helps maintain softer, smoother-looking skin', 'Turns everyday body care into a richer ritual', 'Suitable for regular use as directed'],
    'Gift Sets': ['A coordinated routine in one set', 'Ideal for gifting or beginning a new ritual', 'Better value than purchasing each item separately']
  };
  return byCategory[p.category] || ['Thoughtfully selected by Maya’s Secret', 'Simple to include in your beauty routine', 'Personal guidance available on WhatsApp'];
}

function ensureProductModal() {
  if (document.getElementById('productModal')) return;
  document.body.insertAdjacentHTML('beforeend', `<section class="product-modal" id="productModal" role="dialog" aria-modal="true" aria-labelledby="modalProductName" aria-hidden="true">
    <button class="modal-close" id="modalClose" type="button" aria-label="Close product details">×</button>
    <div class="modal-product-media"><div class="modal-product-visual" id="modalVisual"></div><div class="modal-thumbs" id="modalThumbs" aria-label="Additional product images"></div></div>
    <div class="modal-product-copy">
      <p class="eyebrow" id="modalCategory"></p>
      <h2 id="modalProductName"></h2>
      <div class="modal-meta"><strong id="modalPrice"></strong><span id="modalSize"></span></div>
      <p class="modal-description" id="modalDescription"></p>
      <div class="modal-benefits" id="modalBenefits"></div><div class="modal-use" id="modalUseWrap"><strong>How to use</strong><p id="modalUse"></p></div>
      <div class="modal-purchase">
        <div class="modal-qty" aria-label="Quantity selector"><button id="modalMinus" type="button">−</button><span id="modalQty">1</span><button id="modalPlus" type="button">+</button></div>
        <button class="btn primary" id="modalAdd" type="button">Add to bag</button>
      </div>
      <a class="modal-help" id="modalHelp" target="_blank" rel="noopener">Ask about this product on WhatsApp →</a>
    </div>
  </section>`);
  document.getElementById('modalClose').addEventListener('click', closeProductModal);
  document.getElementById('modalMinus').addEventListener('click', () => { modalQty = Math.max(1, modalQty - 1); document.getElementById('modalQty').textContent = modalQty; });
  document.getElementById('modalPlus').addEventListener('click', () => { modalQty += 1; document.getElementById('modalQty').textContent = modalQty; });
  document.getElementById('modalAdd').addEventListener('click', () => { if (activeProduct) { add(activeProduct.id, modalQty); closeProductModal(); } });
}
function openProductModal(id) {
  activeProduct = products.find(p => p.id === id);
  if (!activeProduct) return;
  ensureProductModal();
  modalQty = 1;
  document.getElementById('modalQty').textContent = '1';
  const images = [activeProduct.image, ...(activeProduct.gallery || [])].filter(Boolean);
  document.getElementById('modalVisual').innerHTML = images.length ? `<div class="product-art product-photo modal-art"><img id="modalMainImage" src="${esc(images[0])}" alt="${esc(activeProduct.name)}"></div>` : productVisual(activeProduct, 'modal-art');
  const thumbs = document.getElementById('modalThumbs');
  if (thumbs) thumbs.innerHTML = images.length > 1 ? images.map((src,i)=>`<button type="button" class="modal-thumb ${i===0?'active':''}" data-modal-image="${esc(src)}"><img src="${esc(src)}" alt="${esc(activeProduct.name)} view ${i+1}"></button>`).join('') : '';
  document.getElementById('modalCategory').textContent = activeProduct.category;
  document.getElementById('modalProductName').textContent = activeProduct.name;
  document.getElementById('modalPrice').textContent = money(activeProduct.price);
  document.getElementById('modalSize').textContent = activeProduct.size || '';
  document.getElementById('modalDescription').textContent = activeProduct.desc || 'A thoughtfully selected Maya’s Secret beauty essential created to elevate your everyday routine.';
  const benefits = Array.isArray(activeProduct.benefits) && activeProduct.benefits.length ? activeProduct.benefits : modalBenefits(activeProduct);
  document.getElementById('modalBenefits').innerHTML = benefits.map(item => `<div><span>✓</span><p>${esc(item)}</p></div>`).join('');
  document.getElementById('modalUse').textContent = activeProduct.use || 'Use as directed. Contact Maya’s Secret for personalised product guidance.';
  document.getElementById('modalUseWrap').hidden = false;
  const addButton=document.getElementById('modalAdd'); addButton.disabled=activeProduct.status==='soldout'; addButton.textContent=activeProduct.status==='soldout'?'Sold out':'Add to bag';
  document.getElementById('modalHelp').href = `https://wa.me/2348109044321?text=${encodeURIComponent(`Hello Maya's Secret, I would like more information about ${activeProduct.name}.`)}`;
  const modal = document.getElementById('productModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  const overlay = document.querySelector('[data-overlay], .overlay'); if (overlay) { overlay.hidden = false; overlay.classList.add('open'); }
  document.body.classList.add('no-scroll');
  document.getElementById('modalClose').focus();
}
function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.cart.open')) document.querySelector('.overlay')?.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

document.addEventListener('click', e => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const cartToggle = target.closest('[data-cart-toggle], .bag-toggle, .floating-bag');
  if (cartToggle) { e.preventDefault(); e.stopPropagation(); openCart(); return; }

  const cartClose = target.closest('[data-cart-close], .cart-close');
  if (cartClose) { e.preventDefault(); e.stopPropagation(); closeCart(); return; }

  const checkoutButton = target.closest('[data-checkout], .checkout');
  if (checkoutButton) {
    e.preventDefault(); e.stopPropagation();
    if (!cart.length) { toast('Your bag is empty'); return; }
    window.location.assign('checkout.html');
    return;
  }

  const view = target.closest('[data-view]');
  if (view) { e.preventDefault(); openProductModal(view.dataset.view); return; }
  const thumb = target.closest('[data-modal-image]');
  if (thumb) { e.preventDefault(); const img=document.getElementById('modalMainImage'); if(img) img.src=thumb.dataset.modalImage; document.querySelectorAll('.modal-thumb').forEach(x=>x.classList.remove('active')); thumb.classList.add('active'); return; }
  const addButton = target.closest('[data-add]');
  if (addButton) { e.preventDefault(); const p=products.find(x=>x.id===addButton.dataset.add); if(p?.status==='soldout'){ toast('This product is currently sold out'); return; } add(addButton.dataset.add); return; }
  const plus = target.closest('[data-plus]');
  if (plus) { e.preventDefault(); e.stopPropagation(); change(plus.dataset.plus, 1); return; }
  const minus = target.closest('[data-minus]');
  if (minus) { e.preventDefault(); e.stopPropagation(); change(minus.dataset.minus, -1); return; }
  const remove = target.closest('[data-remove]');
  if (remove) { e.preventDefault(); e.stopPropagation(); cart = cart.filter(x => x.id !== remove.dataset.remove); saveCart(); toast('Product removed from your bag'); return; }
});
document.querySelector('[data-overlay], .overlay')?.addEventListener('click', () => { closeCart(); closeProductModal(); });
document.querySelector('.menu')?.addEventListener('click', () => document.querySelector('.header nav')?.classList.toggle('open'));

function renderCheckout() {
  const list = document.querySelector('#checkoutItems');
  if (!list) return;
  const empty = document.querySelector('#checkoutEmpty');
  const content = document.querySelector('#checkoutContent');
  const validItems = cart.map(i => ({...i, product: products.find(p => p.id === i.id)})).filter(i => i.product);
  if (!validItems.length) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  if (content) content.hidden = false;
  list.innerHTML = validItems.map(i => `<article class="checkout-item">${productVisual(i.product, 'checkout-thumb')}<div><p>${esc(i.product.category)}</p><h3>${esc(i.product.name)}</h3><span>${esc(i.product.size || '')}</span><div class="qty"><button data-minus="${esc(i.product.id)}" type="button">−</button><span>${i.qty}</span><button data-plus="${esc(i.product.id)}" type="button">+</button></div></div><strong>${money(i.product.price * i.qty)}</strong><button class="remove" data-remove="${esc(i.product.id)}" type="button" aria-label="Remove ${esc(i.product.name)}">×</button></article>`).join('');
  const subtotal = validItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const discount = calculateLaunchDiscount(subtotal);
  document.querySelectorAll('[data-checkout-total]').forEach(el => el.textContent = money(Math.max(0,subtotal-discount)));
  refreshCheckoutReward();
}

let activeLaunchCoupon = null;
const checkoutForm = document.querySelector('#checkoutForm');
const couponInput = document.querySelector('#launchCoupon');
const couponStatus = document.querySelector('[data-coupon-status]');
function calculateLaunchDiscount(total){ return activeLaunchCoupon ? Math.round(total * activeLaunchCoupon.percent / 100) : 0; }
function refreshCheckoutReward(){
  const rawTotal = cart.map(i=>({...i,product:products.find(p=>p.id===i.id)})).filter(i=>i.product).reduce((sum,i)=>sum+i.product.price*i.qty,0);
  const discount=calculateLaunchDiscount(rawTotal), finalTotal=Math.max(0,rawTotal-discount);
  document.querySelectorAll('[data-checkout-total]').forEach(el=>el.textContent=money(finalTotal));
  let row=document.querySelector('[data-launch-discount-row]');
  if(discount&&!row){row=document.createElement('div');row.className='checkout-summary-row launch-discount-row';row.dataset.launchDiscountRow='';row.innerHTML='<span>Launch reward</span><strong data-launch-discount></strong>';document.querySelector('.checkout-summary-total')?.before(row);}
  if(row){row.hidden=!discount;const v=row.querySelector('[data-launch-discount]');if(v)v.textContent='− '+money(discount);}
}
document.querySelector('[data-apply-coupon]')?.addEventListener('click',()=>{
  const code=window.MayaLaunch?.clean(couponInput?.value); const reward=window.MayaLaunch?.find(code);
  activeLaunchCoupon=reward?{...reward,code}:null;
  if(couponStatus){couponStatus.classList.toggle('success',!!reward);couponStatus.textContent=reward?`${reward.label} applied.`:'That reward code is not valid.';}
  refreshCheckoutReward();
});
checkoutForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!cart.length) { toast('Your bag is empty'); return; }
  if (!checkoutForm.reportValidity()) return;

  const submitButton = checkoutForm.querySelector('[data-checkout-submit]');
  const originalLabel = submitButton?.textContent;
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Preparing order…'; }

  const whatsappWindow = window.open('', '_blank');
  const form = new FormData(checkoutForm);
  const validItems = cart.map(i => ({...i, product: products.find(x => x.id === i.id)})).filter(i => i.product);
  if (!validItems.length) {
    whatsappWindow?.close();
    toast('The products in your bag are no longer available. Please add them again.');
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel; }
    return;
  }

  const subtotal = validItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const discount = calculateLaunchDiscount(subtotal);
  const total = Math.max(0, subtotal - discount);
  const fulfilment = form.get('fulfilment');
  const orderReference = 'MS-' + Date.now().toString(36).toUpperCase();
  const order = {
    reference: orderReference,
    customerName: String(form.get('name') || '').trim(),
    customerPhone: String(form.get('phone') || '').trim(),
    customer: { name: String(form.get('name') || '').trim(), phone: String(form.get('phone') || '').trim() },
    fulfilment,
    address: fulfilment === 'Delivery' ? String(form.get('address') || '').trim() : '',
    notes: String(form.get('notes') || '').trim(),
    items: validItems.map(i => ({ id:i.product.id, name:i.product.name, price:Number(i.product.price), qty:i.qty, quantity:i.qty, subtotal:Number(i.product.price)*i.qty })),
    subtotal,
    discount,
    couponCode: activeLaunchCoupon?.code || '',
    couponPercent: activeLaunchCoupon?.percent || 0,
    total,
    grandTotal: total,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    source: 'Website checkout',
    createdAt: new Date().toISOString()
  };

  let savedToCloud = false;
  try {
    const cloud = window.BusinessCloud || window.MayaCloud;
    if (cloud?.saveOrder) {
      if (typeof cloud.init === 'function') await cloud.init();
      const response = await cloud.saveOrder(order);
      if (response && response.success === false) throw new Error(response.error || response.message || 'Order was rejected by the cloud service');
      savedToCloud = true;
    } else {
      throw new Error('Cloud order service unavailable');
    }
  } catch (error) {
    console.warn('Order could not be saved to cloud; preserving a local recovery copy.', error);
    try {
      const pending = JSON.parse(localStorage.getItem('mayaPendingOrders') || '[]');
      pending.push(order);
      localStorage.setItem('mayaPendingOrders', JSON.stringify(pending.slice(-50)));
    } catch (_) {}
  }

  const lines = validItems.map(i => `• ${i.product.name} × ${i.qty} — ${money(i.product.price * i.qty)}`).join('\n');
  const address = fulfilment === 'Delivery' ? `\nDelivery address: ${order.address || 'Not supplied'}` : '';
  const message = `Hello Maya's Secret, I would like to place this order:

Order reference: ${order.reference}

${lines}

Subtotal: ${money(subtotal)}
Launch reward: ${discount ? '− ' + money(discount) + ' (' + activeLaunchCoupon.code + ')' : 'None'}
Estimated total: ${money(total)}

Customer: ${order.customerName}
Phone: ${order.customerPhone}
Order method: ${fulfilment}${address}
Notes: ${order.notes || 'None'}

Please confirm availability, final delivery fee and payment details.`;
  const whatsappUrl = `https://wa.me/2348109044321?text=${encodeURIComponent(message)}`;
  lastCheckoutWhatsAppUrl = whatsappUrl;

  if (whatsappWindow) {
    whatsappWindow.opener = null;
    whatsappWindow.location.href = whatsappUrl;
  } else {
    window.location.href = whatsappUrl;
  }

  cart = [];
  saveCart();
  checkoutForm.reset();
  const success = document.querySelector('[data-checkout-success]');
  const content = document.querySelector('[data-checkout-content]');
  const emptyState = document.querySelector('[data-checkout-empty]');
  const reference = document.querySelector('[data-order-reference]');
  if (content) content.hidden = true;
  if (emptyState) emptyState.hidden = true;
  if (reference) reference.textContent = order.reference;
  if (success) success.hidden = false;
  toast(savedToCloud ? 'Order recorded and opened in WhatsApp' : 'Order opened in WhatsApp and saved on this device');
  if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel; }
});

document.querySelector('[data-open-whatsapp]')?.addEventListener('click', () => {
  if (lastCheckoutWhatsAppUrl) window.open(lastCheckoutWhatsAppUrl, '_blank', 'noopener');
});

document.querySelectorAll('input[name="fulfilment"]').forEach(input => input.addEventListener('change', () => {
  const wrap = document.querySelector('#addressWrap');
  const address = document.querySelector('#checkoutAddress');
  const delivery = input.checked && input.value === 'Delivery';
  if (wrap) wrap.hidden = !delivery;
  if (address) address.required = delivery;
}));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeProductModal(); } });

let filter = 'All';
const apply = () => {
  let list = products.filter(p => filter === 'All' || p.category === filter);
  const q = document.querySelector('#shopSearch')?.value.toLowerCase().trim();
  if (q) list = list.filter(p => (`${p.name} ${p.category} ${p.desc || ''}`).toLowerCase().includes(q));
  const sort = document.querySelector('#shopSort')?.value;
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  if (sort === 'high') list.sort((a, b) => b.price - a.price);
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  renderShop(list);
};
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('active'));
  button.classList.add('active');
  filter = button.dataset.filter;
  apply();
}));
document.querySelector('#shopSearch')?.addEventListener('input', apply);
document.querySelector('#shopSort')?.addEventListener('change', apply);
document.querySelector('#contactForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const text = `Hello Maya's Secret,\n\nName: ${contactName.value}\nContact: ${contactReach.value}\nInterest: ${contactTopic.value}\nMessage: ${contactMessage.value}`;
  window.open(`https://wa.me/2348109044321?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

function renderAllProductViews(){
  renderFeatured();
  apply();
  drawCart();
  renderCheckout();
}
async function initialiseCloudCatalogue(){
  renderAllProductViews();
  if(!window.MayaCloud) return;
  try{
    const cloudProducts=await window.MayaCloud.getProducts();
    if(Array.isArray(cloudProducts) && cloudProducts.length){
      products=cloudProducts.map(p=>({...p,price:Number(p.price||0),gallery:Array.isArray(p.gallery)?p.gallery:[],benefits:Array.isArray(p.benefits)?p.benefits:[]}));
      renderAllProductViews();
      document.documentElement.dataset.catalogue='cloud';
    } else {
      document.documentElement.dataset.catalogue='fallback';
    }
  }catch(error){
    console.warn('Cloud catalogue unavailable; using bundled catalogue.',error);
    document.documentElement.dataset.catalogue='offline';
  }
}
ensureProductModal();
drawCart();
initialiseCloudCatalogue();
