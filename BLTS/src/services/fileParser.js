import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const trim = (v) => (v === undefined || v === null ? '' : String(v).trim());
export const num  = (v) => { const f = parseFloat(trim(v)); return isNaN(f) ? null : f; };

const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
export const isFailGrade = (g) => FAIL_GRADES.has(trim(g).toUpperCase());

// Normalise name: uppercase, collapse whitespace — used as the primary join key
export const normName = (n) => trim(n).toUpperCase().replace(/\s+/g, ' ');

// ─── Period helpers ───────────────────────────────────────────────────────────
export function normalisePeriod(raw) {
  if (!raw) return '';
  const m = trim(raw).replace(/\s+/g, ' ').match(/(Winter|Summer)[- ]?(\d{4})/i);
  if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}-${m[2]}`;
  return trim(raw);
}

export function periodSortKey(period) {
  const m = (period || '').match(/(Winter|Summer)[- ]?(\d{4})/i);
  if (!m) return 0;
  return parseInt(m[2], 10) * 100 + (/winter/i.test(m[1]) ? 11 : 5);
}

// ─── File role detection ──────────────────────────────────────────────────────
export function detectFileRole(filename) {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase();
  if (/^or[_ ]|or[_ ]integrated|^or_/i.test(filename) || /^or\b/.test(base)) return 'OR';
  if (/pass[_ ]?m?feed|passfeed/i.test(base)) return 'PASS_MFEED';
  if (/fail[_ ]?m?feed|failfeed/i.test(base)) return 'FAIL_MFEED';
  return 'UNKNOWN';
}

// ─── Read file → raw rows ─────────────────────────────────────────────────────
export function readFileToRows(file) {
  const name = file.name.toLowerCase();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = (e) => {
      try {
        let wb;
        if (name.endsWith('.csv')) {
          wb = XLSX.read(e.target.result, { type: 'string', raw: false, cellText: true, cellDates: false });
        } else {
          wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', raw: false, cellText: true, cellDates: false });
        }
        let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });

        // Fix garbage first-column header (long numeric string in some OR CSVs)
        if (rows.length > 0) {
          const firstKey = Object.keys(rows[0])[0];
          if (firstKey && /^\d{4,}/.test(firstKey)) {
            rows = rows.map(r => {
              const fixed = { no: r[firstKey] };
              Object.keys(r).forEach(k => { if (k !== firstKey) fixed[k] = r[k]; });
              return fixed;
            });
          }
        }
        resolve(rows);
      } catch (err) {
        reject(new Error(`Could not parse ${file.name}: ${err.message}`));
      }
    };
    if (name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

// ─── Extract period from rows ─────────────────────────────────────────────────
export function extractPeriodFromRows(rows) {
  for (const row of rows) {
    // Handle both 'Period' (CSV) and 'Sem No.' / 'Period' (integrated XLSX)
    const p = trim(row['Period'] || row['Sem No.'] || '');
    if (p && /(Winter|Summer)/i.test(p)) return normalisePeriod(p);
  }
  return '';
}

// ─── Detect if a row is from the integrated XLSX format ──────────────────────
// Integrated XLSX uses ExtMark01/IntMark01/PractMark01 instead of Out of (70)E etc.
function isIntegratedFormat(row) {
  return 'ExtMark01' in row || 'Program Name' in row;
}

// ─── Extract subjects from OR row — handles BOTH CSV and integrated XLSX ──────
export function extractSubjectsOR(row) {
  const integrated = isIntegratedFormat(row);
  const subjects = [];

  for (let i = 1; i <= 10; i++) {
    const pad = String(i).padStart(2, '0');

    const code = trim(row[`SubCode${pad}`]);
    if (!code || code === '-' || /^Sem-/i.test(code)) continue;

    const subGrade = trim(row[`SubGrade${pad}`]);
    const emGrade  = trim(row[`EMGrade${pad}`] || row[`EMGrade${i}`] || '');
    const gradeForBacklog = subGrade || emGrade;

    let theoryMarks, midMarks, vivaMarks;
    if (integrated) {
      // Integrated XLSX column names
      theoryMarks = trim(row[`ExtMark${pad}`]);
      midMarks    = trim(row[`IntMark${pad}`]);
      vivaMarks   = trim(row[`PractMark${pad}`]);
    } else {
      // Standard CSV column names (slot 1 has no suffix, slots 2+ have _N-1)
      const sfx = i === 1 ? '' : `_${i - 1}`;
      theoryMarks = trim(row[`Out of (70)E${sfx}`]);
      midMarks    = trim(row[`Total(30)M${sfx}`]);
      vivaMarks   = trim(row[`Practical(50)V${sfx}`]);
    }

    subjects.push({
      code,
      name:        trim(row[`SubHead${pad}`]),
      credits:     num(row[`SubCredit${pad}`]) ?? 0,
      theoryMarks,
      midMarks,
      vivaMarks,
      totalMarks:  trim(row[`SubMark${pad}`]),
      comment:     trim(row[`Comment${pad}`] || (i === 1 ? row['Comment'] : row[`Comment_${i-1}`]) || ''),
      theoryGrade: trim(row[`TGrade${pad}`] || row[`TGrade${i}`] || ''),
      midGrade:    trim(row[`MGrade${pad}`]  || row[`MGrade${i}`]  || ''),
      vivaGrade:   trim(row[`VGrade${pad}`]  || row[`VGrade${i}`]  || ''),
      vivaCredits: num(row[`VCredits${pad}`] || row[`VCredits${i}`]) ?? null,
      emCredits:   num(row[`EMCredits${pad}`] || row[`EMCredits${i}`]) ?? null,
      emGrade,
      subGrade,
      gradePoint:  num(row[`SubGP${pad}`]),
      isBacklog:   isFailGrade(gradeForBacklog),
    });
  }
  return subjects;
}

// ─── Extract subjects from MFEED row ─────────────────────────────────────────
export function extractSubjectsMFEED(row) {
  const subjects = [];
  for (let i = 1; i <= 10; i++) {
    const pad = String(i).padStart(2, '0');
    const code = trim(row[`SubCode${pad}`]);
    if (!code || code === '-') continue;

    const emGrade = trim(row[`EMGrade${pad}`] || row[`EMGrade${i}`] || '');
    const vGrade  = trim(row[`VGrade${pad}`]  || row[`VGrade${i}`]  || '');

    subjects.push({
      code,
      name:        trim(row[`SubHead${pad}`]),
      emGrade,
      emCredits:   num(row[`EMCredits${pad}`] || row[`EMCredits${i}`]) ?? null,
      vivaGrade:   vGrade,
      vivaCredits: num(row[`VCredits${pad}`]  || row[`VCredits${i}`])  ?? null,
      isBacklog:   isFailGrade(emGrade),
    });
  }
  return subjects;
}

// ─── Parse a single file → { role, period, rows, filename } ──────────────────
export async function parseOneFile(file) {
  const rows = await readFileToRows(file);
  const role = detectFileRole(file.name);
  const period = extractPeriodFromRows(rows);
  return { role, period, rows, filename: file.name };
}
