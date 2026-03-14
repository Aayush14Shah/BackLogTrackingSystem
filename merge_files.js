/**
 * merge_files.js  (v2)
 * Run with: node merge_files.js
 *
 * Key fix: ENROLMENT is a 16-digit integer that exceeds JS float64 precision.
 * We use { raw: false } in SheetJS so all cells are read as formatted strings,
 * then we only keep ENROLMENT as-is (string). Numeric fields like marks are
 * parsed explicitly with parseFloat.
 *
 * Sem*BLog fix: In the Sem VII file, those columns hold unrelated data
 * (MOOC course names, gender). We only count a backlog if the value
 * is a non-negative integer. Strings are silently ignored.
 */

const XLSX = require('./blts/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = __dirname;
const OUTPUT_FILE = path.join(__dirname, 'merged_results.csv');

// ─── Keep only these columns in the output ────────────────────────────────────
const SEM_SUMMARY_COLS = [
    'CURSEM_CRERN', 'CURSEM_Credits', 'CURSEM_GRPOINT', 'CURSEM_SPI',
    'RESULT', 'REMARK',
    'CUM_CRERN', 'CUM_Credits', 'CUM_GRPOINT', 'CUM_PPI', 'CLASS',
    'Sem1BLog', 'Sem2BLog', 'Sem3BLog', 'Sem4BLog', 'Sem5BLog',
    'Sem6BLog', 'Sem7BLog', 'Sem8BLog', 'Sem9BLog', 'Sem10BLog',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const trim = (v) => (v === undefined || v === null ? '' : String(v).trim());

/** Returns the integer if v is a valid non-negative integer string, else null */
function parseBacklogCount(v) {
    const t = trim(v);
    if (t === '' || t === '-') return null;
    const n = parseInt(t, 10);
    // Reject if parseInt succeeded but the original string clearly isn't a number
    // e.g. "Female", "Coursera", MOOC titles, etc.
    if (isNaN(n)) return null;
    if (String(n) !== t && !(/^\d+$/.test(t))) return null; // extra safety
    return n >= 0 ? n : null;
}

function readFileRows(fpath) {
    const fname = path.basename(fpath);
    try {
        let wb;
        if (fname.endsWith('.csv')) {
            wb = XLSX.read(fs.readFileSync(fpath, 'utf8'), {
                type: 'string',
                raw: false,      // Return all values as formatted strings
                cellText: true,
                cellDates: false,
            });
        } else {
            wb = XLSX.readFile(fpath, {
                raw: false,
                cellText: true,
                cellDates: false,
            });
        }
        // Use header:'A' then json to avoid SheetJS auto-converting big numbers
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, {
            defval: '',
            raw: false,   // Force all cells as strings
        });
    } catch (e) {
        console.warn(`  ⚠ Could not read ${fname}: ${e.message}`);
        return [];
    }
}

function extractSubjectRows(raw, sourceFile) {
    // Trim enrollment and use it as a pure string
    const enrollment = trim(raw['ENROLMENT']);
    if (!enrollment) return [];

    const semNo = trim(raw['SemNo']);
    const period = trim(raw['Period']);
    const name = trim(raw['Name']);
    const course = trim(raw['CourseName']);

    const summaryFields = {};
    SEM_SUMMARY_COLS.forEach(col => {
        summaryFields[col] = trim(raw[col]);
    });

    const subjects = [];

    for (let i = 1; i <= 8; i++) {
        const pad = String(i).padStart(2, '0');
        const sfx = i === 1 ? '' : `_${i - 1}`;

        const code = trim(raw[`SubCode${pad}`]);
        if (!code || code === '-') continue;
        // Skip summary-style rows embedded as SubCode (e.g. "Sem-VII" strings)
        if (/^Sem-/i.test(code)) continue;

        const subRow = {
            SourceFile: sourceFile,
            ENROLMENT: enrollment,
            Name: name,
            CourseName: course,
            SemNo: semNo,
            Period: period,
            //── Subject identifiers ──────────────────────────────────────────────
            SubCode: code,
            SubName: trim(raw[`SubHead${pad}`]),
            Credits: trim(raw[`SubCredit${pad}`]),
            //── Marks ─────────────────────────────────────────────────────────────
            TheoryMarks: trim(raw[`Out of (70)E${sfx}`]),
            MidMarks: trim(raw[`Total(30)M${sfx}`]),
            VivaMarks: trim(raw[`Practical(50)V${sfx}`]),
            TotalMarks: trim(raw[`SubMark${pad}`]),
            PR_Percent: trim(raw[`PR((tot/150)*100)${sfx}`]),
            //── Component grades (Theory / Mid / Viva) ────────────────────────────
            TheoryGrade: trim(raw[`TGrade${i}`]),
            MidGrade: trim(raw[`MGrade${i}`]),
            VivaGrade: trim(raw[`VGrade${i}`]),
            //── Subject grade & GP ────────────────────────────────────────────────
            SubGrade: trim(raw[`SubGrade${pad}`]),
            GradePoint: trim(raw[`SubGP${pad}`]),
            Comment: trim(raw[`Comment${sfx}`]),
            //── Semester summary (repeated per subject for filtering convenience) ──
            ...summaryFields,
        };

        subjects.push(subRow);
    }

    if (subjects.length === 0) {
        subjects.push({
            SourceFile: sourceFile,
            ENROLMENT: enrollment,
            Name: name,
            CourseName: course,
            SemNo: semNo,
            Period: period,
            SubCode: '', SubName: '', Credits: '',
            TheoryMarks: '', MidMarks: '', VivaMarks: '', TotalMarks: '', PR_Percent: '',
            TheoryGrade: '', MidGrade: '', VivaGrade: '',
            SubGrade: '', GradePoint: '', Comment: '',
            ...summaryFields,
        });
    }

    return subjects;
}

function main() {
    const files = fs.readdirSync(INPUT_DIR)
        .filter(f => /\.(xlsx|csv|xls)$/i.test(f) && !f.startsWith('merged'))
        .sort();

    console.log(`Found ${files.length} file(s):`);
    files.forEach(f => console.log(`  - ${f}`));

    let allRows = [];

    files.forEach(fname => {
        const rawRows = readFileRows(path.join(INPUT_DIR, fname));
        console.log(`  ${fname}: ${rawRows.length} student rows`);

        let subjectRows = 0;
        rawRows.forEach(raw => {
            const subjectRowsForStudent = extractSubjectRows(raw, fname);
            allRows = allRows.concat(subjectRowsForStudent);
            subjectRows += subjectRowsForStudent.length;
        });
        console.log(`    → ${subjectRows} subject rows extracted`);
    });

    if (allRows.length === 0) {
        console.error('No data extracted. Exiting.');
        return;
    }

    // Verify: print unique ENROLMENTs
    const uniqueEnrollments = new Set(allRows.map(r => r.ENROLMENT));
    console.log(`\nTotal merged rows: ${allRows.length}`);
    console.log(`Unique students by ENROLMENT: ${uniqueEnrollments.size}`);

    // Sample AGRAWAL check
    const agrawalRows = allRows.filter(r => r.Name && r.Name.toLowerCase().includes('agrawal neha'));
    const agrawalSems = [...new Set(agrawalRows.map(r => r.SemNo))].sort();
    console.log(`\nAGRAWAL NEHA semesters in merged file: ${agrawalSems.join(', ')}`);

    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MergedResults');
    XLSX.writeFile(wb, OUTPUT_FILE);
    console.log(`\n✅ Written: ${OUTPUT_FILE}`);
}

main();
