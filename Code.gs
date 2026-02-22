/**
 * Production-ready Ramadan Timings backend for Google Apps Script.
 * Deployment: https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec
 */

var SHEET_NAME = 'Sheet1';
var PENDING_SHEET_NAME = 'PendingEdits';

/**
 * GET /exec?date=yyyy-MM-dd&country=&state=&district=&area=
 * Returns filtered JSON array with required fields.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var tz = Session.getScriptTimeZone();
    var targetDate = params.date ? parseIsoDate(params.date) : new Date();
    var dateKey = toIsoDateString(targetDate);

    var sheet = getOrCreateSheet_(SHEET_NAME, true);
    var rows = readRows_(sheet);

    var filtered = rows.filter(function (r) {
      if (r.Date !== dateKey) return false;
      if (params.country && r.Country !== params.country) return false;
      if (params.state && r.State !== params.state) return false;
      if (params.district && r.District !== params.district) return false;
      if (params.area && r.Area !== params.area) return false;
      return true;
    });

    return jsonResponse(filtered, 200);
  } catch (error) {
    return jsonResponse({ success: false, message: 'GET failed', error: error.message }, 500);
  }
}

/**
 * POST accepts:
 * { action:"add"|"update", editor_key?, Country,State,District,Area,Date,Sehri,Iftar }
 * Update requires valid editor key; otherwise stores in PendingEdits.
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(body.action || 'add').toLowerCase();

    var required = ['Country', 'State', 'District', 'Area', 'Date', 'Sehri', 'Iftar'];
    for (var i = 0; i < required.length; i++) {
      if (!String(body[required[i]] || '').trim()) {
        return jsonResponse({ success: false, message: required[i] + ' is required' }, 400);
      }
    }

    var parsedDate = parseIsoDate(body.Date);
    var dateKey = toIsoDateString(parsedDate);
    var sehri = formatTime12(body.Sehri);
    var iftar = formatTime12(body.Iftar);

    var payload = {
      Country: String(body.Country).trim(),
      State: String(body.State).trim(),
      District: String(body.District).trim(),
      Area: String(body.Area).trim(),
      Date: dateKey,
      Sehri: sehri,
      Iftar: iftar,
      LastUpdated: new Date().toISOString(),
    };

    var sheet = getOrCreateSheet_(SHEET_NAME, true);
    var lookup = findMatchRow_(sheet, payload);

    if (lookup.rowIndex > 0) {
      if (!checkEditorKey(body.editor_key || '')) {
        savePendingEdit_(payload, action, 'editor_key required for updates');
        return jsonResponse({ success: false, action: 'pending', message: 'editor_key required; saved to PendingEdits' }, 200);
      }

      sheet.getRange(lookup.rowIndex, 6).setValue(payload.Sehri);
      sheet.getRange(lookup.rowIndex, 7).setValue(payload.Iftar);
      sheet.getRange(lookup.rowIndex, 8).setValue(payload.LastUpdated);
      return jsonResponse({ success: true, action: 'updated', rowIndex: lookup.rowIndex }, 200);
    }

    // If user asked update but row does not exist, append as new entry.
    sheet.appendRow([payload.Country, payload.State, payload.District, payload.Area, payload.Date, payload.Sehri, payload.Iftar, payload.LastUpdated]);
    return jsonResponse({ success: true, action: 'added' }, 200);
  } catch (error) {
    return jsonResponse({ success: false, message: 'POST failed', error: error.message }, 500);
  }
}

/**
 * Validates editor key against Script Properties EDITOR_KEY.
 * Set it with:
 * PropertiesService.getScriptProperties().setProperty('EDITOR_KEY','your-secret')
 */
function checkEditorKey(key) {
  var expected = PropertiesService.getScriptProperties().getProperty('EDITOR_KEY') || '';
  return key && expected && String(key) === String(expected);
}

/** Converts HH:mm or hh:mm AM/PM to hh:mm AM/PM using script timezone. */
function formatTime12(time) {
  var value = String(time || '').trim();
  if (!value) throw new Error('Invalid time');

  var ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    var h1 = Number(ampmMatch[1]);
    var m1 = Number(ampmMatch[2]);
    if (h1 < 1 || h1 > 12 || m1 < 0 || m1 > 59) throw new Error('Invalid 12h time: ' + value);
    var dt1 = new Date();
    dt1.setHours(ampmMatch[3].toUpperCase() === 'PM' && h1 !== 12 ? h1 + 12 : (ampmMatch[3].toUpperCase() === 'AM' && h1 === 12 ? 0 : h1), m1, 0, 0);
    return Utilities.formatDate(dt1, Session.getScriptTimeZone(), 'hh:mm a');
  }

  var hhmmMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmmMatch) throw new Error('Time must be HH:mm or hh:mm AM/PM');

  var h2 = Number(hhmmMatch[1]);
  var m2 = Number(hhmmMatch[2]);
  if (h2 < 0 || h2 > 23 || m2 < 0 || m2 > 59) throw new Error('Invalid 24h time: ' + value);

  var dt2 = new Date();
  dt2.setHours(h2, m2, 0, 0);
  return Utilities.formatDate(dt2, Session.getScriptTimeZone(), 'hh:mm a');
}

/** Parse yyyy-MM-dd into a Date object safely in script timezone. */
function parseIsoDate(str) {
  var match = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Date must be yyyy-MM-dd');
  var y = Number(match[1]);
  var m = Number(match[2]) - 1;
  var d = Number(match[3]);
  var date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) throw new Error('Invalid date');
  return date;
}

/** Returns yyyy-MM-dd in script timezone. */
function toIsoDateString(dateObj) {
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** Wrap JSON with status and proper mime type. */
function jsonResponse(obj, status) {
  var payload = Object.assign({ status: status || 200 }, obj);
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(name, withHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (withHeaders && sheet.getLastRow() === 0) {
    sheet.appendRow(['Country', 'State', 'District', 'Area', 'Date', 'Sehri', 'Iftar', 'LastUpdated']);
  }
  return sheet;
}

function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return values.map(function (row) {
    return {
      Country: String(row[0] || ''),
      State: String(row[1] || ''),
      District: String(row[2] || ''),
      Area: String(row[3] || ''),
      Date: row[4] instanceof Date ? toIsoDateString(row[4]) : String(row[4] || ''),
      Sehri: formatTime12(row[5] || ''),
      Iftar: formatTime12(row[6] || ''),
      LastUpdated: row[7] ? new Date(row[7]).toISOString() : new Date().toISOString(),
    };
  });
}

function findMatchRow_(sheet, payload) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rowIndex: -1 };

  var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < values.length; i++) {
    var rowDate = values[i][4] instanceof Date ? toIsoDateString(values[i][4]) : String(values[i][4] || '');
    if (
      String(values[i][0] || '') === payload.Country &&
      String(values[i][1] || '') === payload.State &&
      String(values[i][2] || '') === payload.District &&
      String(values[i][3] || '') === payload.Area &&
      rowDate === payload.Date
    ) {
      return { rowIndex: i + 2 };
    }
  }

  return { rowIndex: -1 };
}

function savePendingEdit_(payload, action, reason) {
  var pending = getOrCreateSheet_(PENDING_SHEET_NAME, false);
  if (pending.getLastRow() === 0) {
    pending.appendRow(['Timestamp', 'Action', 'Reason', 'Country', 'State', 'District', 'Area', 'Date', 'Sehri', 'Iftar', 'LastUpdated']);
  }

  pending.appendRow([
    new Date().toISOString(),
    action,
    reason,
    payload.Country,
    payload.State,
    payload.District,
    payload.Area,
    payload.Date,
    payload.Sehri,
    payload.Iftar,
    payload.LastUpdated,
  ]);
}

/**
 * Admin helper: manually approve a pending edit row.
 * Run this function from Apps Script editor: approvePending(2)
 */
function approvePending(rowIndex) {
  var pending = getOrCreateSheet_(PENDING_SHEET_NAME, false);
  var row = pending.getRange(rowIndex, 1, 1, 11).getValues()[0];

  var payload = {
    Country: String(row[3] || ''),
    State: String(row[4] || ''),
    District: String(row[5] || ''),
    Area: String(row[6] || ''),
    Date: String(row[7] || ''),
    Sehri: String(row[8] || ''),
    Iftar: String(row[9] || ''),
    LastUpdated: String(row[10] || new Date().toISOString()),
  };

  var sheet = getOrCreateSheet_(SHEET_NAME, true);
  var match = findMatchRow_(sheet, payload);

  if (match.rowIndex > 0) {
    sheet.getRange(match.rowIndex, 6).setValue(payload.Sehri);
    sheet.getRange(match.rowIndex, 7).setValue(payload.Iftar);
    sheet.getRange(match.rowIndex, 8).setValue(new Date().toISOString());
  } else {
    sheet.appendRow([payload.Country, payload.State, payload.District, payload.Area, payload.Date, payload.Sehri, payload.Iftar, new Date().toISOString()]);
  }
}
