import ExcelJS from 'exceljs';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:      'FF1E3A5F',
  navyMid:   'FF2C5282',
  navyLight: 'FF4A628A',
  white:     'FFFFFFFF',
  altRow:    'FFF8FAFC',
  border:    'FFD1D5DB',
  // Result colours
  passBg:    'FFD1FAE5', passFg:    'FF065F46',
  promoteBg: 'FFDBEAFE', promoteFg: 'FF1E40AF',
  failBg:    'FFFEE2E2', failFg:    'FFDC2626',
  // Grade colours
  gradePass: 'FFD1FAE5', gradePassFg: 'FF065F46',
  gradeFail: 'FFFEE2E2', gradeFailFg: 'FFDC2626',
  gradeRet:  'FFF1F5F9', gradeRetFg:  'FF64748B',
  // Section header
  secBg:     'FF334155', secFg: 'FFFFFFFF',
};

const THIN   = { style: 'thin',   color: { argb: C.border } };
const MEDIUM = { style: 'medium', color: { argb: C.navyMid } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const BORDER_THICK_BOTTOM = { top: THIN, left: THIN, bottom: MEDIUM, right: THIN };

const fill  = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const fnt   = (o = {}) => ({ name: 'Calibri', size: 10, ...o });
const align = (h = 'center', wrap = false) => ({ horizontal: h, vertical: 'middle', wrapText: wrap });

function hCell(cell, text, bg = C.navyMid, fg = C.white, bold = true, wrap = true) {
  cell.value     = text;
  cell.font      = fnt({ bold, color: { argb: fg } });
  cell.fill      = fill(bg);
  cell.alignment = align('center', wrap);
  cell.border    = BORDER_THICK_BOTTOM;
}

function resultColors(result) {
  const r = (result || '').toLowerCase();
  if (/^pass/.test(r))    return { bg: C.passBg,    fg: C.passFg };
  if (/promoted/.test(r)) return { bg: C.promoteBg, fg: C.promoteFg };
  if (/fail/.test(r))     return { bg: C.failBg,    fg: C.failFg };
  return { bg: C.white, fg: '374151' };
}

const FAIL_SET = new Set(['F','FF','I','W','AB']);
function gradeColors(g) {
  const u = (g || '').trim().toUpperCase();
  if (!u || u === '-' || u === '—') return null;
  return FAIL_SET.has(u)
    ? { bg: C.gradeFail, fg: C.gradeFailFg }
    : { bg: C.gradePass, fg: C.gradePassFg };
}

async function download(wb, filename) {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Sheet 1: Overview / Summary ─────────────────────────────────────────────
function buildOverviewSheet(wb, students, attemptMeta) {
  const ws = wb.addWorksheet('📊 Overview');
  ws.columns = [{ width: 38 }, { width: 16 }, { width: 38 }, { width: 16 }];

  // Title
  const t = ws.addRow(['STUDENT ACADEMIC BACKLOG TRACKING REPORT']);
  ws.mergeCells(1, 1, 1, 4);
  t.height = 34;
  Object.assign(t.getCell(1), {
    value: 'STUDENT ACADEMIC BACKLOG TRACKING REPORT',
    font: fnt({ bold: true, size: 15, color: { argb: C.white } }),
    fill: fill(C.navy), alignment: align('center'), border: BORDER,
  });

  const sub = ws.addRow([`Generated: ${new Date().toLocaleString('en-IN')}  ·  ${students.length} students  ·  ${attemptMeta.length} exam cycles`]);
  ws.mergeCells(2, 1, 2, 4);
  sub.getCell(1).font      = fnt({ italic: true, color: { argb: 'FF6B7280' } });
  sub.getCell(1).alignment = align('center');
  ws.addRow([]);

  // ── Batch metrics ──
  const total    = students.length;
  const cleared  = students.filter(s => s.totalActiveBacklogs === 0).length;
  const backlog  = students.filter(s => s.totalActiveBacklogs > 0 && s.overallStatus !== 'DETAINED').length;
  const detained = students.filter(s => s.overallStatus === 'DETAINED').length;
  const spiArr   = students.filter(s => s.latestSPI > 0).map(s => s.latestSPI);
  const avgSPI   = spiArr.length ? (spiArr.reduce((a, b) => a + b, 0) / spiArr.length).toFixed(2) : '—';

  const mHdr = ws.addRow(['Metric', 'Count', 'Metric', 'Value']);
  mHdr.height = 22;
  [1,2,3,4].forEach(c => hCell(mHdr.getCell(c), mHdr.getCell(c).value, C.navyMid));

  [
    ['Total Students Enrolled', total,    'Average SPI (latest)',  avgSPI],
    ['Cleared All Backlogs',    cleared,  'Clear Rate',            `${total ? ((cleared/total)*100).toFixed(1) : 0}%`],
    ['Still Have Backlogs',     backlog,  'Backlog Rate',          `${total ? ((backlog/total)*100).toFixed(1) : 0}%`],
    ['Detained (4+ backlogs)',  detained, 'Total Exam Cycles',     attemptMeta.length],
  ].forEach(([m1, v1, m2, v2], i) => {
    const r = ws.addRow([m1, v1, m2, v2]);
    r.height = 20;
    const bg = i % 2 === 0 ? C.white : C.altRow;
    [1,2,3,4].forEach(c => {
      r.getCell(c).fill      = fill(bg);
      r.getCell(c).border    = BORDER;
      r.getCell(c).alignment = align(c % 2 === 0 ? 'center' : 'left');
      if (c % 2 === 0) r.getCell(c).font = fnt({ bold: true, size: 12 });
    });
    if (m1.includes('Detained') && detained > 0) {
      r.getCell(2).fill = fill(C.failBg); r.getCell(2).font = fnt({ bold: true, color: { argb: C.failFg }, size: 12 });
    }
    if (m1.includes('Cleared') && cleared > 0) {
      r.getCell(2).fill = fill(C.passBg); r.getCell(2).font = fnt({ bold: true, color: { argb: C.passFg }, size: 12 });
    }
  });

  ws.addRow([]);

  // ── Per-attempt summary ──
  const aHdr = ws.addRow(['Exam Cycle', 'Period', 'Appeared', 'Passed', 'Promoted / Still Failing']);
  aHdr.height = 22;
  [1,2,3,4,5].forEach(c => hCell(aHdr.getCell(c), aHdr.getCell(c).value, C.secBg));
  ws.getColumn(1).width = 38; ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 12; ws.getColumn(4).width = 12; ws.getColumn(5).width = 26;

  attemptMeta.forEach((am, i) => {
    const r = ws.addRow([am.label, am.period, am.appeared, am.passed, am.promoted]);
    r.height = 20;
    const bg = i % 2 === 0 ? C.white : C.altRow;
    [1,2,3,4,5].forEach(c => {
      r.getCell(c).fill = fill(bg); r.getCell(c).border = BORDER;
      r.getCell(c).alignment = align(c <= 2 ? 'left' : 'center');
    });
    if (am.passed > 0)    { r.getCell(4).fill = fill(C.passBg);    r.getCell(4).font = fnt({ bold: true, color: { argb: C.passFg } }); }
    if (am.promoted > 0)  { r.getCell(5).fill = fill(C.promoteBg); r.getCell(5).font = fnt({ bold: true, color: { argb: C.promoteFg } }); }
  });
}

// ─── One sheet per exam attempt ───────────────────────────────────────────────
// Shows every student who appeared in that attempt with their subjects + result
function buildAttemptSheet(wb, attemptNo, label, period, studentsInAttempt) {
  const sheetName = `A${attemptNo} ${period}`.slice(0, 31); // Excel 31-char limit
  const ws = wb.addWorksheet(sheetName);

  // Collect all subject codes that appear in this attempt
  const subMap = new Map();
  studentsInAttempt.forEach(({ attempt }) => {
    attempt.subjects?.forEach(sub => {
      if (!subMap.has(sub.code)) subMap.set(sub.code, sub.name || sub.code);
    });
  });
  const subjects = Array.from(subMap.entries()); // [[code, name], ...]

  // Column layout: #, Name, Seat No, Result, SPI, Credits | per subject: Ext, Int, Viva, Grade, GP, Comment
  const fixedCount = 6;
  const subColCount = 6; // External + Internal + Viva + Grade + GP + Comment
  const totalCols = fixedCount + subjects.length * subColCount + 1; // +1 for Backlogs col

  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 16 }, { width: 14 }, { width: 8 }, { width: 10 },
    ...subjects.flatMap(() => [
      { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 7 }, { width: 14 },
    ]),
    { width: 14 },
  ];

  // Row 1: Title
  const titleRow = ws.addRow([`${label}  —  ${period}`]);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.height = 28;
  Object.assign(titleRow.getCell(1), {
    value: `${label}  —  ${period}`,
    font: fnt({ bold: true, size: 13, color: { argb: C.white } }),
    fill: fill(C.navy), alignment: align('center'), border: BORDER,
  });

  // Row 2: stats bar
  const passed   = studentsInAttempt.filter(({ attempt }) => /^pass/i.test(attempt.result)).length;
  const promoted = studentsInAttempt.filter(({ attempt }) => /promoted/i.test(attempt.result)).length;
  const statsRow = ws.addRow([
    `Appeared: ${studentsInAttempt.length}   ✅ Passed: ${passed}   🔁 Promoted/Still Failing: ${promoted}`
  ]);
  ws.mergeCells(2, 1, 2, totalCols);
  statsRow.height = 20;
  statsRow.getCell(1).font      = fnt({ bold: true, color: { argb: C.navyMid } });
  statsRow.getCell(1).alignment = align('left');
  statsRow.getCell(1).fill      = fill('FFF0F4FF');
  statsRow.getCell(1).border    = BORDER;

  // Row 3: subject group headers (merge 2 cols per subject)
  const grpVals = ['#', 'Student Name', 'Seat No', 'Result', 'SPI', 'Credits'];
  subjects.forEach(([code, name]) => { grpVals.push(`${code}\n${name}`); grpVals.push(null); });
  grpVals.push('Backlogs\nThis Attempt');
  const grpRow = ws.addRow(grpVals);
  grpRow.height = 44;
  // Fixed headers
  ['#','Student Name','Seat No','Result','SPI','Credits'].forEach((h, i) => hCell(grpRow.getCell(i+1), h, C.navyMid));
  // Subject group headers (merged)
  subjects.forEach(([code, name], si) => {
    const col = fixedCount + si * subColCount + 1;
    ws.mergeCells(3, col, 3, col + subColCount - 1);
    const cell = grpRow.getCell(col);
    cell.value     = `${code}\n${name}`;
    cell.font      = fnt({ bold: true, color: { argb: C.white }, size: 9 });
    cell.fill      = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
    cell.alignment = align('center', true);
    cell.border    = BORDER_THICK_BOTTOM;
    for (let c = col + 1; c < col + subColCount; c++) {
      grpRow.getCell(c).fill   = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
      grpRow.getCell(c).border = BORDER_THICK_BOTTOM;
    }
  });
  hCell(grpRow.getCell(totalCols), 'Backlogs\nThis Attempt', C.secBg);

  // Row 4: sub-column headers
  const SUB_COLS = ['Ext\n(/70)', 'Int\n(/30)', 'Viva\n(/50)', 'Grade', 'GP', 'Comment'];
  const subHdrVals = [null, null, null, null, null, null];
  subjects.forEach(() => SUB_COLS.forEach(h => subHdrVals.push(h)));
  subHdrVals.push(null);
  const subHdrRow = ws.addRow(subHdrVals);
  subHdrRow.height = 28;
  // Merge fixed cols rows 3-4
  [1,2,3,4,5,6].forEach(c => {
    ws.mergeCells(3, c, 4, c);
    subHdrRow.getCell(c).border = BORDER;
  });
  subjects.forEach(([,], si) => {
    const col = fixedCount + si * subColCount + 1;
    SUB_COLS.forEach((h, ci) => {
      const cell = subHdrRow.getCell(col + ci);
      cell.value     = h;
      cell.font      = fnt({ bold: true, color: { argb: C.white }, size: 9 });
      cell.fill      = fill(si % 2 === 0 ? 'FF385F8B' : 'FF4A6FA5');
      cell.alignment = align('center', true);
      cell.border    = BORDER;
    });
  });
  ws.mergeCells(3, totalCols, 4, totalCols);
  subHdrRow.getCell(totalCols).border = BORDER;

  ws.views = [{ state: 'frozen', xSplit: fixedCount, ySplit: 4 }];

  // Data rows
  studentsInAttempt.forEach(({ student, attempt }, idx) => {
    const bg = idx % 2 === 0 ? C.white : C.altRow;
    const backlogCount = attempt.subjects?.filter(s => s.isBacklog).length ?? 0;

    const rowVals = [
      idx + 1,
      student.name,
      attempt.seatNo || student.enrollmentNo || '',
      attempt.result || '',
      attempt.spi > 0 ? attempt.spi : '',
      attempt.earnedCredits > 0 ? `${attempt.earnedCredits}/${attempt.totalCredits || '?'}` : '',
    ];
    subjects.forEach(([code]) => {
      const sub = attempt.subjects?.find(s => s.code === code);
      rowVals.push(
        sub ? (sub.theoryMarks || '—') : '—',  // External (/70)
        sub ? (sub.midMarks    || '—') : '—',  // Internal (/30)
        sub ? (sub.vivaMarks   || '—') : '—',  // Viva (/50)
        sub ? (sub.subGrade || sub.emGrade || '—') : '—',  // Grade
        sub?.gradePoint != null ? sub.gradePoint : '—',    // GP
        sub ? (sub.comment || '—') : '—',                  // Comment
      );
    });
    rowVals.push(backlogCount > 0 ? backlogCount : '');

    const row = ws.addRow(rowVals);
    row.height = 18;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill      = fill(bg);
      cell.border    = BORDER;
      cell.alignment = align(colNum <= 2 ? 'left' : 'center');
      cell.font      = fnt({});
    });

    // Result cell colour
    const rc = resultColors(attempt.result);
    row.getCell(4).fill = fill(rc.bg);
    row.getCell(4).font = fnt({ bold: true, color: { argb: rc.fg } });

    // Grade cells (offset 3 within each subject group = the Grade column)
    subjects.forEach(([code], si) => {
      const gradeCol = fixedCount + si * subColCount + 3 + 1; // +1 for 1-indexed
      const sub = attempt.subjects?.find(s => s.code === code);
      if (!sub) return;
      const gc = gradeColors(sub.subGrade || sub.emGrade || '');
      if (gc) {
        row.getCell(gradeCol).fill = fill(gc.bg);
        row.getCell(gradeCol).font = fnt({ bold: true, color: { argb: gc.fg } });
      }
    });

    // Backlog count cell
    if (backlogCount > 0) {
      row.getCell(totalCols).fill = fill(C.failBg);
      row.getCell(totalCols).font = fnt({ bold: true, color: { argb: C.failFg } });
    }
  });
}

// ─── Sheet: Still Failing After All Attempts ─────────────────────────────────
function buildStillFailingSheet(wb, students) {
  const failing = students
    .filter(s => s.totalActiveBacklogs > 0)
    .sort((a, b) => b.totalActiveBacklogs - a.totalActiveBacklogs);

  const ws = wb.addWorksheet('❌ Still Failing');
  const totalAttempts = Math.max(...students.map(s => s.attempts?.length || 1), 1);

  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 16 }, { width: 14 },
    { width: 12 }, { width: 40 },
    ...Array(totalAttempts).fill({ width: 14 }),
  ];

  const totalCols = 6 + totalAttempts;

  // Title
  const t = ws.addRow(['STUDENTS STILL FAILING AFTER ALL REMEDIALS']);
  ws.mergeCells(1, 1, 1, totalCols);
  t.height = 28;
  Object.assign(t.getCell(1), {
    value: 'STUDENTS STILL FAILING AFTER ALL REMEDIALS',
    font: fnt({ bold: true, size: 13, color: { argb: C.white } }),
    fill: fill('FFDC2626'), alignment: align('center'), border: BORDER,
  });

  const sub = ws.addRow([`${failing.length} students unresolved  ·  ${totalAttempts} exam cycle${totalAttempts > 1 ? 's' : ''} completed`]);
  ws.mergeCells(2, 1, 2, totalCols);
  sub.getCell(1).font = fnt({ bold: true, color: { argb: 'FFDC2626' } });
  sub.getCell(1).alignment = align('left');
  sub.getCell(1).fill = fill('FFFEF2F2');
  sub.getCell(1).border = BORDER;

  // Header
  const hdrs = ['#', 'Student Name', 'Seat / Roll No', 'Status', 'Backlogs\nRemaining', 'Uncleared Subjects'];
  for (let a = 1; a <= totalAttempts; a++) hdrs.push(`Attempt ${a}\nResult`);
  const hdrRow = ws.addRow(hdrs);
  hdrRow.height = 32;
  hdrs.forEach((h, i) => hCell(hdrRow.getCell(i + 1), h, C.navyMid));

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

  failing.forEach((student, idx) => {
    const attempts = student.attempts || [];
    const bg = idx % 2 === 0 ? C.white : C.altRow;

    const unclearedList = (student.currentBacklogs || [])
      .map(b => `${b.code} (${b.grade || 'F'})`)
      .join(', ') || '—';

    const rowVals = [
      idx + 1,
      student.name,
      student.enrollmentNo || '',
      student.overallStatus,
      student.totalActiveBacklogs,
      unclearedList,
    ];
    for (let a = 0; a < totalAttempts; a++) {
      const att = attempts[a];
      rowVals.push(att ? (att.result || '—') : '—');
    }

    const row = ws.addRow(rowVals);
    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill      = fill(bg);
      cell.border    = BORDER;
      cell.alignment = align(colNum <= 2 || colNum === 6 ? 'left' : 'center', colNum === 6);
      cell.font      = fnt({});
    });

    // Status
    const sc = row.getCell(4);
    sc.fill = fill(student.overallStatus === 'DETAINED' ? C.failBg : 'FFFEF3C7');
    sc.font = fnt({ bold: true, color: { argb: student.overallStatus === 'DETAINED' ? C.failFg : 'FF92400E' } });

    // Backlog count
    row.getCell(5).fill = fill(C.failBg);
    row.getCell(5).font = fnt({ bold: true, color: { argb: C.failFg }, size: 12 });

    // Per-attempt result cells
    for (let a = 0; a < totalAttempts; a++) {
      const att = attempts[a];
      if (!att) continue;
      const rc = resultColors(att.result);
      const cell = row.getCell(7 + a);
      cell.fill = fill(rc.bg);
      cell.font = fnt({ bold: true, color: { argb: rc.fg }, size: 9 });
    }
  });
}

// ─── Sheet: Subject-wise Grade Progression ───────────────────────────────────
function buildProgressionSheet(wb, students) {
  const totalAttempts = Math.max(...students.map(s => s.attempts?.length || 1), 1);

  // Only subjects that had at least one backlog
  const subMap = new Map();
  students.forEach(s => {
    (s.attempts || []).forEach(att => {
      att.subjects?.forEach(sub => {
        if (sub.isBacklog && !subMap.has(sub.code))
          subMap.set(sub.code, sub.name || sub.code);
      });
    });
  });
  const subjects = Array.from(subMap.entries());
  if (!subjects.length) return;

  const ws = wb.addWorksheet('📈 Grade Progression');
  const fixedCols = 3;
  const subColCount = totalAttempts + 1; // one per attempt + final status
  const totalCols = fixedCols + subjects.length * subColCount;

  ws.columns = [
    { width: 5 }, { width: 28 }, { width: 16 },
    ...subjects.flatMap(() => [...Array(totalAttempts).fill({ width: 9 }), { width: 13 }]),
  ];

  // Title
  const t = ws.addRow(['SUBJECT-WISE GRADE PROGRESSION ACROSS ALL ATTEMPTS']);
  ws.mergeCells(1, 1, 1, totalCols);
  t.height = 28;
  Object.assign(t.getCell(1), {
    value: 'SUBJECT-WISE GRADE PROGRESSION ACROSS ALL ATTEMPTS',
    font: fnt({ bold: true, size: 13, color: { argb: C.white } }),
    fill: fill(C.navy), alignment: align('center'), border: BORDER,
  });

  // Row 2: subject group headers
  const grpVals = [null, null, null];
  subjects.forEach(([code, name]) => {
    grpVals.push(`${code}\n${name}`);
    for (let i = 1; i < subColCount; i++) grpVals.push(null);
  });
  const grpRow = ws.addRow(grpVals);
  grpRow.height = 40;
  ['#','Student Name','Seat No'].forEach((h, i) => hCell(grpRow.getCell(i+1), h, C.navyMid));
  subjects.forEach(([code, name], si) => {
    const col = fixedCols + si * subColCount + 1;
    ws.mergeCells(2, col, 2, col + subColCount - 1);
    const cell = grpRow.getCell(col);
    cell.value     = `${code}\n${name}`;
    cell.font      = fnt({ bold: true, color: { argb: C.white }, size: 9 });
    cell.fill      = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
    cell.alignment = align('center', true);
    cell.border    = BORDER_THICK_BOTTOM;
    for (let c = col + 1; c < col + subColCount; c++) {
      grpRow.getCell(c).fill = fill(si % 2 === 0 ? C.navyMid : C.navyLight);
      grpRow.getCell(c).border = BORDER_THICK_BOTTOM;
    }
  });

  // Row 3: sub-column headers
  const subHdrVals = [null, null, null];
  subjects.forEach(() => {
    for (let a = 1; a <= totalAttempts; a++) subHdrVals.push(`A${a}`);
    subHdrVals.push('Status');
  });
  const subHdrRow = ws.addRow(subHdrVals);
  subHdrRow.height = 18;
  [1,2,3].forEach(c => { ws.mergeCells(2, c, 3, c); subHdrRow.getCell(c).border = BORDER; });
  subjects.forEach(([,], si) => {
    const col = fixedCols + si * subColCount + 1;
    for (let a = 0; a < totalAttempts; a++) {
      const cell = subHdrRow.getCell(col + a);
      cell.value = `A${a+1}`; cell.font = fnt({ bold: true, color: { argb: C.white }, size: 9 });
      cell.fill = fill(si % 2 === 0 ? 'FF385F8B' : 'FF4A6FA5');
      cell.alignment = align('center'); cell.border = BORDER;
    }
    const sc = subHdrRow.getCell(col + totalAttempts);
    sc.value = 'Status'; sc.font = fnt({ bold: true, color: { argb: C.white }, size: 9 });
    sc.fill = fill('FF374151'); sc.alignment = align('center'); sc.border = BORDER;
  });

  ws.views = [{ state: 'frozen', xSplit: fixedCols, ySplit: 3 }];

  // Only students with at least one backlog
  students
    .filter(s => (s.attempts || []).some(att => att.subjects?.some(sub => sub.isBacklog)))
    .forEach((student, idx) => {
      const attempts = student.attempts || [];
      const bg = idx % 2 === 0 ? C.white : C.altRow;
      const rowVals = [idx + 1, student.name, student.enrollmentNo || ''];

      subjects.forEach(([code]) => {
        let clearedAt = null;
        for (let a = 0; a < totalAttempts; a++) {
          const att = attempts[a];
          const sub = att?.subjects?.find(s => s.code === code);
          if (clearedAt !== null) { rowVals.push('✓ Ret'); continue; }
          if (!sub) { rowVals.push('—'); continue; }
          const grade = sub.subGrade || sub.emGrade || '—';
          rowVals.push(grade);
          if (!sub.isBacklog && grade !== '—') clearedAt = a + 1;
        }
        rowVals.push(clearedAt !== null ? `Cleared A${clearedAt}` : 'Uncleared');
      });

      const row = ws.addRow(rowVals);
      row.height = 18;
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = fill(bg); cell.border = BORDER;
        cell.alignment = align(colNum <= 2 ? 'left' : 'center');
        cell.font = fnt({});
      });

      // Style grade cells
      subjects.forEach(([code], si) => {
        let clearedAt = null;
        for (let a = 0; a < totalAttempts; a++) {
          const att = attempts[a];
          const sub = att?.subjects?.find(s => s.code === code);
          const colNum = fixedCols + si * subColCount + a + 1;
          const cell = row.getCell(colNum);
          if (clearedAt !== null) {
            cell.fill = fill(C.gradeRet); cell.font = fnt({ color: { argb: C.gradeRetFg }, italic: true, size: 9 });
          } else if (sub) {
            const gc = gradeColors(sub.subGrade || sub.emGrade || '');
            if (gc) { cell.fill = fill(gc.bg); cell.font = fnt({ bold: true, color: { argb: gc.fg } }); }
            if (!sub.isBacklog && (sub.subGrade || sub.emGrade)) clearedAt = a + 1;
          }
        }
        const statusCell = row.getCell(fixedCols + si * subColCount + totalAttempts + 1);
        if (clearedAt !== null) {
          statusCell.fill = fill(C.passBg); statusCell.font = fnt({ bold: true, color: { argb: C.passFg }, size: 9 });
        } else {
          statusCell.fill = fill(C.failBg); statusCell.font = fnt({ bold: true, color: { argb: C.failFg }, size: 9 });
        }
      });
    });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function masterExport(students, filename = 'Master_Backlog_Report.xlsx') {
  if (!students?.length) return;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BLTS'; wb.created = wb.modified = new Date();

  // Build attempt metadata + per-attempt student lists
  const maxAttempts = Math.max(...students.map(s => s.attempts?.length || 1), 1);
  const attemptMeta = [];

  for (let a = 1; a <= maxAttempts; a++) {
    const studentsInAttempt = students
      .map(s => ({ student: s, attempt: s.attempts?.find(att => att.attemptNo === a) }))
      .filter(x => x.attempt);

    const passed   = studentsInAttempt.filter(({ attempt }) => /^pass/i.test(attempt.result)).length;
    const promoted = studentsInAttempt.length - passed;
    const period   = studentsInAttempt[0]?.attempt?.period || `Attempt ${a}`;
    const label    = studentsInAttempt[0]?.attempt?.label  || `Attempt ${a}`;

    attemptMeta.push({ attemptNo: a, label, period, appeared: studentsInAttempt.length, passed, promoted });
  }

  // Sheet 1: Overview
  buildOverviewSheet(wb, students, attemptMeta);

  // Sheets 2…N: one per attempt
  for (let a = 1; a <= maxAttempts; a++) {
    const meta = attemptMeta[a - 1];
    const studentsInAttempt = students
      .map(s => ({ student: s, attempt: s.attempts?.find(att => att.attemptNo === a) }))
      .filter(x => x.attempt);
    buildAttemptSheet(wb, a, meta.label, meta.period, studentsInAttempt);
  }

  // Sheet: Grade Progression
  buildProgressionSheet(wb, students);

  // Sheet: Still Failing
  buildStillFailingSheet(wb, students);

  await download(wb, filename);
}
