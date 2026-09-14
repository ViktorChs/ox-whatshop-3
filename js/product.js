/* OX WhatShop - Pagina de producto (product.html?id=) */

var I18N = {
  es: { back: 'Volver a la tienda', loading: 'Cargando…', offer: 'Oferta', color: 'Color', size: 'Talla', add_cart: 'Agregar al carrito', added: 'Agregado al carrito', buy: 'Comprar ahora', bar_add: 'Agregar', bar_buy: 'Comprar', desc_title: 'Descripción', cart: 'Carrito', total: 'Total', checkout: 'Proceder al checkout', co_title: 'Datos de envío y pago', co_name: 'Nombre completo', co_phone: 'Teléfono / WhatsApp', co_pay: 'Método de pago', co_note: 'Nota / referencia (opcional)', send_wa: 'Enviar pedido por WhatsApp', back_shop: 'Volver a la tienda', out: 'Agotado', stock_n: 'En stock: {n}', sell_variants: 'Elija color y talla', not_found: 'Producto no encontrado', crumbs_products: 'Producto', f_terminos: 'Términos y condiciones', f_privacidad: 'Política de privacidad', f_politicas: 'Políticas de compra', f_cookies: 'Política de cookies', f_contacto: 'Contacto', f_by: 'Plataforma de tienda de', nav_home: 'Inicio', nav_explore: 'Explorar', nav_categorias: 'Categorías', nav_cart: 'Carrito', size_guide: 'Guía de tallas', new_arrival: 'Nuevo ingreso', off_pct: '{pct}% DCTO', pd_details: 'Detalles', pd_materials: 'Materiales', pd_fit: 'Talla y ajuste', pd_shipping: 'Envío y devoluciones', you_may_like: 'También te puede gustar', vp_ship: 'Envío gratis', vp_ship_s: 'En pedidos +$99', vp_ret: 'Devolución fácil', vp_ret_s: '30 días de garantía', vp_sec: 'Pago seguro', vp_sec_s: 'Checkout 100% seguro', pd_materials_txt: 'Materiales de alta calidad seleccionados para durabilidad y comodidad.', pd_fit_txt: 'El ajuste puede variar según el modelo. Revisa la guía de tallas antes de comprar.', pd_shipping_txt: 'Enviamos a todo el país. Devoluciones dentro de los 30 días posteriores a la compra.' },
  en: { back: 'Back to store', loading: 'Loading…', offer: 'Sale', color: 'Color', size: 'Size', add_cart: 'Add to cart', added: 'Added to cart', buy: 'Buy now', bar_add: 'Add', bar_buy: 'Buy', desc_title: 'Description', cart: 'Cart', total: 'Total', checkout: 'Checkout', co_title: 'Shipping and payment details', co_name: 'Full name', co_phone: 'Phone / WhatsApp', co_pay: 'Payment method', co_note: 'Note / reference (optional)', send_wa: 'Send order via WhatsApp', back_shop: 'Back to store', out: 'Out of stock', stock_n: 'In stock: {n}', sell_variants: 'Choose color and size', not_found: 'Product not found', crumbs_products: 'Product', f_terminos: 'Terms and conditions', f_privacidad: 'Privacy policy', f_politicas: 'Purchase policies', f_cookies: 'Cookie policy', f_contacto: 'Contact', f_by: 'Store platform by',  nav_home: 'Home', nav_explore: 'Explore', nav_categorias: 'Categories', nav_cart: 'Cart', size_guide: 'Size guide', new_arrival: 'New arrival', off_pct: '{pct}% OFF', pd_details: 'Details', pd_materials: 'Materials', pd_fit: 'Size and fit', pd_shipping: 'Shipping and returns', you_may_like: 'You may also like', vp_ship: 'Free shipping', vp_ship_s: 'On orders over 99', vp_ret: 'Easy returns', vp_ret_s: '30-day return policy', vp_sec: 'Secure payment', vp_sec_s: '100% secure checkout', pd_materials_txt: 'High quality materials selected for durability and comfort.', pd_fit_txt: 'Fit may vary by model. Check the size guide before buying.', pd_shipping_txt: 'We ship nationwide. Returns within 30 days of purchase.' }
};
var lang = localStorage.getItem('whatshop_lang') === 'en' ? 'en' : 'es';
function t(key) { var v = I18N[lang][key]; return v != null ? v : key; }

function formatDesc(txt) {
  if (!txt) return '';
  var esc = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var lines = esc.split(/\r?\n/);
  var html = '';
  var inList = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var m = line.match(/^[-*•]\s+(.*)$/);
    if (m) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + m[1] + '</li>';
    } else if (line === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<p>' + line + '</p>';
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function applyLang() {
  document.documentElement.setAttribute('lang', lang);
  document.getElementById('lang-label').textContent = lang.toUpperCase();
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
}

function applyThemeMode(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('whatshop_theme', mode);
  var sun = document.querySelector('.icon-sun'), moon = document.querySelector('.icon-moon');
  if (sun) sun.style.display = mode === 'dark' ? 'none' : '';
  if (moon) moon.style.display = mode === 'dark' ? '' : 'none';
}

var settings = { store: {} };
var product = null;
var variants = [];
var selectedColor = null;
var selectedSize = null;
var qty = 1;

function parseId() {
  var m = location.search.match(/[?&]id=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function variantPrice(v) { return v && v.price != null ? Number(v.price) : Number(product.price || 0); }
function comboStock(color, size) {
  var v = variants.find(function (x) { return x.color === color && x.size === size; });
  return v ? (Number(v.stock) || 0) : 0;
}
function totalStock() {
  if (variants.length) return variants.reduce(function (s, v) { return s + (Number(v.stock) || 0); }, 0);
  return Number(product.stock) || 0;
}
function availableStock() {
  if (variants.length) {
    if (selectedColor && selectedSize) return comboStock(selectedColor, selectedSize);
    return 0;
  }
  return totalStock();
}

function render() {
  var imgs = [];
  if (Array.isArray(product.images) && product.images.length) imgs = product.images.slice();
  else if (product.image) imgs = [product.image];
  document.getElementById('p-hero').src = imgs[0] || './assets/logos/logoB.png';
  document.getElementById('p-hero').alt = product.name;
  document.getElementById('p-name').textContent = product.name;
  document.getElementById('p-desc').innerHTML = formatDesc(product.description);

  var cat = (window.__store && window.__store.categories.find(function (c) { return c.id === product.category_id; })) || null;
  document.getElementById('p-cat').textContent = cat ? cat.name : '';

  document.getElementById('p-price').textContent = formatPrice(product.price, settings);
  var badge = document.getElementById('p-badge');
  if (badge) {
    if (product.original_price) badge.textContent = t('offer');
    else badge.textContent = product.featured ? t('new_arrival') : '';
    badge.style.display = badge.textContent ? '' : 'none';
  }
  if (product.original_price) {
    document.getElementById('p-was').textContent = formatPrice(product.original_price, settings);
    document.getElementById('p-was').classList.remove('hidden');
    document.getElementById('p-offer-badge').classList.remove('hidden');
    var pct = Math.max(0, Math.round((1 - Number(product.price) / Number(product.original_price)) * 100));
    var offEl = document.getElementById('p-off');
    if (offEl) { offEl.textContent = t('off_pct').replace('{pct}', pct); offEl.classList.remove('hidden'); }
  }
  renderDetails('details');
  renderRecs();

  var thumbs = document.getElementById('p-thumbs');
  thumbs.innerHTML = imgs.map(function (u, i) {
    return '<img src="' + u + '" data-i="' + i + '" class="' + (i === 0 ? 'active' : '') + '" alt="" />';
  }).join('');
  thumbs.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('click', function () {
      thumbs.querySelectorAll('img').forEach(function (x) { x.classList.remove('active'); });
      img.classList.add('active');
      document.getElementById('p-hero').src = img.getAttribute('src');
    });
  });

  var colors = [];
  var seen = {};
  variants.forEach(function (v) { if (v.color && !seen[v.color]) { seen[v.color] = 1; colors.push(v); } });
  var colorBox = document.getElementById('p-colors');
  if (colors.length) {
    document.getElementById('p-colors-sec').classList.remove('hidden');
    colorBox.innerHTML = colors.map(function (c) {
      return '<button class="swatch" data-c="' + c.color + '" title="' + c.color + '" style="background:' + (c.color_hex || '#888') + '"></button>';
    }).join('');
    colorBox.querySelectorAll('.swatch').forEach(function (b) {
      b.addEventListener('click', function () {
        selectedColor = b.getAttribute('data-c');
        colorBox.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderSizes();
        updateStock();
      });
    });
  } else {
    document.getElementById('p-colors-sec').classList.add('hidden');
  }
  renderSizes();
  updateStock();
  var bar = document.getElementById('p-bar');
  if (bar) bar.classList.remove('hidden');
}

function renderSizes() {
  var sizes = [];
  var seen = {};
  variants.forEach(function (v) { if (v.size && !seen[v.size]) { seen[v.size] = 1; sizes.push(v.size); } });
  var box = document.getElementById('p-sizes');
  if (!sizes.length) { document.getElementById('p-sizes-sec').classList.add('hidden'); selectedSize = null; return; }
  document.getElementById('p-sizes-sec').classList.remove('hidden');
  box.innerHTML = sizes.map(function (sz) {
    var stock = selectedColor ? comboStock(selectedColor, sz) : null;
    var soldout = selectedColor && stock <= 0;
    return '<button class="size-pill' + (selectedSize === sz ? ' active' : '') + (soldout ? ' soldout' : '') + '" data-sz="' + sz + '"' + (soldout ? ' disabled' : '') + '>' + sz + '</button>';
  }).join('');
  box.querySelectorAll('.size-pill').forEach(function (b) {
    b.addEventListener('click', function () {
      selectedSize = b.getAttribute('data-sz');
      box.querySelectorAll('.size-pill').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      updateStock();
    });
  });
}

function updateStock() {
  var el = document.getElementById('p-stock');
  var canBuy = true;
  var needSel = variants.length > 0 && (!selectedColor || !selectedSize);
  if (needSel) {
    el.textContent = t('sell_variants'); el.classList.remove('out');
    canBuy = false;
  } else {
    var st = variants.length ? comboStock(selectedColor, selectedSize) : totalStock();
    el.textContent = st > 0 ? t('stock_n').replace('{n}', st) : t('out');
    el.classList.toggle('out', st <= 0);
    canBuy = st > 0;
    if (qty > st) { qty = Math.max(1, st); document.getElementById('qty-val').textContent = qty; }
  }
  var cl = document.getElementById('p-color-label');
  if (cl) cl.textContent = t('color') + (selectedColor ? ': ' + selectedColor : '');
  var sl = document.getElementById('p-size-label');
  if (sl) sl.textContent = t('size') + (selectedSize ? ': ' + selectedSize : '');
  updateBar();
}

function updateBar() {
  var sel = document.getElementById('p-bar-sel');
  var price = document.getElementById('p-bar-price');
  if (!sel || !price || !product) return;
  var nm = product.name || '';
  if (variants.length) {
    if (selectedColor && selectedSize) {
      sel.textContent = nm + ' · ' + selectedColor + ' · ' + selectedSize;
    } else if (selectedColor) {
      sel.textContent = nm + ' · ' + selectedColor + ' · ' + t('sell_variants');
    } else {
      sel.textContent = nm + ' · ' + t('sell_variants');
    }
    var v = selectedVariant();
    price.textContent = formatPrice(variantPrice(v), settings);
  } else {
    sel.textContent = nm;
    price.textContent = formatPrice(product.price, settings);
  }
}

function selectedVariant() {
  if (!variants.length) return null;
  return variants.find(function (v) { return v.color === selectedColor && v.size === selectedSize; });
}

function getCartProduct() {
  var imgs = (Array.isArray(product.images) && product.images.length) ? product.images : (product.image ? [product.image] : []);
  return { id: product.id, title: product.name, price: Number(product.price) || 0, image: imgs[0] || null };
}

function addToCartThen(checkout) {
  var cp = getCartProduct();
  if (variants.length) {
    if (!selectedColor || !selectedSize) { toast(t('sell_variants'), 'error'); return; }
    var v = selectedVariant();
    if (!v || (Number(v.stock) || 0) <= 0) { toast(t('out'), 'error'); return; }
    cp.variantPrice = variantPrice(v);
    cp.variantId = v.id;
    CART.addItem(cp, { variantId: v.id, color: v.color, size: v.size, qty: qty, maxStock: Number(v.stock) || 0 });
  } else {
    if (totalStock() <= 0) { toast(t('out'), 'error'); return; }
    CART.addItem(cp, { qty: qty, maxStock: totalStock() });
  }
  if (!checkout) {
    toast(t('added'), 'success');
    ['btn-add-cart', 'p-cta-add'].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.classList.add('added');
      var old = b.textContent;
      b.textContent = '\u2713';
      setTimeout(function () { b.classList.remove('added'); b.textContent = old; }, 800);
    });
  }
  if (checkout) CART.openCheckout();
}

function renderDetails(tab) {
  var body = document.getElementById('pd-body');
  var sec = document.getElementById('p-details');
  if (!body || !sec) return;
  sec.classList.remove('hidden');
  document.querySelectorAll('.pd-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  var txt;
  if (tab === 'materials') txt = t('pd_materials_txt');
  else if (tab === 'fit') txt = t('pd_fit_txt');
  else if (tab === 'shipping') txt = t('pd_shipping_txt');
  else txt = (product && product.description) || '';
  body.innerHTML = formatDesc(txt);
  if (tab === 'details' && product) {
    var cat = (window.__store && window.__store.categories.find(function (c) { return c.id === product.category_id; })) || null;
    body.innerHTML += '<ul class="pd-bullets">' +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></svg> ' + (cat ? cat.name : '') + '</li>' +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ' + formatPrice(product.price, settings) + '</li>' +
      (variants.length ? '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg> ' + variants.length + ' variantes</li>' : '') +
      '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg> ' + (totalStock() > 0 ? t('stock_n').replace('{n}', totalStock()) : t('out')) + '</li>' +
    '</ul>';
  }
}

function renderRecs() {
  var grid = document.getElementById('pr-grid');
  var sec = document.getElementById('p-recs');
  if (!grid || !sec || !product) return;
  var sameCat = [];
  (window.__store ? window.__store.categories : []).forEach(function (c) {
    if (c.id === product.category_id) { (c.products || []).forEach(function (p) { if (p.id !== product.id) sameCat.push(p); }); }
  });
  if (!sameCat.length) {
    (window.__store ? window.__store.categories : []).forEach(function (c) {
      (c.products || []).forEach(function (p) { if (p.id !== product.id && sameCat.length < 4) sameCat.push(p); });
    });
  }
  sameCat = sameCat.slice(0, 4);
  if (!sameCat.length) { sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  grid.innerHTML = sameCat.map(function (p) {
    var imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    var img = imgs[0] ? '<img src="' + imgs[0] + '" alt="' + p.name + '" loading="lazy" />' : '';
    return '<div class="pr-card" data-rec="' + p.id + '">' +
      '<div class="pr-img">' + img + '</div>' +
      '<div class="pr-name">' + p.name + '</div>' +
      '<div class="pr-price">' + formatPrice(p.price, settings) + '</div>' +
    '</div>';
  }).join('');
  grid.querySelectorAll('[data-rec]').forEach(function (card) {
    card.addEventListener('click', function () { window.location.href = './product.html?id=' + card.getAttribute('data-rec'); });
  });
}

function init() {
  applyLang();
  applyThemeMode(localStorage.getItem('whatshop_theme') === 'dark' ? 'dark' : 'light');
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  CART.wire();

  document.getElementById('lang-toggle').addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    localStorage.setItem('whatshop_lang', lang);
    applyLang();
  });
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyThemeMode(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('cart-open').addEventListener('click', CART.openCart);
  var cb = document.getElementById('btn-cart-bar');
  if (cb) cb.addEventListener('click', CART.openCart);
  document.getElementById('btn-back').addEventListener('click', function () { window.location.href = './tienda.html?view=explore'; });
  document.getElementById('qty-dec').addEventListener('click', function () { qty = Math.max(1, qty - 1); document.getElementById('qty-val').textContent = qty; });
  document.getElementById('qty-inc').addEventListener('click', function () {
      var cap = availableStock();
      if (cap <= 0) cap = Math.max(1, totalStock() || 99);
      qty = Math.min(qty + 1, cap);
      document.getElementById('qty-val').textContent = qty;
    });
  document.getElementById('btn-add-cart').addEventListener('click', function () { addToCartThen(false); });
  document.getElementById('btn-buy').addEventListener('click', function () { addToCartThen(true); });
  var dAdd = document.getElementById('p-cta-add');
  var dBuy = document.getElementById('p-cta-buy');
  if (dAdd) dAdd.addEventListener('click', function () { addToCartThen(false); });
  if (dBuy) dBuy.addEventListener('click', function () { addToCartThen(true); });
  document.querySelectorAll('.top-nav .nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var tab = item.getAttribute('data-tab');
      if (tab === 'home') window.location.href = './tienda.html';
      else if (tab === 'explore') window.location.href = './tienda.html?view=explore';
      else if (tab === 'categorias') window.location.href = './categorias.html';
      else if (tab === 'cart') CART.openCart();
    });
  });
  document.querySelectorAll('.pd-tab').forEach(function (b) {
    b.addEventListener('click', function () { renderDetails(b.getAttribute('data-tab')); });
  });
  var sg = document.querySelector('.p-size-guide');
  if (sg) sg.addEventListener('click', function () { toast('Guía de tallas', 'success'); });
  CART.updateBadge();

  var id = parseId();
  if (!id) { document.getElementById('p-loading').textContent = t('not_found'); return; }

  SBStore().then(function (store) {
    settings = store.settings || settings;
    window.__settings = settings;
    window.__store = store;
    applyTheme(settings);
    var name = (settings.store && settings.store.name) || 'WhatShop';
    document.getElementById('brand-name').textContent = name;
    var logo = (settings.landing && settings.landing.logo) || './assets/logos/logoB.png';
    var bl = document.getElementById('brand-logo');
    bl.style.opacity = '0';
    bl.onload = function () { bl.style.opacity = '1'; };
    bl.onerror = function () { bl.src = './assets/logos/logoB.png'; bl.style.opacity = '1'; };
    bl.src = logo;
    document.title = name;
    var all = [];
    (store.categories || []).forEach(function (c) { (c.products || []).forEach(function (p) { all.push(p); }); });
    (store.uncategorized || []).forEach(function (p) { all.push(p); });
    CART.pruneCart(all.map(function (p) { return p.id; }));
    product = all.find(function (p) { return p.id === id; }) || null;
    if (!product) { document.getElementById('p-loading').textContent = t('not_found'); return; }
    variants = (product.product_variants || []).filter(function (v) { return v.color && v.size; });
    if (!variants.length) variants = (product.product_variants || []).slice();
    document.getElementById('p-loading').classList.add('hidden');
    document.getElementById('p-content').classList.remove('hidden');
    render();
    renderCrumbs();
  }).catch(function (err) {
    console.error(err);
    document.getElementById('p-loading').textContent = t('not_found');
  });
}

function renderCrumbs() {
  var box = document.getElementById('p-crumbs');
  if (!box || !product) return;
  var cat = (window.__store && window.__store.categories.find(function (c) { return c.id === product.category_id; })) || null;
  var parts = '<a href="./tienda.html" data-i18n="nav_home">' + t('nav_home') + '</a>';
  parts += '<span class="crumbs-sep">/</span>';
  parts += '<a href="./tienda.html?view=explore">' + t('crumbs_products') + '</a>';
  if (cat) {
    parts += '<span class="crumbs-sep">/</span>';
    parts += '<a href="./tienda.html?cat=' + cat.id + '">' + cat.name + '</a>';
  }
  parts += '<span class="crumbs-sep">/</span>';
  parts += '<span class="crumbs-current">' + (product.name || '') + '</span>';
  box.innerHTML = parts;
}

document.addEventListener('DOMContentLoaded', init);