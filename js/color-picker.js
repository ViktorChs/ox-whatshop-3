/* OX WhatShop - Color picker personalizado (hex 6/8 digitos, con transparencia) */

(function () {
  var SWATCHES = ['#FFFFFF', '#171717', '#000000', '#E8ECF0', '#A16207', '#16A34A', '#DC2626', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', 'transparent'];

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function hexToRgba(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (h.length === 6) h += 'ff';
    if (h.length !== 8) return null;
    var n = parseInt(h, 16);
    if (isNaN(n)) return null;
    return { r: (n >> 24) & 255, g: (n >> 16) & 255, b: (n >> 8) & 255, a: ((n & 255) / 255) };
  }

  function rgbaToHex(r, g, b, a) {
    var hx = function (v) { return ('0' + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); };
    var base = '#' + hx(r) + hx(g) + hx(b);
    if (a >= 0.999) return base;
    return base + hx(a * 255);
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    var h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, v: v };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    var r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }

  var CHECKER = 'repeating-conic-gradient(#b9b9b9 0% 25%, #ffffff 0% 50%) 0 0 / 12px 12px';

  function build(el) {
    var initial = hexToRgba(el.value) || { r: 0, g: 0, b: 0, a: 1 };
    var hsv = rgbToHsv(initial.r, initial.g, initial.b);
    var state = { hue: hsv.h, s: hsv.s, v: hsv.v, r: initial.r, g: initial.g, b: initial.b, a: initial.a };

    el.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'cp';

    var swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'cp-swatch';
    swatch.title = 'Abrir selector de color';

    var hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'cp-hex';
    hexInput.spellcheck = false;
    hexInput.setAttribute('autocomplete', 'off');

    var panel = document.createElement('div');
    panel.className = 'cp-panel';
    panel.innerHTML =
      '<div class="cp-sv-wrap"><canvas class="cp-sv" width="208" height="124"></canvas><span class="cp-thumb"></span></div>' +
      '<div class="cp-bar cp-hue"><span class="cp-thumb"></span></div>' +
      '<div class="cp-bar cp-alpha"><span class="cp-thumb"></span></div>' +
      '<div class="cp-swatches"></div>' +
      '<div class="cp-hex-row"><span class="cp-hash">#</span><input type="text" class="cp-hex-input" spellcheck="false" autocomplete="off" /><span class="cp-preview"></span></div>';

    wrap.appendChild(swatch);
    wrap.appendChild(hexInput);
    wrap.appendChild(panel);
    el.parentNode.insertBefore(wrap, el.nextSibling);

    var sv = panel.querySelector('.cp-sv');
    var hueBar = panel.querySelector('.cp-hue');
    var alphaBar = panel.querySelector('.cp-alpha');
    var svThumb = panel.querySelector('.cp-sv-wrap .cp-thumb');
    var hueThumb = panel.querySelector('.cp-hue .cp-thumb');
    var alphaThumb = panel.querySelector('.cp-alpha .cp-thumb');
    var swatchesBox = panel.querySelector('.cp-swatches');
    var hexField = panel.querySelector('.cp-hex-input');
    var preview = panel.querySelector('.cp-preview');

    function render() {
      var rgb = hsvToRgb(state.hue, state.s, state.v);
      state.r = rgb.r; state.g = rgb.g; state.b = rgb.b;
      var hex = rgbaToHex(state.r, state.g, state.b, state.a);

      swatch.style.setProperty('--c', hex);
      hexInput.value = hex.replace('#', '');
      hexField.value = hex.replace('#', '');

      var svX = state.s * sv.width;
      var svY = (1 - state.v) * sv.height;
      svThumb.style.left = svX + 'px';
      svThumb.style.top = svY + 'px';
      svThumb.style.display = 'block';
      hueThumb.style.left = (state.hue / 360 * hueBar.offsetWidth) + 'px';
      alphaThumb.style.left = (state.a * alphaBar.offsetWidth) + 'px';
      alphaBar.style.background = 'linear-gradient(to right, rgba(' + state.r + ',' + state.g + ',' + state.b + ',0), rgba(' + state.r + ',' + state.g + ',' + state.b + ',1))';
      preview.style.background = hex;

      el.value = hex;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      drawSV();
    }

    function drawSV() {
      var ctx = sv.getContext('2d');
      var w = sv.width, h = sv.height;
      ctx.fillStyle = 'hsl(' + state.hue + ',100%,50%)';
      ctx.fillRect(0, 0, w, h);
      var g1 = ctx.createLinearGradient(0, 0, w, 0);
      g1.addColorStop(0, '#fff');
      g1.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      var g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, 'rgba(0,0,0,0)');
      g2.addColorStop(1, '#000');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    }

    // Swatches
    SWATCHES.forEach(function (hex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cp-sw';
      if (hex === 'transparent') {
        b.style.backgroundImage = CHECKER;
        b.title = 'Transparente';
      } else {
        b.style.background = hex;
      }
      b.addEventListener('click', function () {
        if (hex === 'transparent') { state.a = 0; }
        else { var p = hexToRgba(hex); state.hue = rgbToHsv(p.r, p.g, p.b).h; state.s = rgbToHsv(p.r, p.g, p.b).s; state.v = rgbToHsv(p.r, p.g, p.b).v; state.a = p.a; }
        render();
      });
      swatchesBox.appendChild(b);
    });

    // Pointer helpers (barras 1D)
    function attachDrag(bar, applyValue) {
      bar.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var move = function (ev) {
          var rect = bar.getBoundingClientRect();
          var val = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
          applyValue(val);
          render();
        };
        move(e);
        bar.setPointerCapture(e.pointerId);
        var up = function () { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
      });
    }
    attachDrag(hueBar, function (val) { state.hue = val * 360; });
    attachDrag(alphaBar, function (val) { state.a = val; });

    // Drag 2D para el canvas SV
    sv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var move = function (ev) {
        var rect = sv.getBoundingClientRect();
        state.s = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        state.v = clamp(1 - (ev.clientY - rect.top) / rect.height, 0, 1);
        render();
      };
      move(e);
      sv.setPointerCapture(e.pointerId);
      var up = function () { sv.removeEventListener('pointermove', move); sv.removeEventListener('pointerup', up); };
      sv.addEventListener('pointermove', move);
      sv.addEventListener('pointerup', up);
    });

    // Hex input (6 o 8 digitos)
    hexField.addEventListener('change', function () {
      var p = hexToRgba(hexField.value);
      if (!p) { hexField.value = rgbaToHex(state.r, state.g, state.b, state.a).replace('#', ''); return; }
      state.r = p.r; state.g = p.g; state.b = p.b; state.a = p.a;
      var hsv2 = rgbToHsv(p.r, p.g, p.b);
      state.hue = hsv2.h; state.s = hsv2.s; state.v = hsv2.v;
      render();
    });
    hexField.addEventListener('input', function () {
      var p = hexToRgba(hexField.value);
      if (p) {
        state.r = p.r; state.g = p.g; state.b = p.b; state.a = p.a;
        var hsv2 = rgbToHsv(p.r, p.g, p.b);
        state.hue = hsv2.h; state.s = hsv2.s; state.v = hsv2.v;
        render();
      }
    });

    hexInput.addEventListener('change', function () {
      var p = hexToRgba(hexInput.value);
      if (p) {
        state.r = p.r; state.g = p.g; state.b = p.b; state.a = p.a;
        var hsv2 = rgbToHsv(p.r, p.g, p.b);
        state.hue = hsv2.h; state.s = hsv2.s; state.v = hsv2.v;
        render();
      } else { hexInput.value = rgbaToHex(state.r, state.g, state.b, state.a).replace('#', ''); }
    });

    // Open/close
    function openPanel() { panel.classList.add('open'); }
    function closePanel() { panel.classList.remove('open'); }
    swatch.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.contains('open') ? closePanel() : openPanel(); });
    hexInput.addEventListener('focus', function () { hexInput.select(); });
    hexInput.addEventListener('click', function (e) { e.stopPropagation(); openPanel(); });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    render();
    return { input: el, sync: function () { var p = hexToRgba(el.value); if (p) { state.r = p.r; state.g = p.g; state.b = p.b; state.a = p.a; var h2 = rgbToHsv(p.r, p.g, p.b); state.hue = h2.h; state.s = h2.s; state.v = h2.v; render(); } } };
  }

  var registry = [];
  function init() {
    document.querySelectorAll('input[type="color"]').forEach(function (el) {
      if (el.__cpBuilt) return;
      el.__cpBuilt = true;
      registry.push(build(el));
    });
  }
  function syncAll() { registry.forEach(function (r) { r.sync(); }); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ColorPicker = { syncAll: syncAll, init: init };
})();