import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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

const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);

/**
 * For a backlog subject, returns which components failed.
 * e.g. "External, Viva" or "Internal" or "External"
 */
function getFailedComponents(sub) {
  const parts = [];
  const tg = (sub.theoryGrade || '').trim().toUpperCase();
  const mg = (sub.midGrade || '').trim().toUpperCase();
  const vg = (sub.vivaGrade || '').trim().toUpperCase();
  if (tg && FAIL_GRADES.has(tg)) parts.push('External');
  if (mg && FAIL_GRADES.has(mg)) parts.push('Internal');
  if (vg && FAIL_GRADES.has(vg)) parts.push('Viva');
  // If no component grade is individually flagged but subject is still a backlog,
  // fall back to the overall sub grade label
  if (parts.length === 0 && sub.isBacklog) parts.push(sub.subGrade || 'Failed');
  return parts.join(', ');
}

// Sub-columns rendered per subject (matching reference tabulation format)
const SUB_COLS = ['Internal(50)', 'External(50)', 'Viva(50)', 'Total', 'Credit', 'Grade', 'Grade Point', 'Comment'];

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
        const mid   = sub.midMarks   !== '' && sub.midMarks   != null ? sub.midMarks   : '';
        const ext   = sub.theoryMarks !== '' && sub.theoryMarks != null ? sub.theoryMarks : '';
        const viva  = sub.vivaMarks  !== '' && sub.vivaMarks  != null ? sub.vivaMarks  : '';
        const total = sub.totalMarks !== '' && sub.totalMarks != null ? sub.totalMarks : '';
        rowValues.push(mid, ext, viva, total, sub.credits ?? '', sub.subGrade || '', sub.gradePoint != null ? sub.gradePoint : '', sub.comment || '');
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
