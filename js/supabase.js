/* OX WhatShop - Cliente Supabase + helpers (multi-tienda) */
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

let sbClient = null;

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (sbClient) return resolve(sbClient);
    if (window.supabase) { sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return resolve(sbClient); }
    const s = document.createElement('script');
    s.src = SUPABASE_CDN;
    s.onload = () => {
      sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      resolve(sbClient);
    };
    s.onerror = () => reject(new Error('No se pudo cargar Supabase'));
    document.head.appendChild(s);
  });
}

// ===== Tienda activa (multi-tienda) =====
// Cada repo/tierenda puede fijar su id con `const WS_STORE_ID = N`
// en config.js. Si no, se respeta la elección guardada en localStorage
// La tienda horneada (WS_STORE_ID del config.js de ESTE repo) manda.
// Solo si no hay baked se usa el localStorage (p. ej. para switchear
// entre tiendas en instalaciones multi-tienda) y, si nada hay, la 1.
function getActiveStoreId() {
  const baked = Number(window.WS_STORE_ID || 0);
  if (Number.isInteger(baked) && baked > 0) return baked;
  const v = Number(localStorage.getItem('whatshop_store'));
  if (Number.isInteger(v) && v > 0) return v;
  return 1;
}
function setActiveStoreId(id) {
  localStorage.setItem('whatshop_store', String(id));
}

// ===== Helpers UI compartidos (tienda + admin) =====
function applyTheme(settings) {
  const t = (settings && settings.theme) || {};
  const root = document.documentElement.style;
  const map = {
    '--color-primary': t.primary,
    '--color-on-primary': t.onPrimary,
    '--color-secondary': t.secondary,
    '--color-accent': t.accent,
    '--color-background': t.background,
    '--color-foreground': t.foreground,
    '--color-muted': t.muted,
    '--color-border': t.border,
    '--color-destructive': t.destructive,
    '--color-ring': t.ring,
    '--color-category-box': t.categoryBox,
    '--radius': (t.corners === 'rounded' ? (t.radius || 14) : 0) + 'px',
    '--card-border': t.cardBorder === 'line' ? '1px solid var(--color-border, #E5E5E5)' : 'none',
    '--filter-bg': undefined,
    '--card-shadow': t.cardShadow === 'none' ? 'none' : (t.cardShadow === 'media' ? '0 4px 16px rgba(0, 0, 0, 0.10)' : '0 2px 12px rgba(0, 0, 0, 0.08)')
  };
  for (const [key, value] of Object.entries(map)) {
    if (value) root.setProperty(key, value);
  }
  if (t.fontHeading) {
    root.setProperty('--font-heading', `'${t.fontHeading}', system-ui, sans-serif`);
    root.setProperty('--font-body', `'${t.fontHeading}', system-ui, sans-serif`);
    injectFont(t.fontHeading);
  }
}

function injectFont(fontName) {
  if (!fontName || /system/i.test(fontName)) return;
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function toast(message, type = '', duration = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type ? ` toast--${type}` : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

function fmtMoney(value) {
  return Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPrice(value, settings) {
  const s = settings || {};
  const currency = (s.store && s.store.currency) || '$';
  const pos = (s.store && s.store.currencyPosition) || 'before';
  const num = fmtMoney(value);
  return pos === 'after' ? `${num} ${currency}` : `${currency}${num}`;
}

function openWhatsApp(message, phone) {
  const number = phone || '';
  const encoded = encodeURIComponent(message);
  let url;
  if (number && number.startsWith('wa.me/')) {
    url = `https://${number}?text=${encoded}`;
  } else if (number) {
    url = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encoded}`;
  } else {
    url = `https://wa.me?text=${encoded}`;
  }
  window.open(url, '_blank');
  toast('Abriendo WhatsApp...', 'success');
}

// SHA-256 (hex) para validar el PIN del admin
async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compresion de imagen en el navegador antes de subir (canvas).
// Intenta convertir a WebP (mas ligero); si el navegador no soporta
// codificar WebP, mantiene el formato original. GIF animado intacto.
function compressImageFile(file, maxDim, quality) {
  return new Promise(function (resolve) {
    var type = ((file && file.type) || '').toLowerCase();
    if (!type || type === 'image/gif' || type.indexOf('image/') !== 0) return resolve(file);
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var w = img.width, h = img.height;
      var scale = Math.max(w, h) > maxDim ? maxDim / Math.max(w, h) : 1;
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      var webpOk = typeof canvas.toDataURL === 'function' && canvas.toDataURL('image/webp', quality).indexOf('data:image/webp') === 0;
      var outType = webpOk ? 'image/webp' : type;
      var outExt = webpOk ? 'webp' : (type === 'image/jpeg' ? 'jpg' : 'png');
      canvas.toBlob(function (blob) {
        if (!blob) return resolve(file);
        resolve(new File([blob], 'img-' + Date.now() + '.' + outExt, { type: outType }));
      }, outType, quality);
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ===== Helpers API =====
const SBHelper = {
  async client() { return loadSupabase(); },

  // ---- Tiendas ----
  async getStores() {
    const c = await loadSupabase();
    const { data, error } = await c.from('stores').select('*').order('id');
    if (error) throw error;
    return data || [];
  },

  // ---- Settings ----
  async getSettings(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('settings').select('data').eq('store_id', sid).single();
    if (!error) return data ? data.data : null;
    // Store sin fila de settings: crearla de forma lazy y devolver null
    // para que el admin/tienda usen los defaults (los campos del HTML).
    if (error.code === 'PGRST116') {
      try {
        await c.from('settings').upsert({ store_id: sid, data: {}, updated_at: new Date() }, { onConflict: 'store_id' });
      } catch (e) {}
      return null;
    }
    throw error;
  },
  async saveSettings(data, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { error } = await c.from('settings').upsert({ store_id: sid, data, updated_at: new Date() }, { onConflict: 'store_id' });
    if (error) throw error;
  },

  // ---- Admin PIN ----
  async getPinHash() {
    const c = await loadSupabase();
    const { data, error } = await c.from('admin').select('pin_hash').eq('id', 1).single();
    if (error) throw error;
    return data ? data.pin_hash : null;
  },
  async setPinHash(hash) {
    const c = await loadSupabase();
    const { error } = await c.from('admin').update({ pin_hash: hash }).eq('id', 1);
    if (error) throw error;
  },

  // ---- Categorias ----
  async getCategories(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('categories').select('*').eq('store_id', sid).order('position');
    if (error) throw error;
    return data || [];
  },
  async addCategory(obj, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('categories').insert({ ...obj, store_id: sid }).select().single();
    if (error) throw error;
    return data;
  },
  async updateCategory(id, obj) {
    const c = await loadSupabase();
    const { error } = await c.from('categories').update(obj).eq('id', id);
    if (error) throw error;
  },
  async deleteCategory(id) {
    const c = await loadSupabase();
    const { error } = await c.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Subcategorias ----
  async getSubcategories(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('subcategories').select('*').eq('store_id', sid).order('position');
    if (error) return [];
    return data || [];
  },
  async addSubcategory(obj, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('subcategories').insert({ ...obj, store_id: sid }).select().single();
    if (error) throw error;
    return data;
  },
  async updateSubcategory(id, obj) {
    const c = await loadSupabase();
    const { error } = await c.from('subcategories').update(obj).eq('id', id);
    if (error) throw error;
  },
  async deleteSubcategory(id) {
    const c = await loadSupabase();
    const { error } = await c.from('subcategories').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Productos ----
  async getProducts(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('products')
      .select('*, product_variants(*)')
      .eq('store_id', sid)
      .order('position');
    if (error) throw error;
    return data || [];
  },
  async addProduct(obj, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('products').insert({ ...obj, store_id: sid }).select().single();
    if (error) throw error;
    return data;
  },
  async updateProduct(id, obj) {
    const c = await loadSupabase();
    const { error } = await c.from('products').update(obj).eq('id', id);
    if (error) throw error;
  },
  async deleteProduct(id) {
    const c = await loadSupabase();
    const { error } = await c.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Variantes ----
  async replaceVariants(productId, variants) {
    const c = await loadSupabase();
    const { error: d0 } = await c.from('product_variants').delete().eq('product_id', productId);
    if (d0) throw d0;
    if (variants && variants.length) {
      const rows = variants.map((v) => ({
        product_id: productId,
        store_id: getActiveStoreId(),
        name: v.name || [v.color, v.size].filter(Boolean).join(' ') || 'Variante',
        color: v.color || null,
        color_hex: v.color_hex || null,
        size: v.size || null,
        sku: v.sku || null,
        price: v.price != null ? v.price : null,
        stock: v.stock != null ? v.stock : 1,
        position: v.position != null ? v.position : 0
      }));
      const { error } = await c.from('product_variants').insert(rows);
      if (error) throw error;
    }
  },

  // ---- Plantillas de tallas ----
  async getTemplates(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('variant_templates').select('*').eq('store_id', sid).order('id');
    if (error) throw error;
    return data || [];
  },
  async addTemplate(obj, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('variant_templates').insert({ ...obj, store_id: sid }).select().single();
    if (error) throw error;
    return data;
  },
  async deleteTemplate(id) {
    const c = await loadSupabase();
    const { error } = await c.from('variant_templates').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Pedidos ----
  async addOrder(order) {
    const c = await loadSupabase();
    const sid = order.store_id || getActiveStoreId();
    const { data, error } = await c.rpc('create_order', {
      p_store_id: sid,
      p_name: order.name,
      p_phone: order.phone || '',
      p_payment_method: order.payment_method || '',
      p_note: order.note || '',
      p_items: order.items || [],
      p_total: order.total || 0
    });
    if (error) throw error;
    return data;
  },
  async getOrders(storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { data, error } = await c.from('orders').select('*').eq('store_id', sid).order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async updateOrderStatus(id, status) {
    const c = await loadSupabase();
    const { error } = await c.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // ---- Storage (imagenes) ----
  // Si hay CDN (window.IMG_CDN, p.ej. un Worker de Cloudflare), las
  // imágenes públicas se sirven desde allí en vez de Supabase: el CDN
  // reenvía a Supabase solo la primera vez y cachea el resto -> 0 egress.
  publicUrl(path) {
    const base = window.IMG_CDN || SUPABASE_URL;
    return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  },
  async uploadImage(file) {
    const c = await loadSupabase();
    const f = await compressImageFile(file, 1600, 0.82);
    const ft = (f && f.type || '').toLowerCase();
    const isGif = ft === 'image/gif';
    const ext = isGif ? 'gif' : ft === 'image/webp' ? 'webp' : ft === 'image/png' ? 'png' : 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await c.storage.from(STORAGE_BUCKET).upload(path, f, { contentType: ft || 'image/png' });
    if (error) throw error;
    return this.publicUrl(path);
  },

  // ---- Backup: reemplazar catalogo completo (borra e inserta) ----
  async replaceCatalog(categories, products, storeId) {
    const c = await loadSupabase();
    const sid = storeId || getActiveStoreId();
    const { error: d0 } = await c.from('product_variants').delete().eq('store_id', sid);
    if (d0) throw d0;
    const { error: d1 } = await c.from('products').delete().eq('store_id', sid);
    if (d1) throw d1;
    const { error: d2 } = await c.from('categories').delete().eq('store_id', sid);
    if (d2) throw d2;

    const catIdMap = {};
    for (const cat of categories || []) {
      const { data, error } = await c.from('categories')
        .insert({ name: cat.name, image: cat.image, color: cat.color, icon: cat.icon || null, position: cat.position, store_id: sid })
        .select().single();
      if (error) throw error;
      catIdMap[cat.id] = data.id;
    }

    for (const p of products || []) {
      const { data, error } = await c.from('products')
        .insert({
          category_id: p.category_id != null ? (catIdMap[p.category_id] ?? null) : null,
          name: p.name,
          description: p.description,
          price: p.price,
          original_price: p.original_price ?? null,
          image: p.image,
          images: p.images || [],
          stock: p.stock,
          featured: !!p.featured,
          position: p.position,
          store_id: sid
        })
        .select().single();
      if (error) throw error;

      if (Array.isArray(p.variants) && p.variants.length) {
        const rows = p.variants.map((v) => ({
          product_id: data.id,
          store_id: sid,
          name: v.name,
          price: v.price ?? null,
          stock: v.stock ?? 1,
          color: v.color ?? null,
          color_hex: v.color_hex ?? null,
          size: v.size ?? null,
          sku: v.sku ?? null,
          position: v.position ?? 0
        }));
        const { error: ve } = await c.from('product_variants').insert(rows);
        if (ve) throw ve;
      }
    }
    return true;
  }
};

// ===== Cargar tienda completa (settings + catalogo + plantillas) =====
async function SBStore(storeId) {
  const sid = storeId || getActiveStoreId();
  const [settings, categories, products, templates] = await Promise.all([
    SBHelper.getSettings(sid),
    SBHelper.getCategories(sid),
    SBHelper.getProducts(sid),
    SBHelper.getTemplates(sid)
  ]);
  let subcategories = [];
  try { subcategories = await SBHelper.getSubcategories(sid); } catch (e) { subcategories = []; }
  const visibles = (products || []).filter((p) => !p.hidden);
  const categoriesWithProducts = (categories || []).map((cat) => ({
    ...cat,
    subcategories: (subcategories || []).filter((s) => s.category_id === cat.id),
    products: visibles.filter((p) => p.category_id === cat.id)
  }));
  const uncategorized = visibles.filter((p) => !p.category_id);
  return { settings, categories: categoriesWithProducts, uncategorized, templates, subcategories };
}