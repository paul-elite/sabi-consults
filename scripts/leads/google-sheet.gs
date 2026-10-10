// Paste this into your Google Sheet: Extensions > Apps Script, replace everything, save,
// then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
// See scripts/leads/README.md for the full steps.
//
// The lead finder posts its results here. New companies are added at the bottom with
// status "New"; companies already in the sheet get fresh scores, and your own "status"
// and "notes" columns are never touched.

const SECRET = 'CHANGE-ME-to-a-long-random-phrase'; // must match LEADS_SHEET_SECRET in GitHub
const SHEET_NAME = 'Leads';
const STATUSES = ['New', 'Contacted', 'Replied', 'Meeting', 'Won', 'Not interested'];
const KEEP_COLUMNS = ['status', 'notes', 'first_seen']; // set once, then left alone

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) return reply({ error: 'wrong secret' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return reply(upsert(body.columns, body.rows));
  } finally {
    lock.releaseLock();
  }
}

function upsert(columns, rows) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);

  // Header: key, status, notes, then whatever the finder sends. Unknown columns are appended.
  let header = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (!header.length) header = ['key', 'status', 'notes'];
  columns.concat(['last_seen']).forEach((c) => header.indexOf(c) === -1 && header.push(c));
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  const col = (name) => header.indexOf(name);

  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, header.length).getValues() : [];
  const rowByKey = {};
  existing.forEach((r, i) => (rowByKey[r[col('key')]] = i));

  const today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const added = [];
  let updated = 0;
  rows.forEach((values) => {
    const lead = {};
    columns.forEach((c, i) => (lead[c] = values[i]));
    lead.last_seen = today;
    const at = rowByKey[lead.key];
    if (at === undefined) {
      const r = header.map(() => '');
      header.forEach((h, i) => h in lead && (r[i] = lead[h]));
      r[col('status')] = 'New';
      if (!r[col('first_seen')]) r[col('first_seen')] = today;
      added.push(r);
    } else {
      header.forEach((h, i) => h in lead && KEEP_COLUMNS.indexOf(h) === -1 && (existing[at][i] = lead[h]));
      updated++;
    }
  });

  if (existing.length) sheet.getRange(2, 1, existing.length, header.length).setValues(existing);
  if (added.length) {
    added.sort((a, b) => (Number(b[col('score')]) || 0) - (Number(a[col('score')]) || 0));
    sheet.getRange(sheet.getLastRow() + 1, 1, added.length, header.length).setValues(added);
  }

  const total = sheet.getLastRow() - 1;
  if (total > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
    sheet.getRange(2, col('status') + 1, total, 1).setDataValidation(rule);
  }
  return { added: added.length, updated: updated };
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
