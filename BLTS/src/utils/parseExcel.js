import * as XLSX from 'xlsx';

// ─── Helper ────────────────────────────────────────────────────────────────
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());
const n = (v) => { const f = parseFloat(v); return isNaN(f) ? 0 : f; };

// SemNo roman / ordinal → integer
const SEM_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
function semToInt(raw) {
    const upper = s(raw).toUpperCase();
    if (SEM_MAP[upper]) return SEM_MAP[upper];
    const asInt = parseInt(upper, 10);
    return isNaN(asInt) ? 0 : asInt;
}

// ─── Merged-file format (output of merge_files.js) ─────────────────────────
// One row per subject, columns: SourceFile, ENROLMENT, Name, CourseName, SemNo,
// Period, SubCode, SubName, Credits, TheoryMarks, MidMarks, VivaMarks,
// TotalMarks, PR_Percent, TheoryGrade, MidGrade, VivaGrade, SubGrade,
// GradePoint, Comment, CURSEM_SPI, CURSEM_Credits, CURSEM_GRPOINT,
// RESULT, REMARK, CUM_PPI, CLASS, Sem1BLog … Sem10BLog

function processMergedRows(rawData) {
    // Group by ENROLMENT → SemNo → subjects[]
    const studentMap = new Map(); // enrollmentNo → { ...meta, semesters: Map<semInt, semObj> }

    rawData.forEach(row => {
        const enrollment = s(row['ENROLMENT']);
        if (!enrollment) return;

        const semInt = semToInt(row['SemNo']);

        if (!studentMap.has(enrollment)) {
            studentMap.set(enrollment, {
                enrollmentNo: enrollment,
                name: s(row['Name']),
                branch: s(row['CourseName']),
                semesters: new Map(),
            });
        }

        const student = studentMap.get(enrollment);
        // Update name/branch if they were blank and now have a value
        if (!student.name && row['Name']) student.name = s(row['Name']);
        if (!student.branch && row['CourseName']) student.branch = s(row['CourseName']);

        // Ensure semester record exists
        if (!student.semesters.has(semInt)) {
            student.semesters.set(semInt, {
                semNo: semInt,
                semLabel: s(row['SemNo']),
                period: s(row['Period']),
                spi: n(row['CURSEM_SPI']),
                earnedCredits: n(row['CURSEM_Credits']),
                gradePoints: n(row['CURSEM_GRPOINT']),
                result: s(row['RESULT']),
                remark: s(row['REMARK'] || row['Comment'] || ''),
                subjects: [],
                backlogCounts: {} // semN → count, from the row-level Sem*BLog columns
            });

            // Read Sem*BLog columns
            for (let i = 1; i <= 10; i++) {
                const val = row[`Sem${i}BLog`];
                if (val !== undefined && val !== '' && val !== '-') {
                    const cnt = parseInt(val, 10);
                    if (!isNaN(cnt)) student.semesters.get(semInt).backlogCounts[i] = cnt;
                }
            }
        }

        const sem = student.semesters.get(semInt);

        // Add subject row if SubCode is present
        const subCode = s(row['SubCode']);
        if (subCode) {
            const grade = s(row['SubGrade']);
            const gp = n(row['GradePoint']);
            const isBacklog = grade === 'FF' || grade === 'F' || gp === 0;

            sem.subjects.push({
                code: subCode,
                name: s(row['SubName']),
                credits: n(row['Credits']),
                theoryMarks: s(row['TheoryMarks']),
                midMarks: s(row['MidMarks']),
                vivaMarks: s(row['VivaMarks']),
                totalMarks: s(row['TotalMarks']),
                prPercent: s(row['PR_Percent']),
                theoryGrade: s(row['TheoryGrade']),
                midGrade: s(row['MidGrade']),
                vivaGrade: s(row['VivaGrade']),
                subGrade: grade,
                gradePoint: gp,
                comment: s(row['Comment']),
                isBacklog,
            });
        }
    });

    // ── Final processing ────────────────────────────────────────────────────
    const students = Array.from(studentMap.values()).map(student => {
        const sortedSems = Array.from(student.semesters.values())
            .sort((a, b) => a.semNo - b.semNo); // ascending order

        // Total active backlogs from Sem*BLog
        let totalActiveBacklogs = 0;
        const backlogSummary = [];
        const seenBlogSems = new Set();

        sortedSems.forEach(sem => {
            Object.entries(sem.backlogCounts).forEach(([semNumStr, cnt]) => {
                const k = parseInt(semNumStr);
                if (!seenBlogSems.has(k)) {
                    seenBlogSems.add(k);
                    backlogSummary.push({ semester: k, backlogCount: cnt });
                    totalActiveBacklogs += cnt;
                }
            });
        });

        backlogSummary.sort((a, b) => a.semester - b.semester);

        // Latest semester data
        const latestSem = sortedSems[sortedSems.length - 1] || {};

        // CUM_PPI (CGPA) from last row that has it
        const cgpa = s(student.semesters.size > 0
            ? Array.from(student.semesters.values()).reduce((last, sem) => { return sem; }).cgpa
            : '-') || '-';

        // Overall status
        let overallStatus = 'CLEAR';
        if (totalActiveBacklogs >= 4) overallStatus = 'DETAINED';
        else if (totalActiveBacklogs > 0) overallStatus = 'BACKLOG';

        return {
            enrollmentNo: student.enrollmentNo,
            name: student.name,
            branch: student.branch,
            semesters: sortedSems,
            latestSemNo: latestSem.semNo || 0,
            latestSPI: latestSem.spi || 0,
            latestResult: latestSem.result || '',
            totalActiveBacklogs,
            backlogSummary,
            overallStatus,
        };
    });

    return students;
}

// ─── Original single-file format (one row per student) ─────────────────────
// Handles: SubCode01..SubCode05 with mark suffixes _1, _2, …
function parseSingleFileRows(rawData) {
    const studentMap = new Map();

    rawData.forEach(row => {
        const enrollment = s(row['ENROLMENT']);
        if (!enrollment) return;

        const semInt = semToInt(row['SemNo']);

        if (!studentMap.has(enrollment)) {
            studentMap.set(enrollment, {
                enrollmentNo: enrollment,
                name: s(row['Name']),
                branch: s(row['CourseName']),
                semesters: new Map(),
            });
        }

        const student = studentMap.get(enrollment);

        if (!student.semesters.has(semInt)) {
            student.semesters.set(semInt, {
                semNo: semInt,
                semLabel: s(row['SemNo']),
                period: s(row['Period']),
                spi: n(row['CURSEM_SPI']),
                earnedCredits: n(row['CURSEM_Credits']),
                gradePoints: n(row['CURSEM_GRPOINT']),
                result: s(row['RESULT']),
                remark: s(row['REMARK'] || ''),
                subjects: [],
                backlogCounts: {},
            });

            for (let i = 1; i <= 10; i++) {
                const val = row[`Sem${i}BLog`];
                if (val !== undefined && val !== '' && val !== '-') {
                    const cnt = parseInt(val, 10);
                    if (!isNaN(cnt)) student.semesters.get(semInt).backlogCounts[i] = cnt;
                }
            }
        }

        const sem = student.semesters.get(semInt);

        // Extract subjects (slots 1–5, or more)
        for (let i = 1; i <= 8; i++) {
            const pad = String(i).padStart(2, '0');
            const sfx = i === 1 ? '' : `_${i - 1}`;
            const code = s(row[`SubCode${pad}`]);
            if (!code || code.startsWith('Sem-') || code === '-') continue;

            const grade = s(row[`SubGrade${pad}`]);
            const gp = n(row[`SubGP${pad}`]);

            sem.subjects.push({
                code,
                name: s(row[`SubHead${pad}`]),
                credits: n(row[`SubCredit${pad}`]),
                theoryMarks: s(row[`Out of (70)E${sfx}`]),
                midMarks: s(row[`Total(30)M${sfx}`]),
                vivaMarks: s(row[`Practical(50)V${sfx}`]),
                totalMarks: s(row[`SubMark${pad}`]),
                prPercent: s(row[`PR((tot/150)*100)${sfx}`]),
                theoryGrade: s(row[`TGrade${i}`]),
                midGrade: s(row[`MGrade${i}`]),
                vivaGrade: s(row[`VGrade${i}`]),
                subGrade: grade,
                gradePoint: gp,
                comment: s(row[`Comment${sfx}`]),
                isBacklog: grade === 'FF' || grade === 'F' || gp === 0,
            });
        }
    });

    return finalize(studentMap);
}

function finalize(studentMap) {
    return Array.from(studentMap.values()).map(student => {
        const sortedSems = Array.from(student.semesters.values())
            .sort((a, b) => a.semNo - b.semNo);

        let totalActiveBacklogs = 0;
        const backlogSummary = [];
        const seenBlogSems = new Set();

        sortedSems.forEach(sem => {
            Object.entries(sem.backlogCounts).forEach(([kStr, cnt]) => {
                const k = parseInt(kStr);
                if (!seenBlogSems.has(k)) {
                    seenBlogSems.add(k);
                    backlogSummary.push({ semester: k, backlogCount: cnt });
                    totalActiveBacklogs += cnt;
                }
            });
        });

        backlogSummary.sort((a, b) => a.semester - b.semester);

        const latestSem = sortedSems[sortedSems.length - 1] || {};
        let overallStatus = 'CLEAR';
        if (totalActiveBacklogs >= 4) overallStatus = 'DETAINED';
        else if (totalActiveBacklogs > 0) overallStatus = 'BACKLOG';

        return {
            enrollmentNo: student.enrollmentNo,
            name: student.name,
            branch: student.branch,
            semesters: sortedSems,
            latestSemNo: latestSem.semNo || 0,
            latestSPI: latestSem.spi || 0,
            latestResult: latestSem.result || '',
            totalActiveBacklogs,
            backlogSummary,
            overallStatus,
        };
    });
}

// ─── Detect format ─────────────────────────────────────────────────────────
function isMergedFormat(rows) {
    if (!rows.length) return false;
    return 'SourceFile' in rows[0] && 'SubCode' in rows[0];
}

// ─── Public API ────────────────────────────────────────────────────────────
export const parseFile = (file) => {
    const name = (file.name || '').toLowerCase();

    if (name.endsWith('.csv')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const wb = XLSX.read(e.target.result, { type: 'string' });
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                    resolve(isMergedFormat(rows) ? processMergedRows(rows) : parseSingleFileRows(rows));
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
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                resolve(isMergedFormat(rows) ? processMergedRows(rows) : parseSingleFileRows(rows));
            } catch (err) {
                reject(new Error('Could not read Excel: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsArrayBuffer(file);
    });
};
