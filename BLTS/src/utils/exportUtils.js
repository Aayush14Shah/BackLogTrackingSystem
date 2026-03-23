import * as XLSX from 'xlsx';

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

export const exportToExcel = (data, filename = 'student_data.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // ── Collect ALL unique subjects (not just backlogs) sorted by sem then code ─
  const subjectMap = new Map(); // code → { code, name, semInt }
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

  // ── Fixed columns ─────────────────────────────────────────────────────────
  const FIXED = ['#', 'Enrollment No', 'Student Name', 'Active Backlogs', 'Latest SPI', 'Sem'];
  const fixedCount = FIXED.length;
  const subColCount = SUB_COLS.length;

  const aoa = [];

  // ── Row 0: college/branch header ──────────────────────────────────────────
  const collegeName = data[0]?.branch || 'Student Result Tabulation';
  const hdr0 = [collegeName, ...Array(FIXED.length - 1 + allSubjects.length * subColCount).fill('')];
  aoa.push(hdr0);

  // ── Row 1: subject name headers (merged across SUB_COLS each) ─────────────
  const hdr1 = FIXED.map((f, i) => (i === 0 ? f : ''));
  FIXED.forEach((f, i) => { hdr1[i] = f; });
  allSubjects.forEach(({ code, name, semLabel }) => {
    hdr1.push(`${name} (${code}) — Sem ${semLabel}`);
    for (let i = 1; i < subColCount; i++) hdr1.push('');
  });
  aoa.push(hdr1);

  // ── Row 2: sub-column labels ───────────────────────────────────────────────
  const hdr2 = FIXED.map(() => '');
  allSubjects.forEach(() => SUB_COLS.forEach(sc => hdr2.push(sc)));
  aoa.push(hdr2);

  // ── Data rows ─────────────────────────────────────────────────────────────
  data.forEach((student, idx) => {
    // Build lookup: subjectCode → subject
    const subLookup = new Map();
    student.semesters?.forEach(sem => {
      sem.subjects?.forEach(sub => {
        if (sub.code) subLookup.set(sub.code, sub);
      });
    });

    const row = [
      idx + 1,
      student.enrollmentNo || '',
      student.name || '',
      student.totalActiveBacklogs ?? 0,
      student.latestSPI || '',
      student.latestSemNo ? `Sem ${student.latestSemNo}` : '',
    ];

    allSubjects.forEach(({ code }) => {
      const sub = subLookup.get(code);
      if (sub) {
        // midMarks = Internal/CEC, theoryMarks = External, vivaMarks = Viva/Practical
        const mid   = sub.midMarks   !== '' && sub.midMarks   != null ? sub.midMarks   : '';
        const ext   = sub.theoryMarks !== '' && sub.theoryMarks != null ? sub.theoryMarks : '';
        const viva  = sub.vivaMarks  !== '' && sub.vivaMarks  != null ? sub.vivaMarks  : '';
        const total = sub.totalMarks !== '' && sub.totalMarks != null ? sub.totalMarks : '';
        row.push(
          mid,
          ext,
          viva,
          total,
          sub.credits   ?? '',
          sub.subGrade  || '',
          sub.gradePoint != null ? sub.gradePoint : '',
          sub.comment   || '',
        );
      } else {
        for (let i = 0; i < subColCount; i++) row.push('');
      }
    });

    aoa.push(row);
  });

  // ── Build worksheet ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Merges ────────────────────────────────────────────────────────────────
  const merges = [];

  // Row 0: college name spans entire width
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: fixedCount + allSubjects.length * subColCount - 1 } });

  // Row 1 fixed cols: merge vertically with row 2
  FIXED.forEach((_, ci) => {
    merges.push({ s: { r: 1, c: ci }, e: { r: 2, c: ci } });
  });

  // Row 1 subject headers: merge horizontally across SUB_COLS
  allSubjects.forEach((_, si) => {
    const startCol = fixedCount + si * subColCount;
    merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: startCol + subColCount - 1 } });
  });

  ws['!merges'] = merges;

  // ── Column widths ─────────────────────────────────────────────────────────
  const colWidths = [
    { wch: 5 },   // #
    { wch: 20 },  // Enrollment
    { wch: 30 },  // Name
    { wch: 14 },  // Active Backlogs
    { wch: 10 },  // SPI
    { wch: 8 },   // Sem
  ];
  allSubjects.forEach(() => {
    SUB_COLS.forEach(sc => colWidths.push({ wch: Math.max(sc.length + 2, 10) }));
  });
  ws['!cols'] = colWidths;

  // ── Freeze header rows + fixed columns ────────────────────────────────────
  ws['!freeze'] = { xSplit: fixedCount, ySplit: 3 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Result Tabulation');

  // ── Sheet 2: Backlog Summary ───────────────────────────────────────────────
  // Only backlog students, showing which subjects they failed
  const backlogStudents = data.filter(s => s.totalActiveBacklogs > 0);
  if (backlogStudents.length > 0) {
    const backlogSubjects = allSubjects.filter(({ code }) =>
      data.some(student =>
        student.semesters?.some(sem =>
          sem.subjects?.some(sub => sub.code === code && sub.isBacklog)
        )
      )
    );

    const bAoa = [];
    const bHdr1 = ['#', 'Enrollment No', 'Student Name', 'Active Backlogs'];
    backlogSubjects.forEach(({ code, name }) => bHdr1.push(`${code} — ${name}`, '', '', ''));
    bAoa.push(bHdr1);

    const bHdr2 = ['', '', '', ''];
    backlogSubjects.forEach(() => ['Grade', 'Grade Point', 'Comment', 'Failed In'].forEach(h => bHdr2.push(h)));
    bAoa.push(bHdr2);

    backlogStudents.forEach((student, idx) => {
      const subLookup = new Map();
      student.semesters?.forEach(sem => {
        sem.subjects?.forEach(sub => { if (sub.code) subLookup.set(sub.code, sub); });
      });

      const row = [idx + 1, student.enrollmentNo || '', student.name || '', student.totalActiveBacklogs ?? 0];
      backlogSubjects.forEach(({ code }) => {
        const sub = subLookup.get(code);
        if (sub && sub.isBacklog) {
          row.push(sub.subGrade || '', sub.gradePoint != null ? sub.gradePoint : '', sub.comment || '', getFailedComponents(sub));
        } else {
          row.push('', '', '', '');
        }
      });
      bAoa.push(row);
    });

    const bWs = XLSX.utils.aoa_to_sheet(bAoa);
    const bMerges = [];
    backlogSubjects.forEach((_, si) => {
      const startCol = 4 + si * 4;
      bMerges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 3 } });
    });
    bWs['!merges'] = bMerges;
    XLSX.utils.book_append_sheet(wb, bWs, 'Backlog Summary');
  }

  // ── Sheet 3: Stats ────────────────────────────────────────────────────────
  const summaryWs = XLSX.utils.json_to_sheet(generateSummaryData(data));
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Stats');

  XLSX.writeFile(wb, filename);
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
export const exportStudentReport = (student, format = 'print') => {
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
      exportToExcel([student], `${student.name}_report.xlsx`);
      break;
    default:
      console.warn('Unsupported export format:', format);
  }
};
