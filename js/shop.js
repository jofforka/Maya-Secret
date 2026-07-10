const PRODUCTS = [
  {id:'radiance-body-oil',name:'Radiance Body Oil',category:'body',label:'Body care',price:8500,badge:'Bestseller',tone:'amber',form:'oil',size:'100 ml',summary:'A silky finishing oil created to seal in moisture and leave skin soft, luminous and beautifully conditioned.',benefits:['Seals in lasting moisture','Softens dry, dull-looking skin','Leaves a refined, non-sticky glow'],use:'Massage a small amount into slightly damp skin after bathing. Focus on areas that need extra softness.'},
  {id:'velvet-body-butter',name:'Velvet Body Butter',category:'body',label:'Deep moisture',price:10000,badge:'Rich care',tone:'ivory',form:'jar',size:'250 g',summary:'A rich body moisturiser for a supple, comforted finish and a more polished-looking everyday glow.',benefits:['Comforts dry-feeling skin','Supports a softer skin texture','Ideal for evening body rituals'],use:'Smooth over clean skin, paying attention to elbows, knees and other dry areas.'},
  {id:'luminous-face-serum',name:'Luminous Face Serum',category:'face',label:'Face care',price:12000,badge:'Glow essential',tone:'rose',form:'dropper',size:'30 ml',summary:'A lightweight facial serum selected to support a hydrated, smooth and naturally radiant complexion.',benefits:['Lightweight daily hydration','Supports a smoother appearance','Layers easily within a routine'],use:'Apply 2–3 drops to clean skin before moisturiser. Begin with once-daily use.'},
  {id:'clarity-cleanser',name:'Clarity Gel Cleanser',category:'face',label:'Cleanse',price:7500,badge:'Daily ritual',tone:'smoke',form:'pump',size:'150 ml',summary:'A fresh daily cleanser designed to remove surface impurities without making the skin feel stripped.',benefits:['Cleanses gently','Refreshes congested-feeling skin','Prepares skin for treatment products'],use:'Massage onto damp skin for 30–60 seconds, then rinse thoroughly.'},
  {id:'dew-moisture-cream',name:'Dew Moisture Cream',category:'face',label:'Hydrate',price:11000,badge:'Spa favourite',tone:'pearl',form:'jar',size:'50 g',summary:'A comforting face cream that helps maintain moisture and gives the complexion a soft, rested finish.',benefits:['Supports the moisture barrier','Comforts tight-feeling skin','Creates a smooth finish'],use:'Apply after serum, morning or evening. Use a small amount and press gently into the skin.'},
  {id:'polish-body-scrub',name:'Silk Polish Body Scrub',category:'body',label:'Exfoliate',price:9000,badge:'Weekly ritual',tone:'sand',form:'jar',size:'300 g',summary:'A sensorial body polish created to lift away roughness and reveal smoother, more refined-looking skin.',benefits:['Buffs rough texture','Prepares skin for moisture','Leaves skin visibly polished'],use:'Use on wet skin 1–2 times weekly with gentle circular movements. Rinse and moisturise.'},
  {id:'signature-glow-set',name:'Signature Glow Set',category:'sets',label:'Face ritual',price:28500,badge:'Save as a set',tone:'plum',form:'set',size:'3 pieces',summary:'A focused three-step face ritual featuring the Clarity Cleanser, Luminous Serum and Dew Moisture Cream.',benefits:['Simple three-step routine','Balanced cleanse and hydration','Ideal for routine beginners'],use:'Cleanse, apply serum, then seal with moisturiser. Introduce one product at a time if skin is sensitive.'},
  {id:'body-renewal-set',name:'Body Renewal Set',category:'sets',label:'Body ritual',price:25000,badge:'Complete ritual',tone:'bronze',form:'set',size:'3 pieces',summary:'A complete body ritual pairing exfoliation, rich moisture and a final luminous seal.',benefits:['Polishes and nourishes','Supports softer-looking skin','Beautiful gifting option'],use:'Polish 1–2 times weekly, moisturise daily and finish with body oil on damp skin.'}
];

const money = value => `₦${Number(value).toLocaleString('en-NG')}`;
const getProduct = id => PRODUCTS.find(product => product.id === id) || PRODUCTS[0];
let cart = JSON.parse(localStorage.getItem('mayaCart') || '[]');

function productArt(product, compact = false) {
  const pieces = product.form === 'set' ? '<span class="mini-piece one"></span><span class="mini-piece two"></span><span class="mini-piece three"></span>' : '';
  return `<div class="catalog-art tone-${product.tone} ${compact ? 'compact-art' : ''}"><span class="art-monogram">MS</span><div class="packaging form-${product.form}"><i>MS</i>${pieces}</div></div>`;
}

function productCard(product) {
  return `<article class="catalog-card" data-category="${product.category}" data-price="${product.price}" data-name="${product.name}">
    <a class="catalog-image-link" href="product.html?id=${product.id}" aria-label="View ${product.name}">${productArt(product)}<span class="catalog-badge">${product.badge}</span><span class="view-product">View details ↗</span></a>
    <div class="catalog-card-info"><div><p>${product.label}</p><h3><a href="product.html?id=${product.id}">${product.name}</a></h3><span>${product.size}</span></div><strong>${money(product.price)}</strong></div>
    <button class="quick-add" data-add="${product.id}" type="button">Add to bag <span>+</span></button>
  </article>`;
}

function renderCatalog(list = PRODUCTS) {
  const grid = document.getElementById('catalogGrid');
  if (grid) grid.innerHTML = list.map(productCard).join('');
}

function saveCart() { localStorage.setItem('mayaCart', JSON.stringify(cart)); updateCart(); }
function addToCart(id, qty = 1) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += qty; else cart.push({id, qty});
  saveCart(); showToast(`${getProduct(id).name} added`);
}
function changeQty(id, delta) {
  const item = cart.find(entry => entry.id === id); if (!item) return;
  item.qty += delta; if (item.qty <= 0) cart = cart.filter(entry => entry.id !== id); saveCart();
}
function removeItem(id) { cart = cart.filter(entry => entry.id !== id); saveCart(); }

function updateCart() {
  const count = cart.reduce((sum,item) => sum + item.qty, 0);
  document.querySelectorAll('#cartCount').forEach(el => el.textContent = count);
  const items = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  if (!items) return;
  if (!cart.length) { items.innerHTML=''; empty.hidden=false; footer.hidden=true; return; }
  empty.hidden=true; footer.hidden=false;
  items.innerHTML = cart.map(item => { const p=getProduct(item.id); return `<div class="cart-line">${productArt(p,true)}<div class="cart-line-copy"><p>${p.label}</p><h3>${p.name}</h3><strong>${money(p.price * item.qty)}</strong><div class="qty-control"><button data-minus="${p.id}" type="button">−</button><span>${item.qty}</span><button data-plus="${p.id}" type="button">+</button></div></div><button class="remove-line" data-remove="${p.id}" type="button" aria-label="Remove ${p.name}">×</button></div>`; }).join('');
  const total = cart.reduce((sum,item) => sum + getProduct(item.id).price * item.qty, 0);
  document.getElementById('cartTotal').textContent = money(total);
}

function openCart() { document.getElementById('cartDrawer')?.classList.add('open'); document.getElementById('cartOverlay')?.classList.add('open'); document.getElementById('cartDrawer')?.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeCart() { document.getElementById('cartDrawer')?.classList.remove('open'); document.getElementById('cartOverlay')?.classList.remove('open'); document.getElementById('cartDrawer')?.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
let toastTimer;
function showToast(message) { const toast=document.getElementById('toast'); if(!toast)return; toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2200); }

function checkout() {
  if (!cart.length) return;
  const lines = cart.map(item => { const p=getProduct(item.id); return `• ${p.name} × ${item.qty} — ${money(p.price*item.qty)}`; }).join('\n');
  const total = cart.reduce((sum,item) => sum + getProduct(item.id).price * item.qty, 0);
  const message = `Hello Maya's Secret, I would like to order:\n\n${lines}\n\nEstimated total: ${money(total)}\n\nPlease confirm availability and delivery.`;
  window.open(`https://wa.me/2348109044321?text=${encodeURIComponent(message)}`,'_blank','noopener');
}

function renderProductPage() {
  const mount = document.getElementById('productDetail'); if (!mount) return;
  const id = new URLSearchParams(location.search).get('id'); const p=getProduct(id);
  document.title = `${p.name} | Maya's Secret`;
  mount.innerHTML = `<section class="product-detail"><div class="product-gallery"><a class="back-shop" href="shop.html">← Back to collection</a>${productArt(p)}<span class="detail-badge">${p.badge}</span></div><div class="product-copy"><p class="eyebrow">${p.label}</p><h1>${p.name}</h1><div class="product-price"><strong>${money(p.price)}</strong><span>${p.size}</span></div><p class="product-summary">${p.summary}</p><div class="benefit-list">${p.benefits.map(item=>`<div><span>✦</span>${item}</div>`).join('')}</div><div class="purchase-row"><div class="detail-qty"><button id="detailMinus" type="button">−</button><span id="detailQty">1</span><button id="detailPlus" type="button">+</button></div><button class="button button-gold" id="detailAdd" type="button">Add to bag</button></div><div class="product-accordion"><details open><summary>How to use <span>+</span></summary><p>${p.use}</p></details><details><summary>Product guidance <span>+</span></summary><p>Skin needs vary. Contact Maya's Secret for personalised guidance, especially when introducing active products or managing a specific concern.</p></details><details><summary>Delivery & confirmation <span>+</span></summary><p>Orders are confirmed directly on WhatsApp. Product availability, Abuja delivery timing and any delivery fee are agreed before payment.</p></details></div></div></section>`;
  let qty=1; const qtyLabel=document.getElementById('detailQty');
  document.getElementById('detailMinus').onclick=()=>{qty=Math.max(1,qty-1);qtyLabel.textContent=qty};
  document.getElementById('detailPlus').onclick=()=>{qty++;qtyLabel.textContent=qty};
  document.getElementById('detailAdd').onclick=()=>{addToCart(p.id,qty);openCart()};
  const related=document.getElementById('relatedGrid'); if(related) related.innerHTML=PRODUCTS.filter(x=>x.id!==p.id).slice(0,3).map(productCard).join('');
}

document.addEventListener('click', event => {
  const add=event.target.closest('[data-add]'); if(add) addToCart(add.dataset.add);
  const plus=event.target.closest('[data-plus]'); if(plus) changeQty(plus.dataset.plus,1);
  const minus=event.target.closest('[data-minus]'); if(minus) changeQty(minus.dataset.minus,-1);
  const remove=event.target.closest('[data-remove]'); if(remove) removeItem(remove.dataset.remove);
});
document.getElementById('cartTrigger')?.addEventListener('click',openCart);
document.getElementById('cartClose')?.addEventListener('click',closeCart);
document.getElementById('cartOverlay')?.addEventListener('click',closeCart);
document.getElementById('checkoutBtn')?.addEventListener('click',checkout);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});

document.querySelectorAll('.filter-btn').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));button.classList.add('active');const value=button.dataset.filter;renderCatalog(value==='all'?PRODUCTS:PRODUCTS.filter(p=>p.category===value));document.getElementById('sortProducts').value='featured';}));
document.getElementById('sortProducts')?.addEventListener('change',event=>{let list=[...PRODUCTS];const active=document.querySelector('.filter-btn.active')?.dataset.filter;if(active&&active!=='all')list=list.filter(p=>p.category===active);if(event.target.value==='low')list.sort((a,b)=>a.price-b.price);if(event.target.value==='high')list.sort((a,b)=>b.price-a.price);if(event.target.value==='name')list.sort((a,b)=>a.name.localeCompare(b.name));renderCatalog(list)});

renderCatalog(); renderProductPage(); updateCart();
