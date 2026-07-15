'use strict';

const AUTH_KEY = 'mayaAdminSession';
const PREVIEW_PASSCODE = 'maya2026';
const $ = id => document.getElementById(id);
const cloneDefaults = () => (window.MAYA_DEFAULT_PRODUCTS || []).map(item => ({...item, gallery:[...(item.gallery||[])], benefits:[...(item.benefits||[])]}));
const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug = value => String(value || 'product').toLowerCase().trim().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

let products = [];
let query = '';
let categoryFilter = 'All';
let cloudReady = false;
let busy = false;

function normalizeProduct(p) {
  return {...p, id:String(p.id || slug(p.name)), price:Number(p.price || 0), gallery:Array.isArray(p.gallery)?p.gallery:[], benefits:Array.isArray(p.benefits)?p.benefits:[]};
}
function setCloudStatus(text, state='working') {
  const node = $('cloudStatus');
  if (!node) return;
  node.textContent = text;
  node.dataset.state = state;
}
function showToast(message) {
  const toast = $('adminToast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600);
}
function setBusy(value, message='Saving…') {
  busy=value;
  document.body.classList.toggle('admin-busy',value);
  const button=$('saveProduct');
  if(button){button.disabled=value;button.textContent=value?message:'Save product';}
}
function showPanel(){ $('adminLogin').hidden=true; $('adminPanel').hidden=false; loadCloudProducts(); updatePreview(); }
if(sessionStorage.getItem(AUTH_KEY)==='yes') showPanel();
$('togglePassword')?.addEventListener('click',()=>{const p=$('adminPassword');const show=p.type==='password';p.type=show?'text':'password';$('togglePassword').textContent=show?'Hide':'Show';});
$('loginForm')?.addEventListener('submit',e=>{e.preventDefault();if($('adminPassword').value.trim()===PREVIEW_PASSCODE){sessionStorage.setItem(AUTH_KEY,'yes');$('loginError').textContent='';showPanel();}else{$('loginError').textContent='Incorrect passcode. Please try again.';$('adminPassword').focus();}});
$('adminLogout')?.addEventListener('click',()=>{sessionStorage.removeItem(AUTH_KEY);location.reload();});

async function loadCloudProducts() {
  setCloudStatus('Connecting to Google Drive…','working');
  try {
    const cloud = await window.MayaCloud.getProducts();
    products = (cloud.length ? cloud : cloneDefaults()).map(normalizeProduct);
    cloudReady = true;
    setCloudStatus(cloud.length ? `Cloud connected • ${cloud.length} products` : 'Cloud connected • starter catalogue not uploaded yet','online');
    if (!cloud.length) $('publishPackage').textContent='Upload starter catalogue to cloud';
    else $('publishPackage').textContent='Back up cloud catalogue';
    render();
  } catch(error) {
    products=cloneDefaults().map(normalizeProduct);
    cloudReady=false;
    setCloudStatus('Cloud unavailable • showing bundled fallback','offline');
    render();
    showToast(error.message || 'Cloud connection failed');
  }
}

function filteredProducts(){return products.filter(p=>{const hay=`${p.name} ${p.category} ${p.badge||''} ${p.status||''}`.toLowerCase();return(!query||hay.includes(query))&&(categoryFilter==='All'||p.category===categoryFilter);});}
function renderStats(){
  $('statTotal').textContent=products.length;
  $('statFace').textContent=products.filter(p=>p.category==='Face Care').length;
  $('statBody').textContent=products.filter(p=>p.category==='Body Care').length;
  $('statGifts').textContent=products.filter(p=>p.category==='Gift Sets').length;
  $('statFeatured').textContent=products.filter(p=>p.featured).length;
  $('statSoldOut').textContent=products.filter(p=>p.status==='soldout').length;
}
function thumb(p){return p.image?`<div class="cart-thumb product-art product-photo"><img src="${escapeHtml(p.image)}" alt=""></div>`:`<div class="cart-thumb product-art tone-${escapeHtml(p.tone||'plum')}"><div class="product-pack">MS</div></div>`;}
function render(){
  renderStats(); const list=filteredProducts();
  $('productCountText').textContent=`${list.length} of ${products.length} products`;
  $('adminEmptyState').hidden=!!list.length;
  $('adminProductList').innerHTML=list.map(p=>`<article class="admin-product-item">${thumb(p)}<div class="admin-product-main"><div class="admin-product-flags"><span>${escapeHtml(p.category)}</span>${p.featured?'<span>Featured</span>':''}${p.status==='soldout'?'<span>Sold out</span>':''}</div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.size||'No size')} · ${money(p.price)}</p></div><div class="admin-product-actions"><button data-edit="${escapeHtml(p.id)}" type="button">Edit</button><button data-duplicate="${escapeHtml(p.id)}" type="button">Duplicate</button><button data-delete="${escapeHtml(p.id)}" class="danger-text" type="button">Delete</button></div></article>`).join('');
}
function clearValidation(){$('nameError').textContent='';$('priceError').textContent='';}
function clearForm(){
  $('productForm').reset(); $('productId').value=''; $('productTone').value='plum'; $('productStatus').value='available';
  ['productImage','gallery1','gallery2','gallery3'].forEach(id=>$(id).value='');
  $('formMode').textContent='NEW PRODUCT';$('formTitle').textContent='Add product';$('cancelEdit').hidden=true;clearValidation();updatePreview();
}
function setEditMode(p){$('formMode').textContent='EDIT PRODUCT';$('formTitle').textContent=p.name;$('cancelEdit').hidden=false;}
function updatePreview(){
  const art=$('previewArt'); const image=$('productImage').value.trim();
  if(image){art.className='product-art product-photo';art.innerHTML=`<span class="product-badge" id="previewBadge">${escapeHtml($('productBadge').value.trim()||'New')}</span><img src="${escapeHtml(image)}" alt="">`;}
  else{art.className=`product-art tone-${$('productTone').value||'plum'}`;art.innerHTML=`<span class="product-badge" id="previewBadge">${escapeHtml($('productBadge').value.trim()||'New')}</span><div class="product-pack">MS</div>`;}
  $('previewCategory').textContent=$('productCategory').value||'Face Care';$('previewName').textContent=$('productName').value.trim()||'Your product';$('previewSize').textContent=$('productSize').value.trim()||'Size';$('previewPrice').textContent=money($('productPrice').value);$('descCount').textContent=$('productDesc').value.length;
}
['productName','productCategory','productPrice','productSize','productBadge','productDesc','productTone','productImage'].forEach(id=>$(id)?.addEventListener('input',updatePreview));

async function compressImage(file){
  if(!file)return''; if(file.size>8*1024*1024)throw new Error('Image is larger than 8 MB.');
  const bitmap=await createImageBitmap(file);const max=1400;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.84);
}
async function handleImage(fileInputId,targetId){
  const file=$(fileInputId).files?.[0];if(!file)return;
  try{showToast('Preparing image…');$(targetId).value=await compressImage(file);updatePreview();showToast('Image ready for cloud upload');}catch(err){alert(err.message||'Unable to process image.');}finally{$(fileInputId).value='';}
}
[['productImageFile','productImage'],['galleryFile1','gallery1'],['galleryFile2','gallery2'],['galleryFile3','gallery3']].forEach(([f,t])=>$(f)?.addEventListener('change',()=>handleImage(f,t)));
$('clearImages')?.addEventListener('click',()=>{['productImage','gallery1','gallery2','gallery3'].forEach(id=>$(id).value='');updatePreview();showToast('Images removed from form');});

async function uploadIfNeeded(source, name, suffix='main') {
  if(!source || !source.startsWith('data:')) return source;
  const match=source.match(/^data:([^;]+);base64,(.+)$/); if(!match) throw new Error('Invalid image data.');
  setBusy(true,'Uploading images…');
  const ext=match[1].includes('png')?'png':match[1].includes('webp')?'webp':'jpg';
  const result=await window.MayaCloud.uploadImage({fileName:`${slug(name)}-${suffix}.${ext}`,mimeType:match[1],base64:source});
  return result.imageUrl;
}

$('productForm')?.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;clearValidation();
  const name=$('productName').value.trim();const price=Number($('productPrice').value);let valid=true;
  if(name.length<2){$('nameError').textContent='Enter a clear product name.';valid=false;}if(!Number.isFinite(price)||price<1){$('priceError').textContent='Enter a valid price greater than zero.';valid=false;}if(!valid)return;
  try{
    setBusy(true);
    const existingId=$('productId').value;const id=existingId||`${slug(name)}-${Date.now().toString().slice(-6)}`;
    const main=await uploadIfNeeded($('productImage').value.trim(),name,'main');
    const gallery=[];for(const [i,field] of ['gallery1','gallery2','gallery3'].entries()){const src=$(field).value.trim();if(src)gallery.push(await uploadIfNeeded(src,name,`gallery-${i+1}`));}
    const product={id,name,category:$('productCategory').value,price,size:$('productSize').value.trim(),badge:$('productBadge').value.trim()||'New',desc:$('productDesc').value.trim(),tone:$('productTone').value,status:$('productStatus').value,featured:$('productFeatured').checked,image:main,gallery,benefits:$('productBenefits').value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,8),use:$('productUse').value.trim()};
    const result=await window.MayaCloud.saveProduct(product);products=(result.products||products).map(normalizeProduct);cloudReady=true;setCloudStatus(`Cloud connected • ${products.length} products`,'online');render();clearForm();showToast(existingId?'Product updated everywhere':'Product added everywhere');
  }catch(error){console.error(error);alert(`Product was not saved to Google Drive.\n\n${error.message}`);}finally{setBusy(false);}
});

$('clearForm')?.addEventListener('click',clearForm);$('cancelEdit')?.addEventListener('click',clearForm);
$('adminSearch')?.addEventListener('input',e=>{query=e.target.value.toLowerCase().trim();render();});
$('adminCategoryFilter')?.addEventListener('change',e=>{categoryFilter=e.target.value;render();});
$('resetProducts')?.addEventListener('click',async()=>{if(!confirm('Replace the cloud catalogue with the bundled starter collection?'))return;try{setBusy(true,'Restoring…');const result=await window.MayaCloud.importProducts(cloneDefaults());products=(result.products||cloneDefaults()).map(normalizeProduct);render();showToast('Starter catalogue restored to cloud');}catch(e){alert(e.message);}finally{setBusy(false);}});

$('publishPackage')?.addEventListener('click',async()=>{
  try{setBusy(true,'Syncing…');if(!cloudReady||!products.length){throw new Error('No catalogue is available to upload.');}
    const cloud=await window.MayaCloud.getProducts();
    if(!cloud.length){const result=await window.MayaCloud.importProducts(products);products=(result.products||products).map(normalizeProduct);render();showToast(`${products.length} products uploaded to Google Drive`);$('publishPackage').textContent='Back up cloud catalogue';}
    else{await window.MayaCloud.createBackup();showToast('Cloud backup created in Google Drive');}
  }catch(e){alert(e.message);}finally{setBusy(false);}
});
$('exportProducts')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(products,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`maya-secret-cloud-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast('Backup downloaded');});
$('importProducts')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!Array.isArray(imported)||imported.some(x=>!x.name||!x.category||!Number.isFinite(Number(x.price))))throw new Error('Invalid catalogue file.');if(confirm(`Upload ${imported.length} products to the shared cloud catalogue? This replaces the current cloud catalogue.`)){setBusy(true,'Uploading catalogue…');const result=await window.MayaCloud.importProducts(imported.map(normalizeProduct));products=(result.products||imported).map(normalizeProduct);render();cloudReady=true;setCloudStatus(`Cloud connected • ${products.length} products`,'online');showToast('Cloud catalogue imported');}}catch(err){alert(err.message||'Invalid Maya’s Secret backup.');}finally{setBusy(false);e.target.value='';}});

document.addEventListener('click',async e=>{
  const eb=e.target.closest('[data-edit]');if(eb){const p=products.find(x=>x.id===eb.dataset.edit);if(!p)return;$('productId').value=p.id;$('productName').value=p.name;$('productCategory').value=p.category;$('productPrice').value=p.price;$('productSize').value=p.size||'';$('productBadge').value=p.badge||'';$('productDesc').value=p.desc||'';$('productTone').value=p.tone||'plum';$('productStatus').value=p.status||'available';$('productFeatured').checked=!!p.featured;$('productImage').value=p.image||'';$('gallery1').value=p.gallery?.[0]||'';$('gallery2').value=p.gallery?.[1]||'';$('gallery3').value=p.gallery?.[2]||'';$('productBenefits').value=(p.benefits||[]).join('\n');$('productUse').value=p.use||'';setEditMode(p);clearValidation();updatePreview();document.querySelector('.admin-editor').scrollIntoView({behavior:'smooth',block:'start'});}
  const db=e.target.closest('[data-duplicate]');if(db){const s=products.find(x=>x.id===db.dataset.duplicate);if(!s)return;const copy={...s,id:`${slug(s.name)}-copy-${Date.now().toString().slice(-5)}`,name:`${s.name} Copy`,badge:'New',featured:false,gallery:[...(s.gallery||[])],benefits:[...(s.benefits||[])]};try{setBusy(true,'Duplicating…');const result=await window.MayaCloud.saveProduct(copy);products=(result.products||[copy,...products]).map(normalizeProduct);render();showToast('Product duplicated in cloud');}catch(err){alert(err.message);}finally{setBusy(false);}}
  const del=e.target.closest('[data-delete]');if(del){const p=products.find(x=>x.id===del.dataset.delete);if(p&&confirm(`Delete “${p.name}” from every device?`)){try{setBusy(true,'Deleting…');const result=await window.MayaCloud.deleteProduct(p.id);products=(result.products||products.filter(x=>x.id!==p.id)).map(normalizeProduct);render();if($('productId').value===p.id)clearForm();showToast('Product deleted everywhere');}catch(err){alert(err.message);}finally{setBusy(false);}}}
});

updatePreview();
