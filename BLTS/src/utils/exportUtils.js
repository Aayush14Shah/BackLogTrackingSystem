import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { FAIL_GRADES, MARKS_LABELS } from '../config';

// Utility functions for exporting data in different formats

export const exportToCSV = (data, filename = 'student_data.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Flatten student data for CSV export
  const flattenedData = data.map(student => ({
    'Name': student.name || '',
    'Enrollment No': student.enrollmentNo || '',
    'Branch': student.branch || '',
    'Latest Semester': student.latestSemNo || '',
    'Latest SPI': student.latestSPI || '',
    'Overall Status': student.overallStatus || '',
    'Active Backlogs': student.totalActiveBacklogs || 0,
    'Semesters on Record': student.semesters?.length || 0,
    'Latest Result': student.latestResult || ''
  }));

  // Convert to CSV string
  const headers = Object.keys(flattenedData[0]);
  const csvContent = [
    headers.join(','),
    ...flattenedData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Download file
  downloadFile(csvContent, filename, 'text/csv');
};

const FAIL_GRADES_SET = new Set(FAIL_GRADES);

/**
 * For a backlog subject, returns which components failed.
 * e.g. "External, Viva" or "Internal" or "External"
 */
function getFailedComponents(sub) {
  const parts = [];
  const tg = (sub.theoryGrade || '').trim().toUpperCase();
  const mg = (sub.midGrade || '').trim().toUpperCase();
  const vg = (sub.vivaGrade || '').trim().toUpperCase();
  if (tg && FAIL_GRADES_SET.has(tg)) parts.push('External');
  if (mg && FAIL_GRADES_SET.has(mg)) parts.push('Internal');
  if (vg && FAIL_GRADES_SET.has(vg)) parts.push('Viva');
  // If no component grade is individually flagged but subject is still a backlog,
  // fall back to the overall sub grade label
  if (parts.length === 0 && sub.isBacklog) parts.push(sub.subGrade || 'Failed');
  return parts.join(', ');
}

// Sub-columns rendered per subject (matching GTU reference tabulation format: External first, then Internal)
const SUB_COLS = [MARKS_LABELS.theory, MARKS_LABELS.mid, MARKS_LABELS.viva, 'Total', 'Credit', 'Grade', 'Grade Point', 'Comment'];

// ── Border style helper ────────────────────────────────────────────────────
const THIN_BORDER = {
  top:    { style: 'thin' },
  left:   { style: 'thin' },
  bottom: { style: 'thin' },
  right:  { style: 'thin' },
};

// Apply thin border to every cell in a row (ExcelJS row object)
function applyBorderToRow(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.border = THIN_BORDER;
  });
}

export const exportToExcel = async (data, filename = 'student_data.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // ── Collect ALL unique subjects sorted by sem then code ───────────────────
  const subjectMap = new Map();
  data.forEach(student => {
    student.semesters?.forEach(sem => {
      const semInt = parseInt(String(sem.semLabel || sem.semNo).replace(/\D/g, '')) || 0;
      sem.subjects?.forEach(sub => {
        if (sub.code && !subjectMap.has(sub.code)) {
          subjectMap.set(sub.code, {
            code: sub.code,
            name: sub.name || sub.code,
            semInt,
            semLabel: sem.semLabel || sem.semNo,
          });
        }
      });
    });
  });

  const allSubjects = [...subjectMap.values()].sort((a, b) =>
    a.semInt !== b.semInt ? a.semInt - b.semInt : a.code.localeCompare(b.code)
  );

  const subColCount = SUB_COLS.length;

  // ── Fixed columns: Sem removed; Active Backlogs & Latest SPI at end ───────
  // Layout: # | Enrollment No | Student Name | [subjects...] | Active Backlogs | Latest SPI
  const PREFIX_FIXED = ['#', 'Enrollment No', 'Student Name'];
  const SUFFIX_FIXED = ['Active Backlogs', 'Latest SPI'];
  const prefixCount  = PREFIX_FIXED.length;
  const suffixCount  = SUFFIX_FIXED.length;
  const totalCols    = prefixCount + allSubjects.length * subColCount + suffixCount;

  // ── ExcelJS workbook ───────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Result Tabulation');

  // ── Column widths ──────────────────────────────────────────────────────────
  const colDefs = [
    { width: 5  },  // #
    { width: 22 },  // Enrollment No
    { width: 32 },  // Student Name
  ];
  allSubjects.forEach(() => SUB_COLS.forEach(sc => colDefs.push({ width: Math.max(sc.length + 2, 11) })));
  colDefs.push({ width: 16 }); // Active Backlogs
  colDefs.push({ width: 12 }); // Latest SPI
  ws.columns = colDefs;

  // ── Row 0: title spanning full width ──────────────────────────────────────
  const collegeName = data[0]?.branch || 'Student Result Tabulation';
  const titleRow = ws.addRow([collegeName]);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.getCell(1).font      = { bold: true, size: 13 };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titleRow.getCell(1).font      = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).border    = THIN_BORDER;
  titleRow.height = 24;

  // ── Row 1: prefix fixed + subject name headers (merged) + suffix fixed ────
  const hdr1Values = [...PREFIX_FIXED];
  allSubjects.forEach(({ code, name, semLabel }) => {
    hdr1Values.push(`${name} (${code}) — Sem ${semLabel}`);
    for (let i = 1; i < subColCount; i++) hdr1Values.push(null);
  });
  SUFFIX_FIXED.forEach(h => hdr1Values.push(h));

  const hdr1Row = ws.addRow(hdr1Values);
  hdr1Row.height = 40;

  // Style prefix + suffix fixed header cells (row 1, merge with row 2 later)
  [...Array(prefixCount).keys()].forEach(ci => {
    const cell = hdr1Row.getCell(ci + 1);
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = THIN_BORDER;
  });
  SUFFIX_FIXED.forEach((_, si) => {
    const colIdx = prefixCount + allSubjects.length * subColCount + si + 1;
    const cell = hdr1Row.getCell(colIdx);
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = THIN_BORDER;
  });

  // Style + merge subject name header cells
  allSubjects.forEach((_, si) => {
    const startCol = prefixCount + si * subColCount + 1; // 1-indexed
    const endCol   = startCol + subColCount - 1;
    if (subColCount > 1) ws.mergeCells(2, startCol, 2, endCol);
    const cell = hdr1Row.getCell(startCol);
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A628A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = THIN_BORDER;
    // Apply border to the rest of the merged range cells too
    for (let c = startCol + 1; c <= endCol; c++) {
      hdr1Row.getCell(c).border = THIN_BORDER;
    }
  });

  // ── Row 2: sub-column labels ───────────────────────────────────────────────
  const hdr2Values = [null, null, null]; // prefix fixed — merged with row above
  allSubjects.forEach(() => SUB_COLS.forEach(sc => hdr2Values.push(sc)));
  hdr2Values.push(null, null); // suffix fixed — merged with row above

  const hdr2Row = ws.addRow(hdr2Values);
  hdr2Row.height = 36;

  // Merge prefix/suffix fixed header cells vertically (rows 1–2)
  [...Array(prefixCount).keys()].forEach(ci => {
    ws.mergeCells(2, ci + 1, 3, ci + 1);
    hdr2Row.getCell(ci + 1).border = THIN_BORDER;
  });
  SUFFIX_FIXED.forEach((_, si) => {
    const colIdx = prefixCount + allSubjects.length * subColCount + si + 1;
    ws.mergeCells(2, colIdx, 3, colIdx);
    hdr2Row.getCell(colIdx).border = THIN_BORDER;
  });

  // Style sub-column label cells
  allSubjects.forEach((_, si) => {
    const startCol = prefixCount + si * subColCount + 1;
    for (let c = 0; c < subColCount; c++) {
      const cell = hdr2Row.getCell(startCol + c);
      cell.value     = SUB_COLS[c];
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF385F8B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = THIN_BORDER;
    }
  });

  // Freeze top 3 rows + prefix fixed columns
  ws.views = [{ state: 'frozen', xSplit: prefixCount, ySplit: 3 }];

  // ── Data rows ─────────────────────────────────────────────────────────────
  data.forEach((student, idx) => {
    const subLookup = new Map();
    student.semesters?.forEach(sem => {
      sem.subjects?.forEach(sub => { if (sub.code) subLookup.set(sub.code, sub); });
    });

    const rowValues = [
      idx + 1,
      student.enrollmentNo || '',
      student.name || '',
    ];

    allSubjects.forEach(({ code }) => {
      const sub = subLookup.get(code);
      if (sub) {
        const ext   = sub.theoryMarks !== '' && sub.theoryMarks != null ? sub.theoryMarks : '';
        const mid   = sub.midMarks   !== '' && sub.midMarks   != null ? sub.midMarks   : '';
        const viva  = sub.vivaMarks  !== '' && sub.vivaMarks  != null ? sub.vivaMarks  : '';
        const total = sub.totalMarks !== '' && sub.totalMarks != null ? sub.totalMarks : '';
        rowValues.push(ext, mid, viva, total, sub.credits ?? '', sub.subGrade || '', sub.gradePoint != null ? sub.gradePoint : '', sub.comment || '');
      } else {
        for (let i = 0; i < subColCount; i++) rowValues.push('');
      }
    });

    // Suffix: Active Backlogs, Latest SPI
    rowValues.push(student.totalActiveBacklogs ?? 0, student.latestSPI || '');

    const dataRow = ws.addRow(rowValues);
    dataRow.height = 18;

    // Alternate row fill
    const fillColor = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (!cell.fill || cell.fill.type === 'none') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      }
      cell.border    = THIN_BORDER;
      cell.alignment = { vertical: 'middle' };

      // Highlight backlog count cell if > 0
      const activeBacklogsCol = prefixCount + allSubjects.length * subColCount + 1;
      if (colNumber === activeBacklogsCol && (student.totalActiveBacklogs ?? 0) > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    });
  });

  // ── Sheet 2: Backlog Summary (uses original XLSX for simplicity) ───────────
  const backlogStudents = data.filter(s => s.totalActiveBacklogs > 0);
  if (backlogStudents.length > 0) {
    const backlogSubjects = allSubjects.filter(({ code }) =>
      data.some(student =>
        student.semesters?.some(sem =>
          sem.subjects?.some(sub => sub.code === code && sub.isBacklog)
        )
      )
    );

    const bWs = wb.addWorksheet('Backlog Summary');
    const bColDefs = [{ width: 5 }, { width: 22 }, { width: 32 }, { width: 16 }];
    backlogSubjects.forEach(() => ['Grade', 'Grade Point', 'Comment', 'Failed In'].forEach(() => bColDefs.push({ width: 14 })));
    bWs.columns = bColDefs;

    const bHdr1Values = ['#', 'Enrollment No', 'Student Name', 'Active Backlogs'];
    backlogSubjects.forEach(({ code, name }) => { bHdr1Values.push(`${code} — ${name}`); for (let i = 1; i < 4; i++) bHdr1Values.push(null); });
    const bHdr1Row = bWs.addRow(bHdr1Values);
    bHdr1Row.height = 36;
    // Merge subject header cells
    backlogSubjects.forEach((_, si) => {
      const sc = 4 + si * 4 + 1;
      if (4 > 1) bWs.mergeCells(1, sc, 1, sc + 3);
      const cell = bHdr1Row.getCell(sc);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      for (let c = sc; c <= sc + 3; c++) bHdr1Row.getCell(c).border = THIN_BORDER;
    });
    // Style fixed header cells
    [1,2,3,4].forEach(ci => {
      const cell = bHdr1Row.getCell(ci);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });

    const bHdr2Values = [null, null, null, null];
    backlogSubjects.forEach(() => ['Grade', 'Grade Point', 'Comment', 'Failed In'].forEach(h => bHdr2Values.push(h)));
    const bHdr2Row = bWs.addRow(bHdr2Values);
    bHdr2Row.height = 22;
    [1,2,3,4].forEach(ci => { bWs.mergeCells(1, ci, 2, ci); bHdr2Row.getCell(ci).border = THIN_BORDER; });
    backlogSubjects.forEach((_, si) => {
      const sc = 4 + si * 4 + 1;
      for (let c = 0; c < 4; c++) {
        const cell = bHdr2Row.getCell(sc + c);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF385F8B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = THIN_BORDER;
      }
    });

    backlogStudents.forEach((student, idx) => {
      const subLookup = new Map();
      student.semesters?.forEach(sem => sem.subjects?.forEach(sub => { if (sub.code) subLookup.set(sub.code, sub); }));
      const row = [idx + 1, student.enrollmentNo || '', student.name || '', student.totalActiveBacklogs ?? 0];
      backlogSubjects.forEach(({ code }) => {
        const sub = subLookup.get(code);
        if (sub && sub.isBacklog) row.push(sub.subGrade || '', sub.gradePoint != null ? sub.gradePoint : '', sub.comment || '', getFailedComponents(sub));
        else row.push('', '', '', '');
      });
      const bDataRow = bWs.addRow(row);
      bDataRow.height = 18;
      bDataRow.eachCell({ includeEmpty: true }, cell => { cell.border = THIN_BORDER; cell.alignment = { vertical: 'middle' }; });
    });
  }

  // ── Sheet 3: Stats ────────────────────────────────────────────────────────
  const statsData = generateSummaryData(data);
  const statsWs = wb.addWorksheet('Stats');
  statsWs.columns = [{ width: 30 }, { width: 15 }];
  const statsHdr = statsWs.addRow(['Metric', 'Value']);
  statsHdr.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
    cell.border = THIN_BORDER;
  });
  statsData.forEach(item => {
    const r = statsWs.addRow([item['Metric'], item['Value']]);
    r.eachCell({ includeEmpty: true }, cell => { cell.border = THIN_BORDER; });
  });

  // ── Write file ────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printSelectedStudents = (students) => {
  if (!students || students.length === 0) {
    console.warn('No students to print');
    return;
  }

  // Create printable HTML
  const printContent = generatePrintContent(students);
  
  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
};

// Helper function to download files
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate summary data for Excel export
const generateSummaryData = (students) => {
  const totalStudents = students.length;
  const withBacklog = students.filter(s => s.totalActiveBacklogs > 0).length;
  const clearStatus = students.filter(s => s.totalActiveBacklogs === 0).length;
  const detained = students.filter(s => s.overallStatus === 'DETAINED').length;
  
  const validSPI = students.filter(s => s.latestSPI && s.latestSPI > 0);
  const averageSPI = validSPI.length > 0 
    ? (validSPI.reduce((sum, s) => sum + s.latestSPI, 0) / validSPI.length).toFixed(2)
    : 0;

  // Department breakdown
  const deptStats = {};
  students.forEach(student => {
    const dept = student.branch || 'Unknown';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, clear: 0, backlog: 0, detained: 0 };
    }
    deptStats[dept].total++;
    if (student.totalActiveBacklogs === 0) deptStats[dept].clear++;
    else if (student.overallStatus === 'DETAINED') deptStats[dept].detained++;
    else deptStats[dept].backlog++;
  });

  return [
    { 'Metric': 'Total Students', 'Value': totalStudents },
    { 'Metric': 'Clear Status', 'Value': clearStatus },
    { 'Metric': 'With Backlog', 'Value': withBacklog },
    { 'Metric': 'Detained Students', 'Value': detained },
    { 'Metric': 'Average SPI', 'Value': averageSPI },
    { 'Metric': '', 'Value': '' },
    ...Object.entries(deptStats).map(([dept, stats]) => ({
      'Metric': `${dept} - Total`,
      'Value': stats.total
    })),
    ...Object.entries(deptStats).map(([dept, stats]) => ({
      'Metric': `${dept} - Clear`,
      'Value': stats.clear
    })),
    ...Object.entries(deptStats).map(([dept, stats]) => ({
      'Metric': `${dept} - Backlog`,
      'Value': stats.backlog
    })),
    ...Object.entries(deptStats).map(([dept, stats]) => ({
      'Metric': `${dept} - Detained`,
      'Value': stats.detained
    }))
  ];
};

// Generate printable HTML content
const generatePrintContent = (students) => {
  const currentDate = new Date().toLocaleDateString();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Reports</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .student-card { 
          margin-bottom: 30px; 
          border: 1px solid #ddd; 
          padding: 20px; 
          page-break-inside: avoid;
        }
        .status-clear { color: #059669; font-weight: bold; }
        .status-backlog { color: #d97706; font-weight: bold; }
        .status-detained { color: #dc2626; font-weight: bold; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px; 
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left; 
        }
        th { 
          background-color: #f5f5f5; 
          font-weight: bold;
        }
        .backlog-subject { 
          background-color: #fef2f2; 
          color: #dc2626;
        }
        @media print {
          body { margin: 10px; }
          .student-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Student Backlog Reports</h1>
        <p>Generated on ${currentDate}</p>
        <p>Total Students: ${students.length}</p>
      </div>
  `;

  students.forEach((student, index) => {
    const statusClass = student.totalActiveBacklogs === 0 ? 'status-clear' : 
                        student.overallStatus === 'DETAINED' ? 'status-detained' : 'status-backlog';
    
    html += `
      <div class="student-card">
        <h2>${student.name}</h2>
        <p><strong>Enrollment:</strong> ${student.enrollmentNo}</p>
        <p><strong>Branch:</strong> ${student.branch || 'Unknown'}</p>
        <p><strong>Status:</strong> <span class="${statusClass}">
          ${student.totalActiveBacklogs === 0 ? 'Clear' : 
            student.overallStatus === 'DETAINED' ? 'Detained' : 
            `${student.totalActiveBacklogs} Backlog${student.totalActiveBacklogs > 1 ? 's' : ''}`}
        </span></p>
        <p><strong>Latest SPI:</strong> ${student.latestSPI || 'N/A'}</p>
        <p><strong>Latest Semester:</strong> ${student.latestSemNo || 'N/A'}</p>
    `;

    // Add semester details if available
    if (student.semesters && student.semesters.length > 0) {
      html += '<h3>Semester Details</h3><table>';
      html += '<tr><th>Semester</th><th>SPI</th><th>Credits</th><th>Result</th><th>Backlog Subjects</th></tr>';
      
      student.semesters.forEach(sem => {
        const backlogSubjects = sem.subjects?.filter(s => s.isBacklog) || [];
        html += `
          <tr>
            <td>${sem.semLabel || sem.semNo}</td>
            <td>${sem.spi || 'N/A'}</td>
            <td>${sem.earnedCredits || 0}/${sem.totalCredits || 0}</td>
            <td>${sem.result || 'N/A'}</td>
            <td>${backlogSubjects.length > 0 ? backlogSubjects.map(s => s.name).join(', ') : 'None'}</td>
          </tr>
        `;
      });
      
      html += '</table>';
    }

    html += '</div>';
  });

  html += `
    </body>
    </html>
  `;

  return html;
};

// Export individual student report
export const exportStudentReport = async (student, format = 'print') => {
  if (!student) {
    console.warn('No student data provided');
    return;
  }

  switch (format) {
    case 'print':
      printSelectedStudents([student]);
      break;
    case 'csv':
      exportToCSV([student], `${student.name}_report.csv`);
      break;
    case 'excel':
      await exportToExcel([student], `${student.name}_report.xlsx`);
      break;
    default:
      console.warn('Unsupported export format:', format);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Provisional Marksheet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a professional A4-ready HTML marksheet for a single semester.
 * @param {object} student  – full student data object
 * @param {object} sem      – one semester object from student.semesters
 */
export const generateProvisionalMarksheetHTML = (student, sem) => {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const semLabel  = sem.semLabel || sem.semNo || '—';
  const period    = sem.period   || '—';
  const spi       = sem.spi      || '—';
  const result    = sem.result   || '—';
  const earnedCr  = sem.earnedCredits != null ? sem.earnedCredits : '—';
  const totalCr   = sem.totalCredits  != null ? sem.totalCredits  : '—';
  const gradePoints = sem.gradePoints != null ? sem.gradePoints : '—';

  const FAIL_GRADES_LOCAL = new Set(FAIL_GRADES);
  const isResultFail = /fail|detained/i.test(result);
  const isResultPass = /pass/i.test(result);

  const subjectRows = (sem.subjects || []).map((sub, idx) => {
    const isFail = sub.isBacklog;
    const rowBg  = isFail ? '#fff5f5' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');

    const gradeStyle = (g) => {
      const u = (g || '').trim().toUpperCase();
      if (!u || u === '-' || u === '—') return 'color:#94a3b8;';
      return FAIL_GRADES_LOCAL.has(u) ? 'color:#dc2626;font-weight:700;' : 'color:#065f46;font-weight:700;';
    };

    const cell = (val) => val !== null && val !== undefined && val !== '' ? val : '—';

    return `
      <tr style="background:${rowBg};">
        <td style="padding:7px 10px;border:1px solid #e2e8f0;font-family:monospace;font-size:11px;color:#64748b;">${cell(sub.code)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:${isFail ? '600' : '400'};color:${isFail ? '#991b1b' : '#1e293b'};">
          ${cell(sub.name)}
          ${isFail ? '<span style="margin-left:6px;font-size:9px;background:#fecaca;color:#991b1b;padding:1px 5px;border-radius:3px;font-weight:700;vertical-align:middle;">NOT CLEARED</span>' : ''}
        </td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${cell(sub.credits)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${cell(sub.midMarks)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${cell(sub.theoryMarks)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${cell(sub.vivaMarks)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:13px;font-weight:600;">${cell(sub.totalMarks)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;${gradeStyle(sub.subGrade)}">${cell(sub.subGrade)}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#1e40af;">${sub.gradePoint != null ? sub.gradePoint : '—'}</td>
        <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">${cell(sub.comment)}</td>
      </tr>
    `;
  }).join('');

  const resultColor = isResultFail ? '#dc2626' : isResultPass ? '#065f46' : '#1e40af';
  const resultBg    = isResultFail ? '#fef2f2' : isResultPass ? '#d1fae5' : '#dbeafe';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Provisional Marksheet — ${student.name} — Sem ${semLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 0;
      box-shadow: 0 4px 32px rgba(0,0,0,0.12);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
      color: #fff;
      padding: 28px 36px 20px;
      text-align: center;
      position: relative;
    }
    .header-badge {
      position: absolute;
      top: 16px; left: 24px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #bfdbfe;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .header h2 {
      font-size: 13px;
      font-weight: 400;
      color: #bfdbfe;
      margin-bottom: 14px;
    }
    .header-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.2);
      margin: 12px 0;
    }
    .header .doc-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #e0f2fe;
    }
    .header .provisional-note {
      font-size: 10px;
      color: #93c5fd;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }

    /* ── Student Info ── */
    .student-info {
      padding: 18px 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 32px;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
    }
    .info-item { display: flex; gap: 8px; align-items: baseline; }
    .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; white-space: nowrap; }
    .info-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .info-value.mono { font-family: monospace; background: #e2e8f0; padding: 1px 7px; border-radius: 4px; font-size: 12px; }

    /* ── Section Title ── */
    .sec-title {
      background: #334155;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 36px;
    }

    /* ── Marks Table ── */
    .marks-wrap { padding: 0 36px 16px; overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 0;
    }
    thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    thead th {
      padding: 9px 10px;
      border: 1px solid #2c5282;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    thead th:nth-child(2) { text-align: left; }
    tfoot tr { background: #f1f5f9; }
    tfoot td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #475569; text-align: center; }

    /* ── Summary Strip ── */
    .summary {
      margin: 0 36px 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .summary-cell {
      padding: 12px 14px;
      text-align: center;
      border-right: 1px solid #e2e8f0;
    }
    .summary-cell:last-child { border-right: none; }
    .summary-cell .s-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 4px; }
    .summary-cell .s-value { font-size: 20px; font-weight: 800; color: #1e293b; }

    /* ── Result Banner ── */
    .result-banner {
      margin: 0 36px 24px;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: ${resultBg};
      border: 1.5px solid ${isResultFail ? '#fca5a5' : isResultPass ? '#6ee7b7' : '#93c5fd'};
    }
    .result-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
    .result-value { font-size: 18px; font-weight: 800; color: ${resultColor}; letter-spacing: 1px; }

    /* ── Footer ── */
    .footer {
      margin: 0 36px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
    }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; margin: 34px 8px 4px; }
    .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; }
    .sig-sub { font-size: 9px; color: #94a3b8; }

    .watermark-note {
      text-align: center;
      margin: 16px 36px 20px;
      font-size: 9px;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-badge">Provisional</div>
    <h1>Student Academic Report</h1>
    <h2>${student.branch || 'Academic Institution'}</h2>
    <hr class="header-divider" />
    <div class="doc-title">Semester Marksheet</div>
    <div class="provisional-note">This is a provisional document generated by the Backlog Tracking System. It is not an official university document.</div>
  </div>

  <!-- Student Info Grid -->
  <div class="student-info">
    <div class="info-item">
      <span class="info-label">Student Name</span>
      <span class="info-value">${student.name || '—'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Enrollment No.</span>
      <span class="info-value mono">${student.enrollmentNo || '—'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Semester</span>
      <span class="info-value">Semester ${semLabel}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Exam Period</span>
      <span class="info-value">${period}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Branch / Programme</span>
      <span class="info-value">${student.branch || '—'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Date of Issue</span>
      <span class="info-value">${today}</span>
    </div>
  </div>

  <!-- Marks Table -->
  <div class="sec-title">Subject-wise Performance</div>
  <div class="marks-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:90px;">Code</th>
          <th style="text-align:left;min-width:160px;">Subject Name</th>
          <th>Cr.</th>
          <th>Internal<br/><span style="font-weight:400;">/50</span></th>
          <th>External<br/><span style="font-weight:400;">/50</span></th>
          <th>Viva<br/><span style="font-weight:400;">/50</span></th>
          <th>Total</th>
          <th>Grade</th>
          <th>GP</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows || '<tr><td colspan="10" style="text-align:center;padding:16px;color:#94a3b8;">No subjects found for this semester.</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Summary Strip -->
  <div class="sec-title" style="margin-bottom:10px;">Semester Summary</div>
  <div class="summary">
    <div class="summary-cell">
      <div class="s-label">SPI</div>
      <div class="s-value" style="color:#1e40af;">${spi}</div>
    </div>
    <div class="summary-cell">
      <div class="s-label">Grade Points</div>
      <div class="s-value">${gradePoints}</div>
    </div>
    <div class="summary-cell">
      <div class="s-label">Credits Earned</div>
      <div class="s-value">${earnedCr}<span style="font-size:13px;font-weight:400;color:#94a3b8;">/${totalCr}</span></div>
    </div>
    <div class="summary-cell">
      <div class="s-label">Subjects</div>
      <div class="s-value">${(sem.subjects || []).length}</div>
    </div>
  </div>

  <!-- Result Banner -->
  <div class="result-banner">
    <div>
      <div class="result-label">Semester Result</div>
      <div class="result-value">${result}</div>
    </div>
  </div>

  <!-- Signature Footer -->
  <div class="footer">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Student Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Examination Controller</div>
      <div class="sig-sub">With Seal</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Principal / Director</div>
      <div class="sig-sub">With Seal</div>
    </div>
  </div>

  <p class="watermark-note">
    PROVISIONAL — Generated by BLTS on ${today}. This document is subject to verification by the university registrar.
  </p>

</div>

<script>
  window.onload = function() { window.print(); };
</script>
</body>
</html>`;
};

/**
 * Opens a new browser window with the provisional marksheet HTML and triggers print.
 * @param {object} student  – full student data object
 * @param {object} sem      – the semester to generate the marksheet for
 */
export const downloadProvisionalMarksheet = (student, sem) => {
  if (!student || !sem) {
    console.warn('downloadProvisionalMarksheet: student and sem are required');
    return;
  }
  const html = generateProvisionalMarksheetHTML(student, sem);
  const win  = window.open('', '_blank');
  if (!win) {
    alert('Popup was blocked. Please allow popups for this site and try again.');
    return;
  }
  win.document.write(html);
  win.document.close();
};
