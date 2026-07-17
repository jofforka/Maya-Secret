products = [
{"id":"radiance-body-oil","name":"Baby Glowing Lotion","category":"Body Care","price":8500,"size":"150 ml","badge":"✨ Customer Favourite","desc":"A gentle daily body lotion designed to nourish, hydrate, and soften children's skin while supporting a healthy, natural-looking glow. Its lightweight texture absorbs easily, leaving skin feeling smooth, moisturised, and comfortable throughout the day.","tone":"plum","status":"available","featured":True,"image":"assets/products/baby-glowing-lotion.jpg","gallery":[],"benefits":["Provides long-lasting hydration","Helps keep skin soft and smooth","Supports a healthy-looking natural glow","Comfortable for everyday use","Leaves skin feeling fresh and nourished"],"use":"Apply generously to clean skin after bathing or whenever moisture is needed. Massage gently until fully absorbed. For best results, use daily as part of the Baby Glow skincare routine."},
{"id":"velvet-body-butter","name":"Baby Glow Oil","category":"Body Care","price":10000,"size":"250 g","badge":"⭐ Best Seller","desc":"A lightweight nourishing body oil specially formulated to help keep children's skin soft, moisturised, and naturally radiant. Baby Glow Oil absorbs comfortably into the skin and is ideal for daily care, leaving the skin feeling smooth, healthy, and refreshed.","tone":"rose","status":"available","featured":True,"image":"assets/products/baby-glow-oil.jpg","gallery":[],"benefits":["Helps lock in moisture","Leaves skin feeling soft and smooth","Supports a healthy-looking natural glow","Lightweight and easy to absorb","Suitable for everyday skincare"],"use":"Apply a small amount onto clean skin and massage gently until fully absorbed. Use after bathing or whenever the skin needs extra moisture. For best results, use consistently as part of your daily skincare routine."},
{"id":"luminous-face-serum","name":"Flawless Face Cream","category":"Face Care","price":12000,"size":"30 ml","badge":"💎 Premium Formula","desc":"Flawless Face Cream is a luxurious daily facial moisturiser formulated to help keep your skin smooth, hydrated, and naturally radiant. Its rich yet comfortable texture melts into the skin, providing lasting moisture while promoting a fresh, healthy-looking complexion.","tone":"cream","status":"available","featured":True,"image":"assets/products/flawless-face-cream.jpg","gallery":[],"benefits":["Deeply hydrates facial skin","Helps improve skin softness","Supports a smoother-looking complexion","Promotes a healthy natural glow","Suitable for everyday facial care"],"use":"Apply a small amount to clean, dry skin after cleansing. Massage gently over the face and neck using upward circular motions. Use morning and evening as part of your daily skincare routine."},
{"id":"clarity-cleanser","name":"Stretchmark Oil","category":"Body Care","price":7500,"size":"200 ml","badge":"🌿 Targeted Care","desc":"Stretchmark Oil is a nourishing body oil specially developed to improve skin hydration and elasticity while helping reduce the appearance of stretch marks. Its lightweight formula absorbs comfortably into the skin, making it an excellent addition to your daily body care routine.","tone":"sage","status":"available","featured":True,"image":"assets/products/stretchmark-oil.jpg","gallery":[],"benefits":["Helps reduce the appearance of stretch marks","Supports improved skin elasticity","Deeply nourishes and moisturises the skin","Leaves skin feeling soft and smooth","Suitable for daily body care"],"use":"Apply a few drops directly to clean, dry skin and massage gently using circular motions until fully absorbed. Use morning and evening for best results. Consistent daily use is recommended."},
{"id":"dew-moisture-cream","name":"Whitening Kojic Acid Soap","category":"Body Care","price":11000,"size":"50 ml","badge":"⭐ Best Seller","desc":"Whitening Kojic Acid Soap is a luxurious cleansing bar designed to gently cleanse the skin while promoting a brighter, smoother, and more radiant-looking complexion. Suitable for both face and body, it removes impurities without leaving the skin feeling stripped, making it an excellent choice for everyday skincare.","tone":"sand","status":"available","featured":True,"image":"assets/products/whitening-kojic-acid-soap.jpg","gallery":[],"benefits":["Gently cleanses the skin","Helps brighten dull-looking skin","Helps reduce the appearance of dark spots","Promotes a clearer, more radiant complexion","Suitable for face and body","Suitable for daily use"],"use":"Wet the skin and the soap with clean water. Work into a rich lather and gently massage over the face or body. Rinse thoroughly with water. Follow with a moisturiser. Use once or twice daily based on your skincare routine."},
{"id":"silk-body-scrub","name":"Baby Glow Complete Collection","category":"Gift Sets","price":30000,"size":"300 g","badge":"🎁 Complete Set","desc":"The Baby Glow Complete Collection brings together Maya's Secret's essential baby skincare products in one nourishing routine. Designed for gentle daily care, this complete set helps cleanse, moisturise, and nourish delicate skin, leaving it feeling soft, smooth, and naturally radiant.","tone":"wine","status":"available","featured":True,"image":"assets/products/baby-glow-complete-collection.jpg","gallery":[],"benefits":["Complete daily skincare routine","Gently cleanses and moisturises the skin","Helps maintain soft, healthy-looking skin","Provides lasting hydration","Convenient all-in-one skincare bundle","Suitable for everyday use"],"use":"Step 1: Cleanse the skin using the Baby Glow Soap and rinse thoroughly.\n\nStep 2: Apply Baby Glow Lotion to moisturise the skin.\n\nStep 3: Finish with Baby Glow Oil to help lock in moisture and leave the skin feeling soft and nourished.\n\nUse daily for best results."},
{"id":"signature-glow-set","name":"Signature Glow Set","category":"Gift Sets","price":28500,"badge":"Save as a Set","size":"3 pieces","tone":"wine","desc":"A focused three-step face ritual for cleansing, hydration and everyday radiance.","status":"available","featured":False,"image":"","gallery":[],"benefits":["A coordinated routine in one set","Ideal for gifting or starting a new ritual","Conveniently combines complementary essentials"],"use":"Use as directed on clean skin. Contact Maya’s Secret for personalised guidance if you are managing a specific skin concern."},
{"id":"body-renewal-set","name":"Body Renewal Set","category":"Gift Sets","price":25000,"badge":"Complete Ritual","size":"3 pieces","tone":"bronze","desc":"A complete body ritual pairing exfoliation, deep moisture and a luminous finishing oil.","status":"available","featured":False,"image":"","gallery":[],"benefits":["A coordinated routine in one set","Ideal for gifting or starting a new ritual","Conveniently combines complementary essentials"],"use":"Use as directed on clean skin. Contact Maya’s Secret for personalised guidance if you are managing a specific skin concern."}
]

data = json.dumps(products, ensure_ascii=False, separators=(",", ":"))

js = f"""'use strict';

window.MAYA_CATALOG_VERSION = '2026-07-17-business-os-v5';
window.MAYA_DEFAULT_PRODUCTS = Object.freeze({data});

/**
 * Maya's Secret catalogue service.
 * Provides one reliable product source for the homepage, shop, checkout,
 * product modal and admin dashboard.
 */
window.MayaCatalog = (() => {{
  const STORAGE_KEY = 'maya_products_v5';
  const VALID_STATUSES = new Set(['available', 'soldout', 'draft', 'archived']);

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const text = (value, fallback = '') =>
    typeof value === 'string' ? value.trim() : fallback;

  const number = (value, fallback = 0) => {{
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }};

  const boolean = (value) =>
    value === true || value === 'true' || value === 1 || value === '1';

  const list = (value) => {{
    if (Array.isArray(value)) {{
      return value.map((item) => text(String(item))).filter(Boolean);
    }}
    if (typeof value === 'string') {{
      return value
        .split(/\\r?\\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }}
    return [];
  }};

  const slugify = (value) =>
    text(value, 'product')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `product-${{Date.now()}}`;

  function normalizeProduct(product, index = 0) {{
    const source = product && typeof product === 'object' ? product : {{}};
    const name = text(source.name, `Product ${{index + 1}}`);
    const status = text(source.status, 'available').toLowerCase();

    return {{
      id: text(source.id) || slugify(name),
      name,
      category: text(source.category, 'Uncategorised'),
      price: number(source.price),
      size: text(source.size),
      badge: text(source.badge),
      desc: text(source.desc || source.description),
      tone: text(source.tone, 'cream').toLowerCase(),
      status: VALID_STATUSES.has(status) ? status : 'available',
      featured: boolean(source.featured),
      image: text(source.image),
      gallery: [...new Set(list(source.gallery).filter((item) => item !== source.image))],
      benefits: list(source.benefits),
      use: text(source.use || source.directions),
      createdAt: text(source.createdAt),
      updatedAt: text(source.updatedAt)
    }};
  }}

  function normalizeProducts(products) {{
    if (!Array.isArray(products)) return [];
    const seen = new Set();

    return products
      .map(normalizeProduct)
      .filter((product) => {{
        if (!product.id || seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      }});
  }}

  function defaults() {{
    return normalizeProducts(clone(window.MAYA_DEFAULT_PRODUCTS));
  }}

  function readLocal() {{
    try {{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return normalizeProducts(JSON.parse(raw));
    }} catch (error) {{
      console.warn('MayaCatalog: local catalogue could not be read.', error);
      return [];
    }}
  }}

  function saveLocal(products) {{
    const normalized = normalizeProducts(products);
    try {{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }} catch (error) {{
      console.warn('MayaCatalog: local catalogue could not be saved.', error);
    }}
    return normalized;
  }}

  async function load(options = {{}}) {{
    const {{
      preferCloud = true,
      allowLocal = true,
      allowDefaults = true,
      persist = true
    }} = options;

    if (
      preferCloud &&
      window.MayaCloud &&
      typeof window.MayaCloud.getProducts === 'function'
    ) {{
      try {{
        const response = await window.MayaCloud.getProducts();
        const cloudProducts = normalizeProducts(
          Array.isArray(response) ? response : response?.products
        );

        if (cloudProducts.length) {{
          if (persist) saveLocal(cloudProducts);
          dispatch('maya:catalog-loaded', {{
            source: 'cloud',
            products: clone(cloudProducts)
          }});
          return cloudProducts;
        }}
      }} catch (error) {{
        console.warn('MayaCatalog: cloud catalogue unavailable.', error);
        dispatch('maya:catalog-error', {{
          source: 'cloud',
          message: error?.message || 'Cloud catalogue unavailable'
        }});
      }}
    }}

    if (allowLocal) {{
      const localProducts = readLocal();
      if (localProducts.length) {{
        dispatch('maya:catalog-loaded', {{
          source: 'local',
          products: clone(localProducts)
        }});
        return localProducts;
      }}
    }}

    const fallback = allowDefaults ? defaults() : [];
    if (persist && fallback.length) saveLocal(fallback);

    dispatch('maya:catalog-loaded', {{
      source: 'default',
      products: clone(fallback)
    }});

    return fallback;
  }}

  function getById(id, products = readLocal()) {{
    const target = text(id);
    return normalizeProducts(products).find((product) => product.id === target) || null;
  }}

  function getCategories(products = readLocal()) {{
    return [...new Set(
      normalizeProducts(products)
        .map((product) => product.category)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }}

  function getFeatured(products = readLocal()) {{
    return normalizeProducts(products).filter(
      (product) => product.featured && product.status !== 'archived'
    );
  }}

  function getPublished(products = readLocal()) {{
    return normalizeProducts(products).filter(
      (product) => product.status === 'available' || product.status === 'soldout'
    );
  }}

  function search(query, products = readLocal()) {{
    const needle = text(query).toLowerCase();
    const normalized = normalizeProducts(products);
    if (!needle) return normalized;

    return normalized.filter((product) =>
      [
        product.name,
        product.category,
        product.badge,
        product.size,
        product.desc,
        ...product.benefits
      ].some((value) => String(value).toLowerCase().includes(needle))
    );
  }}

  function sort(products, mode = 'featured') {{
    const output = normalizeProducts(products);

    switch (mode) {{
      case 'price-low':
        return output.sort((a, b) => a.price - b.price);
      case 'price-high':
        return output.sort((a, b) => b.price - a.price);
      case 'name':
        return output.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
        return output.sort((a, b) =>
          String(b.updatedAt || b.createdAt).localeCompare(
            String(a.updatedAt || a.createdAt)
          )
        );
      case 'featured':
      default:
        return output.sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            a.name.localeCompare(b.name)
        );
    }}
  }}

  function formatPrice(value) {{
    return new Intl.NumberFormat('en-NG', {{
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }}).format(number(value));
  }}

  function dispatch(name, detail) {{
    window.dispatchEvent(new CustomEvent(name, {{ detail }}));
  }}

  function clearLocal() {{
    try {{
      localStorage.removeItem(STORAGE_KEY);
    }} catch (error) {{
      console.warn('MayaCatalog: local catalogue could not be cleared.', error);
    }}
  }}

  return Object.freeze({{
    version: window.MAYA_CATALOG_VERSION,
    storageKey: STORAGE_KEY,
    normalizeProduct,
    normalizeProducts,
    defaults,
    load,
    readLocal,
    saveLocal,
    clearLocal,
    getById,
    getCategories,
    getFeatured,
    getPublished,
    search,
    sort,
    formatPrice
  }});
}})();
