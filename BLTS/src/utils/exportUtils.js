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

export const exportToExcel = (data, filename = 'student_data.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Prepare data for Excel export
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

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(flattenedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Data');

  // Add summary sheet if there's data
  if (data.length > 0) {
    const summaryData = generateSummaryData(data);
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  }

  // Write file
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
