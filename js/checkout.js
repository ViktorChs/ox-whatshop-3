/* OX WhatShop - Pagina de checkout (checkout.html) */

var I18N = {
  es: { back: 'Seguir comprando', empty: 'Tu carrito está vacío', empty_btn: 'Ir a la tienda', title: 'Checkout', sub: 'Revisa tu pedido y confírmalo por WhatsApp.', your_order: 'Tu pedido', your_data: 'Datos y pago', subtotal: 'Subtotal', total: 'Total', co_name: 'Nombre completo *', co_name_ph: 'Tu nombre', co_phone: 'Teléfono / WhatsApp', co_pay: 'Método de pago', co_note: 'Nota / referencia (opcional)', co_note_ph: 'Dirección, referencia, talla...', send: 'Confirmar y enviar por WhatsApp', hint: 'Al confirmar se abrirá WhatsApp con tu pedido listo para enviar.', done: '¡Pedido listo!', done_sub: 'Se abrió WhatsApp con tu pedido. Completa el envío ahí.', done_btn: 'Volver a la tienda', thanks_link: 'Ver página de gracias', write_name: 'Escribe tu nombre', pay_cash: 'Efectivo', pay_transfer: 'Transferencia', pay_mobile: 'Pago móvil', pay_card: 'Tarjeta' },
  en: { back: 'Keep shopping', empty: 'Your cart is empty', empty_btn: 'Go to store', title: 'Checkout', sub: 'Review your order and confirm via WhatsApp.', your_order: 'Your order', your_data: 'Details & payment', subtotal: 'Subtotal', total: 'Total', co_name: 'Full name *', co_name_ph: 'Your name', co_phone: 'Phone / WhatsApp', co_pay: 'Payment method', co_note: 'Note / reference (optional)', co_note_ph: 'Address, reference, size...', send: 'Confirm and send via WhatsApp', hint: 'WhatsApp will open with your order ready to send.', done: 'Order ready!', done_sub: 'WhatsApp opened with your order. Complete it there.', done_btn: 'Back to store', thanks_link: 'View thank-you page', write_name: 'Enter your name', pay_cash: 'Cash', pay_transfer: 'Bank transfer', pay_mobile: 'Mobile payment', pay_card: 'Card' }
};
var lang = localStorage.getItem('whatshop_lang') === 'en' ? 'en' : 'es';
function t(key) { var v = I18N[lang][key]; return v != null ? v : key; }

function applyLang() {
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
}

function applyThemeMode(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('whatshop_theme', mode);
  var sun = document.querySelector('.icon-sun'), moon = document.querySelector('.icon-moon');
  if (sun) sun.style.display = mode === 'dark' ? 'none' : '';
  if (moon) moon.style.display = mode === 'dark' ? '' : 'none';
}

function fmt(v) {
  return typeof window.formatPrice === 'function' ? window.formatPrice(v, window.__settings) : Number(v || 0).toFixed(2);
}

var settings = { store: {} };

function renderItems() {
  var cart = CART.getCart();
  if (!cart.length) { showEmpty(); return; }
  document.getElementById('co-content').style.display = '';
  document.getElementById('co-empty').style.display = 'none';
  var box = document.getElementById('co-items');
  box.innerHTML = cart.map(function (it) {
    var thumb = it.image ? '<img src="' + it.image + '" alt="" />' : '<div class="ph"></div>';
    var v = [it.color, it.size].filter(Boolean).join(' · ');
    return '<div class="co-item">' + thumb +
      '<div><div class="i-name">' + it.name + '</div>' +
      (v ? '<div class="i-var">' + v + '</div>' : '') +
      '<div class="i-price">' + fmt(it.price) + '</div></div>' +
      '<div class="i-right"><div class="co-qty">' +
        '<button data-dec="' + it.id + '" data-v="' + (it.variant_id || '') + '">&minus;</button>' +
        '<span>' + it.qty + '</span>' +
        '<button data-inc="' + it.id + '" data-v="' + (it.variant_id || '') + '">+</button>' +
      '</div>' +
      '<button class="co-rm" data-rm="' + it.id + '" data-v="' + (it.variant_id || '') + '" aria-label="x">&times;</button>' +
      '</div></div>';
  }).join('');
  document.getElementById('co-subtotal').textContent = fmt(CART.cartTotal(cart));
  document.getElementById('co-total').textContent = fmt(CART.cartTotal(cart));

  box.querySelectorAll('[data-inc]').forEach(function (b) {
    b.addEventListener('click', function () { CART.changeQty(b.getAttribute('data-inc'), b.getAttribute('data-v'), 1); renderItems(); });
  });
  box.querySelectorAll('[data-dec]').forEach(function (b) {
    b.addEventListener('click', function () { CART.changeQty(b.getAttribute('data-dec'), b.getAttribute('data-v'), -1); renderItems(); });
  });
  box.querySelectorAll('[data-rm]').forEach(function (b) {
    b.addEventListener('click', function () { CART.removeItem(b.getAttribute('data-rm'), b.getAttribute('data-v')); renderItems(); });
  });
}

function showEmpty() {
  document.getElementById('co-content').style.display = 'none';
  document.getElementById('co-empty').style.display = 'block';
}

function loadPaymentMethods() {
  var s = (settings.store || {});
  var methods = Array.isArray(s.paymentMethods) && s.paymentMethods.length ? s.paymentMethods : [t('pay_cash'), t('pay_transfer'), t('pay_mobile'), t('pay_card')];
  var sel = document.getElementById('co-payment');
  sel.innerHTML = methods.map(function (m) { return '<option>' + m + '</option>'; }).join('');
}

function init() {
  applyLang();
  applyThemeMode(localStorage.getItem('whatshop_theme') === 'dark' ? 'dark' : 'light');
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  CART.updateBadge();

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyThemeMode(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('cart-open').addEventListener('click', function () { window.location.href = './tienda.html'; });
  document.getElementById('btn-back').addEventListener('click', function () { history.length > 1 ? history.back() : (window.location.href = './tienda.html'); });
  document.getElementById('btn-empty-shop').addEventListener('click', function () { window.location.href = './tienda.html'; });
  document.getElementById('btn-done-shop').addEventListener('click', function () { window.location.href = './tienda.html'; });

  document.getElementById('btn-submit').addEventListener('click', function () {
    var ok = CART.sendOrder(window.__settings || {}, true);
    if (ok) {
      document.getElementById('co-content').style.display = 'none';
      document.getElementById('co-empty').style.display = 'none';
      document.getElementById('co-success').classList.add('show');
      CART.updateBadge();
    }
  });

  SBStore().then(function (store) {
    settings = store.settings || settings;
    window.__settings = settings;
    applyTheme(settings);
    var all = [];
    (store.categories || []).forEach(function (c) { (c.products || []).forEach(function (p) { all.push(p); }); });
    (store.uncategorized || []).forEach(function (p) { all.push(p); });
    CART.pruneCart(all.map(function (p) { return p.id; }));
    var s = (settings.store || {});
    var name = s.name || 'WhatShop';
    document.getElementById('brand-name').textContent = name;
    document.getElementById('brand-logo').src = (settings.landing && settings.landing.logo) || './assets/logos/logoB.png';
    document.getElementById('footer-brand-name').textContent = name;
    document.title = 'Checkout - ' + name;
    loadPaymentMethods();
    renderItems();
    if (!CART.getCart().length) showEmpty();
  }).catch(function (err) {
    console.error(err);
    showEmpty();
  });
}

document.addEventListener('DOMContentLoaded', init);