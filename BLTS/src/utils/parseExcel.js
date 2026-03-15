import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const trim = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v) => { const f = parseFloat(trim(v)); return isNaN(f) ? null : f; };

// Roman numeral → integer map for SemNo
const SEM_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
function semToInt(raw) {
    const u = trim(raw).toUpperCase();
    if (SEM_MAP[u]) return SEM_MAP[u];
    const n = parseInt(u, 10);
    return isNaN(n) ? 0 : n;
}

/**
 * A subject is a backlog ONLY when the SubGrade is an explicit fail grade.
 * We do NOT use GP=0 alone because:
 *   - lab-only subjects legitimately have Theory=0 marks (and may show GP=0)
 *   - Sem X final project has non-standard marks columns
 * Safe fail grades from GTU system: 'F', 'FF', 'I', 'W', 'AB'
 */
const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
function isSubjectBacklog(grade, _gp) {
    return FAIL_GRADES.has(trim(grade).toUpperCase());
}

/**
 * Backlog count from Sem*BLog column value.
 * Returns an integer ≥ 0 or null if the value is not a numeric integer
 * (Sem VII file stores MOOC titles and gender strings in these columns).
 */
function parseBacklogCount(v) {
    const t = trim(v);
    if (t === '' || t === '-') return null;
    // Must be a string that looks purely like a non-negative integer
    if (!/^\d+$/.test(t)) return null;
    return parseInt(t, 10);
}

// ─── Normalise student name for comparison ──────────────────────────────────
function normName(name) {
    return trim(name).toLowerCase().replace(/\s+/g, ' ');
}

// ─── Build one semester record from a row ────────────────────────────────────
function buildSemesterFromRow(row, subjects) {
    return {
        semNo: semToInt(row['SemNo']),
        semLabel: trim(row['SemNo']),
        period: trim(row['Period']),
        spi: num(row['CURSEM_SPI']) ?? 0,
        earnedCredits: num(row['CURSEM_Credits']) ?? 0,
        totalCredits: num(row['CURSEM_CRERN']) ?? 0,    // credits registered
        gradePoints: num(row['CURSEM_GRPOINT']) ?? 0,
        result: trim(row['RESULT']),
        remark: trim(row['REMARK'] ?? ''),
        cumCredits: num(row['CUM_Credits']) ?? null,
        cumCrern: num(row['CUM_CRERN']) ?? null,
        cumGradePoints: num(row['CUM_GRPOINT']) ?? null,
        cgpa: num(row['CUM_PPI']) ?? null,
        classification: trim(row['CLASS']),
        subjects,
        backlogCounts: buildBacklogCounts(row),
    };
}

function buildBacklogCounts(row) {
    const counts = {};
    for (let i = 1; i <= 10; i++) {
        const v = parseBacklogCount(row[`Sem${i}BLog`]);
        if (v !== null) counts[i] = v;
    }
    return counts;
}

// ─── Extract subjects from ONE row (single-file format) ─────────────────────
function extractSubjectsFromRow(row) {
    const subjects = [];
    for (let i = 1; i <= 8; i++) {
        const pad = String(i).padStart(2, '0');
        const sfx = i === 1 ? '' : `_${i - 1}`;

        const code = trim(row[`SubCode${pad}`]);
        if (!code || code === '-') continue;
        if (/^Sem-/i.test(code)) continue;

        const grade = trim(row[`SubGrade${pad}`]);
        const gp = num(row[`SubGP${pad}`]) ?? 0;

        subjects.push({
            code,
            name: trim(row[`SubHead${pad}`]),
            credits: num(row[`SubCredit${pad}`]) ?? 0,
            // Marks (column names are misleading; actual max per component = 50)
            theoryMarks: trim(row[`Out of (70)E${sfx}`]),
            midMarks: trim(row[`Total(30)M${sfx}`]),
            vivaMarks: trim(row[`Practical(50)V${sfx}`]),
            totalMarks: trim(row[`SubMark${pad}`]),   // sum of all three, out of 150
            prPercent: trim(row[`PR((tot/150)*100)${sfx}`]),
            // Component grades
            theoryGrade: trim(row[`TGrade${i}`]),
            midGrade: trim(row[`MGrade${i}`]),
            vivaCredits: num(row[`VCredits${i}`]) ?? null,
            vivaGrade: trim(row[`VGrade${i}`]),
            // EM result (final credit & grade assigned per subject)
            emCredits: num(row[`EMCredits${i}`]) ?? null,
            emGrade: trim(row[`EMGrade${i}`]),
            // Overall
            subGrade: grade,
            gradePoint: gp,
            comment: trim(row[`Comment${sfx}`]),
            isBacklog: isSubjectBacklog(grade, gp),
        });
    }
    return subjects;
}

// ─── Extract subjects from ONE row (merged-file format) ──────────────────────
function extractSubjectFromMergedRow(row) {
    const code = trim(row['SubCode']);
    if (!code) return null;

    const grade = trim(row['SubGrade']);
    const gp = num(row['GradePoint']) ?? 0;

    return {
        code,
        name: trim(row['SubName']),
        credits: num(row['Credits']) ?? 0,
        theoryMarks: trim(row['TheoryMarks']),
        midMarks: trim(row['MidMarks']),
        vivaMarks: trim(row['VivaMarks']),
        totalMarks: trim(row['TotalMarks']),
        prPercent: trim(row['PR_Percent']),
        theoryGrade: trim(row['TheoryGrade']),
        midGrade: trim(row['MidGrade']),
        vivaCredits: num(row['VivaCredits']) ?? null,
        vivaGrade: trim(row['VivaGrade']),
        emCredits: num(row['EMCredits']) ?? null,
        emGrade: trim(row['EMGrade']),
        subGrade: grade,
        gradePoint: gp,
        comment: trim(row['Comment']),
        isBacklog: isSubjectBacklog(grade, gp),
    };
}

// ─── Finalise: sort, compute totals, determine status ────────────────────────
function finalise(studentMap) {
    return Array.from(studentMap.values()).map(student => {
        const sortedSems = Array.from(student.semesters.values())
            .sort((a, b) => a.semNo - b.semNo);

        // Count backlogs from subject-level grades — the only reliable source.
        // The Sem*BLog columns in the source files are inconsistent:
        //   - Sem VII file has MOOC titles / gender strings in those columns
        //   - Sem X file has 0s that overwrite real data from Sem IX
        // Using subject isBacklog flags (F/FF/I/W/AB grades) is always accurate
        // and directly matches what is shown in the subject tables.
        const backlogSummary = sortedSems
            .map(sem => ({
                semester: sem.semNo,
                semLabel: sem.semLabel,
                backlogCount: sem.subjects.filter(s => s.isBacklog).length,
            }))
            .filter(b => b.backlogCount > 0);

        const totalActiveBacklogs = backlogSummary.reduce((s, b) => s + b.backlogCount, 0);

        const latestSem = sortedSems[sortedSems.length - 1] || {};
        let overallStatus = 'CLEAR';
        if (totalActiveBacklogs >= 4) overallStatus = 'DETAINED';
        else if (totalActiveBacklogs > 0) overallStatus = 'BACKLOG';

        // ── Build data quality warnings ──────────────────────────────────────
        const dataWarnings = [];

        // 1. Different enrollment numbers across files
        if (student.enrollmentsByFile && student.enrollmentsByFile.size > 0) {
            const pairs = Array.from(student.enrollmentsByFile.entries());
            // Find files where the enrollment differs from the primary
            const mismatches = pairs.filter(([, enr]) => enr !== student.primaryEnrollment);
            if (mismatches.length > 0) {
                const primaryFiles = pairs
                    .filter(([, enr]) => enr === student.primaryEnrollment)
                    .map(([f]) => f)
                    .join(', ');
                mismatches.forEach(([file, enr]) => {
                    dataWarnings.push({
                        type: 'ENROLLMENT_MISMATCH',
                        severity: 'warning',
                        message: `Different enrollment number found in source file "${file}". ` +
                            `Expected ${student.primaryEnrollment} (used in ${primaryFiles || 'other files'}), ` +
                            `but this file has ${enr}. Records were merged by student name.`,
                    });
                });
            }
        }

        // 2. Duplicate semester entries
        if (student.duplicateSems && student.duplicateSems.size > 0) {
            student.duplicateSems.forEach(semLabel => {
                dataWarnings.push({
                    type: 'DUPLICATE_SEMESTER',
                    severity: 'info',
                    message: `Duplicate data rows found for Semester ${semLabel}. Second occurrence was merged into the first.`,
                });
            });
        }

        return {
            enrollmentNo: student.primaryEnrollment,
            name: student.name,
            branch: student.branch,
            semesters: sortedSems,
            latestSemNo: latestSem.semNo || 0,
            latestSPI: latestSem.spi || 0,
            latestResult: latestSem.result || '',
            totalActiveBacklogs,
            backlogSummary,
            overallStatus,
            dataWarnings,
        };
    });
}

// ─── Process MERGED file (one row per subject) ───────────────────────────────
// PRIMARY KEY = normalised student Name (enrollment is too unreliable)
function processMergedRows(rawData) {
    const studentMap = new Map();  // normName → student

    rawData.forEach(row => {
        const studentName = trim(row['Name']);
        if (!studentName) return;

        const enrollment = trim(row['ENROLMENT']);
        const normN = normName(studentName);
        const semInt = semToInt(row['SemNo']);
        const sourceFile = trim(row['SourceFile']) || 'unknown file';

        if (!studentMap.has(normN)) {
            studentMap.set(normN, {
                primaryEnrollment: enrollment,
                name: studentName,
                branch: trim(row['CourseName']),
                semesters: new Map(),
                enrollmentsByFile: new Map(),
                duplicateSems: new Set(),
            });
        }

        const student = studentMap.get(normN);
        if (!student.name && studentName) student.name = studentName;
        if (!student.branch && row['CourseName']) student.branch = trim(row['CourseName']);

        // Track which enrollment ID appeared in which source file (for warnings)
        if (!student.enrollmentsByFile.has(sourceFile)) {
            student.enrollmentsByFile.set(sourceFile, enrollment);
        }

        if (!student.semesters.has(semInt)) {
            student.semesters.set(semInt, buildSemesterFromRow(row, []));
        } else {
            student.duplicateSems.add(trim(row['SemNo']));
        }

        const sub = extractSubjectFromMergedRow(row);
        if (sub) student.semesters.get(semInt).subjects.push(sub);
    });

    return finalise(studentMap);
}

// ─── Process SINGLE file (one row per student, up to 5 subjects per row) ─────
// PRIMARY KEY = normalised student Name
function processSingleFileRows(rawData) {
    const studentMap = new Map();  // normName → student

    rawData.forEach(row => {
        const studentName = trim(row['Name']);
        if (!studentName) return;

        const enrollment = trim(row['ENROLMENT']);
        const normN = normName(studentName);
        const semInt = semToInt(row['SemNo']);
        const semLabel = trim(row['SemNo']);

        if (!studentMap.has(normN)) {
            studentMap.set(normN, {
                primaryEnrollment: enrollment,
                name: studentName,
                branch: trim(row['CourseName']),
                semesters: new Map(),
                enrollmentsByFile: new Map(),
                duplicateSems: new Set(),
            });
        }

        const student = studentMap.get(normN);

        // Track enrollment per semester (for cross-semester enrollment-mismatch warnings)
        if (!student.enrollmentsByFile.has(semLabel)) {
            student.enrollmentsByFile.set(semLabel, enrollment);
        } else if (student.enrollmentsByFile.get(semLabel) !== enrollment) {
            student.enrollmentsByFile.set(semLabel + '_alt', enrollment);
        }

        const subjects = extractSubjectsFromRow(row);

        if (!student.semesters.has(semInt)) {
            student.semesters.set(semInt, buildSemesterFromRow(row, subjects));
        } else {
            student.duplicateSems.add(semLabel);
            student.semesters.get(semInt).subjects.push(...subjects);
        }
    });

    return finalise(studentMap);
}

// ─── Detect format ────────────────────────────────────────────────────────────
function isMergedFormat(rows) {
    return rows.length > 0 && 'SourceFile' in rows[0] && 'SubCode' in rows[0];
}

// ─── Read workbook safely (string mode to preserve 16-digit enrollment IDs) ──
function readWorkbook(content, type) {
    return XLSX.read(content, {
        type,
        raw: false,      // Return all cells as formatted strings
        cellText: true,
        cellDates: false,
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const parseFile = (file) => {
    const name = (file.name || '').toLowerCase();

    if (name.endsWith('.csv')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const wb = readWorkbook(e.target.result, 'string');
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
                    resolve(isMergedFormat(rows) ? processMergedRows(rows) : processSingleFileRows(rows));
                } catch (err) {
                    reject(new Error('Could not read CSV: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    // .xlsx / .xls
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const wb = readWorkbook(new Uint8Array(e.target.result), 'array');
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
                resolve(isMergedFormat(rows) ? processMergedRows(rows) : processSingleFileRows(rows));
            } catch (err) {
                reject(new Error('Could not read Excel: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsArrayBuffer(file);
    });
};
