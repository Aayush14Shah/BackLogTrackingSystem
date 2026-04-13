import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function EnrollmentSubjectWiseScreen() {
  const [file, setFile] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      processFile(uploadedFile);
    }
  };

  const processFile = async (file) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Detect which row contains the component headers
      // Row 0 might have subject names or component details
      // Row 1 might have component details
      let headerRow = 0;
      let dataStartRow = 1;
      
      // Check if row 0 has components (contains TH, INT, PR, EXT, etc.)
      const row0Str = jsonData[0].join(' ').toUpperCase();
      const hasComponents0 = /\b(TH|INT|PR|EXT|PE)\b/.test(row0Str);
      
      if (!hasComponents0 && jsonData.length > 1) {
        // Check row 1 for components
        const row1Str = jsonData[1].join(' ').toUpperCase();
        const hasComponents1 = /\b(TH|INT|PR|EXT|PE)\b/.test(row1Str);
        if (hasComponents1) {
          headerRow = 1;
          dataStartRow = 2;
        }
      }

      // Extract headers and trim whitespace
      const headers = jsonData[headerRow]
        .filter(h => h && h.toString().trim())
        .map(h => h.toString().trim());
      
      console.log('Using header row:', headerRow);
      console.log('Extracted headers:', headers);
      console.log('Total headers:', headers.length);
      
      // Extract enrollment numbers from each column
      const enrollmentsByComponent = {};
      headers.forEach((header, idx) => {
        const enrollments = [];
        for (let i = dataStartRow; i < jsonData.length; i++) {
          const enrollment = jsonData[i][idx];
          if (enrollment && enrollment.toString().trim()) {
            enrollments.push(enrollment.toString().trim());
          }
        }
        enrollmentsByComponent[header] = enrollments;
      });

      // Get all unique enrollments
      const allEnrollments = new Set();
      Object.values(enrollmentsByComponent).forEach(enrollments => {
        enrollments.forEach(e => allEnrollments.add(e));
      });

      // Build the report
      const report = Array.from(allEnrollments).sort().map(enrollment => {
        const row = { ENROLL: enrollment };
        headers.forEach(header => {
          row[header] = enrollmentsByComponent[header].includes(enrollment) ? 'Yes' : '-';
        });
        return row;
      });

      console.log('Sample report row:', report[0]);
      setReportData({ headers, report });
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const ws = XLSX.utils.json_to_sheet(reportData.report);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enrollment Report');
    XLSX.writeFile(wb, 'Enrollment_Subject_Wise_Report.xlsx');
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Enrollment Subject-Wise Failure Report', 14, 15);

    const tableColumn = ['ENROLL', ...reportData.headers];
    const tableRows = reportData.report.map(row => [
      row.ENROLL,
      ...reportData.headers.map(h => row[h])
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save('Enrollment_Subject_Wise_Report.pdf');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Enrollment Subject-Wise Report
          </h1>

          <div className="mb-8">
            <label className="block mb-4">
              <span className="text-gray-700 font-medium">Upload Failure Componentwise File</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-2 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />
            </label>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Processing file...</p>
            </div>
          )}

          {reportData && !loading && (
            <>
              <div className="mb-6 flex gap-4">
                <button
                  onClick={exportToExcel}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Export to Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Export to PDF
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">ENROLLMENT</th>
                      {reportData.headers.map((header, idx) => (
                        <th key={idx} className="border border-gray-300 px-4 py-2 text-center font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.report.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                          {row.ENROLL}
                        </td>
                        {reportData.headers.map((header, hIdx) => (
                          <td key={hIdx} className="border border-gray-300 px-4 py-2 text-center">
                            <span className={row[header] === 'Yes' ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                              {row[header]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-sm text-gray-600">
                <p>Total Enrollments: {reportData.report.length}</p>
                <p className="mt-2">
                  <span className="text-red-600 font-semibold">Yes</span> = Failed in this component
                  <span className="ml-4 text-gray-400">-</span> = Not failed / Not applicable
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
