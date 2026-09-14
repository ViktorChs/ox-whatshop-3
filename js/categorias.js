/* OX WhatShop - Pagina de categorias (categorias.html) */

var I18N = {
  es: { back: 'Volver a la tienda', title: 'Categorías', sub: 'Elige una categoría para ver sus productos.', loading: 'Cargando…', empty: 'No hay categorías todavía.', cart: 'Carrito', total: 'Total', checkout: 'Proceder al checkout', buscar: 'Buscar categorías...', no_results: 'Sin resultados', nav_home: 'Inicio', nav_explore: 'Explorar', nav_categorias: 'Categorías', nav_cart: 'Carrito', f_terminos: 'Términos y condiciones', f_privacidad: 'Política de privacidad', f_politicas: 'Políticas de compra', f_cookies: 'Política de cookies', f_contacto: 'Contacto', f_by: 'Plataforma de tienda de' },
  en: { back: 'Back to store', title: 'Categories', sub: 'Pick a category to see its products.', loading: 'Loading…', empty: 'No categories yet.', cart: 'Cart', total: 'Total', checkout: 'Checkout', buscar: 'Search categories...', no_results: 'No results', nav_home: 'Home', nav_explore: 'Explore', nav_categorias: 'Categories', nav_cart: 'Cart', f_terminos: 'Terms and conditions', f_privacidad: 'Privacy policy', f_politicas: 'Purchase policies', f_cookies: 'Cookie policy', f_contacto: 'Contact', f_by: 'Store platform by' }
};
var lang = localStorage.getItem('whatshop_lang') === 'en' ? 'en' : 'es';
function t(key) { var v = I18N[lang][key]; return v != null ? v : key; }

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

function catBorderStyle(c) {
  if (!c.border_enabled) return '';
  var col = c.border_color || '#171717';
  var s = c.border_side || 'all';
  if (s === 'top') return 'border-top:2px solid ' + col;
  if (s === 'bottom') return 'border-bottom:2px solid ' + col;
  if (s === 'sides') return 'border-left:2px solid ' + col + ';border-right:2px solid ' + col;
  return 'border:2px solid ' + col;
}

var _allCats = [];
function render(cats) {
  var grid = document.getElementById('cats-grid');
  document.getElementById('cats-loading').classList.add('hidden');
  var emp = document.getElementById('cats-empty');
  if (!cats || !cats.length) { emp.textContent = _allCats.length ? t('no_results') : t('empty'); emp.classList.remove('hidden'); grid.classList.add('hidden'); return; }
  emp.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = cats.map(function (c) {
    var media = c.image
      ? '<div class="cc-media"><img src="' + c.image + '" alt="' + c.name + '" loading="lazy" /></div>'
      : '<div class="cc-media" style="background:' + (c.color || '#E8ECF0') + '"></div>';
    var bs = catBorderStyle(c);
    return '<div class="cat-card" data-cat="' + c.id + '" role="button" tabindex="0" style="' + bs + '">' + media + '<div class="cc-name">' + c.name + '</div></div>';
  }).join('');
  grid.querySelectorAll('[data-cat]').forEach(function (card) {
    function go() { window.location.href = './tienda.html?cat=' + card.getAttribute('data-cat'); }
    card.addEventListener('click', go);
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

function init() {
  applyLang();
  applyThemeMode(localStorage.getItem('whatshop_theme') === 'dark' ? 'dark' : 'light');
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  CART.updateBadge();
  CART.wire();

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyThemeMode(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('lang-toggle').addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    localStorage.setItem('whatshop_lang', lang);
    applyLang();
  });
  document.getElementById('cart-open').addEventListener('click', CART.openCart);


  document.querySelectorAll('.top-nav .nav-item, .bottom-nav .nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var tab = item.getAttribute('data-tab');
      if (tab === 'home') window.location.href = './tienda.html';
      else if (tab === 'explore') window.location.href = './tienda.html?view=explore';
      else if (tab === 'cart') CART.openCart();
    });
  });

  SBStore().then(function (store) {
    window.__settings = store.settings || {};
    applyTheme(window.__settings);
    var s = (store.settings && store.settings.store) || {};
    var name = s.name || 'WhatShop';
    document.getElementById('brand-name').textContent = name;
    document.getElementById('brand-logo').src = (store.settings && store.settings.landing && store.settings.landing.logo) || './assets/logos/logoB.png';
    document.getElementById('footer-brand-name').textContent = name;
    document.title = t('title') + ' - ' + name;
    _allCats = store.categories || [];
    render(_allCats);
    document.getElementById('search-input').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      var list = q ? _allCats.filter(function (c) { return (c.name || '').toLowerCase().indexOf(q) > -1; }) : _allCats;
      render(list);
    });
  }).catch(function (err) {
    console.error(err);
    document.getElementById('cats-loading').textContent = t('empty');
  });
}

document.addEventListener('DOMContentLoaded', init);