import { Upload, FileSpreadsheet, AlertCircle, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import { detectFileRole } from '../services/fileParser';

const ROLE_LABELS = {
  OR:         'Official Result',
  PASS_MFEED: 'Pass Markfeed',
  FAIL_MFEED: 'Fail Markfeed',
  UNKNOWN:    'Unknown',
};
const ROLE_COLORS = {
  OR:         'bg-blue-100 text-blue-700 border-blue-200',
  PASS_MFEED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAIL_MFEED: 'bg-red-100 text-red-700 border-red-200',
  UNKNOWN:    'bg-slate-100 text-slate-600 border-slate-200',
};

export default function UploadScreen({ onFileLoaded }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState([]);   // [{ file, role, period, id }]
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const addFiles = useCallback((incoming) => {
    setError(null);
    const valid = Array.from(incoming).filter(f =>
      /\.(xlsx|xls|csv)$/i.test(f.name)
    );
    if (valid.length === 0) {
      setError('Only .xlsx, .xls, and .csv files are accepted.');
      return;
    }
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.file.name));
      const newEntries = valid
        .filter(f => !existing.has(f.name))
        .map(f => ({ file: f, id: Math.random(), role: detectFileRole(f.name) }));
      return [...prev, ...newEntries];
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragActive(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragActive(false); }, []);

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await onFileLoaded(files.map(f => f.file));
    } catch (err) {
      setError(err.message || 'Error processing files.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group files by role for display
  const grouped = files.reduce((acc, f) => {
    const key = ROLE_LABELS[f.role] || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const orCount = files.filter(f => f.role === 'OR').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Student Backlog Tracker</h1>
        <p className="text-slate-500 mt-2">Upload OR + Markfeed files for all attempts to build a complete backlog timeline.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`w-full max-w-2xl bg-white rounded-2xl shadow-sm border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400'}
          ${error ? 'border-red-400' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="flex flex-col items-center justify-center w-full py-10 cursor-pointer">
          <Upload className={`w-12 h-12 mb-3 transition-all duration-200 ${isDragActive ? 'text-blue-500 -translate-y-1' : 'text-slate-400'}`} />
          <span className="text-base font-medium text-slate-700">
            {isDragActive ? 'Drop files here' : 'Click or drag files here'}
          </span>
          <span className="text-sm text-slate-400 mt-1">OR + PASS_MFEED + FAIL_MFEED files (.xlsx, .csv)</span>
          <input type="file" className="hidden" accept=".xlsx,.xls,.csv" multiple onChange={e => addFiles(e.target.files)} />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* File list grouped by period */}
      {files.length > 0 && (
        <div className="w-full max-w-2xl mt-5 space-y-4">
          {Object.entries(grouped).map(([period, group]) => (
            <div key={period} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {period}
              </div>
              <ul className="divide-y divide-slate-100">
                {group.map(({ file, role, id }) => (
                  <li key={id} className="flex items-center gap-3 px-4 py-3">
                    <FileSpreadsheet className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 truncate">{file.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                    <button onClick={() => removeFile(id)} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Summary + action */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{files.length}</span> files &nbsp;·&nbsp;
              <span className="font-semibold text-blue-700">{orCount}</span> OR result{orCount !== 1 ? 's' : ''} &nbsp;·&nbsp;
              <span className="font-semibold text-emerald-700">{files.filter(f => f.role === 'PASS_MFEED').length}</span> pass &nbsp;·&nbsp;
              <span className="font-semibold text-red-600">{files.filter(f => f.role === 'FAIL_MFEED').length}</span> fail
            </div>
            {isLoading ? (
              <div className="flex items-center text-blue-600 text-sm font-medium gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Processing...
              </div>
            ) : (
              <button
                onClick={processFiles}
                disabled={orCount === 0}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Generate Report <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {orCount === 0 && (
            <p className="text-xs text-amber-600 text-center">
              Add at least one Official Result (OR) file to generate the report.
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {files.length === 0 && (
        <div className="w-full max-w-2xl mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-3">Which files to upload</p>
          <div className="space-y-2 text-sm text-slate-600">
            {[
              ['OR 2024-07-22 ...csv', 'Official Result', 'Winter-2023 (Main Exam)'],
              ['PASS_MFEED 2024-07-22 ...csv', 'Pass Markfeed', 'Winter-2023'],
              ['FAIL_MFEED 2024-07-22 ...csv', 'Fail Markfeed', 'Winter-2023'],
              ['OR 2024-11-27 ...csv', 'Official Result', 'Summer-2024 (Remedial 1)'],
              ['PASS_MFEED 2024-11-27 ...csv', 'Pass Markfeed', 'Summer-2024'],
              ['FAIL_MFEED 2024-11-27 ...csv', 'Fail Markfeed', 'Summer-2024'],
              ['OR 2025-09-23 ...csv', 'Official Result', 'Summer-2025 (Remedial 2)'],
              ['PASS_MFEED 2025-09-23 ...csv', 'Pass Markfeed', 'Summer-2025'],
              ['FAIL_MFEED 2025-09-23 ...csv', 'Fail Markfeed', 'Summer-2025'],
              ['OR_Integrated MCA.xlsx', 'Official Result', 'Winter-2025 (Remedial 3)'],
              ['Passfeed_Integrated MCA.xlsx', 'Pass Markfeed', 'Winter-2025'],
              ['Failfeed_Integrated MCA.xlsx', 'Fail Markfeed', 'Winter-2025'],
            ].map(([file, role, period]) => (
              <div key={file} className="flex items-start gap-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${
                  role === 'Official Result' ? ROLE_COLORS.OR : role === 'Pass Markfeed' ? ROLE_COLORS.PASS_MFEED : ROLE_COLORS.FAIL_MFEED
                }`}>{role === 'Official Result' ? 'OR' : role === 'Pass Markfeed' ? 'PASS' : 'FAIL'}</span>
                <span className="font-mono text-xs text-slate-500 flex-shrink-0 w-52 truncate">{file}</span>
                <span className="text-slate-500">{period}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">You can upload all 12 files at once — just select them all in the file picker.</p>
        </div>
      )}
    </div>
  );
}
