window.MAYA_CLOUD = Object.freeze({
  apiUrl: 'https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec',
  timeoutMs: 30000,
  retries: 2,
  version: '5.0'
});

window.MayaCloud = (() => {

  const config = window.MAYA_CLOUD;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function request(url, options = {}) {

    let lastError;

    for (let attempt = 0; attempt <= config.retries; attempt++) {

      const controller = new AbortController();

      const timer = setTimeout(() => controller.abort(), config.timeoutMs);

      try {

        const response = await fetch(url, {
          cache: 'no-store',
          redirect: 'follow',
          signal: controller.signal,
          ...options
        });

        if (!response.ok) {
          throw new Error(`Cloud request failed (${response.status})`);
        }

        const type = response.headers.get('content-type') || '';

        if (!type.includes('application/json')) {
          throw new Error('Unexpected response from cloud service.');
        }

        const data = await response.json();

        if (!data || data.success === false) {
          throw new Error(data?.error || 'Cloud operation failed.');
        }

        return data;

      } catch (err) {

        lastError = err;

        if (err.name === 'AbortError') {
          lastError = new Error('The cloud service took too long to respond.');
        }

        if (attempt < config.retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }

      } finally {
        clearTimeout(timer);
      }

    }

    throw lastError;

  }

  async function getProducts() {
    const data = await request(
      `${config.apiUrl}?action=getProducts&t=${Date.now()}`
    );
    return Array.isArray(data.products)
      ? data.products
      : [];
  }

  function post(action, payload = {}) {

    return request(config.apiUrl, {

      method: 'POST',

      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },

      body: JSON.stringify({
        action,
        version: config.version,
        ...payload
      })

    });

  }

  function saveProduct(product) {
    return post('saveProduct', { product });
  }

  function deleteProduct(productId) {
    return post('deleteProduct', { productId });
  }

  function importProducts(products) {
    return post('importProducts', { products });
  }

  function createBackup() {
    return post('createBackup');
  }

  function restoreBackup(data) {
    return post('restoreBackup', { data });
  }

  function uploadImage(fileName, mimeType, base64) {

    if (!fileName || !mimeType || !base64) {
      throw new Error('Invalid image supplied.');
    }

    return post('uploadImage', {
      fileName,
      mimeType,
      base64
    });

  }

  async function ping() {

    try {
      await getProducts();
      return true;
    } catch {
      return false;
    }

  }

  return Object.freeze({

    getProducts,

    saveProduct,

    deleteProduct,

    importProducts,

    createBackup,

    restoreBackup,

    uploadImage,

    ping

  });

})();
