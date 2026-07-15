window.MAYA_CLOUD = Object.freeze({
  apiUrl: 'https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec',
  timeoutMs: 30000
});

window.MayaCloud = (() => {
  const config = window.MAYA_CLOUD;
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: controller.signal, ...options });
      if (!response.ok) throw new Error(`Cloud request failed (${response.status})`);
      const data = await response.json();
      if (!data || data.success === false) throw new Error(data?.error || 'Cloud operation failed');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The cloud service took too long to respond.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function getProducts() {
    const data = await request(`${config.apiUrl}?action=getProducts&t=${Date.now()}`);
    return Array.isArray(data.products) ? data.products : [];
  }
  async function post(action, payload = {}) {
    return request(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
  }
  async function saveProduct(product) { return post('saveProduct', { product }); }
  async function deleteProduct(productId) { return post('deleteProduct', { productId }); }
  async function importProducts(products) { return post('importProducts', { products }); }
  async function createBackup() { return post('createBackup'); }
  async function uploadImage(fileName, mimeType, base64) { return post('uploadImage', { fileName, mimeType, base64 }); }
  return { getProducts, saveProduct, deleteProduct, importProducts, createBackup, uploadImage };
})();
