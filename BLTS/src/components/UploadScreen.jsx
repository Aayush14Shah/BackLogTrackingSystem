import { Upload, FileSpreadsheet, AlertCircle, X, ChevronRight, GraduationCap, BarChart2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { detectFileRole } from '../services/fileParser';

const ROLE_LABELS  = { OR: 'Official Result', PASS_MFEED: 'Pass Markfeed', FAIL_MFEED: 'Fail Markfeed', UNKNOWN: 'Unknown' };
const ROLE_COLORS  = {
  OR:         'bg-blue-100 text-blue-700 border-blue-200',
  PASS_MFEED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAIL_MFEED: 'bg-red-100 text-red-700 border-red-200',
  UNKNOWN:    'bg-slate-100 text-slate-600 border-slate-200',
};

const SEMESTERS = [
  { key: 'sem7',  label: 'Semester VII',  color: 'blue',   hint: 'OR + PASS_MFEED + FAIL_MFEED for Sem 7 (all attempts)' },
  { key: 'sem8',  label: 'Semester VIII', color: 'violet', hint: 'OR + PASS_MFEED + FAIL_MFEED for Sem 8 (all attempts)' },
  { key: 'sem9',  label: 'Semester IX',   color: 'amber',  hint: 'OR + PASS_MFEED + FAIL_MFEED for Sem 9 (all attempts)' },
  { key: 'sem10', label: 'Semester X',    color: 'emerald',hint: 'OR + PASS_MFEED + FAIL_MFEED for Sem 10 (all attempts)' },
];

const SEM_COLORS = {
  blue:    { border: 'border-blue-300',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   header: 'bg-blue-600',   active: 'border-blue-500 bg-blue-50/60' },
  violet:  { border: 'border-violet-300', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700 border-violet-200', header: 'bg-violet-600', active: 'border-violet-500 bg-violet-50/60' },
  amber:   { border: 'border-amber-300',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700 border-amber-200',  header: 'bg-amber-500',  active: 'border-amber-500 bg-amber-50/60' },
  emerald: { border: 'border-emerald-300',bg: 'bg-emerald-50',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', header: 'bg-emerald-600', active: 'border-emerald-500 bg-emerald-50/60' },
};

// ─── Single semester upload slot ──────────────────────────────────────────────
function SemSlot({ sem, files, onAdd, onRemove }) {
  const [drag, setDrag] = useState(false);
  const c = SEM_COLORS[sem.color];
  const orCount = files.filter(f => f.role === 'OR').length;

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    const valid = Array.from(e.dataTransfer.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (valid.length) onAdd(sem.key, valid);
  }, [sem.key, onAdd]);

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${drag ? c.active : c.border} bg-white shadow-sm`}>
      {/* Header */}
      <div className={`${c.header} px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-white font-bold text-sm">{sem.label}</span>
        {orCount > 0 && (
          <span className="flex items-center gap-1 text-white/90 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center gap-1.5 py-4 cursor-pointer transition-colors ${drag ? c.bg : 'hover:bg-slate-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
      >
        <Upload className={`w-6 h-6 ${drag ? 'text-blue-500' : 'text-slate-300'}`} />
        <span className="text-xs text-slate-500 font-medium">Drop files or click to browse</span>
        <span className="text-[10px] text-slate-400 text-center px-2">{sem.hint}</span>
        <input
          type="file" className="hidden" accept=".xlsx,.xls,.csv" multiple
          onChange={e => { const v = Array.from(e.target.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name)); if (v.length) onAdd(sem.key, v); e.target.value = ''; }}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {files.map(({ file, role, id }) => (
            <li key={id} className="flex items-center gap-2 px-3 py-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="flex-1 text-xs text-slate-600 truncate">{file.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${ROLE_COLORS[role]}`}>
                {role === 'OR' ? 'OR' : role === 'PASS_MFEED' ? 'PASS' : role === 'FAIL_MFEED' ? 'FAIL' : '?'}
              </span>
              <button onClick={() => onRemove(sem.key, id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {orCount === 0 && files.length === 0 && (
        <p className="text-[10px] text-slate-300 text-center pb-2">No files yet</p>
      )}
      {orCount === 0 && files.length > 0 && (
        <p className="text-[10px] text-amber-500 text-center pb-2 px-2">⚠ Add at least one OR file for this semester</p>
      )}
    </div>
  );
}

// ─── Main Upload Screen ───────────────────────────────────────────────────────
export default function UploadScreen({ onFileLoaded }) {
  const [mode, setMode]         = useState(null); // null | 'backlog' | 'transcript'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState(null);

  // ── Backlog mode state ──
  const [files, setFiles]       = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // ── Transcript mode state: { sem7: [], sem8: [], sem9: [], sem10: [] } ──
  const [semFiles, setSemFiles] = useState({ sem7: [], sem8: [], sem9: [], sem10: [] });

  // ── Backlog mode handlers ──
  const addFiles = useCallback((incoming) => {
    setError(null);
    const valid = Array.from(incoming).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!valid.length) { setError('Only .xlsx, .xls, and .csv files are accepted.'); return; }
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.file.name));
      return [...prev, ...valid.filter(f => !existing.has(f.name)).map(f => ({ file: f, id: Math.random(), role: detectFileRole(f.name) }))];
    });
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); addFiles(e.dataTransfer.files); }, [addFiles]);

  // ── Transcript mode handlers ──
  const addSemFiles = useCallback((semKey, incoming) => {
    setError(null);
    setSemFiles(prev => {
      const existing = new Set(prev[semKey].map(f => f.file.name));
      const newEntries = incoming.filter(f => !existing.has(f.name)).map(f => ({ file: f, id: Math.random(), role: detectFileRole(f.name) }));
      return { ...prev, [semKey]: [...prev[semKey], ...newEntries] };
    });
  }, []);

  const removeSemFile = useCallback((semKey, id) => {
    setSemFiles(prev => ({ ...prev, [semKey]: prev[semKey].filter(f => f.id !== id) }));
  }, []);

  // ── Process ──
  const processBacklog = async () => {
    if (!files.length) return;
    setIsLoading(true); setError(null);
    try { await onFileLoaded(files.map(f => f.file), 'backlog'); }
    catch (err) { setError(err.message || 'Error processing files.'); }
    finally { setIsLoading(false); }
  };

  const processTranscript = async () => {
    const allFiles = Object.values(semFiles).flat().map(f => f.file);
    if (!allFiles.length) return;
    setIsLoading(true); setError(null);
    try { await onFileLoaded(allFiles, 'transcript'); }
    catch (err) { setError(err.message || 'Error processing files.'); }
    finally { setIsLoading(false); }
  };

  const orCount        = files.filter(f => f.role === 'OR').length;
  const totalSemFiles  = Object.values(semFiles).flat().length;
  const semOrCount     = Object.values(semFiles).flat().filter(f => f.role === 'OR').length;
  const loadedSems     = SEMESTERS.filter(s => semFiles[s.key].some(f => f.role === 'OR')).length;

  // ── Mode selector ──
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Student Backlog Tracker</h1>
          <p className="text-slate-500 mt-2">Choose what you want to do</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-4xl">
          <button
            onClick={() => setMode('backlog')}
            className="flex flex-col items-start gap-3 bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-6 text-left transition-all group"
          >
            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Backlog Tracking</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Upload OR + Markfeed files for one semester across all remedial attempts. Get dashboard, search, and master export.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 mt-auto">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => setMode('transcript')}
            className="flex flex-col items-start gap-3 bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-md rounded-2xl p-6 text-left transition-all group"
          >
            <div className="p-3 bg-violet-100 rounded-xl group-hover:bg-violet-200 transition-colors">
              <GraduationCap className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Transcript Generator</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Upload OR + Markfeed files for Sem 7, 8, 9 and 10 separately. Generate complete academic transcripts for any student.
              </p>
            </div>
            <span className="text-xs font-semibold text-violet-600 flex items-center gap-1 mt-auto">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => window.location.hash = '#/enrollment-subject-wise'}
            className="flex flex-col items-start gap-3 bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl p-6 text-left transition-all group"
          >
            <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
              <FileSpreadsheet className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Enrollment Subject-Wise</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Upload failure componentwise file to generate enrollment-wise subject failure report with checkmarks.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 mt-auto">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={() => window.location.hash = '#/urgent-file'}
            className="flex flex-col items-start gap-3 bg-white border-2 border-slate-200 hover:border-red-400 hover:shadow-md rounded-2xl p-6 text-left transition-all group"
          >
            <div className="p-3 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Urgent File Upload</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Upload failure componentwise file to generate detailed component-wise report showing all students with their marks. Failed components (AB, 0, N/A) are highlighted.
              </p>
            </div>
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-auto">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Loading overlay ──
  const loadingOverlay = isLoading && (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      <p className="text-base font-semibold text-slate-700">Parsing files and building student records…</p>
      <p className="text-sm text-slate-400">This may take a few seconds for large datasets.</p>
    </div>
  );

  // ── Backlog mode ──
  if (mode === 'backlog') {
    const grouped = files.reduce((acc, f) => {
      const key = ROLE_LABELS[f.role] || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {loadingOverlay}
        <div className="mb-6 text-center">
          <button onClick={() => { setMode(null); setFiles([]); setError(null); }} className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1 mx-auto">
            ← Back to mode selection
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Backlog Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">Upload OR + Markfeed files for all attempts of one semester</p>
        </div>

        <div
          className={`w-full max-w-2xl bg-white rounded-2xl shadow-sm border-2 border-dashed transition-all duration-200 cursor-pointer
            ${isDragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400'}
            ${error ? 'border-red-400' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center w-full py-10 cursor-pointer">
            <Upload className={`w-12 h-12 mb-3 transition-all duration-200 ${isDragActive ? 'text-blue-500 -translate-y-1' : 'text-slate-400'}`} />
            <span className="text-base font-medium text-slate-700">{isDragActive ? 'Drop files here' : 'Click or drag files here'}</span>
            <span className="text-sm text-slate-400 mt-1">OR + PASS_MFEED + FAIL_MFEED files (.xlsx, .csv)</span>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" multiple onChange={e => addFiles(e.target.files)} />
          </label>
        </div>

        {error && <div className="flex items-center gap-2 mt-3 text-red-600 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        {files.length > 0 && (
          <div className="w-full max-w-2xl mt-5 space-y-4">
            {Object.entries(grouped).map(([period, group]) => (
              <div key={period} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">{period}</div>
                <ul className="divide-y divide-slate-100">
                  {group.map(({ file, role, id }) => (
                    <li key={id} className="flex items-center gap-3 px-4 py-3">
                      <FileSpreadsheet className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="flex-1 text-sm text-slate-700 truncate">{file.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
                      <button onClick={() => setFiles(p => p.filter(f => f.id !== id))} className="text-slate-400 hover:text-red-500 transition-colors ml-1"><X className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{files.length}</span> files &nbsp;·&nbsp;
                <span className="font-semibold text-blue-700">{orCount}</span> OR &nbsp;·&nbsp;
                <span className="font-semibold text-emerald-700">{files.filter(f => f.role === 'PASS_MFEED').length}</span> pass &nbsp;·&nbsp;
                <span className="font-semibold text-red-600">{files.filter(f => f.role === 'FAIL_MFEED').length}</span> fail
              </div>
              {isLoading
                ? <div className="flex items-center text-blue-600 text-sm font-medium gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />Parsing…</div>
                : <button onClick={processBacklog} disabled={orCount === 0} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                    Generate Report <ChevronRight className="w-4 h-4" />
                  </button>
              }
            </div>
            {orCount === 0 && <p className="text-xs text-amber-600 text-center">Add at least one OR file to generate the report.</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Transcript mode ──
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {loadingOverlay}
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 text-center">
          <button onClick={() => { setMode(null); setSemFiles({ sem7: [], sem8: [], sem9: [], sem10: [] }); setError(null); }} className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1 mx-auto">
            ← Back to mode selection
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Transcript Generator</h1>
          <p className="text-slate-500 text-sm mt-1">Upload files for each semester separately — all 4 semesters will be merged into one transcript per student</p>
        </div>

        {/* 4 semester slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {SEMESTERS.map(sem => (
            <SemSlot
              key={sem.key}
              sem={sem}
              files={semFiles[sem.key]}
              onAdd={addSemFiles}
              onRemove={removeSemFile}
            />
          ))}
        </div>

        {error && <div className="flex items-center gap-2 mb-4 text-red-600 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        {/* Summary + action */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-3 text-sm">
              {SEMESTERS.map(sem => {
                const hasOR = semFiles[sem.key].some(f => f.role === 'OR');
                const count = semFiles[sem.key].length;
                return (
                  <span key={sem.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${hasOR ? SEM_COLORS[sem.color].badge : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    {hasOR ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />}
                    {sem.label} {count > 0 ? `(${count})` : ''}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {loadedSems === 0 ? 'Upload OR files for at least one semester to continue' : `${loadedSems} semester${loadedSems !== 1 ? 's' : ''} ready · ${totalSemFiles} total files`}
            </p>
          </div>
          {isLoading
            ? <div className="flex items-center text-violet-600 text-sm font-medium gap-2 shrink-0"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600" />Parsing…</div>
            : <button
                onClick={processTranscript}
                disabled={semOrCount === 0}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-5 rounded-lg transition-colors shrink-0"
              >
                <GraduationCap className="w-4 h-4" />
                Build Transcripts <ChevronRight className="w-4 h-4" />
              </button>
          }
        </div>
      </div>
    </div>
  );
}
