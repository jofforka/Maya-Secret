(() => {
  const cfg = window.MAYA_CONFIG || {};
  const endpoint = cfg.apiUrl;

  async function request(action, payload = null) {
    if (!endpoint) throw new Error('Cloud API URL is not configured.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs || 30000);
    try {
      let response;
      if (payload === null) {
        const url = new URL(endpoint);
        url.searchParams.set('action', action);
        url.searchParams.set('_', Date.now().toString());
        response = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal, redirect: 'follow' });
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload }),
          signal: controller.signal,
          redirect: 'follow'
        });
      }
      if (!response.ok) throw new Error(`Cloud request failed (${response.status}).`);
      const data = await response.json();
      if (!data || data.success === false) throw new Error(data?.error || 'Cloud request failed.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Cloud request timed out. Check your internet connection.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  const normalize = p => ({
    ...p,
    id: String(p.id || ''),
    name: String(p.name || ''),
    category: String(p.category || 'Body Care'),
    price: Number(p.price || 0),
    gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
    benefits: Array.isArray(p.benefits) ? p.benefits.filter(Boolean) : [],
    status: p.status === 'soldout' ? 'soldout' : 'available',
    featured: Boolean(p.featured)
  });

  window.MayaCloud = {
    async getProducts() {
      const data = await request('getProducts');
      return Array.isArray(data.products) ? data.products.map(normalize) : [];
    },
    async saveProduct(product) {
      const data = await request('saveProduct', { product: normalize(product) });
      return { ...data, product: data.product ? normalize(data.product) : null, products: Array.isArray(data.products) ? data.products.map(normalize) : [] };
    },
    async deleteProduct(productId) { return request('deleteProduct', { productId }); },
    async uploadImage(file) {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Image could not be read.'));
        reader.readAsDataURL(file);
      });
      return request('uploadImage', { fileName: file.name, mimeType: file.type || 'image/jpeg', base64 });
    },
    async importProducts(products) { return request('importProducts', { products: products.map(normalize) }); },
    async createBackup() { return request('createBackup', {}); },
    async test() { const products = await this.getProducts(); return { success: true, count: products.length }; }
  };
})();
