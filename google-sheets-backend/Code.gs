// ============================================================
// COFRE — Backend Google Apps Script v7
// ============================================================
// IMPORTANTE: Este script debe estar vinculado a un Google Sheets.
// Para crearlo correctamente:
//   1. Abre drive.google.com → + Nuevo → Google Sheets
//   2. Ponle nombre "Cofre Datos"
//   3. Menú Extensiones → Apps Script
//   4. Borra todo y pega ESTE código
//   5. Guarda (Ctrl+S)
//   6. Implementar → Nueva implementación → App web
//      Ejecutar como: Yo | Acceso: Cualquier persona
//   7. Copia la URL
// ============================================================

function doGet(e)  { return handle(e, 'GET');  }
function doPost(e) { return handle(e, 'POST'); }

function handle(e, method) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'load';

    if (action === 'ping') {
      var sheet = getOrMakeSheet();
      var ts = sheet.getRange('B2').getValue();
      return ok({ lastSaved: ts ? ts.toString() : null });
    }

    if (action === 'load') {
      var sheet = getOrMakeSheet();
      var raw = sheet.getRange('A2').getValue();
      var data = null;
      if (raw && raw.toString().trim() !== '') {
        try { data = JSON.parse(raw.toString()); } catch(x) { data = null; }
      }
      return ok({ data: data });
    }

    if (action === 'save') {
      var body = '';
      if (e && e.postData) {
        body = e.postData.contents || '';
      }
      if (!body && e && e.parameter && e.parameter.payload) {
        body = e.parameter.payload;
      }
      if (!body) {
        return fail('No se recibieron datos. Method=' + method);
      }

      var parsed = JSON.parse(body);
      if (!parsed || !parsed.data) {
        return fail('JSON incorrecto: falta el campo data');
      }

      var now = new Date().toISOString();
      var data = parsed.data;
      data._ts = now;

      var sheet = getOrMakeSheet();
      sheet.getRange('A2').setValue(JSON.stringify(data));
      sheet.getRange('B2').setValue(now);

      return ok({ savedAt: now });
    }

    return fail('Accion desconocida: ' + action);
  } catch(err) {
    return fail(err.toString());
  }
}

function getOrMakeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Cofre_Data');
  if (!sheet) {
    sheet = ss.insertSheet('Cofre_Data');
    sheet.getRange('A1').setValue('datos');
    sheet.getRange('B1').setValue('actualizado');
    sheet.getRange('A2').setValue('');
    sheet.getRange('B2').setValue('');
  }
  return sheet;
}

function ok(obj)   { obj.ok = true;  return respond(obj); }
function fail(msg) { return respond({ ok: false, error: msg }); }

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
