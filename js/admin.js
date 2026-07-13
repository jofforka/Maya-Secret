const PRODUCT_KEY = 'mayaProducts';
const AUTH_KEY = 'mayaAdminSession';
const PREVIEW_PASSCODE = 'maya2026';
const $ = id => document.getElementById(id);
const cloneDefaults = () => (window.MAYA_DEFAULT_PRODUCTS || []).map(item => ({ ...item, gallery:[...(item.gallery||[])], benefits:[...(item.benefits||[])] }));
const readProducts = () => { try { const saved = JSON.parse(localStorage.getItem(PRODUCT_KEY)); return Array.isArray(saved) ? saved : cloneDefaults(); } catch { return cloneDefaults(); } };
let products = readProducts();
let query = '';
let categoryFilter = 'All';
const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function persist(message='Changes saved'){ localStorage.setItem(PRODUCT_KEY, JSON.stringify(products)); render(); showToast(message); }
function showToast(message){ const toast=$('adminToast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2300); }
function showPanel(){ $('adminLogin').hidden=true; $('adminPanel').hidden=false; render(); updatePreview(); }
if(sessionStorage.getItem(AUTH_KEY)==='yes') showPanel();
$('togglePassword').addEventListener('click',()=>{ const p=$('adminPassword'); const show=p.type==='password'; p.type=show?'text':'password'; $('togglePassword').textContent=show?'Hide':'Show'; });
$('loginForm').addEventListener('submit',e=>{ e.preventDefault(); if($('adminPassword').value.trim()===PREVIEW_PASSCODE){ sessionStorage.setItem(AUTH_KEY,'yes'); $('loginError').textContent=''; showPanel(); } else { $('loginError').textContent='Incorrect passcode. Please try again.'; $('adminPassword').focus(); }});
$('adminLogout').addEventListener('click',()=>{ sessionStorage.removeItem(AUTH_KEY); location.reload(); });

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
  $('adminProductList').innerHTML=list.map(p=>`<article class="admin-item">
    ${thumb(p)}
    <div class="admin-item-copy"><div class="admin-item-meta"><span>${escapeHtml(p.category)}</span>${p.badge?`<span>${escapeHtml(p.badge)}</span>`:''}${p.featured?'<span>Featured</span>':''}${p.status==='soldout'?'<span class="status-soldout">Sold out</span>':'<span class="status-live">Available</span>'}</div>
    <h3>${escapeHtml(p.name)}</h3><p>${money(p.price)}${p.size?` · ${escapeHtml(p.size)}`:''}</p>${p.desc?`<small>${escapeHtml(p.desc)}</small>`:''}</div>
    <div class="admin-item-actions"><button data-edit="${escapeHtml(p.id)}">Edit</button><button data-duplicate="${escapeHtml(p.id)}">Duplicate</button><button class="delete" data-delete="${escapeHtml(p.id)}">Delete</button></div>
  </article>`).join('');
}
function setEditMode(p=null){ const editing=!!p; $('formMode').textContent=editing?'EDITING PRODUCT':'NEW PRODUCT'; $('formTitle').textContent=editing?'Update product':'Add product'; $('saveProduct').textContent=editing?'Update product':'Save product'; $('cancelEdit').hidden=!editing; }
function clearValidation(){ $('nameError').textContent=''; $('priceError').textContent=''; }
function clearForm(){ $('productForm').reset(); $('productId').value=''; $('productCategory').value='Face Care'; $('productTone').value='plum'; $('productStatus').value='available'; ['productImage','gallery1','gallery2','gallery3'].forEach(id=>$(id).value=''); setEditMode(); clearValidation(); updatePreview(); }
function updatePreview(){
  const image=$('productImage').value.trim(); const art=$('previewArt');
  if(image){ art.className='product-art product-photo'; art.innerHTML=`<span class="product-badge" id="previewBadge">${escapeHtml($('productBadge').value.trim()||'New')}</span><img src="${escapeHtml(image)}" alt="">`; }
  else { art.className=`product-art tone-${$('productTone').value||'plum'}`; art.innerHTML=`<span class="product-badge" id="previewBadge">${escapeHtml($('productBadge').value.trim()||'New')}</span><div class="product-pack">MS</div>`; }
  $('previewCategory').textContent=$('productCategory').value||'Face Care'; $('previewName').textContent=$('productName').value.trim()||'Your product'; $('previewSize').textContent=$('productSize').value.trim()||'Size'; $('previewPrice').textContent=money($('productPrice').value); $('descCount').textContent=$('productDesc').value.length;
}
['productName','productCategory','productPrice','productSize','productBadge','productDesc','productTone','productImage'].forEach(id=>$(id).addEventListener('input',updatePreview));

async function compressImage(file){
  if(!file) return '';
  if(file.size>8*1024*1024) throw new Error('Image is larger than 8MB');
  const bitmap=await createImageBitmap(file); const max=1200; const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale); canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); return canvas.toDataURL('image/jpeg',.82);
}
async function handleImage(fileInputId,targetId){
  const file=$(fileInputId).files?.[0]; if(!file) return;
  try { showToast('Preparing image…'); $(targetId).value=await compressImage(file); updatePreview(); showToast('Image ready'); }
  catch(err){ alert(err.message||'Unable to process this image.'); }
  finally { $(fileInputId).value=''; }
}
[['productImageFile','productImage'],['galleryFile1','gallery1'],['galleryFile2','gallery2'],['galleryFile3','gallery3']].forEach(([f,t])=>$(f).addEventListener('change',()=>handleImage(f,t)));
$('clearImages').addEventListener('click',()=>{ ['productImage','gallery1','gallery2','gallery3'].forEach(id=>$(id).value=''); updatePreview(); showToast('Images removed from form'); });

$('productForm').addEventListener('submit',e=>{
  e.preventDefault(); clearValidation(); const name=$('productName').value.trim(); const price=Number($('productPrice').value); let valid=true;
  if(name.length<2){ $('nameError').textContent='Enter a clear product name.'; valid=false; }
  if(!Number.isFinite(price)||price<1){ $('priceError').textContent='Enter a valid price greater than zero.'; valid=false; }
  if(!valid) return;
  const existingId=$('productId').value; const id=existingId||`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString().slice(-6)}`;
  const product={ id,name,category:$('productCategory').value,price,size:$('productSize').value.trim(),badge:$('productBadge').value.trim()||'New',desc:$('productDesc').value.trim(),tone:$('productTone').value,status:$('productStatus').value,featured:$('productFeatured').checked,image:$('productImage').value.trim(),gallery:[$('gallery1').value.trim(),$('gallery2').value.trim(),$('gallery3').value.trim()].filter(Boolean),benefits:$('productBenefits').value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,6),use:$('productUse').value.trim() };
  const index=products.findIndex(x=>x.id===id); if(index>=0) products[index]=product; else products.unshift(product); persist(index>=0?'Product updated':'Product added'); clearForm();
});
$('clearForm').addEventListener('click',clearForm); $('cancelEdit').addEventListener('click',clearForm);
$('adminSearch').addEventListener('input',e=>{ query=e.target.value.toLowerCase().trim(); render(); }); $('adminCategoryFilter').addEventListener('change',e=>{ categoryFilter=e.target.value; render(); });
$('resetProducts').addEventListener('click',()=>{ if(confirm('Restore the original product collection? This replaces all current changes.')){ products=cloneDefaults(); persist('Default collection restored'); clearForm(); }});

async function sourceToBlob(source){
  if(!source) return null;
  if(source.startsWith('data:')){
    const response=await fetch(source);
    return await response.blob();
  }
  try{
    const response=await fetch(source,{cache:'no-store'});
    if(!response.ok) throw new Error('Image could not be read');
    return await response.blob();
  }catch{
    return null;
  }
}
function safeSlug(value){ return String(value||'product').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product'; }
function extensionFor(blob){
  const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  return map[blob?.type]||'jpg';
}
async function createPublishPackage(){
  if(typeof JSZip==='undefined'){
    alert('The publishing tool could not load. Check your internet connection and reload the Admin page.');
    return;
  }
  const button=$('publishPackage');
  const oldText=button.textContent;
  button.disabled=true;
  button.textContent='Preparing package…';
  try{
    const zip=new JSZip();
    const published=[];
    for(const product of products){
      const item={...product,gallery:[]};
      const slug=safeSlug(product.name||product.id);
      if(product.image){
        const blob=await sourceToBlob(product.image);
        if(blob){
          const filename=`${slug}.${extensionFor(blob)}`;
          zip.file(`assets/products/${filename}`,blob);
          item.image=`assets/products/${filename}`;
        }
      }
      const gallery=[];
      for(let i=0;i<(product.gallery||[]).length;i++){
        const source=product.gallery[i];
        const blob=await sourceToBlob(source);
        if(blob){
          const filename=`${slug}-${i+2}.${extensionFor(blob)}`;
          zip.file(`assets/products/${filename}`,blob);
          gallery.push(`assets/products/${filename}`);
        }
      }
      item.gallery=gallery;
      published.push(item);
    }
    const json=JSON.stringify(published,null,2);
    zip.file('data/products.json',json);
    zip.file('js/catalog.js',`window.MAYA_CATALOG_VERSION = '${new Date().toISOString()}';
window.MAYA_DEFAULT_PRODUCTS = ${JSON.stringify(published)};
`);
    zip.file('UPLOAD-INSTRUCTIONS.txt',`MAYA'S SECRET PRODUCT PUBLISH PACKAGE

1. Open your Maya-Secret repository on GitHub.
2. Click Add file > Upload files.
3. Open this ZIP on your computer.
4. Drag the assets, data and js folders into GitHub.
5. Commit the changes.
6. Wait 1-3 minutes, then refresh the website on your phone.

Important: Upload the folders themselves so the paths remain assets/products, data/products.json and js/catalog.js.
`);
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`maya-secret-publish-${new Date().toISOString().slice(0,10)}.zip`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Publish package created');
  }catch(error){
    console.error(error);
    alert('The publish package could not be created. Your products are still safe in the Admin backup.');
  }finally{
    button.disabled=false;
    button.textContent=oldText;
  }
}
$('publishPackage')?.addEventListener('click',createPublishPackage);

$('exportProducts').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(products,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`maya-secret-products-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Backup exported'); });
$('importProducts').addEventListener('change',async e=>{ const file=e.target.files?.[0]; if(!file)return; try{ const imported=JSON.parse(await file.text()); if(!Array.isArray(imported)||imported.some(x=>!x.id||!x.name||!x.category||!Number.isFinite(Number(x.price)))) throw new Error(); if(confirm(`Import ${imported.length} products and replace the current collection?`)){ products=imported.map(x=>({...x,price:Number(x.price),gallery:Array.isArray(x.gallery)?x.gallery:[],benefits:Array.isArray(x.benefits)?x.benefits:[]})); persist('Backup imported'); clearForm(); }}catch{ alert('That file is not a valid Maya’s Secret product backup.'); } finally{ e.target.value=''; }});

document.addEventListener('click',e=>{
  const eb=e.target.closest('[data-edit]'); if(eb){ const p=products.find(x=>x.id===eb.dataset.edit); if(!p)return; $('productId').value=p.id; $('productName').value=p.name; $('productCategory').value=p.category; $('productPrice').value=p.price; $('productSize').value=p.size||''; $('productBadge').value=p.badge||''; $('productDesc').value=p.desc||''; $('productTone').value=p.tone||'plum'; $('productStatus').value=p.status||'available'; $('productFeatured').checked=!!p.featured; $('productImage').value=p.image||''; $('gallery1').value=p.gallery?.[0]||''; $('gallery2').value=p.gallery?.[1]||''; $('gallery3').value=p.gallery?.[2]||''; $('productBenefits').value=(p.benefits||[]).join('\n'); $('productUse').value=p.use||''; setEditMode(p); clearValidation(); updatePreview(); document.querySelector('.admin-editor').scrollIntoView({behavior:'smooth',block:'start'}); }
  const db=e.target.closest('[data-duplicate]'); if(db){ const s=products.find(x=>x.id===db.dataset.duplicate); if(s){ products.unshift({...s,id:`${s.id}-copy-${Date.now().toString().slice(-5)}`,name:`${s.name} Copy`,badge:'New',featured:false,gallery:[...(s.gallery||[])],benefits:[...(s.benefits||[])]}); persist('Product duplicated'); }}
  const del=e.target.closest('[data-delete]'); if(del){ const p=products.find(x=>x.id===del.dataset.delete); if(p&&confirm(`Delete “${p.name}”? This cannot be undone unless you restore a backup.`)){ products=products.filter(x=>x.id!==p.id); persist('Product deleted'); if($('productId').value===p.id) clearForm(); }}
});
render(); updatePreview();
