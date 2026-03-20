/**
 * Parse a Netflix ViewingActivity.csv export.
 * Returns an array compatible with NetflixItemSchema:
 *   [{ title, seriesTitle?, date?, duration? }]
 *
 * Netflix CSV columns (ViewingActivity.csv):
 *   Profile Name, Start Time, Duration, Attributes, Title, ...
 *
 * Episode titles come in the form "Series: Season X: Episode Title"
 * so we split on ": " to extract the series title.
 */
export function parseNetflixCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV appears empty or has no data rows.");

  const headers = parseCSVLine(lines[0]);
  const col = (name) =>
    headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

  const titleIdx = col("Title");
  const dateIdx  = col("Start Time");
  const durIdx   = col("Duration");

  if (titleIdx === -1) {
    throw new Error(
      'Could not find a "Title" column. Make sure you uploaded ViewingActivity.csv from your Netflix export.'
    );
  }

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row.length) continue;

    const fullTitle = row[titleIdx]?.trim();
    if (!fullTitle) continue;

    // Netflix episode format: "Series Title: Season X: \"Episode Title\""
    const parts = fullTitle.split(": ");
    let title       = fullTitle;
    let seriesTitle = null;

    if (parts.length >= 2) {
      seriesTitle = parts[0].trim();
      title       = parts[parts.length - 1].replace(/^"|"$/g, "").trim();
    }

    items.push({
      title,
      seriesTitle,
      date:     dateIdx !== -1 ? row[dateIdx]?.trim()  || null : null,
      duration: durIdx  !== -1 ? row[durIdx]?.trim()   || null : null,
    });
  }

  if (!items.length) throw new Error("No viewing history found in the CSV.");
  return items;
}

/** Minimal RFC 4180 CSV line parser — handles quoted fields and escaped quotes. */
function parseCSVLine(line) {
  const result = [];
  let current  = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
