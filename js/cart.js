/* OX WhatShop - Carrito compartido + checkout por WhatsApp (tienda y pagina de producto) */

(function () {
  function getCart() {
    try { return (JSON.parse(localStorage.getItem('whatshop_cart') || '[]') || []).map(function (it) {
      it.variant_id = it.variant_id != null ? String(it.variant_id) : '';
      return it;
    }); }
    catch (e) { return []; }
  }
  function saveCart(c) { localStorage.setItem('whatshop_cart', JSON.stringify(c)); }

  function cartCount(c) { return c.reduce(function (s, it) { return s + (it.qty || 1); }, 0); }
  function cartTotal(c) { return c.reduce(function (s, it) { return s + Number(it.price || 0) * (it.qty || 1); }, 0); }

  function itemKey(it) { return it.id + '|' + (it.variant_id || ''); }

  // Producto -> item de carrito. opts: { variantId, color, size, qty, maxStock }
  function addItem(product, opts) {
    opts = opts || {};
    var cart = getCart();
    var ex = cart.find(function (it) {
      return String(it.id) === String(product.id) && String(it.variant_id || '') === String(opts.variantId || '');
    });
    var hasVariant = opts.variantId != null && String(opts.variantId) !== '';
    var price = hasVariant ? (product.variantPrice || product.price) : product.price;
    var q = opts.qty || 1;
    if (ex) {
      ex.qty += q;
    }
    else {
      cart.push({
        id: product.id,
        variant_id: hasVariant ? String(opts.variantId) : '',
        name: product.title || product.name,
        price: price,
        qty: q,
        image: product.image || null,
        color: opts.color || null,
        size: opts.size || null
      });
    }
    saveCart(cart);
    updateBadge();
    return cart;
  }

  function changeQty(id, variantId, delta) {
    var cart = getCart();
    var idx = cart.findIndex(function (it) { return String(it.id) === String(id) && String(it.variant_id || '') === String(variantId || ''); });
    if (idx === -1) return cart;
    cart[idx].qty += delta;
    if (cart[idx].qty < 1) cart.splice(idx, 1);
    saveCart(cart);
    updateBadge();
    renderCart();
    return cart;
  }

  function removeItem(id, variantId) {
    var cart = getCart();
    var idx = cart.findIndex(function (it) { return String(it.id) === String(id) && String(it.variant_id || '') === String(variantId || ''); });
    if (idx === -1) return cart;
    cart.splice(idx, 1);
    saveCart(cart);
    updateBadge();
    renderCart();
    return cart;
  }

  function changeQtyAt(idx, delta) {
    var cart = getCart();
    if (!cart[idx]) return cart;
    cart[idx].qty += delta;
    if (cart[idx].qty < 1) cart.splice(idx, 1);
    saveCart(cart);
    updateBadge();
    renderCart();
    return cart;
  }

  function removeAt(idx) {
    var cart = getCart();
    if (!cart[idx]) return cart;
    cart.splice(idx, 1);
    saveCart(cart);
    updateBadge();
    renderCart();
    return cart;
  }

  // Elimina del carrito items cuyo producto ya no existe en el catalogo.
  // Si no hay ids validos (catalogo vacio o no cargó), NO toca el carrito.
  function pruneCart(validIds) {
    if (!Array.isArray(validIds) || !validIds.length) return getCart();
    var cart = getCart().filter(function (it) { return validIds.some(function (v) { return String(v) === String(it.id); }); });
    saveCart(cart);
    updateBadge();
    renderCart();
    return cart;
  }

  function updateBadge() {
    var n = cartCount(getCart());
    ['cart-badge', 'cart-badge-m', 'cart-badge-bar'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) {
        b.textContent = n;
        b.classList.toggle('hidden', n === 0);
        b.classList.remove('add-pop');
        void b.offsetWidth;
        b.classList.add('add-pop');
      }
    });
  }

  function fmt(v) {
    if (typeof window.formatPrice === 'function' && window.__settings) return window.formatPrice(v, window.__settings);
    return Number(v || 0).toFixed(2);
  }

  function renderCart() {
    var box = document.getElementById('cart-items');
    if (!box) return;
    var cart = getCart();
    var emptyText = (window.__settings && window.__settings.store && window.__settings.store.emptyCartText) || 'Tu carrito está vacío';
    if (!cart.length) {
      box.innerHTML = '<p style="text-align:center;color:var(--secondary-text);padding:24px 0">' + emptyText + '</p>';
      document.getElementById('cart-total').textContent = fmt(0);
      return;
    }
    var html;
    try {
      html = cart.map(function (it, i) {
        var thumb = it.image
          ? '<img class="placeholder-box thumb" src="' + it.image + '" alt="' + it.name + '" />'
          : '<div class="placeholder-box thumb" role="img" aria-label="' + it.name + '"></div>';
        var v = [it.color, it.size].filter(Boolean).join(' · ');
        return '' +
          '<div class="cart-item">' +
            thumb +
            '<div class="info">' +
              '<div class="name">' + it.name + (v ? '<br><span style="font-size:.75rem;color:var(--secondary-text)">' + v + '</span>' : '') + '</div>' +
              '<div class="price">' + fmt(it.price) + '</div>' +
            '</div>' +
            '<div class="qty-control">' +
              '<button data-dec="' + i + '" aria-label="-">-</button>' +
              '<span>' + it.qty + '</span>' +
              '<button data-inc="' + i + '" aria-label="+">+</button>' +
            '</div>' +
            '<button class="remove" data-remove="' + i + '" aria-label="x">&times;</button>' +
          '</div>';
      }).join('');
    } catch (e) {
      console.error('renderCart error', e);
      html = cart.map(function (it, i) {
        return '<div class="cart-item"><div class="info"><div class="name">' + (it.name || 'Producto') + '</div>' +
          '<div class="price">' + fmt(it.price) + '</div></div>' +
          '<div class="qty-control"><button data-dec="' + i + '">-</button>' +
          '<span>' + it.qty + '</span><button data-inc="' + i + '">+</button></div>' +
          '<button class="remove" data-remove="' + i + '">&times;</button></div>';
      }).join('');
    }
    box.innerHTML = html;
    document.getElementById('cart-total').textContent = fmt(cartTotal(cart));

    box.querySelectorAll('[data-inc]').forEach(function (b) {
      b.addEventListener('click', function () { changeQtyAt(Number(b.getAttribute('data-inc')), 1); });
    });
    box.querySelectorAll('[data-dec]').forEach(function (b) {
      b.addEventListener('click', function () { changeQtyAt(Number(b.getAttribute('data-dec')), -1); });
    });
    box.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { removeAt(Number(b.getAttribute('data-remove'))); });
    });
  }

  function openCart() { renderCart(); document.getElementById('cart-drawer').classList.add('open'); var sc = document.getElementById('cart-scrim'); if (sc) sc.classList.add('open'); }
  function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); var sc = document.getElementById('cart-scrim'); if (sc) sc.classList.remove('open'); }

  function openCheckout() {
    if (!getCart().length) { if (typeof toast === 'function') toast('Tu carrito está vacío', 'error'); return; }
    closeCart();
    window.location.href = './checkout.html';
  }
  function closeCheckout() { closeCart(); }

  // Construye el mensaje con la plantilla configurable
  function sanitizeTpl(tpl) {
    return tpl
      .replace(/\\n/g, '\n')
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
  }
  function buildMessage(settings, name, phone, method, note) {
    var s = (settings && settings.store) || {};
    var tpl = sanitizeTpl(s.messageTemplate || '');
    var cart = getCart();
    var items = cart.map(function (it, i) {
      var v = [it.color, it.size].filter(Boolean).join(' ');
      return (i + 1) + '. ' + it.name + (v ? ' (' + v + ')' : '') + ' - ' + fmt(it.price) + ' x ' + it.qty + ' = ' + fmt(it.price * it.qty);
    }).join('\n');
    var total = fmt(cartTotal(cart));
    var noteText = note ? '📝 Nota: ' + note : '';
    if (tpl) {
      return tpl
        .replace(/\{storeName\}/g, s.name || '')
        .replace(/\{name\}/g, name)
        .replace(/\{phone\}/g, phone || '')
        .replace(/\{paymentMethod\}/g, method)
        .replace(/\{noteText\}/g, noteText)
        .replace(/\{items\}/g, items)
        .replace(/\{total\}/g, total);
    }
    return '🛒 NUEVO PEDIDO - ' + (s.name || '') + '\n' +
      '\n👤 Cliente: ' + name +
      (phone ? '\n📱 Teléfono: ' + phone : '') +
      '\n💳 Método de pago: ' + method +
      (noteText ? '\n' + noteText : '') +
      '\n\n' + items +
      '\n\nTOTAL: ' + total;
  }

  // Envía el pedido: guarda en Supabase (RPC atomico) y abre WhatsApp.
  // Devuelve true si el pedido fue procesado (para mostrar estado en checkout.html).
  function sendOrder(settings, clearCart) {
    var cart = getCart();
    if (!cart.length) { if (typeof toast === 'function') toast('Tu carrito está vacío', 'error'); return false; }
    var nameEl = document.getElementById('co-name');
    var name = nameEl.value.trim();
    if (!name) { if (typeof toast === 'function') toast('Escribe tu nombre', 'error'); nameEl.focus(); return false; }
    var phone = document.getElementById('co-phone').value.trim();
    var method = document.getElementById('co-payment').value || 'Efectivo';
    var note = document.getElementById('co-note').value.trim();

    var msg = buildMessage(settings, name, phone, method, note);
    var s = (settings && settings.store) || {};

    if (typeof SBHelper !== 'undefined') {
      SBHelper.addOrder({
        name: name,
        phone: phone || '',
        payment_method: method,
        note: note || '',
        items: cart.map(function (it) {
          return { id: it.id, variant_id: it.variant_id || '', name: it.name, price: it.price, qty: it.qty, image: it.image || null, color: it.color, size: it.size };
        }),
        total: cartTotal(cart)
      }).catch(function (err) { console.warn('No se pudo guardar el pedido', err); });
    }

    if (typeof openWhatsApp === 'function') openWhatsApp(msg, s.whatsapp);

    if (clearCart !== false) {
      saveCart([]);
      updateBadge();
    }
    return true;
  }

  function wire() {
    ['cart-close', 'cart-scrim'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', closeCart);
    });
    var go = document.getElementById('go-checkout');
    if (go) go.addEventListener('click', openCheckout);
    var send = document.getElementById('send-whatsapp');
    if (send) send.addEventListener('click', function () { sendOrder(window.__settings || {}); });
  }

  window.CART = {
    getCart: getCart, saveCart: saveCart, cartCount: cartCount, cartTotal: cartTotal,
    addItem: addItem, changeQty: changeQty, changeQtyAt: changeQtyAt, removeItem: removeItem, removeAt: removeAt, pruneCart: pruneCart,
    updateBadge: updateBadge, renderCart: renderCart,
    openCart: openCart, closeCart: closeCart,
    openCheckout: openCheckout, closeCheckout: closeCheckout,
    buildMessage: buildMessage, sendOrder: sendOrder, wire: wire
  };
})();