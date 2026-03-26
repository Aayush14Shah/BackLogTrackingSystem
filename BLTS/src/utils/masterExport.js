import ExcelJS from 'exceljs';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  navyBg:    'FF1E3A5F',
  navyMid:   'FF2C5282',
  navyLight: 'FF4A628A',
  headerFg:  'FFFFFFFF',
  failBg:    'FFFEE2E2',
  failFg:    'FFDC2626',
  passBg:    'FFD1FAE5',
  passFg:    'FF065F46',
  promoteBg: 'FFDBEAFE',
  promoteFg: 'FF1E40AF',
  retainBg:  'FFF1F5F9',
  retainFg:  'FF64748B',
  altRow:    'FFF8FAFC',
  white:     'FFFFFFFF',
  border:    'FFD1D5DB',
  warnBg:    'FFFEF3C7',
  warnFg:    'FF92400E',
};

const THIN = { style: 'thin', color: { argb: C.border } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const THICK_BOTTOM = { top: THIN, left: THIN, bottom: { style: 'medium', color: { argb: C.navyMid } }, right: THIN };

function fill(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }
function font(opts) { return { name: 'Calibri', size: 10, ...opts }; }
function center(wrapText = false) { return { horizontal: 'center', vertical: 'middle', wrapText }; }
function left()   { return { horizontal: 'left',   vertical: 'middle' }; }

function applyBorder(row, includeEmpty = true) {
  row.eachCell({ includeEmpty }, cell => { cell.border = BORDER; });
}

function headerCell(cell, text, bgArgb = C.navyMid, fgArgb = C.headerFg, bold = true, wrap = true) {
  cell.value     = text;
  cell.font      = font({ bold, color: { argb: fgArgb }, size: 10 });
  cell.fill      = fill(bgArgb);
  cell.alignment = center(wrap);
  cell.border    = BORDER;
}

function resultStyle(result) {
  const r = (result || '').toLowerCase();
  if (/^pass/.test(r))    return { bg: C.passBg,    fg: C.passFg };
  if (/promoted/.test(r)) return { bg: C.promoteBg, fg: C.promoteFg };
  if (/fail/.test(r))     return { bg: C.failBg,    fg: C.failFg };
  return { bg: C.white, fg: 'FF374151' };
}

function gradeStyle(grade) {
  const FAIL = new Set(['F','FF','I','W','AB']);
  const g = (grade || '').trim().toUpperCase();
  if (!g || g === '-' || g === '—') return null;
  return FAIL.has(g) ? { bg: C.failBg, fg: C.failFg } : { bg: C.passBg, fg: C.passFg };
}

function styledGradeCell(cell, grade) {
  const s = gradeStyle(grade);
  if (s) {
    cell.fill = fill(s.bg);
    cell.font = font({ bold: true, color: { argb: s.fg } });
  }
  cell.alignment = center();
  cell.border    = BORDER;
}

// ─── Download helper ──────────────────────────────────────────────────────────
async function downloadWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Sheet 1: Summary ─────────────────────────────────────────────────────────
function buildSummarySheet(wb, students) {
  const ws = wb.addWorksheet('📊 Summary');
  ws.columns = [{ width: 36 }, { width: 18 }, { width: 36 }, { width: 18 }];

  // Title
  const title = ws.addRow(['STUDENT ACADEMIC BACKLOG REPORT', '', '', '']);
  ws.mergeCells(1, 1, 1, 4);
  title.height = 32;
  const tc = title.getCell(1);
  tc.value     = 'STUDENT ACADEMIC BACKLOG REPORT';
  tc.font      = font({ bold: true, size: 16, color: { argb: C.headerFg } });
  tc.fill      = fill(C.navyBg);
  tc.alignment = center();
  tc.border    = BORDER;

  // Generated date
  const dateRow = ws.addRow([`Generated: ${new Date().toLocaleString('en-IN')}`, '', '', '']);
  ws.mergeCells(2, 1, 2, 4);
  dateRow.getCell(1).font      = font({ italic: true, color: { argb: 'FF6B7280' } });
  dateRow.getCell(1).alignment = center();
  ws.addRow([]);

  // ── Key metrics ──
  const total    = students.length;
  const clear    = students.filter(s => s.totalActiveBacklogs === 0).length;
  const backlog  = students.filter(s => s.totalActiveBacklogs > 0 && s.overallStatus !== 'DETAINED').length;
  const detained = students.filter(s => s.overallStatus === 'DETAINED').length;
  const validSPI = students.filter(s => s.latestSPI > 0);
  const avgSPI   = validSPI.length ? (validSPI.reduce((s, x) => s + x.latestSPI, 0) / validSPI.length).toFixed(2) : '—';
  const maxAttempts = Math.max(...students.map(s => s.attempts?.length || s.semesters?.length || 1));

  const metrics = [
    ['Total Students',       total,    'Avg. SPI',           avgSPI],
    ['All Clear (No Backlog)', clear,  'Max Attempts Seen',  maxAttempts],
    ['With Backlog',         backlog,  'Clear Rate',         `${total ? ((clear/total)*100).toFixed(1) : 0}%`],
    ['Detained (4+ Backlogs)', detained, 'Backlog Rate',     `${total ? ((backlog/total)*100).toFixed(1) : 0}%`],
  ];

  const mHdr = ws.addRow(['Metric', 'Count', 'Metric', 'Value']);
  mHdr.height = 22;
  [1,2,3,4].forEach(c => headerCell(mHdr.getCell(c), mHdr.getCell(c).value, C.navyMid));

  metrics.forEach(([m1, v1, m2, v2], i) => {
    const r = ws.addRow([m1, v1, m2, v2]);
    r.height = 20;
    const bg = i % 2 === 0 ? C.white : C.altRow;
    [1,2,3,4].forEach(c => {
      r.getCell(c).fill      = fill(bg);
      r.getCell(c).border    = BORDER;
      r.getCell(c).alignment = c % 2 === 0 ? center() : left();
      if (c % 2 === 0) r.getCell(c).font = font({ bold: true, size: 12 });
    });
    // Colour detained row
    if (m1.includes('Detained') && detained > 0) {
      r.getCell(2).fill = fill(C.failBg);
      r.getCell(2).font = font({ bold: true, color: { argb: C.failFg }, size: 12 });
    }
    if (m1.includes('Clear') && !m1.includes('Rate') && clear > 0) {
      r.getCell(2).fill = fill(C.passBg);
      r.getCell(2).font = font({ bold: true, color: { argb: C.passFg }, size: 12 });
    }
  });

  ws.addRow([]);

  // ── Attempt distribution ──
  const attemptDist = {};
  students.forEach(s => {
    const n = s.attempts?.length || s.semesters?.length || 1;
    attemptDist[n] = (attemptDist[n] || 0) + 1;
  });
  const adHdr = ws.addRow(['Attempts Taken', 'No. of Students', '', '']);
  ws.mergeCells(adHdr.number, 3, adHdr.number, 4);
  adHdr.height = 20;
  [1,2].forEach(c => headerCell(adHdr.getCell(c), adHdr.getCell(c).value, C.navyLight));

  Object.entries(attemptDist).sort(([a],[b]) => +a - +b).forEach(([n, cnt], i) => {
    const r = ws.addRow([`${n} attempt${n > 1 ? 's' : ''}`, cnt, '', '']);
    r.height = 18;
    [1,2].forEach(c => {
      r.getCell(c).fill      = fill(i % 2 === 0 ? C.white : C.altRow);
      r.getCell(c).border    = BORDER;
      r.getCell(c).alignment = c === 2 ? center() : left();
    });
  });

  ws.views = [{ state: 'normal' }];
}

// ─── Sheet 2: All Students Timeline ──────────────────────────────────────────
function buildStudentTimelineSheet(wb, students) {
  const ws = wb.addWorksheet('📋 All Students');

  // Find max attempts across all students
  const maxAttempts = Math.max(...students.map(s => s.attempts?.length || s.semesters?.length || 1), 1);

  // Fixed cols: #, Name, Enrollment, Program, Status, Backlogs Remaining
  // Then per attempt: Period, Result, SPI, Credits, Backlogs
  const fixedCols = ['#', 'Student Name', 'Enrollment No', 'Program / Branch', 'Final Status', 'Backlogs\nRemaining'];
  const attemptCols = ['Period', 'Result', 'SPI', 'Credits\nEarned', 'Backlogs\nThis Attempt'];
  const totalCols = fixedCols.length + maxAttempts * attemptCols.length;

  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 22 }, { width: 36 }, { width: 14 }, { width: 12 },
    ...Array(maxAttempts).fill(null).flatMap(() => [
      { width: 16 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 10 },
    ]),
  ];

  // Row 1: Title
  const titleRow = ws.addRow(['ALL STUDENTS — ACADEMIC JOURNEY OVERVIEW']);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.height = 28;
  const tc = titleRow.getCell(1);
  tc.value     = 'ALL STUDENTS — ACADEMIC JOURNEY OVERVIEW';
  tc.font      = font({ bold: true, size: 13, color: { argb: C.headerFg } });
  tc.fill      = fill(C.navyBg);
  tc.alignment = center();
  tc.border    = BORDER;

  // Row 2: Attempt group headers
  const grpValues = [...fixedCols.map(() => null)];
  for (let a = 1; a <= maxAttempts; a++) {
    grpValues.push(`Attempt ${a}`);
    for (let i = 1; i < attemptCols.length; i++) grpValues.push(null);
  }
  const grpRow = ws.addRow(grpValues);
  grpRow.height = 22;
  // Style fixed header cells (merge rows 2-3 later)
  fixedCols.forEach((h, i) => headerCell(grpRow.getCell(i + 1), h, C.navyMid, C.headerFg, true, true));
  // Style attempt group cells
  for (let a = 0; a < maxAttempts; a++) {
    const startCol = fixedCols.length + a * attemptCols.length + 1;
    const endCol   = startCol + attemptCols.length - 1;
    ws.mergeCells(2, startCol, 2, endCol);
    const cell = grpRow.getCell(startCol);
    cell.value     = `Attempt ${a + 1}`;
    cell.font      = font({ bold: true, color: { argb: C.headerFg } });
    cell.fill      = fill(a % 2 === 0 ? C.navyMid : C.navyLight);
    cell.alignment = center();
    cell.border    = BORDER;
    for (let c = startCol + 1; c <= endCol; c++) {
      grpRow.getCell(c).border = BORDER;
      grpRow.getCell(c).fill   = fill(a % 2 === 0 ? C.navyMid : C.navyLight);
    }
  }

  // Row 3: Sub-column headers
  const subValues = [...fixedCols.map(() => null)];
  for (let a = 0; a < maxAttempts; a++) attemptCols.forEach(h => subValues.push(h));
  const subRow = ws.addRow(subValues);
  subRow.height = 30;
  // Merge fixed cols rows 2-3
  fixedCols.forEach((_, i) => {
    ws.mergeCells(2, i + 1, 3, i + 1);
    subRow.getCell(i + 1).border = BORDER;
  });
  // Style sub-col headers
  for (let a = 0; a < maxAttempts; a++) {
    const startCol = fixedCols.length + a * attemptCols.length + 1;
    attemptCols.forEach((h, ci) => {
      const cell = subRow.getCell(startCol + ci);
      cell.value     = h;
      cell.font      = font({ bold: true, color: { argb: C.headerFg }, size: 9 });
      cell.fill      = fill(a % 2 === 0 ? 'FF385F8B' : 'FF4A6FA5');
      cell.alignment = center(true);
      cell.border    = BORDER;
    });
  }

  ws.views = [{ state: 'frozen', xSplit: fixedCols.length, ySplit: 3 }];

  // Data rows
  students.forEach((student, idx) => {
    const attempts = student.attempts || student.semesters || [];
    const rowBg = idx % 2 === 0 ? C.white : C.altRow;

    const rowValues = [
      idx + 1,
      student.name || '',
      student.enrollmentNo || '',
      student.branch || '',
      student.overallStatus || '',
      student.totalActiveBacklogs ?? 0,
    ];

    for (let a = 0; a < maxAttempts; a++) {
      const att = attempts[a];
      if (att) {
        const backlogCount = att.backlogs?.length ?? att.subjects?.filter(s => s.isBacklog).length ?? 0;
        rowValues.push(
          att.period || att.attemptLabel || '',
          att.result || '',
          att.spi > 0 ? att.spi : '',
          att.earnedCredits > 0 ? att.earnedCredits : '',
          backlogCount > 0 ? backlogCount : '',
        );
      } else {
        rowValues.push('', '', '', '', '');
      }
    }

    const dataRow = ws.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill      = fill(rowBg);
      cell.border    = BORDER;
      cell.alignment = colNum <= 2 ? left() : center();
      cell.font      = font({});
    });

    // Status cell colour
    const statusCell = dataRow.getCell(5);
    const s = resultStyle(student.overallStatus === 'CLEAR' ? 'PASS' : student.overallStatus);
    statusCell.fill = fill(s.bg);
    statusCell.font = font({ bold: true, color: { argb: s.fg } });

    // Backlogs remaining cell
    const blCell = dataRow.getCell(6);
    if ((student.totalActiveBacklogs ?? 0) > 0) {
      blCell.fill = fill(C.failBg);
      blCell.font = font({ bold: true, color: { argb: C.failFg } });
    }

    // Per-attempt result + backlog cells
    for (let a = 0; a < maxAttempts; a++) {
      const att = attempts[a];
      if (!att) continue;
      const baseCol = fixedCols.length + a * attemptCols.length + 1;
      // Result cell (col offset 1)
      const resultCell = dataRow.getCell(baseCol + 1);
      const rs = resultStyle(att.result || '');
      resultCell.fill = fill(rs.bg);
      resultCell.font = font({ bold: true, color: { argb: rs.fg }, size: 9 });

      // Backlog count cell (col offset 4)
      const backlogCount = att.backlogs?.length ?? att.subjects?.filter(s => s.isBacklog).length ?? 0;
      if (backlogCount > 0) {
        const blc = dataRow.getCell(baseCol + 4);
        blc.fill = fill(C.failBg);
        blc.font = font({ bold: true, color: { argb: C.failFg } });
      }
    }
  });
}

// ─── Sheet 3: Subject-wise Backlog Tracker ────────────────────────────────────
function buildBacklogTrackerSheet(wb, students) {
  // Collect all unique subjects that had at least one backlog
  const subjectMap = new Map(); // code → { code, name }
  students.forEach(s => {
    const attempts = s.attempts || s.semesters || [];
    attempts.forEach(att => {
      att.subjects?.forEach(sub => {
        if (sub.isBacklog && !subjectMap.has(sub.code)) {
          subjectMap.set(sub.code, { code: sub.code, name: sub.name || sub.code });
        }
      });
    });
  });

  const subjects = Array.from(subjectMap.values());
  if (!subjects.length) return;

  const maxAttempts = Math.max(...students.map(s => s.attempts?.length || s.semesters?.length || 1), 1);
  const ws = wb.addWorksheet('🔍 Backlog Tracker');

  // Cols: #, Name, Enrollment, [per subject: A1 grade, A2 grade, ..., Status]
  const fixedCols = 3;
  const subColCount = maxAttempts + 1; // one per attempt + final status
  const totalCols = fixedCols + subjects.length * subColCount;

  ws.columns = [
    { width: 5 }, { width: 28 }, { width: 20 },
    ...Array(subjects.length).fill(null).flatMap(() => [
      ...Array(maxAttempts).fill({ width: 10 }),
      { width: 12 },
    ]),
  ];

  // Title row
  const titleRow = ws.addRow(['SUBJECT-WISE BACKLOG TRACKER — GRADE PROGRESSION']);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.height = 28;
  const tc = titleRow.getCell(1);
  tc.value     = 'SUBJECT-WISE BACKLOG TRACKER — GRADE PROGRESSION';
  tc.font      = font({ bold: true, size: 13, color: { argb: C.headerFg } });
  tc.fill      = fill(C.navyBg);
  tc.alignment = center();
  tc.border    = BORDER;

  // Row 2: subject group headers
  const grpValues = [null, null, null];
  subjects.forEach(sub => {
    grpValues.push(`${sub.code}\n${sub.name}`);
    for (let i = 1; i < subColCount; i++) grpValues.push(null);
  });
  const grpRow = ws.addRow(grpValues);
  grpRow.height = 40;
  ['#', 'Student Name', 'Enrollment No'].forEach((h, i) => headerCell(grpRow.getCell(i + 1), h, C.navyMid));
  subjects.forEach((sub, si) => {
    const startCol = fixedCols + si * subColCount + 1;
    const endCol   = startCol + subColCount - 1;
    ws.mergeCells(2, startCol, 2, endCol);
    const cell = grpRow.getCell(startCol);
    cell.value     = `${sub.code}\n${sub.name}`;
    cell.font      = font({ bold: true, color: { argb: C.headerFg }, size: 9 });
    cell.fill      = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
    cell.alignment = center(true);
    cell.border    = BORDER;
    for (let c = startCol + 1; c <= endCol; c++) {
      grpRow.getCell(c).border = BORDER;
      grpRow.getCell(c).fill   = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
    }
  });

  // Row 3: sub-column headers (A1, A2, ..., Status)
  const subHdrValues = [null, null, null];
  subjects.forEach(() => {
    for (let a = 1; a <= maxAttempts; a++) subHdrValues.push(`A${a}`);
    subHdrValues.push('Status');
  });
  const subHdrRow = ws.addRow(subHdrValues);
  subHdrRow.height = 20;
  // Merge fixed cols rows 2-3
  [1,2,3].forEach(c => {
    ws.mergeCells(2, c, 3, c);
    subHdrRow.getCell(c).border = BORDER;
  });
  subjects.forEach((_, si) => {
    const startCol = fixedCols + si * subColCount + 1;
    for (let a = 0; a < maxAttempts; a++) {
      const cell = subHdrRow.getCell(startCol + a);
      cell.value     = `A${a + 1}`;
      cell.font      = font({ bold: true, color: { argb: C.headerFg }, size: 9 });
      cell.fill      = fill(si % 2 === 0 ? 'FF385F8B' : 'FF4A6FA5');
      cell.alignment = center();
      cell.border    = BORDER;
    }
    const statusCell = subHdrRow.getCell(startCol + maxAttempts);
    statusCell.value     = 'Status';
    statusCell.font      = font({ bold: true, color: { argb: C.headerFg }, size: 9 });
    statusCell.fill      = fill('FF374151');
    statusCell.alignment = center();
    statusCell.border    = BORDER;
  });

  ws.views = [{ state: 'frozen', xSplit: fixedCols, ySplit: 3 }];

  // Only show students who had at least one backlog
  const backlogStudents = students.filter(s =>
    (s.attempts || s.semesters || []).some(att => att.subjects?.some(sub => sub.isBacklog))
  );

  backlogStudents.forEach((student, idx) => {
    const attempts = student.attempts || student.semesters || [];
    const rowBg = idx % 2 === 0 ? C.white : C.altRow;

    const rowValues = [idx + 1, student.name || '', student.enrollmentNo || ''];

    subjects.forEach(sub => {
      let clearedAt = null;
      for (let a = 0; a < maxAttempts; a++) {
        const att = attempts[a];
        if (!att) { rowValues.push('—'); continue; }
        const found = att.subjects?.find(s => s.code === sub.code);
        if (!found) {
          rowValues.push(clearedAt !== null ? '✓' : '—');
          continue;
        }
        if (clearedAt !== null) {
          rowValues.push('Retained ✓');
        } else {
          const grade = found.subGrade || found.emGrade || '—';
          rowValues.push(grade);
          if (!found.isBacklog && grade !== '—') clearedAt = a + 1;
        }
      }
      rowValues.push(clearedAt !== null ? `Cleared (A${clearedAt})` : 'Uncleared');
    });

    const dataRow = ws.addRow(rowValues);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill      = fill(rowBg);
      cell.border    = BORDER;
      cell.alignment = colNum <= 2 ? left() : center();
      cell.font      = font({});
    });

    // Style grade cells
    subjects.forEach((sub, si) => {
      let clearedAt = null;
      for (let a = 0; a < maxAttempts; a++) {
        const att = attempts[a];
        const colNum = fixedCols + si * subColCount + a + 1;
        const cell = dataRow.getCell(colNum);
        if (!att) continue;
        const found = att.subjects?.find(s => s.code === sub.code);
        if (clearedAt !== null) {
          cell.fill = fill(C.retainBg);
          cell.font = font({ color: { argb: C.retainFg }, italic: true, size: 9 });
        } else if (found) {
          styledGradeCell(cell, found.subGrade || found.emGrade || '');
          if (!found.isBacklog && (found.subGrade || found.emGrade)) clearedAt = a + 1;
        }
      }
      // Status cell
      const statusCol = fixedCols + si * subColCount + maxAttempts + 1;
      const statusCell = dataRow.getCell(statusCol);
      if (clearedAt !== null) {
        statusCell.fill = fill(C.passBg);
        statusCell.font = font({ bold: true, color: { argb: C.passFg }, size: 9 });
      } else {
        statusCell.fill = fill(C.failBg);
        statusCell.font = font({ bold: true, color: { argb: C.failFg }, size: 9 });
      }
    });
  });
}

// ─── Sheet 4: Backlog Students Detail ────────────────────────────────────────
function buildBacklogDetailSheet(wb, students) {
  const backlogStudents = students.filter(s => s.totalActiveBacklogs > 0);
  if (!backlogStudents.length) return;

  const ws = wb.addWorksheet('⚠️ Backlog Detail');
  ws.columns = [
    { width: 5 }, { width: 28 }, { width: 20 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 36 }, { width: 36 },
  ];

  // Title
  const titleRow = ws.addRow(['STUDENTS WITH ACTIVE BACKLOGS — DETAILED VIEW']);
  ws.mergeCells(1, 1, 1, 8);
  titleRow.height = 28;
  const tc = titleRow.getCell(1);
  tc.value     = 'STUDENTS WITH ACTIVE BACKLOGS — DETAILED VIEW';
  tc.font      = font({ bold: true, size: 13, color: { argb: C.headerFg } });
  tc.fill      = fill('FFDC2626');
  tc.alignment = center();
  tc.border    = BORDER;

  // Header
  const headers = ['#', 'Student Name', 'Enrollment No', 'Status', 'Backlogs\nRemaining', 'Total\nAttempts', 'Uncleared Subjects', 'Attempt History'];
  const hdrRow = ws.addRow(headers);
  hdrRow.height = 32;
  headers.forEach((h, i) => headerCell(hdrRow.getCell(i + 1), h, C.navyMid));

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  backlogStudents
    .sort((a, b) => b.totalActiveBacklogs - a.totalActiveBacklogs)
    .forEach((student, idx) => {
      const attempts = student.attempts || student.semesters || [];
      const rowBg = idx % 2 === 0 ? C.white : C.altRow;

      // Build uncleared subjects string
      const unclearedSubjects = (student.currentBacklogs || [])
        .map(b => `${b.code} (${b.grade || 'F'})`)
        .join(', ') || attempts[attempts.length - 1]?.subjects
          ?.filter(s => s.isBacklog)
          .map(s => `${s.code} (${s.subGrade || s.emGrade || 'F'})`)
          .join(', ') || '—';

      // Build attempt history string
      const attemptHistory = attempts
        .map((a, i) => {
          const bl = a.backlogs?.length ?? a.subjects?.filter(s => s.isBacklog).length ?? 0;
          return `A${i+1}: ${a.period || ''} → ${a.result || '?'} (${bl} backlog${bl !== 1 ? 's' : ''})`;
        })
        .join(' | ');

      const row = ws.addRow([
        idx + 1,
        student.name || '',
        student.enrollmentNo || '',
        student.overallStatus || '',
        student.totalActiveBacklogs ?? 0,
        attempts.length,
        unclearedSubjects,
        attemptHistory,
      ]);
      row.height = 22;

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill      = fill(rowBg);
        cell.border    = BORDER;
        cell.alignment = colNum <= 2 || colNum >= 7 ? { ...left(), wrapText: true } : center();
        cell.font      = font({});
      });

      // Status cell
      const statusCell = row.getCell(4);
      if (student.overallStatus === 'DETAINED') {
        statusCell.fill = fill(C.failBg);
        statusCell.font = font({ bold: true, color: { argb: C.failFg } });
      } else {
        statusCell.fill = fill(C.warnBg);
        statusCell.font = font({ bold: true, color: { argb: C.warnFg } });
      }

      // Backlog count cell
      const blCell = row.getCell(5);
      blCell.fill = fill(C.failBg);
      blCell.font = font({ bold: true, color: { argb: C.failFg }, size: 12 });
    });
}

// ─── Main export entry point ──────────────────────────────────────────────────
export async function masterExport(students, filename = 'Master_Backlog_Report.xlsx') {
  if (!students || students.length === 0) return;

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BLTS — Student Backlog Tracker';
  wb.created  = new Date();
  wb.modified = new Date();

  buildSummarySheet(wb, students);
  buildStudentTimelineSheet(wb, students);
  buildBacklogTrackerSheet(wb, students);
  buildBacklogDetailSheet(wb, students);

  await downloadWorkbook(wb, filename);
}
