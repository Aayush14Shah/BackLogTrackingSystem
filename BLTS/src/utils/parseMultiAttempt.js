import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const trim = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v) => { const f = parseFloat(trim(v)); return isNaN(f) ? null : f; };
const normName = (n) => trim(n).toLowerCase().replace(/\s+/g, ' ');

const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
const isFailGrade = (g) => FAIL_GRADES.has(trim(g).toUpperCase());

const SEM_MAP = { I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10 };
function semToInt(raw) {
  const u = trim(raw).toUpperCase();
  if (SEM_MAP[u]) return SEM_MAP[u];
  const n = parseInt(u, 10);
  return isNaN(n) ? 0 : n;
}

// ─── Detect file role from filename ──────────────────────────────────────────
// Returns { role: 'OR'|'PASS'|'FAIL', period, attemptLabel }
export function detectFileRole(filename) {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase();

  // Period extraction: look for Winter/Summer + year
  const periodMatch = filename.match(/(Winter|Summer)[- _]?(\d{4})/i);
  const period = periodMatch ? `${periodMatch[1]}-${periodMatch[2]}` : '';

  if (/^or[_ ]|[/\\]or[_ ]/i.test(filename) || /^or\b/i.test(base)) {
    return { role: 'OR', period };
  }
  if (/pass[_ ]?m?feed|passfeed/i.test(base)) {
    return { role: 'PASS', period };
  }
  if (/fail[_ ]?m?feed|failfeed/i.test(base)) {
    return { role: 'FAIL', period };
  }
  // Fallback: try to guess from column presence after parsing
  return { role: 'UNKNOWN', period };
}

// ─── Read a file into rows ────────────────────────────────────────────────────
function readFileToRows(file) {
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
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
        resolve(rows);
      } catch (err) {
        reject(new Error(`Could not parse ${file.name}: ${err.message}`));
      }
    };
    if (name.endsWith('.csv')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

// ─── Extract subjects from OR row (up to 8 subjects) ─────────────────────────
function extractSubjectsOR(row) {
  const subjects = [];
  for (let i = 1; i <= 8; i++) {
    const pad = String(i).padStart(2, '0');
    const sfx = i === 1 ? '' : `_${i - 1}`;
    const code = trim(row[`SubCode${pad}`]);
    if (!code || code === '-' || /^Sem-/i.test(code)) continue;
    const grade = trim(row[`SubGrade${pad}`]);
    subjects.push({
      code,
      name: trim(row[`SubHead${pad}`]),
      credits: num(row[`SubCredit${pad}`]) ?? 0,
      theoryMarks: trim(row[`Out of (70)E${sfx}`]),
      midMarks: trim(row[`Total(30)M${sfx}`]),
      vivaMarks: trim(row[`Practical(50)V${sfx}`]),
      totalMarks: trim(row[`SubMark${pad}`]),
      subGrade: grade,
      gradePoint: num(row[`SubGP${pad}`]),
      emGrade: trim(row[`EMGrade${i}`]),
      isBacklog: isFailGrade(grade),
    });
  }
  return subjects;
}

// ─── Extract subjects from markfeed row ──────────────────────────────────────
function extractSubjectsMFEED(row) {
  const subjects = [];
  for (let i = 1; i <= 8; i++) {
    const pad = String(i).padStart(2, '0');
    const code = trim(row[`SubCode${pad}`]);
    if (!code || code === '-') continue;
    const emGrade = trim(row[`EMGrade${i}`]);
    subjects.push({
      code,
      name: trim(row[`SubHead${pad}`]),
      emGrade,
      emCredits: num(row[`EMCredits${i}`]) ?? null,
      vivaGrade: trim(row[`VGrade${i}`]),
      vivaCredits: num(row[`VCredits${i}`]) ?? null,
      isBacklog: isFailGrade(emGrade),
    });
  }
  return subjects;
}

// ─── Build one attempt record from an OR row ─────────────────────────────────
function buildAttemptFromOR(row, period, attemptNo) {
  const result = trim(row['RESULT']);
  const remark = trim(row['REMARK'] ?? '');
  const subjects = extractSubjectsOR(row);
  return {
    attemptNo,
    period,
    semNo: semToInt(row['SemNo']),
    semLabel: trim(row['SemNo']),
    result,
    remark,
    spi: num(row['CURSEM_SPI']) ?? 0,
    earnedCredits: num(row['CURSEM_Credits']) ?? 0,
    subjects,
    backlogs: subjects.filter(s => s.isBacklog).map(s => ({ code: s.code, name: s.name, grade: s.subGrade })),
    cleared: [],   // filled in from markfeed
    source: 'OR',
  };
}

// ─── Main multi-file parser ───────────────────────────────────────────────────
/**
 * Takes an array of File objects (OR + PASS_MFEED + FAIL_MFEED across attempts).
 * Returns an array of student objects, each with:
 *   - enrollmentNo, name, branch
 *   - attempts: [ { attemptNo, period, semNo, result, subjects, backlogs, cleared } ]
 *   - timeline: summary of each attempt
 *   - currentBacklogs: subjects still failing after last attempt
 *   - overallStatus: 'CLEAR' | 'BACKLOG' | 'DETAINED'
 */
export async function parseMultipleFiles(files) {
  // 1. Parse all files into rows with metadata
  const parsed = await Promise.all(
    files.map(async (file) => {
      const rows = await readFileToRows(file);
      const { role, period } = detectFileRole(file.name);
      // Auto-detect role from columns if UNKNOWN
      let finalRole = role;
      if (finalRole === 'UNKNOWN' && rows.length > 0) {
        const cols = Object.keys(rows[0]);
        if (cols.includes('RESULT') && cols.includes('SubGrade01')) finalRole = 'OR';
        else if (cols.includes('RESULT')) finalRole = 'PASS';
        else finalRole = 'FAIL';
      }
      // Extract period from data if not in filename
      let finalPeriod = period;
      if (!finalPeriod && rows.length > 0) {
        finalPeriod = trim(rows[0]['Period'] || rows[0]['SemNo'] || '');
      }
      return { role: finalRole, period: finalPeriod, rows, filename: file.name };
    })
  );

  // 2. Sort files: OR files first, then PASS, then FAIL; within each group by period
  // Assign attempt numbers to OR files in chronological order
  const orFiles = parsed.filter(f => f.role === 'OR');
  const passFiles = parsed.filter(f => f.role === 'PASS');
  const failFiles = parsed.filter(f => f.role === 'FAIL');

  // Sort OR files by period (Winter-2023 < Summer-2024 < Summer-2025 < Winter-2025)
  const periodOrder = (p) => {
    const m = p.match(/(Winter|Summer)[- _]?(\d{4})/i);
    if (!m) return 0;
    const year = parseInt(m[2], 10) * 10;
    const season = m[1].toLowerCase() === 'winter' ? 1 : 5;
    return year + season;
  };
  orFiles.sort((a, b) => periodOrder(a.period) - periodOrder(b.period));

  // 3. Build student map from OR files
  // Key: normName → student
  const studentMap = new Map();

  orFiles.forEach((orFile, attemptIdx) => {
    const attemptNo = attemptIdx + 1;
    orFile.rows.forEach(row => {
      const name = trim(row['Name']);
      if (!name) return;
      const key = normName(name);
      const enrollment = trim(row['ENROLMENT']);

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          enrollmentNo: enrollment,
          name,
          branch: trim(row['CourseName'] || ''),
          attempts: [],
        });
      }
      const student = studentMap.get(key);
      // Avoid duplicate attempts from duplicate OR files
      if (!student.attempts.find(a => a.attemptNo === attemptNo)) {
        student.attempts.push(buildAttemptFromOR(row, orFile.period, attemptNo));
      }
    });
  });

  // 4. Enrich attempts with markfeed data (cleared subjects)
  [...passFiles, ...failFiles].forEach(mfFile => {
    mfFile.rows.forEach(row => {
      const name = trim(row['Name']);
      if (!name) return;
      const key = normName(name);
      const student = studentMap.get(key);
      if (!student) return;

      // Find the matching attempt by period
      const attempt = student.attempts.find(a =>
        a.period && mfFile.period && a.period.toLowerCase() === mfFile.period.toLowerCase()
      ) || student.attempts[student.attempts.length - 1];

      if (!attempt) return;

      const mfSubjects = extractSubjectsMFEED(row);
      mfSubjects.forEach(ms => {
        // Mark cleared subjects in the attempt
        const existing = attempt.subjects.find(s => s.code === ms.code);
        if (existing) {
          existing.emGrade = ms.emGrade || existing.emGrade;
          existing.vivaGrade = ms.vivaGrade || existing.vivaGrade;
        }
        // If this is a PASS markfeed, record cleared subjects
        if (mfFile.role === 'PASS' && !isFailGrade(ms.emGrade)) {
          if (!attempt.cleared.find(c => c.code === ms.code)) {
            attempt.cleared.push({ code: ms.code, name: ms.name, grade: ms.emGrade });
          }
        }
      });

      // Update result from markfeed if OR result is ambiguous
      const mfResult = trim(row['RESULT'] || '');
      if (mfResult && attempt.result === '') attempt.result = mfResult;
    });
  });

  // 5. Compute timeline + current backlog status per student
  return Array.from(studentMap.values()).map(student => {
    student.attempts.sort((a, b) => a.attemptNo - b.attemptNo);

    // Build timeline: one entry per attempt
    const timeline = student.attempts.map(a => ({
      attemptNo: a.attemptNo,
      period: a.period,
      semLabel: a.semLabel,
      result: a.result,
      remark: a.remark,
      spi: a.spi,
      earnedCredits: a.earnedCredits,
      backlogCount: a.backlogs.length,
      clearedCount: a.cleared.length,
      backlogs: a.backlogs,
      cleared: a.cleared,
    }));

    // Current backlogs = subjects that are still failing in the LAST attempt
    const lastAttempt = student.attempts[student.attempts.length - 1];
    const currentBacklogs = lastAttempt ? lastAttempt.backlogs : [];

    // Subject-level history: for each unique subject code, show grade per attempt
    const subjectHistory = buildSubjectHistory(student.attempts);

    const totalActiveBacklogs = currentBacklogs.length;
    let overallStatus = 'CLEAR';
    if (totalActiveBacklogs >= 4) overallStatus = 'DETAINED';
    else if (totalActiveBacklogs > 0) overallStatus = 'BACKLOG';

    // Compatibility with existing ReportScreen / SearchScreen
    // Map attempts → semesters format expected by existing components
    const semesters = student.attempts.map(a => ({
      semNo: a.semNo,
      semLabel: a.semLabel,
      period: a.period,
      spi: a.spi,
      earnedCredits: a.earnedCredits,
      result: a.result,
      remark: a.remark,
      subjects: a.subjects,
      backlogCounts: {},
      attemptNo: a.attemptNo,
      attemptLabel: `Attempt ${a.attemptNo} — ${a.period}`,
    }));

    const latestSem = semesters[semesters.length - 1] || {};

    return {
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      branch: student.branch,
      semesters,
      attempts: student.attempts,
      timeline,
      subjectHistory,
      currentBacklogs,
      totalActiveBacklogs,
      overallStatus,
      latestSemNo: latestSem.semNo || 7,
      latestSPI: latestSem.spi || 0,
      latestResult: latestSem.result || '',
      backlogSummary: timeline.filter(t => t.backlogCount > 0).map(t => ({
        semester: t.semNo,
        semLabel: `${t.semLabel} (${t.period})`,
        backlogCount: t.backlogCount,
      })),
      dataWarnings: [],
    };
  });
}

// ─── Build subject-level attempt history ─────────────────────────────────────
function buildSubjectHistory(attempts) {
  const subMap = new Map(); // code → { code, name, attempts: [{attemptNo, period, grade, isBacklog}] }

  attempts.forEach(attempt => {
    attempt.subjects.forEach(sub => {
      if (!subMap.has(sub.code)) {
        subMap.set(sub.code, { code: sub.code, name: sub.name, attempts: [] });
      }
      subMap.get(sub.code).attempts.push({
        attemptNo: attempt.attemptNo,
        period: attempt.period,
        grade: sub.subGrade || sub.emGrade || '-',
        isBacklog: sub.isBacklog,
        totalMarks: sub.totalMarks || '-',
      });
    });
  });

  return Array.from(subMap.values());
}
