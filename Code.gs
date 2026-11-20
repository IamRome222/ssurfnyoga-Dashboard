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
    return json({ sheets, generatedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e) });
  }
}

function hexToRgb(h) {
  const n = parseInt(h.replace("#", "").slice(0, 6), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
