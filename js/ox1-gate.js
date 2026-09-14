/* =============================================================
   OX1 gate — bloqueo por licencia + badge de plan (tienda web)
   -------------------------------------------------------------
   Depende de:
     - js/ox1-license.js       (SDK, carga primero)
     - window.OX1_CONFIG       (definido en config.js)

   Si no hay licencia configurada (placeholders), la tienda sigue
   funcionando normal (modo seguro). Al poner valores reales, la
   tienda se bloquea sola si el servidor OX1 la suspende, revoca o
   expira, o si pierde conexion mas alla de graceHours.

   MODO TIENDA (OX1_WSTORE): cuando config.js define
     window.OX1_WSTORE = { centralUrl, wsRef, wsStoreId }
   el gate consulta la RPC publica store_status del panel CENTRAL y
   bloquea la tienda al instante si la central dice online=false
   (no registrada, suspendida o vencida). Si el panel no tiene esa
   tienda registrada aún, la página queda bloqueada (más seguro).
   ============================================================= */
(function () {
  'use strict';

  var cfg = window.OX1_CONFIG || null;
  var wstore = window.OX1_WSTORE || null;

  // Sin configuración: no gatear.
  if (!cfg && !wstore) return;

  var locked = false;
  var ovEl = null;

  function esc(s) {
    var d = document.createElement('span');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  // Overlay opaco a pantalla completa: bloquea lo que haya debajo
  // (el render de la tienda) mientras se verifica el estado. Se
  // crea en cuanto se evalua el script, ANTES del render, para
  // que nunca se vea la tienda "descubierta" detras.
  function ensureOverlay() {
    if (ovEl && document.getElementById('ox1-lock')) return ovEl;
    ovEl = document.createElement('div');
    ovEl.id = 'ox1-lock';
    ovEl.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:#0e0e13;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ovEl.style.visibility = 'hidden';
    document.body.appendChild(ovEl);
    return ovEl;
  }

  function showChecking() {
    var ov = ensureOverlay();
    ov.style.visibility = 'visible';
    ov.innerHTML =
      '<div style="width:34px;height:34px;border-radius:50%;border:3px solid #27272a;border-top-color:#16a34a;animation:ox1spin .8s linear infinite"></div>' +
      '<p style="margin:0;color:#a1a1aa;max-width:420px;font-size:14px">Comprobando estado de la tienda...</p>';
    if (!document.getElementById('ox1-spin-css')) {
      var st = document.createElement('style');
      st.id = 'ox1-spin-css';
      st.textContent = '@keyframes ox1spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(st);
    }
  }

  function hideOverlay() {
    if (ovEl) ovEl.style.visibility = 'hidden';
    if (document.body) document.body.style.visibility = '';
  }

  function showLock(reason) {
    locked = true;
    var ov = ensureOverlay();
    ov.style.visibility = 'visible';
    if (!document.getElementById('ox1-lock-btn')) {
      ov.innerHTML =
        '<div style="font-size:46px;line-height:1">\uD83D\uDD12</div>' +
        '<h1 style="margin:4px 0 0;font-size:24px;letter-spacing:.5px">P\u00e1gina suspendida</h1>' +
        '<p style="margin:0;color:#a1a1aa;max-width:420px;font-size:14px">' + esc(reason) + '</p>' +
        '<p style="margin:0;color:#71717a;font-size:12px">Contacta con tu proveedor para reactivar la tienda.</p>' +
        '<button type="button" id="ox1-lock-btn" style="margin-top:8px;padding:10px 26px;border:none;border-radius:999px;background:#16a34a;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Reintentar</button>';
      var btn = document.getElementById('ox1-lock-btn');
      if (btn) {
        btn.addEventListener('click', function () {
          if (cfg && OX1License && OX1License.recheck) {
            OX1License.recheck().catch(function () {});
            return;
          }
          if (wstore) { showChecking(); checkStore().catch(function () {}); }
        });
      }
    }
  }

  /* ---- Modo tienda: consulta store_status en la central ---- */
  var checkTimer = null;
  function checkStore() {
    return new Promise(function (resolve) {
      if (!wstore || !wstore.centralUrl || !wstore.wsRef || !(wstore.wsStoreId > 0)) {
        resolve(false);
        return;
      }
      fetch(wstore.centralUrl + '/rest/v1/rpc/store_status', {
        method: 'POST',
        headers: { 'apikey': wstore.centralKey || '', 'Authorization': 'Bearer ' + (wstore.centralKey || '') , 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_ws_ref: wstore.wsRef, p_ws_store_id: wstore.wsStoreId })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.online === true) {
          locked = false;
          hideOverlay();
          resolve(true);
        } else {
          var reason = (j && j.reason) || 'La tienda no está registrada o fue suspendida.';
          showLock(reason);
          resolve(false);
        }
      }).catch(function () {
        if (wstore.failOpen !== true) showLock('No se pudo verificar el estado de la tienda.');
        else hideOverlay();
        resolve(false);
      });
    });
  }

  function scheduleCheck() {
    if (checkTimer) clearInterval(checkTimer);
    var ms = (wstore && wstore.refreshMs) || 5 * 60 * 1000;
    checkTimer = setInterval(function () {
      if (document.hidden === true) return;
      checkStore().catch(function () {});
    }, ms);
  }

  function init() {
    // Balance: si la tienda está bloqueada, no esperar más.
    if (cfg) {
      try {
        var liCfg = cfg.appId && cfg.key && String(cfg.appId).indexOf('REEMPLAZAR') !== 0 && String(cfg.key).indexOf('REEMPLAZAR') !== 0;
        if (liCfg && OX1License) {
          OX1License.init({
            endpoint: cfg.endpoint,
            appId: cfg.appId,
            key: cfg.key,
            heartbeatHours: cfg.heartbeatHours || 6,
            graceHours: cfg.graceHours || 72,
            debug: !!cfg.debug,
            onLock: showLock,
            onState: function () {
            }
          });
          OX1License.check().catch(function () {});
        }
      } catch (e) {
        if (cfg.debug) console.error('[OX1] license:', e);
      }
    }
    if (wstore) {
      // Tapar la tienda ya en el primer paint: nada se ve detras
      // mientras la central decide si esta online o suspendida.
      checkStore().then(function (online) {
        if (!online) return;
        scheduleCheck();
      });
    }
  }

  // En modo tienda, tapar la pagina de inmediato (antes de que
  // renderice) y NO mostrar contenido hasta que la central confirme.
  if (wstore && wstore.centralUrl && wstore.wsRef && wstore.wsStoreId > 0) {
    if (document.body) document.body.style.visibility = 'hidden';
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { showChecking(); init(); });
    } else {
      showChecking();
      init();
    }
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();