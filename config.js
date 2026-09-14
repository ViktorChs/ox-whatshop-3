/* Configuracion de Supabase - OX WhatShop */
const SUPABASE_URL = 'https://qfxcnvnjbabikdikftsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BRvDhGZ0uVwqxP3QL0vcYQ_NMuEAnYs';
const STORAGE_BUCKET = 'images';

/* ===== OX1 Licencia (validacion contra el Supabase CENTRAL) =====
   Rellena estos valores desde el panel central (OX1Dashboard > Licenses):
     - appId = UUID de la app "OX1 WhatShop" en el panel central.
     - key   = clave de licencia del cliente (formato OX1-XXXX-XXXX-XXXX-XXXX).
   Mientras el appId/key digan "REEMPLAZAR", la tienda NO se bloquea. */
window.OX1_CONFIG = {
  endpoint: 'https://wufzqynbhvfbzlmqnvgw.supabase.co',
  appId: 'REEMPLAZAR-CON-EL-APPID-DE-OX1-WHATSHOP',
  key: 'REEMPLAZAR-CON-LA-CLAVE-DEL-CLIENTE',
  plan: 'free', /* free | basico | profesional | empresarial — se muestra en el panel admin bajo el logo */
  heartbeatHours: 6,
  graceHours: 72,
  debug: false
};

/* Analiticas opcionales (Google Analytics 4). Pon tu Measurement ID, p. ej. 'G-XXXXXXXXXX' */
const GA4_ID = '';

/* Auto-limpiar service workers y caché viejos (evita servir versiones corruptas) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (rs) {
    rs.forEach(function (r) { r.unregister(); });
  });
}
if (window.caches && caches.keys) {
  caches.keys().then(function (keys) {
    keys.forEach(function (k) { caches.delete(k); });
  });
}

/* Cargar GA4 si hay Measurement ID configurado */
(function () {
  if (!GA4_ID) return;
  var g = document.createElement('script');
  g.async = true;
  g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(g);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA4_ID);
  window.gtag = gtag;
})();

/* Banner de consentimiento de cookies (solo tienda, no admin) */
(function () {
  function initCookieBanner() {
    if (document.body.classList.contains('admin-page')) return;
    if (localStorage.getItem('whatshop_cookies') === 'ok') return;
    var bar = document.createElement('div');
    bar.id = 'cookie-banner';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#111;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,.25)';
    bar.innerHTML = '<span style="flex:1;min-width:200px">Usamos cookies y almacenamiento local para mejorar tu experiencia.</span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="cookie-accept" style="padding:8px 18px;border:none;border-radius:999px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">Aceptar</button>' +
      '<a href="./cookies.html" style="padding:8px 14px;border-radius:999px;border:1px solid #fff;color:#fff;text-decoration:none;font-weight:600">Más info</a>' +
      '</span>';
    document.body.appendChild(bar);
    document.getElementById('cookie-accept').addEventListener('click', function () {
      localStorage.setItem('whatshop_cookies', 'ok');
      bar.remove();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCookieBanner);
  else initCookieBanner();
})();

/* ===== OX1 tienda (bloqueo via panel central) =====
   Valores por despliegue (OX1Dashboard > Stores). wsStoreId distinto
   por tienda (esta = 1). El gate bloquea si la central dice offline.
   Para tienda nueva: registrar sucursal en el panel CENTRAL antes de
   desplegar, si no queda bloqueada. */
const WS_STORE_ID = 3;
const WS_STORE_NAME = 'WhatShop-100';
window.OX1_WSTORE = {
  centralUrl: 'https://wufzqynbhvfbzlmqnvgw.supabase.co',
  centralKey: 'sb_publishable_MLdr8wFcc2vG9npNtUg38g_Dg_uxodE',
  wsRef: 'qfxcnvnjbabikdikftsr',
  wsStoreId: WS_STORE_ID,
  refreshMs: 5 * 60 * 1000
};

/* ===== CDN de imagenes (Cloudflare Worker) =====
   Las imagenes publicas se sirven desde el Worker de Cloudflare, que
   cachea y reenvia a Supabase una sola vez -> 0 egress en visitas
   repetidas. NO usar barra final. */
window.IMG_CDN = 'https://shiny-scene-c37d.contactservice-ox1.workers.dev';

/* ===== OX1 keep-alive (mantener la BD activa) =====
   Supabase (plan free) pausa el proyecto si no recibe ninguna
   peticion durante 7 dias. Esta pagina hace un fetch ligero a la
   BD de la tienda y a la central con la frecuencia indicada,
   mientras este abierta. Se complementa con el cron de GitHub
   Actions del dashboard (que peticiona aunque nadie tenga abierta
   la pagina). */
(function () {
  var KEEPALIVE_MS = 20 * 60 * 1000; /* cada 20 min */
  function keepalivePing() {
    try {
      /* ping a la BD de la tienda: select ligero sobre settings (ya permitido para anon) */
      fetch(SUPABASE_URL + '/rest/v1/settings?select=store_id&limit=1', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
      }).catch(function () {});
    } catch (e) {}
    var wst = window.OX1_WSTORE;
    if (!wst || !wst.centralUrl || !wst.centralKey || wst.wsRef == null) return;
    try {
      /* ping a la central: store_status ya es una RPC barata registrada */
      fetch(wst.centralUrl + '/rest/v1/rpc/store_status', {
        method: 'POST',
        headers: {
          'apikey': wst.centralKey,
          'Authorization': 'Bearer ' + wst.centralKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_ws_ref: wst.wsRef, p_ws_store_id: wst.wsStoreId })
      }).catch(function () {});
    } catch (e) {}
  }
  try {
    if (window.navigator && navigator.connection && navigator.connection.saveData) return;
  } catch (e) {}
  keepalivePing();
  setInterval(keepalivePing, KEEPALIVE_MS);
})();