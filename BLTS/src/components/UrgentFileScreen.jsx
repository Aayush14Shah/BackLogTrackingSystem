import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, X, Download, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UrgentFileScreen() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const parseUrgentFile = useCallback((fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          // Find all subject sections in the file
          const subjectSections = [];
          
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const firstCell = row[0] ? String(row[0]).trim() : '';
            
            // Check if this is a subject header (contains course code in parentheses)
            if (firstCell && firstCell.includes('(') && firstCell.includes(')') && !firstCell.includes('Sr.No')) {
              // Next row should be the header with Sr.No, Er.NO, Name, etc.
              if (i + 1 < rawData.length) {
                const nextRow = rawData[i + 1];
                if (nextRow[0] && String(nextRow[0]).includes('Sr.No')) {
                  // Parse component columns from header
                  const components = [];
                  for (let col = 3; col < nextRow.length; col++) {
                    const header = nextRow[col] ? String(nextRow[col]).trim() : '';
                    if (header && header !== '') {
                      components.push({ col, name: header.split('\n')[0] });
                    }
                  }
                  
                  subjectSections.push({
                    name: firstCell,
                    headerRow: i + 1,
                    components
                  });
                }
              }
            }
          }

          if (subjectSections.length === 0) {
            reject(new Error('No subject sections found in the file'));
            return;
          }

          // Build a map of all students with their failures across all subjects
          const studentMap = new Map();

          // Process each subject section
          subjectSections.forEach((section, sectionIdx) => {
            const startRow = section.headerRow + 1;
            const endRow = sectionIdx < subjectSections.length - 1 
              ? subjectSections[sectionIdx + 1].headerRow - 1 
              : rawData.length;

            for (let i = startRow; i < endRow; i++) {
              const row = rawData[i];
              if (!row[1] || !row[2]) continue; // Skip if no enrollment or name

              const enrollment = String(row[1]).trim();
              const nameFull = String(row[2]).trim();
              const name = nameFull.replace(/\s*\(Active\)\s*$/i, '').trim();

              // Get or create student entry
              if (!studentMap.has(enrollment)) {
                studentMap.set(enrollment, {
                  enrollment,
                  name,
                  failures: {}
                });
              }

              const student = studentMap.get(enrollment);
              const subjectFailure = {};

              // Process each component for this subject - INCLUDE ALL STUDENTS
              section.components.forEach(comp => {
                const value = row[comp.col] !== undefined ? String(row[comp.col]).trim().toUpperCase() : '';
                
                // Check if failed: AB, 0, or N/A
                const isFailed = value === 'AB' || value === '0' || value === 'N/A' || 
                                (value && !isNaN(value) && parseFloat(value) === 0);
                
                // Store the actual value (mark, AB, or N/A)
                subjectFailure[comp.name] = {
                  value: value || '-',
                  failed: isFailed
                };
              });

              // Add this subject for ALL students (not just those with failures)
              student.failures[section.name] = subjectFailure;
            }
          });

          // Convert map to array - include ALL students
          const students = Array.from(studentMap.values());

          resolve({ subjects: subjectSections, students });
        } catch (err) {
          reject(new Error(`Failed to parse file: ${err.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(fileObj);
    });
  }, []);

  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    
    setError(null);
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const data = await parseUrgentFile(selectedFile);
      setReportData(data);
    } catch (err) {
      setError(err.message);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [parseUrgentFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && /\.(xlsx|xls)$/i.test(droppedFile.name)) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please upload an Excel file (.xlsx or .xls)');
    }
  }, [handleFileSelect]);

  const handleExport = useCallback(() => {
    if (!reportData) return;

    const exportData = [];
    
    // Header row 1: Subject names
    const headerRow1 = ['Enrollment', 'Name'];
    reportData.subjects.forEach(subject => {
      headerRow1.push(subject.name);
      // Add empty cells for remaining components
      for (let i = 1; i < subject.components.length; i++) {
        headerRow1.push('');
      }
    });
    exportData.push(headerRow1);

    // Header row 2: Component names
    const headerRow2 = ['', ''];
    reportData.subjects.forEach(subject => {
      subject.components.forEach(comp => {
        headerRow2.push(comp.name);
      });
    });
    exportData.push(headerRow2);

    // Data rows
    reportData.students.forEach(student => {
      const row = [student.enrollment, student.name];
      reportData.subjects.forEach(subject => {
        const failure = student.failures[subject.name];
        if (failure) {
          subject.components.forEach(comp => {
            const compData = failure[comp.name];
            if (compData) {
              // Show "Yes" if failed, otherwise show the actual mark
              row.push(compData.failed ? 'Yes' : compData.value);
            } else {
              row.push('-');
            }
          });
        } else {
          // No failure in this subject, add empty cells
          subject.components.forEach(() => row.push('-'));
        }
      });
      exportData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failure Report');
    XLSX.writeFile(wb, `Urgent_Failure_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [reportData]);

  const handleReset = useCallback(() => {
    setFile(null);
    setReportData(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.location.hash = '#/upload'}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Urgent File Upload</h1>
          <p className="text-slate-500 mt-2">Upload failure componentwise file to generate detailed component-wise report for all students</p>
        </div>

        {/* Upload Section */}
        {!reportData && (
          <div
            className={`bg-white rounded-2xl shadow-sm border-2 border-dashed transition-all duration-200 cursor-pointer
              ${isDragActive ? 'border-red-500 bg-red-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400'}
              ${error ? 'border-red-400' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
            onDrop={handleDrop}
          >
            <label className="flex flex-col items-center justify-center w-full py-16 cursor-pointer">
              <Upload className={`w-16 h-16 mb-4 transition-all duration-200 ${isDragActive ? 'text-red-500 -translate-y-1' : 'text-slate-400'}`} />
              <span className="text-lg font-medium text-slate-700">{isDragActive ? 'Drop file here' : 'Click or drag file here'}</span>
              <span className="text-sm text-slate-400 mt-2">Upload failure componentwise Excel file (.xlsx, .xls)</span>
              {file && (
                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-700">{file.name}</span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mb-4" />
            <p className="text-slate-600 font-medium">Processing file...</p>
          </div>
        )}

        {/* Report Section */}
        {reportData && !isLoading && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{reportData.students.length}</span> students
                <span className="mx-2">·</span>
                <span className="font-semibold text-slate-800">{reportData.subjects.length}</span> subjects
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 border-r border-slate-200">Enrollment</th>
                      <th rowSpan={2} className="px-4 py-3 text-left font-semibold text-slate-700 sticky left-32 bg-slate-50 z-20 border-r border-slate-200">Name</th>
                      {reportData.subjects.map((subject, idx) => (
                        <th key={idx} colSpan={subject.components.length} className="px-4 py-3 text-center font-semibold text-slate-700 border-l border-slate-200">
                          <div className="text-xs leading-tight">{subject.name}</div>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      {reportData.subjects.map((subject, subIdx) => (
                        subject.components.map((comp, compIdx) => (
                          <th key={`${subIdx}-${compIdx}`} className={`px-2 py-2 text-xs font-medium text-slate-500 ${compIdx === 0 ? 'border-l border-slate-200' : ''}`}>
                            {comp.name}
                          </th>
                        ))
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100">{student.enrollment}</td>
                        <td className="px-4 py-3 text-slate-600 sticky left-32 bg-white z-10 border-r border-slate-100">{student.name}</td>
                        {reportData.subjects.map((subject, subIdx) => {
                          const failure = student.failures[subject.name];
                          return subject.components.map((comp, compIdx) => {
                            const compData = failure?.[comp.name];
                            const isFailed = compData?.failed;
                            const displayValue = isFailed ? 'Yes' : (compData?.value || '-');
                            
                            return (
                              <td 
                                key={`${subIdx}-${compIdx}`} 
                                className={`px-2 py-3 text-center text-xs ${compIdx === 0 ? 'border-l border-slate-200' : ''} ${
                                  isFailed ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-500'
                                }`}
                              >
                                {displayValue}
                              </td>
                            );
                          });
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
