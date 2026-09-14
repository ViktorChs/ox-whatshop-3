// =============================================================
// OX1 License SDK — Web (vanilla JS, sin dependencias)
// -------------------------------------------------------------
// CÓMO USARLO (ver app/web/INSTALL.md):
//
//   OX1License.init({
//     endpoint: 'https://TU_PROYECTO.supabase.co',  // Supabase URL
//     appId: 'uuid-de-la-app-en-tu-panel',
//     key: 'OX1-XXXX-XXXX-XXXX-XXXX',               // clave del cliente
//     heartbeatHours: 6,                            // latido cada 6h
//     graceHours: 72,                               // tolerancia offline
//     onLock: (reason) => { /* Muestra tu pantalla de bloqueo */ },
//   });
//
//   OX1License.check();  // ejecutar al arrancar la app
//
// La app se bloquea sola si el servidor la suspende/revoca/expira,
// o si pierde conexión más allá de graceHours.
//
// NUNCA guardes aquí la service_role ni el secreto HMAC: el servidor
// revalida cada latido. Esto SDK solo reporta y obedece.
// =============================================================

(function () {
  'use strict';

  const P = 'ox1:';
  const TAMPER_MS = 5 * 60 * 1000; // tolerancia de 5 min si el reloj "retrocede"

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function sha256hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function storage(cfg) {
    return cfg.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  function get(k, cfg) { const s = storage(cfg); try { return s ? JSON.parse(s.getItem(P + k)) : null; } catch { return null; } }
  function set(k, v, cfg) { const s = storage(cfg); if (!s) return; try { s.setItem(P + k, JSON.stringify(v)); } catch {} }
  function del(k, cfg) { const s = storage(cfg); if (!s) return; try { s.removeItem(P + k); } catch {} }

  let cfg = null;
  let locked = false;
  let timer = null;

  async function deviceId() {
    let id = get('device', cfg);
    if (!id) { id = uuid(); set('device', id, cfg); }
    return id;
  }

  async function fingerprint() {
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const scr = typeof screen !== 'undefined' ? screen : {};
    const signals = [
      nav.userAgent || '', nav.platform || '', nav.language || '',
      navigator.languages ? navigator.languages.join(',') : '',
      scr.width + 'x' + scr.height + 'x' + scr.colorDepth,
      new Date().getTimezoneOffset(), nav.hardwareConcurrency || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ].join('|');
    return sha256hex(signals);
  }

  async function call(fnName, body) {
    if (!cfg) throw new Error('OX1License.init() no llamado.');
    const url = cfg.endpoint.replace(/\/+$/, '') + '/functions/v1/' + fnName;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  }

  // Guarda el veredicto firmado. serverOk = tiempo del servidor
  // (issued_at), base = reloj local en ese momento. Así, si el usuario
  // atrasa el reloj, la caché se invalida sola.
  function storeOk(data) {
    const serverOk = Date.parse(data.issued_at);
    set('state', {
      data,
      serverOk: isNaN(serverOk) ? Date.now() : serverOk,
      base: Date.now(),
    }, cfg);
  }

  function cached() {
    return get('state', cfg);
  }

  // ¿La caché sigue dentro de la gracia y del vencimiento?
  function cachedUsable() {
    const c = cached();
    if (!c || !c.data || !c.data.allowed) return null;
    const now = Date.now();
    // Reloj manipulado: si "hoy" es anterior al momento en que se guardó
    // la caché, el usuario atrasó el reloj para no vencer la gracia.
    if (c.base && now < c.base - TAMPER_MS) return null;
    const grace = (cfg.graceHours || c.data.grace_hours || 72) * 3600 * 1000;
    const base = c.base || now;
    const elapsed = now - base;
    if (elapsed > grace) return null;
    if (c.data.expires_at) {
      const expires = Date.parse(c.data.expires_at);
      const serverNow = (c.serverOk || base) + elapsed;
      if (!isNaN(expires) && serverNow >= expires) return null;
    }
    return c;
  }

  function stopTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function lock(reason) {
    if (locked) return;
    locked = true;
    stopTimer();
    if (cfg.onLock) cfg.onLock(reason);
    if (cfg.onState) cfg.onState('locked', reason);
    if (cfg.debug) console.warn('[OX1] BLOCKED:', reason);
  }

  function stateOk(data) {
    if (cfg.onState) cfg.onState('ok', data);
  }

  // Activa (primer arranque o dispositivo no registrado).
  async function activate() {
    const body = {
      key: cfg.key,
      app_id: cfg.appId,
      device_id: await deviceId(),
      fingerprint: await fingerprint(),
      platform: 'web',
      name: (typeof navigator !== 'undefined' ? navigator.userAgent : 'web') || 'web',
    };
    const json = await call('ox1-activate', body);
    if (json.ok) { storeOk(json.data); stateOk(json.data); return json.data; }
    throw { code: json.error, message: json.message };
  }

  // Latido (revalidación contra el servidor).
  async function validate() {
    const body = {
      key: cfg.key,
      device_id: await deviceId(),
      fingerprint: await fingerprint(),
      platform: 'web',
      name: (typeof navigator !== 'undefined' ? navigator.userAgent : 'web') || 'web',
    };
    const c = cached();
    if (c && c.data) {
      body.sig = c.data.sig;
      body.issued_at = c.data.issued_at;
    }
    const json = await call('ox1-validate', body);
    if (json.ok) { storeOk(json.data); stateOk(json.data); return json.data; }
    throw { code: json.error, message: json.message };
  }

  function scheduleHeartbeat() {
    stopTimer();
    if (locked) return;
    const h = Math.max(1, cfg.heartbeatHours || 6) * 3600 * 1000;
    const jitter = h * (0.8 + Math.random() * 0.4); // ±20%
    timer = setTimeout(runHeartbeat, jitter);
  }

  async function runHeartbeat() {
    if (locked) return;
    try {
      await validate();
      scheduleHeartbeat();
    } catch (e) {
      // El servidor olvidó el dispositivo -> reactivar.
      if (e && e.code === 'not_activated') {
        try { await activate(); scheduleHeartbeat(); return; } catch (e2) { e = e2; }
      }
      // ¿Tenemos caché todavía dentro de la gracia? -> reintenta luego.
      if (cachedUsable()) { scheduleHeartbeat(); return; }
      lock(e && e.code ? e.code : 'offline');
    }
  }

  // =============================================================
  // API pública
  // =============================================================
  const OX1License = {
    init(settings) {
      cfg = Object.assign({ heartbeatHours: 6, graceHours: 72, debug: false, gateUrl: null }, settings);
      if (!cfg.endpoint) throw new Error('OX1License: falta "endpoint".');
      if (!cfg.appId) throw new Error('OX1License: falta "appId".');
      if (!cfg.key) throw new Error('OX1License: falta "key".');
      if (typeof cfg.onLock !== 'function') console.warn('[OX1] define "onLock" para mostrar el bloqueo.');
    },

    async check() {
      if (locked) return;
      try {
        // 1) Si hay caché válida, funciona sin red (gracia).
        const c = cachedUsable();
        if (c) { stateOk(c.data); scheduleHeartbeat(); return c.data; }
        // 2) Sin caché o vencida: activa si es nuevo, valida si no.
        const has = cached();
        const data = has ? await validate() : await activate();
        scheduleHeartbeat();
        return data;
      } catch (e) {
        const c = cachedUsable();
        if (c) { scheduleHeartbeat(); return c.data; }
        lock(e && e.code ? e.code : 'error');
        throw e;
      }
    },

    // Fuerza una revalidación inmediata (p. ej. botón "Reintentar").
    async recheck() { del('state', cfg); locked = false; return this.check(); },

    // Desvincula este dispositivo (p. ej. "Cerrar sesión").
    async deactivate() {
      try {
        await call('ox1-deactivate', { key: cfg.key, device_id: await deviceId() });
      } catch {}
      del('state', cfg);
      locked = false;
    },

    // Envía el veredicto firmado al server-gate para que emita la cookie
    // httpOnly OX1_OK. Requiere cfg.gateUrl. Llámalo tras check().
    async syncSession() {
      if (!cfg.gateUrl) throw new Error('OX1License: falta "gateUrl" en init().');
      const c = cached();
      if (!c || !c.data) throw new Error('OX1License: sin veredicto aún, llama a check() primero.');
      const res = await fetch(cfg.gateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          key: cfg.key,
          device_id: c.data.device_id,
          sig: c.data.sig,
          issued_at: c.data.issued_at,
        }),
      });
      return { ok: res.ok, status: res.status };
    },

    setKey(k) { cfg.key = k; del('state', cfg); },

    async getDevice() { return { device_id: await deviceId(), fingerprint: await fingerprint() }; },

    isLocked: () => locked,
  };

  window.OX1License = OX1License;
})();