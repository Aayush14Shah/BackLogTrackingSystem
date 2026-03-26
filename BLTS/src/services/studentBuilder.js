import {
  trim, num, normName, normalisePeriod, periodSortKey,
  extractSubjectsOR, extractSubjectsMFEED, isFailGrade, parseOneFile,
} from './fileParser';

const ATTEMPT_LABELS = [
  '1st Attempt · Main Exam',
  '2nd Attempt · Remedial 1',
  '3rd Attempt · Remedial 2',
  '4th Attempt · Remedial 3',
  '5th Attempt · Remedial 4',
];
const attemptLabel = (n) => ATTEMPT_LABELS[n - 1] || `${n}th Attempt · Remedial ${n - 1}`;

// ─── Get student metadata from a row (handles CSV + integrated XLSX schemas) ──
function getRowMeta(row) {
  return {
    // Name is consistent across all files
    name:       trim(row['Name'] || ''),
    // Branch: 'CourseName' in CSV, 'Program Name' in integrated XLSX
    branch:     trim(row['CourseName'] || row['Program Name'] || row['ProgramName'] || ''),
    college:    trim(row['CollegeName'] || row['College Address'] || ''),
    gender:     trim(row['GENDER'] || ''),
    category:   trim(row['CATEGORY'] || ''),
    semNo:      trim(row['SemNo'] || row['Sem No.'] || ''),
    // Seat number for display (changes per exam, not used for matching)
    seatNo:     trim(row['Seat'] || row['SeatNo'] || ''),
    // Period
    period:     trim(row['Period'] || ''),
  };
}

// ─── Build subject-level cross-attempt history ────────────────────────────────
function buildSubjectHistory(attempts) {
  const subMap = new Map();
  attempts.forEach(attempt => {
    attempt.subjects.forEach(sub => {
      if (!subMap.has(sub.code)) {
        subMap.set(sub.code, { code: sub.code, name: sub.name, history: [] });
      }
      subMap.get(sub.code).history.push({
        attemptNo:   attempt.attemptNo,
        period:      attempt.period,
        label:       attempt.label,
        grade:       sub.subGrade || sub.emGrade || '—',
        emGrade:     sub.emGrade  || '—',
        theoryMarks: sub.theoryMarks || '—',
        midMarks:    sub.midMarks    || '—',
        vivaMarks:   sub.vivaMarks   || '—',
        totalMarks:  sub.totalMarks  || '—',
        isBacklog:   sub.isBacklog,
        retained:    false,
      });
    });
  });

  subMap.forEach(sub => {
    let clearedAt = null;
    sub.history.forEach(h => {
      if (clearedAt !== null) {
        h.retained = true;
        h.retainedFrom = clearedAt;
      } else if (!h.isBacklog && h.grade !== '—') {
        clearedAt = h.attemptNo;
      }
    });
    sub.clearedAtAttempt = clearedAt;
    sub.isCurrentlyCleared = clearedAt !== null;
  });

  return Array.from(subMap.values());
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export async function buildStudents(files) {
  // 1. Parse all files
  const parsed = await Promise.all(files.map(parseOneFile));

  const orFiles   = parsed.filter(f => f.role === 'OR');
  const passFiles = parsed.filter(f => f.role === 'PASS_MFEED');
  const failFiles = parsed.filter(f => f.role === 'FAIL_MFEED');

  // 2. Sort OR files chronologically → attempt numbers
  orFiles.sort((a, b) => periodSortKey(a.period) - periodSortKey(b.period));

  // 3. Student map keyed by normalised NAME (most reliable cross-file key)
  //    ENROLMENT is NOT reliable: OR1 has the same college code for all 51 students,
  //    OR2/OR3 have per-student IDs that don't match OR1, OR4 has ENROLLMENT=undefined.
  const studentMap = new Map(); // normName → student object

  // 4. Process OR files → build attempts
  orFiles.forEach((orFile, idx) => {
    const attemptNo = idx + 1;
    const filePeriod = normalisePeriod(orFile.period);

    orFile.rows.forEach(row => {
      const meta = getRowMeta(row);
      if (!meta.name) return;
      const key = normName(meta.name);

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name:        meta.name,
          branch:      meta.branch,
          college:     meta.college,
          gender:      meta.gender,
          category:    meta.category,
          semNo:       meta.semNo,
          // Use seat/Number from first OR file as display enrollment
          enrollmentNo: trim(row['Number'] || row['Seat'] || ''),
          attempts:    [],
          sourceFiles: [],
        });
      }

      const student = studentMap.get(key);
      // Fill in missing metadata from later files
      if (!student.branch  && meta.branch)   student.branch   = meta.branch;
      if (!student.gender  && meta.gender)   student.gender   = meta.gender;
      if (!student.category && meta.category) student.category = meta.category;

      // Avoid duplicate attempts
      if (student.attempts.find(a => a.attemptNo === attemptNo)) return;

      const subjects = extractSubjectsOR(row);
      const period   = filePeriod || normalisePeriod(meta.period);
      const result   = trim(row['RESULT'] || '');

      student.attempts.push({
        attemptNo,
        label:          attemptLabel(attemptNo),
        period,
        semNo:          meta.semNo,
        seatNo:         meta.seatNo,
        result,
        remark:         trim(row['REMARK'] || ''),
        spi:            num(row['CURSEM_SPI']) ?? 0,
        earnedCredits:  num(row['CURSEM_Credits']) ?? 0,
        totalCredits:   num(row['CURSEM_CRERN']) ?? 0,
        gradePoints:    num(row['CURSEM_GRPOINT']) ?? 0,
        cgpa:           num(row['CUM_PPI']) ?? null,
        classification: trim(row['CLASS'] || ''),
        subjects,
        backlogs: subjects.filter(s => s.isBacklog).map(s => ({
          code: s.code, name: s.name,
          grade: s.subGrade || s.emGrade,
          theoryMarks: s.theoryMarks, comment: s.comment,
        })),
        cleared:    [],
        sourceFile: orFile.filename,
      });

      if (!student.sourceFiles.find(sf => sf.filename === orFile.filename)) {
        student.sourceFiles.push({ filename: orFile.filename, role: 'OR', period, result });
      }
    });
  });

  // 5. Enrich with PASS/FAIL markfeed data
  [...passFiles, ...failFiles].forEach(mfFile => {
    const isPASS   = mfFile.role === 'PASS_MFEED';
    const mfPeriod = normalisePeriod(mfFile.period);

    mfFile.rows.forEach(row => {
      const name = trim(row['Name'] || '');
      if (!name) return;
      const key     = normName(name);
      const student = studentMap.get(key);
      if (!student) return;

      // Match attempt by period; fallback to last attempt
      let attempt = student.attempts.find(a => a.period && mfPeriod && a.period === mfPeriod);
      if (!attempt) attempt = student.attempts[student.attempts.length - 1];
      if (!attempt) return;

      extractSubjectsMFEED(row).forEach(ms => {
        const existing = attempt.subjects.find(s => s.code === ms.code);
        if (existing) {
          if (ms.emGrade  && ms.emGrade  !== '—') existing.emGrade  = ms.emGrade;
          if (ms.vivaGrade && ms.vivaGrade !== '—') existing.vivaGrade = ms.vivaGrade;
        }
        if (isPASS && !isFailGrade(ms.emGrade) && ms.emGrade && ms.emGrade !== '-') {
          if (!attempt.cleared.find(c => c.code === ms.code)) {
            attempt.cleared.push({ code: ms.code, name: ms.name, grade: ms.emGrade });
          }
        }
      });

      if (!student.sourceFiles.find(sf => sf.filename === mfFile.filename)) {
        student.sourceFiles.push({
          filename: mfFile.filename,
          role:     mfFile.role,
          period:   mfPeriod,
          result:   trim(row['RESULT'] || ''),
        });
      }
    });
  });

  // 6. Finalise
  return Array.from(studentMap.values()).map(student => {
    student.attempts.sort((a, b) => a.attemptNo - b.attemptNo);

    const subjectHistory = buildSubjectHistory(student.attempts);

    const lastAttempt = student.attempts[student.attempts.length - 1];
    const currentBacklogs = lastAttempt
      ? lastAttempt.subjects.filter(s => s.isBacklog).map(s => ({
          code: s.code, name: s.name, grade: s.subGrade || s.emGrade,
        }))
      : [];

    const totalActiveBacklogs = currentBacklogs.length;
    const overallStatus =
      totalActiveBacklogs >= 4 ? 'DETAINED' :
      totalActiveBacklogs > 0  ? 'BACKLOG'  : 'CLEAR';

    const timeline = student.attempts.map(a => ({
      attemptNo:     a.attemptNo,
      label:         a.label,
      period:        a.period,
      semNo:         a.semNo,
      seatNo:        a.seatNo,
      result:        a.result,
      remark:        a.remark,
      spi:           a.spi,
      earnedCredits: a.earnedCredits,
      totalCredits:  a.totalCredits,
      backlogCount:  a.backlogs.length,
      clearedCount:  a.cleared.length,
      backlogs:      a.backlogs,
      cleared:       a.cleared,
    }));

    // Compatibility shim for Dashboard/Search (expect semesters[])
    const semesters = student.attempts.map(a => ({
      semNo:          a.semNo,
      semLabel:       a.semNo,
      period:         a.period,
      spi:            a.spi,
      earnedCredits:  a.earnedCredits,
      totalCredits:   a.totalCredits,
      gradePoints:    a.gradePoints,
      result:         a.result,
      remark:         a.remark,
      classification: a.classification,
      subjects:       a.subjects,
      backlogCounts:  {},
      attemptNo:      a.attemptNo,
      attemptLabel:   a.label,
    }));

    const latestSem = semesters[semesters.length - 1] || {};

    return {
      enrollmentNo:        student.enrollmentNo,
      name:                student.name,
      branch:              student.branch,
      college:             student.college,
      gender:              student.gender,
      category:            student.category,
      semNo:               student.semNo,
      semesters,
      attempts:            student.attempts,
      timeline,
      subjectHistory,
      currentBacklogs,
      totalActiveBacklogs,
      overallStatus,
      latestSemNo:         latestSem.semNo  || 0,
      latestSPI:           latestSem.spi    || 0,
      latestResult:        latestSem.result || '',
      totalAttempts:       student.attempts.length,
      backlogSummary:      timeline.filter(t => t.backlogCount > 0).map(t => ({
        semester:     t.semNo,
        semLabel:     `${t.semNo} (${t.period})`,
        backlogCount: t.backlogCount,
      })),
      sourceFiles:  student.sourceFiles,
      dataWarnings: [],
    };
  });
}
