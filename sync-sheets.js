/* =========================================================================
   SYNC CON GOOGLE SHEETS — v7 (CORS fix + verificación)
   =========================================================================
   PROBLEMA ANTERIOR: fetch con Content-Type: application/json dispara un
   preflight CORS (OPTIONS) que Apps Script NO soporta. La request nunca
   llega. FIX: enviar sin header Content-Type + verificar con GET después.
   ========================================================================= */

var SYNC_KEY     = 'cofre_sheets_url';
var SYNC_POLL    = 15000;
var SYNC_TIMEOUT = 12000;
var _saving      = false;
var _pollId      = null;
var _visOk       = false;

/* ── URL ─────────────────────────────────────────────────────── */
function getSheetsUrl()    { return localStorage.getItem(SYNC_KEY) || ''; }
function setSheetsUrl(u)   { u ? localStorage.setItem(SYNC_KEY,u) : localStorage.removeItem(SYNC_KEY); }
function syncHabilitado()  { return !!getSheetsUrl(); }

/* ── Fetch con timeout ───────────────────────────────────────── */
function sfetch(url, opts) {
  var c = new AbortController();
  var t = setTimeout(function(){ c.abort(); }, SYNC_TIMEOUT);
  return fetch(url, Object.assign({ signal: c.signal, redirect:'follow' }, opts||{}))
    .then(function(r){ clearTimeout(t); return r; })
    .catch(function(e){ clearTimeout(t); throw e; });
}

/* ── Parsear respuesta (Apps Script redirige, a veces devuelve HTML) ── */
async function parseResponse(res) {
  var text = await res.text();
  try { return JSON.parse(text); }
  catch(e) {
    // Apps Script a veces devuelve HTML tras redirect — intentar extraer JSON
    var match = text.match(/\{[\s\S]*"ok"\s*:/);
    if (match) {
      try {
        var jsonStart = text.indexOf('{');
        var jsonEnd   = text.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
          return JSON.parse(text.substring(jsonStart, jsonEnd+1));
      } catch(e2) {}
    }
    return null;
  }
}

/* ── PING ────────────────────────────────────────────────────── */
async function syncPing(url) {
  console.log('[Sync] Ping a', url);
  var res  = await sfetch(url + '?action=ping');
  var json = await parseResponse(res);
  if (!json) throw new Error('URL inválida — no devolvió JSON');
  if (!json.ok) throw new Error(json.error || 'Backend error');
  console.log('[Sync] Ping OK', json);
  return json;
}

/* ── CARGAR (GET — siempre funciona con CORS) ────────────────── */
async function syncCargar() {
  var url = getSheetsUrl();
  if (!url) return null;
  console.log('[Sync] Cargando desde Sheets...');
  var res  = await sfetch(url + '?action=load');
  var json = await parseResponse(res);
  if (!json) { console.warn('[Sync] Load: respuesta no JSON'); return null; }
  if (!json.ok) { console.warn('[Sync] Load error:', json.error); return null; }
  console.log('[Sync] Cargado OK, tiene datos:', !!json.data);
  return json.data || null;
}

/* ── GUARDAR (POST sin Content-Type para evitar CORS preflight) ── */
async function syncGuardarAhora(state) {
  var url = getSheetsUrl();
  if (!url || _saving) return false;
  _saving = true;
  setBadgeSync('saving');
  console.log('[Sync] Guardando en Sheets... ts:', state._ts);

  try {
    // IMPORTANTE: NO enviar Content-Type header para evitar CORS preflight
    // Apps Script lee e.postData.contents igualmente
    var res = await sfetch(url + '?action=save', {
      method: 'POST',
      body: JSON.stringify({ data: state }),
      // SIN headers de Content-Type
    });
    var json = await parseResponse(res);

    if (json && json.ok) {
      console.log('[Sync] Guardado OK, savedAt:', json.savedAt);
      setBadgeSync('ok');
      _saving = false;
      return true;
    }

    // Si no pudimos leer la respuesta JSON (redirect de Apps Script),
    // verificamos con un GET que los datos realmente se guardaron
    console.log('[Sync] Respuesta no clara, verificando con GET...');
    var check = await syncCargar();
    if (check && check._ts === state._ts) {
      console.log('[Sync] Verificación OK — datos guardados correctamente');
      setBadgeSync('ok');
      _saving = false;
      return true;
    }

    console.warn('[Sync] No se pudo verificar el guardado');
    setBadgeSync('error');
    _saving = false;
    return false;

  } catch(e) {
    console.warn('[Sync] Error al guardar:', e.message);
    setBadgeSync('error');
    _saving = false;
    return false;
  }
}

// Alias
function syncGuardar(state) { syncGuardarAhora(state); }

/* ── Aplicar datos de Sheets y refrescar toda la UI ──────────── */
function aplicarDatosSheets(datos) {
  console.log('[Sync] Aplicando datos de Sheets, ts:', datos._ts);
  aplicarEstadoCargado(datos);
  aplicarTema();
  actualizarTopbarYBadges();
  refrescarVistaActual();
  setBadgeSync('ok');
}

/* ── CONECTAR (primer uso o nuevo dispositivo) ───────────────── */
async function sincronizarAlConectar(url) {
  setBadgeSync('loading');
  console.log('[Sync] Conectando a:', url);

  // 1. Verificar que responde
  await syncPing(url);
  setSheetsUrl(url);

  // 2. Intentar cargar datos de Sheets
  var datosSheets = null;
  try { datosSheets = await syncCargar(); } catch(e) {}

  if (datosSheets && datosSheets._ts) {
    var tsS = new Date(datosSheets._ts).getTime();
    var tsL = STATE._ts ? new Date(STATE._ts).getTime() : 0;

    if (tsS > tsL) {
      // Sheets más nuevo → descargar (otro dispositivo ya tenía datos)
      console.log('[Sync] Sheets tiene datos más nuevos, cargando...');
      aplicarDatosSheets(datosSheets);
      toast('✓ Datos cargados desde Google Sheets.', 'success');
    } else {
      // Local más nuevo → subir
      console.log('[Sync] Datos locales más nuevos, subiendo...');
      var ok = await syncGuardarAhora(STATE);
      toast(ok ? '✓ Datos subidos a Google Sheets.' : '⚠ Error al subir datos.', ok ? 'success' : 'warning');
    }
  } else if (STATE.cuentas && STATE.cuentas.length > 0) {
    // Sheets vacío pero tengo datos locales → subir
    console.log('[Sync] Sheets vacío, subiendo datos locales...');
    var ok = await syncGuardarAhora(STATE);
    toast(ok ? '✓ Datos subidos a Google Sheets.' : '⚠ Error al subir datos.', ok ? 'success' : 'warning');
  } else {
    // Todo vacío
    setBadgeSync('ok');
    toast('✓ Conectado. Google Sheets listo para recibir datos.', 'success');
  }

  // 3. Arrancar polling y detección de visibilidad
  iniciarPolling();
  configurarSyncVisibilidad();
}

/* ── CARGA INICIAL (al abrir la app si ya estaba conectado) ─── */
async function syncCargaInicial() {
  if (!syncHabilitado()) { setBadgeSync('off'); return; }
  setBadgeSync('loading');
  console.log('[Sync] Carga inicial...');

  try {
    var datosSheets = await syncCargar();

    if (!datosSheets) {
      // Sheets vacío → subir datos locales si los hay
      if (STATE.cuentas && STATE.cuentas.length > 0) {
        console.log('[Sync] Sheets vacío, subiendo datos locales...');
        await syncGuardarAhora(STATE);
      } else {
        setBadgeSync('ok');
      }
      return;
    }

    var tsS = datosSheets._ts ? new Date(datosSheets._ts).getTime() : 0;
    var tsL = STATE._ts ? new Date(STATE._ts).getTime() : 0;

    if (tsS > tsL) {
      console.log('[Sync] Sheets más nuevo ('+new Date(tsS).toLocaleTimeString()+' vs '+new Date(tsL).toLocaleTimeString()+'), aplicando...');
      aplicarDatosSheets(datosSheets);
    } else if (tsL > tsS) {
      console.log('[Sync] Local más nuevo, subiendo...');
      await syncGuardarAhora(STATE);
    } else {
      console.log('[Sync] Datos sincronizados.');
      setBadgeSync('ok');
    }
  } catch(e) {
    console.warn('[Sync] Error carga inicial:', e.message);
    setBadgeSync('error');
  }
}

/* ── POLLING cada 15s ────────────────────────────────────────── */
function iniciarPolling() {
  detenerPolling();
  _pollId = setInterval(async function() {
    if (!syncHabilitado() || _saving) return;
    try {
      // Ping para ver timestamp sin descargar todo
      var url  = getSheetsUrl();
      var res  = await sfetch(url + '?action=ping');
      var ping = await parseResponse(res);
      if (!ping || !ping.ok || !ping.lastSaved) return;

      var tsS = new Date(ping.lastSaved).getTime();
      var tsL = STATE._ts ? new Date(STATE._ts).getTime() : 0;

      if (tsS > tsL + 2000) {
        console.log('[Sync] Polling: cambios detectados, descargando...');
        var datos = await syncCargar();
        if (datos) {
          aplicarDatosSheets(datos);
          toast('↻ Datos actualizados desde otro dispositivo.', 'info');
        }
      }
    } catch(e) {
      // Silencioso
    }
  }, SYNC_POLL);
}
function detenerPolling() { if (_pollId) { clearInterval(_pollId); _pollId = null; } }

/* ── Sync al volver a la pestaña ─────────────────────────────── */
function configurarSyncVisibilidad() {
  if (_visOk) return;
  _visOk = true;
  document.addEventListener('visibilitychange', async function() {
    if (document.visibilityState !== 'visible' || !syncHabilitado() || _saving) return;
    try {
      var url  = getSheetsUrl();
      var res  = await sfetch(url + '?action=ping');
      var ping = await parseResponse(res);
      if (!ping || !ping.ok || !ping.lastSaved) return;
      var tsS = new Date(ping.lastSaved).getTime();
      var tsL = STATE._ts ? new Date(STATE._ts).getTime() : 0;
      if (tsS > tsL + 2000) {
        var datos = await syncCargar();
        if (datos) {
          aplicarDatosSheets(datos);
          toast('↻ Datos actualizados al volver.', 'info');
        }
      }
    } catch(e) {}
  });
}

/* ── Badge de estado ─────────────────────────────────────────── */
function setBadgeSync(estado) {
  var b = document.getElementById('syncBadge');
  if (!b) return;
  var m = {
    loading:{c:'#5B9FFF',i:'⟳',t:'Sincronizando...'},
    saving: {c:'#5B9FFF',i:'⟳',t:'Guardando...'},
    ok:     {c:'#3DDC97',i:'●',t:'Sincronizado'},
    error:  {c:'#FFA94D',i:'●',t:'Sin conexión'},
    off:    {c:'#555',   i:'○',t:'No conectado'},
  }[estado]||{c:'#555',i:'○',t:''};
  b.style.color=m.c; b.textContent=m.i; b.title=m.t;
  var ind = document.getElementById('syncIndicator');
  if(ind){ ind.textContent=m.i+' '+m.t; ind.style.color=m.c; }
}

/* ── Inicio ──────────────────────────────────────────────────── */
async function iniciarSistemaSync() {
  if (!syncHabilitado()) { setBadgeSync('off'); return; }
  await syncCargaInicial();
  iniciarPolling();
  configurarSyncVisibilidad();
}
