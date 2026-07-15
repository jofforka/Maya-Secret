const AUTH_KEY = 'mayaAdminSession';
const $ = id => document.getElementById(id);
const cloneDefaults = () => (window.MAYA_DEFAULT_PRODUCTS || []).map(item => ({ ...item, gallery:[...(item.gallery||[])], benefits:[...(item.benefits||[])] }));
let products = [];
let query = '';
let categoryFilter = 'All';
let cloudReady = false;
const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slugify = value => String(value || 'product').toLowerCase().trim().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

function showToast(message, isError=false){ const toast=$('adminToast'); toast.textContent=message; toast.classList.toggle('error',isError); toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800); }
function setBusy(button, busy, label='Saving…'){ if(!button)return; if(busy){button.dataset.oldText=button.textContent;button.disabled=true;button.textContent=label;}else{button.disabled=false;button.textContent=button.dataset.oldText||button.textContent;} }
function injectCloudUI(){
  const top=document.querySelector('.admin-top-actions');
  if(top && !$('cloudStatus')) top.insertAdjacentHTML('afterbegin','<span class="cloud-status" id="cloudStatus"><i></i><span>Connecting to cloud…</span></span>');
  const actions=document.querySelector('.admin-data-actions');
  if(actions && !$('uploadStarter')) actions.insertAdjacentHTML('afterbegin','<button id="uploadStarter" type="button" hidden>Upload starter catalogue</button>');
}
function setCloudStatus(mode,text){ const el=$('cloudStatus'); if(!el)return; el.dataset.status=mode; el.querySelector('span').textContent=text; }

function showPanel(){ $('adminLogin').hidden=true; $('adminPanel').hidden=false; injectCloudUI(); render(); updatePreview(); connectCloud(); }
if(sessionStorage.getItem(AUTH_KEY)==='yes') showPanel();
$('togglePassword').addEventListener('click',()=>{ const p=$('adminPassword'); const show=p.type==='password'; p.type=show?'text':'password'; $('togglePassword').textContent=show?'Hide':'Show'; });
$('loginForm').addEventListener('submit',e=>{ e.preventDefault(); const expected=window.MAYA_CONFIG?.adminPasscode||'maya2026'; if($('adminPassword').value.trim()===expected){ sessionStorage.setItem(AUTH_KEY,'yes'); $('loginError').textContent=''; showPanel(); } else { $('loginError').textContent='Incorrect passcode. Please try again.'; $('adminPassword').focus(); }});
$('adminLogout').addEventListener('click',()=>{ sessionStorage.removeItem(AUTH_KEY); location.reload(); });

async function connectCloud(){
  setCloudStatus('loading','Connecting to cloud…');
  try{
    products=await window.MayaCloud.getProducts();
    cloudReady=true;
    if(products.length){ setCloudStatus('online',`Cloud connected • ${products.length} products`); }
    else { setCloudStatus('empty','Cloud connected • catalogue is empty'); $('uploadStarter').hidden=false; }
    render();
  }catch(error){
    cloudReady=false;
    products=cloneDefaults();
    setCloudStatus('offline','Cloud unavailable • showing bundled backup');
    showToast(error.message,true);
    render();
  }
}

function filteredProducts(){ return products.filter(p=>{ const hay=`${p.name} ${p.category} ${p.badge||''} ${p.status||''}`.toLowerCase(); return (!query||hay.includes(query)) && (categoryFilter==='All'||p.category===categoryFilter); }); }
function renderStats(){
  $('statTotal').textContent=products.length;
  $('statFace').textContent=products.filter(p=>p.category==='Face Care').length;
  $('statBody').textContent=products.filter(p=>p.category==='Body Care').length;
  $('statGifts').textContent=products.filter(p=>p.category==='Gift Sets').length;
  $('statFeatured').textContent=products.filter(p=>p.featured).length;
  $('statSoldOut').textContent=products.filter(p=>p.status==='soldout').length;
}
function thumb(p){ return p.image ? `<div class="cart-thumb product-art product-photo"><img src="${escapeHtml(p.image)}" alt=""></div>` : `<div class="cart-thumb product-art tone-${escapeHtml(p.tone||'plum')}"><div class="product-pack">MS</div></div>`; }
function render(){
  renderStats(); const list=filteredProducts(); $('productCountText').textContent=`${list.length} of ${products.length} product${products.length===1?'':'s'}`; $('adminEmptyState').hidden=list.length>0;
  $('adminProductList').innerHTML=list.map(p=>`<article class="admin-item">${thumb(p)}<div class="admin-item-copy"><div class="admin-item-meta"><span>${escapeHtml(p.category)}</span>${p.badge?`<span>${escapeHtml(p.badge)}</span>`:''}${p.featured?'<span>Featured</span>':''}${p.status==='soldout'?'<span class="status-soldout">Sold out</span>':'<span class="status-live">Available</span>'}</div><h3>${escapeHtml(p.name)}</h3><p>${money(p.price)}${p.size?` · ${escapeHtml(p.size)}`:''}</p>${p.desc?`<small>${escapeHtml(p.desc)}</small>`:''}</div><div class="admin-item-actions"><button data-edit="${escapeHtml(p.id)}">Edit</button><button data-duplicate="${escapeHtml(p.id)}">Duplicate</button><button class="delete" data-delete="${escapeHtml(p.id)}">Delete</button></div></article>`).join('');
}
function setEditMode(p=null){ const editing=!!p; $('formMode').textContent=editing?'EDITING PRODUCT':'NEW PRODUCT'; $('formTitle').textContent=editing?'Update product':'Add product'; $('saveProduct').textContent=editing?'Update product':'Save product'; $('cancelEdit').hidden=!editing; }
function clearValidation(){ $('nameError').textContent=''; $('priceError').textContent=''; }
function clearForm(){ $('productForm').reset(); $('productId').value=''; $('productCategory').value='Face Care'; $('productTone').value='plum'; $('productStatus').value='available'; ['productImage','gallery1','gallery2','gallery3'].forEach(id=>$(id).value=''); setEditMode(); clearValidation(); updatePreview(); }
function updatePreview(){
  const image=$('productImage').value.trim(); const art=$('previewArt');
  if(image){ art.className='product-art product-photo'; art.innerHTML=`<span class="product-badge">${escapeHtml($('productBadge').value.trim()||'New')}</span><img src="${escapeHtml(image)}" alt="">`; }
  else { art.className=`product-art tone-${$('productTone').value||'plum'}`; art.innerHTML=`<span class="product-badge">${escapeHtml($('productBadge').value.trim()||'New')}</span><div class="product-pack">MS</div>`; }
  $('previewCategory').textContent=$('productCategory').value||'Face Care'; $('previewName').textContent=$('productName').value.trim()||'Your product'; $('previewSize').textContent=$('productSize').value.trim()||'Size'; $('previewPrice').textContent=money($('productPrice').value); $('descCount').textContent=$('productDesc').value.length;
}
['productName','productCategory','productPrice','productSize','productBadge','productDesc','productTone','productImage'].forEach(id=>$(id).addEventListener('input',updatePreview));
$('cancelEdit').addEventListener('click',clearForm); $('clearForm').addEventListener('click',clearForm);
$('clearImages').addEventListener('click',()=>{ ['productImage','gallery1','gallery2','gallery3','productImageFile','galleryFile1','galleryFile2','galleryFile3'].forEach(id=>$(id).value=''); updatePreview(); });
$('adminSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});
$('adminCategoryFilter').addEventListener('change',e=>{categoryFilter=e.target.value;render();});

async function uploadSelected(fileInputId,urlInputId){ const file=$(fileInputId).files?.[0]; if(!file)return $(urlInputId).value.trim(); const result=await window.MayaCloud.uploadImage(file); $(urlInputId).value=result.imageUrl; return result.imageUrl; }
function formProduct(){ const name=$('productName').value.trim(); return { id:$('productId').value||slugify(name), name, category:$('productCategory').value, price:Number($('productPrice').value), size:$('productSize').value.trim(), badge:$('productBadge').value.trim(), desc:$('productDesc').value.trim(), tone:$('productTone').value, status:$('productStatus').value, featured:$('productFeatured').checked, image:$('productImage').value.trim(), gallery:[$('gallery1').value.trim(),$('gallery2').value.trim(),$('gallery3').value.trim()].filter(Boolean), benefits:$('productBenefits').value.split('\n').map(x=>x.trim()).filter(Boolean), use:$('productUse').value.trim() }; }

$('productForm').addEventListener('submit',async e=>{
  e.preventDefault(); clearValidation();
  if(!cloudReady){ showToast('Cloud is not connected. Reconnect before saving.',true); return; }
  const name=$('productName').value.trim(), price=Number($('productPrice').value); let valid=true;
  if(!name){$('nameError').textContent='Product name is required.';valid=false;} if(!Number.isFinite(price)||price<=0){$('priceError').textContent='Enter a valid price.';valid=false;} if(!valid)return;
  const button=$('saveProduct'); setBusy(button,true,'Uploading…');
  try{
    await uploadSelected('productImageFile','productImage');
    await uploadSelected('galleryFile1','gallery1'); await uploadSelected('galleryFile2','gallery2'); await uploadSelected('galleryFile3','gallery3');
    setBusy(button,true,'Saving…');
    const response=await window.MayaCloud.saveProduct(formProduct());
    products=response.products?.length?response.products:await window.MayaCloud.getProducts();
    setCloudStatus('online',`Cloud connected • ${products.length} products`); render(); clearForm(); showToast('Product saved to cloud');
  }catch(error){ showToast(error.message,true); }
  finally{ setBusy(button,false); }
});

$('uploadStarter')?.addEventListener('click',async()=>{ if(!confirm('Upload the bundled starter catalogue to Google Drive?'))return; const button=$('uploadStarter'); setBusy(button,true,'Uploading…'); try{ const result=await window.MayaCloud.importProducts(cloneDefaults()); products=result.products||await window.MayaCloud.getProducts(); cloudReady=true; button.hidden=true; setCloudStatus('online',`Cloud connected • ${products.length} products`); render(); showToast('Starter catalogue uploaded'); }catch(error){showToast(error.message,true);}finally{setBusy(button,false);} });
$('exportProducts').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(products,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`maya-secret-products-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Backup exported'); });
$('importProducts').addEventListener('change',async e=>{ const file=e.target.files?.[0]; if(!file)return; try{ const imported=JSON.parse(await file.text()); if(!Array.isArray(imported))throw new Error('Backup must contain a product array.'); if(confirm(`Import ${imported.length} products and replace the cloud catalogue?`)){ const result=await window.MayaCloud.importProducts(imported); products=result.products||await window.MayaCloud.getProducts(); cloudReady=true; setCloudStatus('online',`Cloud connected • ${products.length} products`); render(); clearForm(); showToast('Cloud catalogue imported'); }}catch(error){alert(error.message||'That file is not a valid Maya’s Secret product backup.');}finally{e.target.value='';} });
$('resetProducts').addEventListener('click',async()=>{ if(!confirm('Replace the cloud catalogue with the bundled starter products?'))return; try{const result=await window.MayaCloud.importProducts(cloneDefaults());products=result.products||await window.MayaCloud.getProducts();render();showToast('Starter catalogue restored');}catch(error){showToast(error.message,true);} });
$('publishPackage')?.addEventListener('click',async()=>{ try{await window.MayaCloud.createBackup();showToast('Cloud backup created in Google Drive');}catch(error){showToast(error.message,true);} });

function loadEditor(p){ $('productId').value=p.id; $('productName').value=p.name; $('productCategory').value=p.category; $('productPrice').value=p.price; $('productSize').value=p.size||''; $('productBadge').value=p.badge||''; $('productDesc').value=p.desc||''; $('productTone').value=p.tone||'plum'; $('productStatus').value=p.status||'available'; $('productFeatured').checked=!!p.featured; $('productImage').value=p.image||''; $('gallery1').value=p.gallery?.[0]||''; $('gallery2').value=p.gallery?.[1]||''; $('gallery3').value=p.gallery?.[2]||''; $('productBenefits').value=(p.benefits||[]).join('\n'); $('productUse').value=p.use||''; setEditMode(p); clearValidation(); updatePreview(); document.querySelector('.admin-editor').scrollIntoView({behavior:'smooth',block:'start'}); }
document.addEventListener('click',async e=>{
  const eb=e.target.closest('[data-edit]'); if(eb){const p=products.find(x=>x.id===eb.dataset.edit);if(p)loadEditor(p);return;}
  const db=e.target.closest('[data-duplicate]'); if(db){const s=products.find(x=>x.id===db.dataset.duplicate);if(!s)return;try{const copy={...s,id:`${slugify(s.name)}-copy-${Date.now()}`,name:`${s.name} Copy`,badge:'New',featured:false,gallery:[...(s.gallery||[])],benefits:[...(s.benefits||[])]};const result=await window.MayaCloud.saveProduct(copy);products=result.products||await window.MayaCloud.getProducts();render();showToast('Product duplicated');}catch(error){showToast(error.message,true);}return;}
  const del=e.target.closest('[data-delete]'); if(del){const p=products.find(x=>x.id===del.dataset.delete);if(p&&confirm(`Delete “${p.name}” from the shared cloud catalogue?`)){try{const result=await window.MayaCloud.deleteProduct(p.id);products=result.products||await window.MayaCloud.getProducts();render();if($('productId').value===p.id)clearForm();showToast('Product deleted');}catch(error){showToast(error.message,true);}}}
});

injectCloudUI(); render(); updatePreview();
