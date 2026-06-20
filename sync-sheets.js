/* =========================================================================
   SYNC CON GOOGLE SHEETS — TIEMPO REAL v6
   =========================================================================
   Flujo completo:
   ─ Al CONECTAR: descarga Sheets si tiene datos, si no sube los locales
   ─ Al CARGAR LA APP: siempre descarga de Sheets (es la fuente de verdad)
   ─ Al GUARDAR CAMBIO: sube a Sheets inmediatamente
   ─ Polling 15s: verifica si hay cambios nuevos en Sheets → recarga
   ─ Al volver a la pestaña: verifica y recarga si hay cambios
   ========================================================================= */

var SYNC_KEY_URL    = 'cofre_sheets_url';
var SYNC_TIMEOUT_MS = 12000;
var SYNC_POLL_MS    = 15000;

var _syncSaving   = false;
var _syncPolling  = null;
var _visHandlerOk = false;

/* ─── URL ──────────────────────────────────────────────────── */

function getSheetsUrl()    { return localStorage.getItem(SYNC_KEY_URL) || ''; }
function setSheetsUrl(url) {
  url ? localStorage.setItem(SYNC_KEY_URL, url)
      : localStorage.removeItem(SYNC_KEY_URL);
}
function syncHabilitado()  { return !!getSheetsUrl(); }

/* ─── FETCH CON TIMEOUT ────────────────────────────────────── */

function fetchSheet(url, opts) {
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, SYNC_TIMEOUT_MS);
  return fetch(url, Object.assign({ redirect: 'follow', signal: ctrl.signal }, opts || {}))
    .then(function(r) { clearTimeout(timer); return r; })
    .catch(function(e){ clearTimeout(timer); throw e; });
}

/* ─── PING ─────────────────────────────────────────────────── */

async function syncPing(url) {
  var res  = await fetchSheet(url + '?action=ping');
  var json = await res.json().catch(function() {
    throw new Error('La URL no devolvió JSON válido. Revisa que el Apps Script esté bien desplegado.');
  });
  if (!json.ok) throw new Error(json.error || 'Error en el backend');
  return json;
}

/* ─── CARGAR DESDE SHEETS ──────────────────────────────────── */

async function syncCargar() {
  var url = getSheetsUrl();
  if (!url) return null;
  var res  = await fetchSheet(url + '?action=load');
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Error al cargar datos');
  return json.data || null; // null = Sheets está vacío todavía
}

/* ─── GUARDAR EN SHEETS ────────────────────────────────────── */

async function syncGuardarAhora(state) {
  var url = getSheetsUrl();
  if (!url) return false;

  // Si hay un guardado en curso, esperar un momento y reintentar
  if (_syncSaving) {
    setTimeout(function() { syncGuardarAhora(state); }, 2000);
    return false;
  }

  _syncSaving = true;
  setBadgeSync('saving');

  try {
    var res  = await fetchSheet(url + '?action=save', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data: state }),
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error al guardar');
    setBadgeSync('ok');
    return true;
  } catch(e) {
    console.warn('[Sync] Error al guardar:', e.message);
    setBadgeSync('error');
    return false;
  } finally {
    _syncSaving = false;
  }
}

// Llamada desde guardarEstado() en app-core.js
function syncGuardar(state) {
  syncGuardarAhora(state);
}

/* ─── APLICAR DATOS DE SHEETS Y REFRESCAR UI ──────────────── */

function aplicarDatosSheets(datos) {
  aplicarEstadoCargado(datos);  // actualiza STATE + localStorage
  aplicarTema();
  actualizarTopbarYBadges();
  refrescarVistaActual();       // redibuja la vista actual con los nuevos datos
  setBadgeSync('ok');
}

/* ─── CARGA INICIAL (al abrir la app) ─────────────────────── */

async function syncCargaInicial() {
  if (!syncHabilitado()) { setBadgeSync('off'); return; }

  setBadgeSync('loading');
  try {
    var datosSheets = await syncCargar();

    if (!datosSheets) {
      // Sheets vacío → subir los datos locales para que estén disponibles
      // en todos los dispositivos
      console.log('[Sync] Sheets vacío, subiendo datos locales...');
      await syncGuardarAhora(STATE);
      return;
    }

    // Sheets tiene datos — comparo timestamps
    var tsSheets = datosSheets._ts ? new Date(datosSheets._ts).getTime() : 0;
    var tsLocal  = STATE._ts       ? new Date(STATE._ts).getTime()       : 0;

    if (tsSheets > tsLocal) {
      // Sheets es más nuevo → aplicar (caso: abrir en otro dispositivo)
      console.log('[Sync] Cargando datos más nuevos de Sheets...');
      aplicarDatosSheets(datosSheets);
    } else if (tsLocal > tsSheets) {
      // Local es más nuevo → subir (caso: hice cambios offline)
      console.log('[Sync] Subiendo datos locales más nuevos a Sheets...');
      await syncGuardarAhora(STATE);
    } else {
      // Iguales → todo OK
      setBadgeSync('ok');
    }
  } catch(e) {
    console.warn('[Sync] Error en carga inicial:', e.message);
    setBadgeSync('error');
  }
}

/* ─── AL CONECTAR (primer dispositivo o nuevo dispositivo) ─── */

async function sincronizarAlConectar(url) {
  setBadgeSync('loading');
  try {
    // 1. Verificar que el backend responde
    await syncPing(url);
    setSheetsUrl(url);

    // 2. Ver qué hay en Sheets
    var datosSheets = await syncCargar();

    if (datosSheets && datosSheets._ts) {
      var tsSheets = new Date(datosSheets._ts).getTime();
      var tsLocal  = STATE._ts ? new Date(STATE._ts).getTime() : 0;

      if (tsSheets > tsLocal) {
        // Sheets tiene datos más nuevos (el otro dispositivo ya tenía datos)
        aplicarDatosSheets(datosSheets);
        toast('✓ Datos cargados desde Google Sheets.', 'success');
      } else {
        // Mis datos locales son más nuevos → subirlos
        await syncGuardarAhora(STATE);
        toast('✓ Datos subidos a Google Sheets.', 'success');
      }
    } else {
      // Sheets vacío → subir mis datos locales
      await syncGuardarAhora(STATE);
      toast('✓ Conectado. Datos guardados en Google Sheets.', 'success');
    }

    // 3. Arrancar el polling y el listener de visibilidad
    iniciarPolling();
    configurarSyncVisibilidad();

  } catch(e) {
    setSheetsUrl(''); // revertir si falló
    setBadgeSync('error');
    throw e; // re-lanzar para que el botón muestre el error
  }
}

/* ─── POLLING CADA 15 SEGUNDOS ─────────────────────────────── */

function iniciarPolling() {
  detenerPolling();
  _syncPolling = setInterval(async function() {
    if (!syncHabilitado() || _syncSaving) return;
    try {
      var url     = getSheetsUrl();
      var resPing = await fetchSheet(url + '?action=ping');
      var ping    = await resPing.json();
      if (!ping.ok || !ping.lastSaved) return;

      var tsSheets = new Date(ping.lastSaved).getTime();
      var tsLocal  = STATE._ts ? new Date(STATE._ts).getTime() : 0;

      if (tsSheets > tsLocal + 2000) {
        // Hay datos nuevos en Sheets → descargar y aplicar
        console.log('[Sync] Polling: datos nuevos detectados, descargando...');
        var datos = await syncCargar();
        if (!datos) return;
        aplicarDatosSheets(datos);
        toast('↻ Datos actualizados desde otro dispositivo.', 'info');
      }
    } catch(e) {
      // Error silencioso en polling — no interrumpir al usuario
      setBadgeSync('error');
    }
  }, SYNC_POLL_MS);
}

function detenerPolling() {
  if (_syncPolling) { clearInterval(_syncPolling); _syncPolling = null; }
}

/* ─── SYNC AL VOLVER A LA PESTAÑA ──────────────────────────── */

function configurarSyncVisibilidad() {
  if (_visHandlerOk) return; // evitar duplicar el listener
  _visHandlerOk = true;
  document.addEventListener('visibilitychange', async function() {
    if (document.visibilityState !== 'visible' || !syncHabilitado()) return;
    try {
      var url     = getSheetsUrl();
      var resPing = await fetchSheet(url + '?action=ping');
      var ping    = await resPing.json();
      if (!ping.ok || !ping.lastSaved) return;

      var tsSheets = new Date(ping.lastSaved).getTime();
      var tsLocal  = STATE._ts ? new Date(STATE._ts).getTime() : 0;

      if (tsSheets > tsLocal + 2000) {
        var datos = await syncCargar();
        if (!datos) return;
        aplicarDatosSheets(datos);
        toast('↻ Datos actualizados al volver a la app.', 'info');
      }
    } catch(e) {
      console.warn('[Sync] Error al volver a la app:', e.message);
    }
  });
}

/* ─── BADGE EN TOPBAR ───────────────────────────────────────── */

function setBadgeSync(estado) {
  var badge = document.getElementById('syncBadge');
  if (!badge) return;

  var cfgs = {
    loading: { color: '#5B9FFF', icon: '⟳', title: 'Sincronizando...' },
    saving:  { color: '#5B9FFF', icon: '⟳', title: 'Guardando en Sheets...' },
    ok:      { color: '#3DDC97', icon: '●', title: 'Sincronizado con Google Sheets' },
    error:   { color: '#FFA94D', icon: '●', title: 'Sin conexión — guardado localmente' },
    off:     { color: '#555',    icon: '○', title: 'Google Sheets no configurado' },
  };
  var cfg = cfgs[estado] || cfgs.off;
  badge.style.color   = cfg.color;
  badge.title         = cfg.title;
  badge.textContent   = cfg.icon;

  var ind = document.getElementById('syncIndicator');
  if (ind) {
    var txts = {
      loading: 'Sincronizando...', saving: 'Guardando en Sheets...',
      ok: '● Sincronizado', error: '⚠ Sin conexión (datos locales)', off: '○ Sin conectar',
    };
    ind.textContent   = txts[estado] || '';
    ind.style.color   = cfg.color;
  }
}

/* ─── INICIO (llamado desde app-main.js) ───────────────────── */

async function iniciarSistemaSync() {
  if (!syncHabilitado()) { setBadgeSync('off'); return; }
  await syncCargaInicial();
  iniciarPolling();
  configurarSyncVisibilidad();
}
