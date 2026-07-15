(() => {
  'use strict';

  const API_URL = 'https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec';
  const TIMEOUT_MS = 45000;

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
        ...options
      });
      if (!response.ok) throw new Error(`Cloud request failed (${response.status}).`);
      const data = await response.json();
      if (!data || data.success === false) throw new Error(data?.error || 'The cloud service returned an error.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The cloud service took too long to respond. Please try again.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getProducts() {
    const data = await request(`${API_URL}?action=getProducts&t=${Date.now()}`);
    return Array.isArray(data.products) ? data.products : [];
  }

  async function post(action, payload = {}) {
    return request(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, ...payload})
    });
  }

  async function saveProduct(product) { return post('saveProduct', {product}); }
  async function deleteProduct(productId) { return post('deleteProduct', {productId}); }
  async function importProducts(products) { return post('importProducts', {products}); }
  async function createBackup() { return post('createBackup'); }
  async function uploadImage({fileName, mimeType, base64}) { return post('uploadImage', {fileName, mimeType, base64}); }

  window.MAYA_API_URL = API_URL;
  window.MayaCloud = {getProducts, saveProduct, deleteProduct, importProducts, createBackup, uploadImage};
})();
