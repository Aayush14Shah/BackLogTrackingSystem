/**
 * merge_files.js
 * Run with: node merge_files.js
 * 
 * Reads all 4 semester CSVs, extracts ONLY the necessary columns,
 * adds a "SourceFile" and "SemNo" column for easy identification, 
 * then writes a single merged CSV: merged_results.csv
 */

const XLSX = require('./blts/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const INPUT_DIR = __dirname;
const OUTPUT_FILE = path.join(__dirname, 'merged_results.csv');

// The necessary columns to keep in the merged output
// Identity columns (always kept)
const IDENTITY_COLS = ['ENROLMENT', 'Name', 'CourseName', 'SemNo', 'Period'];

// For subjects 1-5 the pattern repeats with a suffix per subject slot
// We'll expand these dynamically
const SUB_COLS_PER_SUBJECT = [
    'SubCode',    // e.g. SubCode01
    'SubHead',    // e.g. SubHead01
    'SubCredit',  // e.g. SubCredit01
    'E',          // Theory: "Out of (70)E" or "Out of (70)E_N"
    'M',          // Mid:    "Total(30)M"   or "Total(30)M_N"
    'V',          // Viva:   "Practical(50)V" or "Practical(50)V_N"
    'SubMark',    // Total submark
    'SubGrade',   // Grade
    'SubGP',      // Grade Point
    'TGrade',     // Theory grade
    'MGrade',     // Mid grade
    'VGrade',     // Viva grade
    'Comment',    // Comment on subject (e.g. "Success", "Pra/Viva")
];

// Semester-level summary
const SEM_SUMMARY_COLS = [
    'CURSEM_CRERN',
    'CURSEM_Credits',
    'CURSEM_GRPOINT',
    'CURSEM_SPI',
    'RESULT',
    'REMARK',
    'CUM_CRERN',
    'CUM_Credits',
    'CUM_GRPOINT',
    'CUM_PPI',
    'CLASS',
    'Sem1BLog', 'Sem2BLog', 'Sem3BLog', 'Sem4BLog', 'Sem5BLog',
    'Sem6BLog', 'Sem7BLog', 'Sem8BLog', 'Sem9BLog', 'Sem10BLog',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());

function readFileRows(fpath) {
    const fname = path.basename(fpath);
    let rawData;
    try {
        if (fname.endsWith('.csv')) {
            const wb = XLSX.read(fs.readFileSync(fpath, 'utf8'), { type: 'string' });
            rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        } else {
            const wb = XLSX.readFile(fpath);
            rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
    } catch (e) {
        console.warn(`  ⚠ Could not read ${fname}: ${e.message}`);
        return [];
    }
    return rawData;
}

/**
 * From a raw row, extract one flat "canonical" record per SUBJECT SLOT.
 * Returns an array of flat row objects (one per subject slot present in the row).
 */
function extractSubjectRows(raw, sourceFile) {
    const enrollment = s(raw['ENROLMENT']);
    if (!enrollment) return [];

    const semNo = s(raw['SemNo']);
    const period = s(raw['Period']);
    const name = s(raw['Name']);
    const course = s(raw['CourseName']);

    // Summary fields (same for all subjects in this row)
    const summaryFields = {};
    SEM_SUMMARY_COLS.forEach(col => {
        summaryFields[col] = s(raw[col]);
    });

    const subjects = [];

    for (let i = 1; i <= 5; i++) {
        const pad = String(i).padStart(2, '0');
        // Subject code key for slot i
        const codeKey = `SubCode${pad}`;
        const code = s(raw[codeKey]);
        if (!code || code === '-') continue; // no subject in this slot

        // Suffix for repeated mark column names (slot 1 is no suffix, slot 2 is _1, slot 3 is _2…)
        const sfx = i === 1 ? '' : `_${i - 1}`;

        const subRow = {
            SourceFile: sourceFile,
            ENROLMENT: enrollment,
            Name: name,
            CourseName: course,
            SemNo: semNo,
            Period: period,
            //── Subject identifiers ──
            SubCode: code,
            SubName: s(raw[`SubHead${pad}`]),
            Credits: s(raw[`SubCredit${pad}`]),
            //── Marks ───────────────
            TheoryMarks: s(raw[`Out of (70)E${sfx}`]),
            MidMarks: s(raw[`Total(30)M${sfx}`]),
            VivaMarks: s(raw[`Practical(50)V${sfx}`]),
            TotalMarks: s(raw[`SubMark${pad}`]),
            PR_Percent: s(raw[`PR((tot/150)*100)${sfx}`]),
            //── Grades ──────────────
            TheoryGrade: s(raw[`TGrade${i}`]),
            MidGrade: s(raw[`MGrade${i}`]),
            VivaGrade: s(raw[`VGrade${i}`]),  // NOTE: VGrade1 in the sheet
            SubGrade: s(raw[`SubGrade${pad}`]),
            GradePoint: s(raw[`SubGP${pad}`]),
            Comment: s(raw[`Comment${sfx === '' ? '' : sfx}`]),
            //── Semester totals (repeated per subject, but useful for filtering) ──
            ...summaryFields,
        };

        subjects.push(subRow);
    }

    // Edge case: no subjects parsed (e.g. final sem has non-standard layout)
    if (subjects.length === 0) {
        // Still add 1 row with just identity + summary, blank subject fields
        subjects.push({
            SourceFile: sourceFile,
            ENROLMENT: enrollment,
            Name: name,
            CourseName: course,
            SemNo: semNo,
            Period: period,
            SubCode: '', SubName: '', Credits: '',
            TheoryMarks: '', MidMarks: '', VivaMarks: '',
            TotalMarks: '', PR_Percent: '',
            TheoryGrade: '', MidGrade: '', VivaGrade: '',
            SubGrade: '', GradePoint: '', Comment: '',
            ...summaryFields,
        });
    }

    return subjects;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
    const files = fs.readdirSync(INPUT_DIR)
        .filter(f => /\.(xlsx|csv|xls)$/i.test(f) && !f.startsWith('merged'))
        .sort(); // sort by filename to maintain semester order

    console.log(`Found ${files.length} file(s):`);
    files.forEach(f => console.log(`  - ${f}`));

    let allRows = [];

    files.forEach(fname => {
        const fpath = path.join(INPUT_DIR, fname);
        const rawRows = readFileRows(fpath);
        console.log(`  ${fname}: ${rawRows.length} student rows`);

        rawRows.forEach(raw => {
            const subjectRows = extractSubjectRows(raw, fname);
            allRows = allRows.concat(subjectRows);
        });
    });

    if (allRows.length === 0) {
        console.error('No data extracted. Exiting.');
        return;
    }

    console.log(`\nTotal merged rows (one per subject slot): ${allRows.length}`);

    // Write to CSV
    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MergedResults');
    XLSX.writeFile(wb, OUTPUT_FILE);

    console.log(`\n✅ Merged file written to: ${OUTPUT_FILE}`);
    console.log('Columns in merged file:', Object.keys(allRows[0]).join(', '));
}

main();
