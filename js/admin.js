const PRODUCT_KEY = 'mayaProducts';
const AUTH_KEY = 'mayaAdminSession';
const PREVIEW_PASSCODE = 'maya2026';

const $ = id => document.getElementById(id);
const cloneDefaults = () => (window.MAYA_DEFAULT_PRODUCTS || []).map(item => ({ ...item }));
const readProducts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_KEY));
    return Array.isArray(saved) ? saved : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
};

let products = readProducts();
let query = '';
let categoryFilter = 'All';

const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function persist(message = 'Changes saved') {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  render();
  showToast(message);
}

function showToast(message) {
  const toast = $('adminToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function showPanel() {
  $('adminLogin').hidden = true;
  $('adminPanel').hidden = false;
  render();
  updatePreview();
}

if (sessionStorage.getItem(AUTH_KEY) === 'yes') showPanel();

$('togglePassword').addEventListener('click', () => {
  const password = $('adminPassword');
  const showing = password.type === 'text';
  password.type = showing ? 'password' : 'text';
  $('togglePassword').textContent = showing ? 'Show' : 'Hide';
  $('togglePassword').setAttribute('aria-label', showing ? 'Show passcode' : 'Hide passcode');
});

$('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('adminPassword').value.trim();
  if (value === PREVIEW_PASSCODE) {
    sessionStorage.setItem(AUTH_KEY, 'yes');
    $('loginError').textContent = '';
    showPanel();
  } else {
    $('loginError').textContent = 'Incorrect passcode. Please try again.';
    $('adminPassword').focus();
  }
});

$('adminLogout').addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY);
  location.reload();
});

function filteredProducts() {
  return products.filter(product => {
    const haystack = `${product.name} ${product.category} ${product.badge || ''}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
}

function renderStats() {
  $('statTotal').textContent = products.length;
  $('statFace').textContent = products.filter(p => p.category === 'Face Care').length;
  $('statBody').textContent = products.filter(p => p.category === 'Body Care').length;
  $('statGifts').textContent = products.filter(p => p.category === 'Gift Sets').length;
}

function render() {
  renderStats();
  const list = filteredProducts();
  $('productCountText').textContent = `${list.length} of ${products.length} product${products.length === 1 ? '' : 's'}`;
  $('adminEmptyState').hidden = list.length > 0;

  $('adminProductList').innerHTML = list.map(product => `
    <article class="admin-item">
      <div class="cart-thumb product-art tone-${escapeHtml(product.tone || 'plum')}">
        <div class="product-pack">MS</div>
      </div>
      <div class="admin-item-copy">
        <div class="admin-item-meta">
          <span>${escapeHtml(product.category)}</span>
          ${product.badge ? `<span>${escapeHtml(product.badge)}</span>` : ''}
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${money(product.price)}${product.size ? ` · ${escapeHtml(product.size)}` : ''}</p>
        ${product.desc ? `<small>${escapeHtml(product.desc)}</small>` : ''}
      </div>
      <div class="admin-item-actions">
        <button data-edit="${escapeHtml(product.id)}" type="button">Edit</button>
        <button data-duplicate="${escapeHtml(product.id)}" type="button">Duplicate</button>
        <button class="delete" data-delete="${escapeHtml(product.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join('');
}

function setEditMode(product = null) {
  const editing = Boolean(product);
  $('formMode').textContent = editing ? 'EDITING PRODUCT' : 'NEW PRODUCT';
  $('formTitle').textContent = editing ? 'Update product' : 'Add product';
  $('saveProduct').textContent = editing ? 'Update product' : 'Save product';
  $('cancelEdit').hidden = !editing;
}

function clearValidation() {
  $('nameError').textContent = '';
  $('priceError').textContent = '';
}

function clearForm() {
  $('productForm').reset();
  $('productId').value = '';
  $('productCategory').value = 'Face Care';
  $('productTone').value = 'plum';
  setEditMode();
  clearValidation();
  updatePreview();
}

function updatePreview() {
  const tone = $('productTone').value || 'plum';
  $('previewArt').className = `product-art tone-${tone}`;
  $('previewBadge').textContent = $('productBadge').value.trim() || 'New';
  $('previewCategory').textContent = $('productCategory').value || 'Face Care';
  $('previewName').textContent = $('productName').value.trim() || 'Your product';
  $('previewSize').textContent = $('productSize').value.trim() || 'Size';
  $('previewPrice').textContent = money($('productPrice').value);
  $('descCount').textContent = $('productDesc').value.length;
}

['productName', 'productCategory', 'productPrice', 'productSize', 'productBadge', 'productDesc', 'productTone']
  .forEach(id => $(id).addEventListener('input', updatePreview));

$('productForm').addEventListener('submit', event => {
  event.preventDefault();
  clearValidation();

  const name = $('productName').value.trim();
  const price = Number($('productPrice').value);
  let valid = true;

  if (name.length < 2) {
    $('nameError').textContent = 'Enter a clear product name.';
    valid = false;
  }
  if (!Number.isFinite(price) || price < 1) {
    $('priceError').textContent = 'Enter a valid price greater than zero.';
    valid = false;
  }
  if (!valid) return;

  const existingId = $('productId').value;
  const id = existingId || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-6)}`;
  const product = {
    id,
    name,
    category: $('productCategory').value,
    price,
    size: $('productSize').value.trim(),
    badge: $('productBadge').value.trim() || 'New',
    desc: $('productDesc').value.trim(),
    tone: $('productTone').value
  };

  const index = products.findIndex(item => item.id === id);
  if (index >= 0) products[index] = product;
  else products.unshift(product);

  persist(index >= 0 ? 'Product updated' : 'Product added');
  clearForm();
});

$('clearForm').addEventListener('click', clearForm);
$('cancelEdit').addEventListener('click', clearForm);

$('adminSearch').addEventListener('input', event => {
  query = event.target.value.toLowerCase().trim();
  render();
});

$('adminCategoryFilter').addEventListener('change', event => {
  categoryFilter = event.target.value;
  render();
});

$('resetProducts').addEventListener('click', () => {
  if (!confirm('Restore the original product collection? This will replace all current product changes.')) return;
  products = cloneDefaults();
  persist('Default collection restored');
  clearForm();
});

$('exportProducts').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `maya-secret-products-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported');
});

$('importProducts').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported) || imported.some(item => !item.id || !item.name || !item.category || !Number.isFinite(Number(item.price)))) {
      throw new Error('Invalid product backup');
    }
    if (!confirm(`Import ${imported.length} products and replace the current collection?`)) return;
    products = imported.map(item => ({ ...item, price: Number(item.price) }));
    persist('Backup imported');
    clearForm();
  } catch {
    alert('That file is not a valid Maya’s Secret product backup.');
  } finally {
    event.target.value = '';
  }
});

document.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.edit);
    if (!product) return;
    $('productId').value = product.id;
    $('productName').value = product.name;
    $('productCategory').value = product.category;
    $('productPrice').value = product.price;
    $('productSize').value = product.size || '';
    $('productBadge').value = product.badge || '';
    $('productDesc').value = product.desc || '';
    $('productTone').value = product.tone || 'plum';
    setEditMode(product);
    clearValidation();
    updatePreview();
    document.querySelector('.admin-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const duplicateButton = event.target.closest('[data-duplicate]');
  if (duplicateButton) {
    const source = products.find(item => item.id === duplicateButton.dataset.duplicate);
    if (!source) return;
    const copy = {
      ...source,
      id: `${source.id}-copy-${Date.now().toString().slice(-5)}`,
      name: `${source.name} Copy`,
      badge: 'New'
    };
    products.unshift(copy);
    persist('Product duplicated');
  }

  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) {
    const product = products.find(item => item.id === deleteButton.dataset.delete);
    if (!product) return;
    if (!confirm(`Delete “${product.name}”? This cannot be undone unless you restore a backup.`)) return;
    products = products.filter(item => item.id !== product.id);
    persist('Product deleted');
    if ($('productId').value === product.id) clearForm();
  }
});

render();
updatePreview();
