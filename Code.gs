/**
 * Booking map → JSON for the room board.
 * Deploy: Extensions → Apps Script (from the booking-map sheet) → paste this → Deploy → New deployment
 *         → Web app, Execute as: Me, Who has access: Anyone → copy the /exec URL into SCRIPT_URL in index.html.
 */
const SHEET_ID = "1Ea1bH17heMyT8LHmT19-tthqGgQY5WcYphvMxoUC-jE";   // your synced copy of the booking map
const RANGE = "A8:M400";                 // header row (room letters) + one row per date

function doGet() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const cutoff = new Date(Date.now() - 45 * 864e5);
    // Tabs named like "2026 2/2" (Jul–Dec, runs into Jan) and "2027 1/2" (Jan–Jun), oldest first.
    const tabs = ss.getSheets()
      .map(sh => ({ sh, m: sh.getName().trim().match(/^(20\d\d)\s+([12])\s*\/\s*2$/) }))
      .filter(t => t.m)
      .map(t => {
        const y = Number(t.m[1]), half = Number(t.m[2]);
        return { sh: t.sh, order: y * 2 + half, ends: half === 1 ? new Date(y, 6, 15) : new Date(y + 1, 0, 31) };
      })
      .filter(t => t.ends >= cutoff)
      .sort((a, b) => a.order - b.order);

    const sheets = tabs.map(({ sh }) => {
      const rng = sh.getRange(RANGE);
      const vals = rng.getDisplayValues();
      const bgs = rng.getBackgrounds();
      return {
        properties: { title: sh.getName(), sheetId: sh.getSheetId() },
        data: [{
          startRow: 7,
          rowData: vals.map((row, i) => ({
            values: row.map((v, j) => {
              const cell = {};
              if (v !== "") cell.formattedValue = v;
              const h = (bgs[i][j] || "").toLowerCase();
              if (h && h !== "#ffffff" && h !== "white") cell.userEnteredFormat = { backgroundColor: hexToRgb(h) };
              return cell;
            })
          }))
        }]
      };
    });
    return json({ sheets, activities: readActivities_(ss), generatedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e) });
  }
}

/* ---------- Activities checklist (the board's "Activities" section) ----------
 * Kept in an "Activities" tab of this spreadsheet: one row per guest stay and activity.
 * The board POSTs {key, code, done, guest} whenever a box is ticked or unticked.
 */
const ACT_TAB = "Activities";
const ACT_HEAD = ["Stay key", "Guest", "Activity", "Done", "Updated"];
const ACT_CODES = { SIB: "Sauna & ice bath", S: "Surfing", Y: "Yoga", M: "Massage", L: "Laundry" };

function actSheet_(ss) {
  let sh = ss.getSheetByName(ACT_TAB);
  if (!sh) { sh = ss.insertSheet(ACT_TAB); sh.getRange(1, 1, 1, ACT_HEAD.length).setValues([ACT_HEAD]); sh.setFrozenRows(1); }
  return sh;
}
function readActivities_(ss) {
  const sh = ss.getSheetByName(ACT_TAB);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, ACT_HEAD.length).getValues()
    .filter(r => r[0] && r[2])
    .map(r => ({ key: String(r[0]), code: codeOf_(r[2]), done: Number(r[3]) || 0 }));
}
function codeOf_(label) { const l = String(label); for (const k in ACT_CODES) if (k === l || ACT_CODES[k] === l) return k; return l; }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const b = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const key = String(b.key || "").slice(0, 120), code = String(b.code || "");
    const done = Math.max(0, Math.min(50, Math.round(Number(b.done) || 0)));
    if (!key || !ACT_CODES[code]) return json({ error: "bad request" });
    const ss = SpreadsheetApp.openById(SHEET_ID), sh = actSheet_(ss);
    const n = Math.max(0, sh.getLastRow() - 1);
    const rows = n ? sh.getRange(2, 1, n, 3).getValues() : [];
    const i = rows.findIndex(r => String(r[0]) === key && codeOf_(r[2]) === code);
    const row = [key, String(b.guest || "").slice(0, 80), ACT_CODES[code], done, new Date()];
    if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    return json({ ok: true, activities: readActivities_(ss) });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function hexToRgb(h) {
  const n = parseInt(h.replace("#", "").slice(0, 6), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
