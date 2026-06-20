// ============================================================
// COFRE — Backend Google Apps Script v5
// ============================================================
// INSTRUCCIONES CORRECTAS:
//
// 1. Abre drive.google.com
// 2. Clic en "+ Nuevo" → "Google Sheets" (crea una hoja nueva)
// 3. Dale un nombre: "Cofre Datos"
// 4. En el menú: Extensiones → Apps Script
//    (Esto abre el editor YA vinculado a esa hoja)
// 5. Borra todo el código que hay y pega ESTE código completo
// 6. Guarda con Ctrl+S
// 7. Clic en "Implementar" → "Nueva implementación"
//    - Clic en el engranaje ⚙ → "Aplicación web"
//    - Ejecutar como: "Yo"
//    - Acceso: "Cualquier persona"
//    - Clic en "Implementar" y acepta permisos
// 8. Copia la URL y pégala en Cofre → Configuración → Google Sheets
// ============================================================

function doGet(e) {
  return processRequest(e);
}

function doPost(e) {
  return processRequest(e);
}

function processRequest(e) {
  try {
    var action = 'load';
    if (e && e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }

    if (action === 'ping') {
      var ts = getTimestamp();
      return respond({ ok: true, msg: 'OK', lastSaved: ts });
    }

    if (action === 'load') {
      var data = readData();
      return respond({ ok: true, data: data });
    }

    if (action === 'save') {
      if (!e || !e.postData || !e.postData.contents) {
        return respond({ ok: false, error: 'Sin datos' });
      }
      var parsed = JSON.parse(e.postData.contents);
      if (!parsed || !parsed.data) {
        return respond({ ok: false, error: 'Formato incorrecto' });
      }
      var savedAt = writeData(parsed.data);
      return respond({ ok: true, savedAt: savedAt });
    }

    return respond({ ok: false, error: 'Accion desconocida: ' + action });

  } catch (err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── Obtener o crear la hoja de datos ──────────────────────────

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Cofre_Data');
  if (!sheet) {
    // La hoja no existe aún — la creamos con cabeceras
    sheet = ss.insertSheet('Cofre_Data');
    sheet.getRange('A1').setValue('datos_json');
    sheet.getRange('B1').setValue('ultima_actualizacion');
    sheet.getRange('A2').setValue('');
    sheet.getRange('B2').setValue('');
    sheet.hideSheet(); // ocultarla para no confundir
  }
  return sheet;
}

function getTimestamp() {
  try {
    var sheet = getOrCreateSheet();
    var val = sheet.getRange('B2').getValue();
    return val ? val.toString() : null;
  } catch(e) {
    return null;
  }
}

function readData() {
  var sheet = getOrCreateSheet();
  var raw = sheet.getRange('A2').getValue();
  if (!raw || raw.toString().trim() === '') return null;
  try {
    return JSON.parse(raw.toString());
  } catch(e) {
    return null;
  }
}

function writeData(data) {
  var sheet = getOrCreateSheet();
  var now = new Date().toISOString();
  if (typeof data === 'object' && data !== null) {
    data._ts = now;
  }
  sheet.getRange('A2').setValue(JSON.stringify(data));
  sheet.getRange('B2').setValue(now);
  return now;
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
