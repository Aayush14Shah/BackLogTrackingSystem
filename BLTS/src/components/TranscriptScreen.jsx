import { useState, useMemo, useRef } from 'react';
import { Search, Printer, ArrowLeft, X, GraduationCap, FileText } from 'lucide-react';
import { cn } from '../utils/cn';

// ─── Roman numeral → integer for sorting ─────────────────────────────────────
const SEM_ORDER = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
function semSortKey(semNo) {
  const u = (semNo || '').trim().toUpperCase();
  if (SEM_ORDER[u]) return SEM_ORDER[u];
  const n = parseInt(u, 10);
  return isNaN(n) ? 99 : n;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
const isFail = (g) => FAIL_GRADES.has((g || '').trim().toUpperCase());

function gradeColor(g) {
  if (!g || g === '-' || g === '—') return 'text-slate-300';
  return isFail(g) ? 'text-red-600 font-bold' : 'text-slate-800 font-semibold';
}

// ─── Transcript document component ───────────────────────────────────────────
function TranscriptDoc({ student }) {
  // Sort attempts by actual semester number (VII < VIII < IX < X)
  const attempts = [...(student.attempts || [])].sort(
    (a, b) => semSortKey(a.semNo) - semSortKey(b.semNo)
  );

  const lastAttempt  = attempts[attempts.length - 1];
  const firstAttempt = attempts[0];
  const cgpa         = lastAttempt?.cgpa || null;
  const classLabel   = lastAttempt?.classification || '';

  const college   = student.college || 'L.J. INSTITUTE OF COMPUTER APPLICATIONS';
  const programme = student.branch  || 'MASTER OF SCIENCE (INFORMATION TECHNOLOGY) INTEGRATED';

  const admYear  = firstAttempt?.period?.match(/\d{4}/)?.[0] || '';
  const compYear = lastAttempt?.period?.match(/\d{4}/)?.[0]  || '';

  return (
    <div
      id="transcript-doc"
      className="bg-white font-sans text-[11px] leading-tight"
      style={{ width: '210mm', minHeight: '297mm', padding: '12mm', boxSizing: 'border-box' }}
    >
      {/* ── Institute header ── */}
      <div className="text-center mb-3 border-b-2 border-slate-800 pb-3">
        <p className="text-[15px] font-bold uppercase tracking-wide text-slate-900">{college}</p>
        <p className="text-[11px] text-slate-600 mt-0.5 uppercase tracking-wider">Academic Transcript</p>
      </div>

      {/* ── Student info block ── */}
      <table className="w-full border border-slate-400 mb-4 text-[10.5px]" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500 w-[22%]">NAME OF STUDENT</td>
            <td className="border border-slate-400 px-2 py-1 font-bold text-slate-900 uppercase w-[28%]">{student.name}</td>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500 w-[22%]">ENROLLMENT NO.</td>
            <td className="border border-slate-400 px-2 py-1 font-bold text-slate-900 w-[28%]">{student.enrollmentNo || '—'}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500">NAME OF SCHOOL</td>
            <td className="border border-slate-400 px-2 py-1 text-slate-800">{college}</td>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500">MEDIUM OF INSTRUCTION</td>
            <td className="border border-slate-400 px-2 py-1 text-slate-800">ENGLISH</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500">PROGRAMME</td>
            <td className="border border-slate-400 px-2 py-1 text-slate-800 uppercase">{programme}</td>
            <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-500">YEAR OF ADMISSION / COMPLETION</td>
            <td className="border border-slate-400 px-2 py-1 text-slate-800">{admYear}{compYear && admYear !== compYear ? ` / ${compYear}` : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Semester blocks ── */}
      {attempts.map((attempt, idx) => (
        <SemesterBlock key={idx} attempt={attempt} />
      ))}

      {/* ── Final certification ── */}
      {cgpa && (
        <div className="mt-4 border border-slate-400 px-3 py-2 text-[10.5px] text-slate-800">
          <p className="font-bold uppercase">
            THIS IS TO CERTIFY THAT {student.name} HAS CLEARED HIS/HER {programme} WITH CGPA OF{' '}
            <span className="text-slate-900">{cgpa}</span>
            {classLabel ? ` (CLASS: ${classLabel.toUpperCase()})` : ''}.
          </p>
        </div>
      )}

      {/* ── Signature row ── */}
      <div className="mt-8 flex justify-between text-[10px] text-slate-500">
        <div className="text-center">
          <div className="border-t border-slate-400 w-40 mt-6 pt-1">VERIFIED BY (NAME &amp; SIGNATURE)</div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 w-40 mt-6 pt-1">DIRECTOR'S SIGNATURE</div>
        </div>
      </div>
    </div>
  );
}

function SemesterBlock({ attempt }) {
  const semLabel = attempt.semNo || `Sem ${attempt.attemptNo}`;

  return (
    <div className="mb-3">
      {/* Semester header */}
      <table className="w-full border border-slate-400 text-[10px]" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr className="bg-slate-100">
            <td className="border border-slate-400 px-2 py-1 font-bold w-[25%]">SEMESTER: {semLabel}</td>
            <td className="border border-slate-400 px-2 py-1 w-[30%]">
              SEAT NO.: <span className="font-semibold">{attempt.seatNo || '—'}</span>
            </td>
            <td className="border border-slate-400 px-2 py-1 w-[20%]">
              CREDIT EARNED: <span className="font-semibold">{attempt.earnedCredits || '—'}</span>
            </td>
            <td className="border border-slate-400 px-2 py-1 w-[12%]">
              GRADE POINT: <span className="font-semibold">{attempt.gradePoints || '—'}</span>
            </td>
            <td className="border border-slate-400 px-2 py-1 w-[13%]">
              SPI: <span className="font-semibold">{attempt.spi || '—'}</span>
            </td>
          </tr>
          {/* Column headers */}
          <tr className="bg-slate-50 text-[9px] font-bold text-slate-600 uppercase">
            <td colSpan={2} className="border border-slate-400 px-2 py-0.5">Course Code and Course Title</td>
            <td className="border border-slate-400 px-2 py-0.5 text-center">Theory<br/>Credit</td>
            <td className="border border-slate-400 px-2 py-0.5 text-center">Theory<br/>Grade</td>
            <td className="border border-slate-400 px-2 py-0.5 text-center">Practical<br/>Credit &amp; Grade</td>
          </tr>
        </tbody>
      </table>

      {/* Subject rows */}
      <table className="w-full border border-slate-400 border-t-0 text-[10px]" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {attempt.subjects?.map((sub, i) => (
            <tr key={i} className={isFail(sub.subGrade) ? 'bg-red-50' : ''}>
              <td className="border border-slate-300 px-2 py-0.5 font-mono text-slate-500 w-[14%]">{sub.code}</td>
              <td className="border border-slate-300 px-2 py-0.5 text-slate-800 w-[46%]">{sub.name || '—'}</td>
              <td className={cn('border border-slate-300 px-2 py-0.5 text-center w-[10%]', gradeColor(sub.subGrade))}>
                {sub.credits || '-'}
              </td>
              <td className={cn('border border-slate-300 px-2 py-0.5 text-center w-[10%]', gradeColor(sub.subGrade))}>
                {sub.subGrade || '-'}
              </td>
              <td className="border border-slate-300 px-2 py-0.5 text-center w-[20%]">
                {sub.vivaCredits != null && sub.vivaCredits > 0
                  ? <span className={gradeColor(sub.vivaGrade)}>{sub.vivaCredits} / {sub.vivaGrade || '-'}</span>
                  : <span className="text-slate-300">-</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Search + Transcript Screen ───────────────────────────────────────────────
export default function TranscriptScreen({ students = [], onBack }) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(null);

  // Sort attempts by semNo for display in search results too
  const sortedAttempts = (s) =>
    [...(s.attempts || [])].sort((a, b) => semSortKey(a.semNo) - semSortKey(b.semNo));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      String(s.enrollmentNo || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [query, students]);

  const handlePrint = () => {
    const content = document.getElementById('transcript-doc');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Transcript — ${selected.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; }
        @page { size: A4; margin: 10mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #94a3b8; padding: 2px 6px; }
        .bg-slate-100 { background: #f1f5f9; }
        .bg-slate-50  { background: #f8fafc; }
        .bg-red-50    { background: #fef2f2; }
        .font-bold    { font-weight: bold; }
        .font-semibold{ font-weight: 600; }
        .text-red-600 { color: #dc2626; }
        .text-slate-300 { color: #cbd5e1; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-800 { color: #1e293b; }
        .text-slate-900 { color: #0f172a; }
        .uppercase { text-transform: uppercase; }
        .text-center { text-align: center; }
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-slate-800">Transcript Generator</span>
            </div>
          </div>
          {selected && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        {!selected && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Generate Transcript</h1>
              <p className="text-slate-500 text-sm mt-1">Search by student name or enrollment number</p>
            </div>

            {/* Info banner */}
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">For a complete all-semester transcript</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                Upload one <span className="font-mono bg-blue-100 px-1 rounded">OR</span> file per semester
                (e.g. OR SEM-7, OR SEM-8, OR SEM-9, OR SEM-10) all at once on the upload screen.
                The transcript will include every semester automatically, sorted by semester number.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type name or enrollment no…"
                className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {results.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(s); setQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {(s.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {s.enrollmentNo}
                        {(() => {
                          const sorted = sortedAttempts(s);
                          const first  = sorted[0]?.semNo;
                          const last   = sorted[sorted.length - 1]?.semNo;
                          if (!first) return null;
                          return ` · Sem ${first}${last && last !== first ? ` → ${last}` : ''}`;
                        })()}
                      </p>
                    </div>
                    <span className={cn(
                      'ml-auto text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                      s.totalActiveBacklogs === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    )}>
                      {s.totalActiveBacklogs === 0 ? 'Clear' : `${s.totalActiveBacklogs} backlog`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-6">No student found matching "{query}"</p>
            )}
          </div>
        )}

        {/* Transcript preview */}
        {selected && (
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 print:hidden">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Search again
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{selected.name}</span>
                <span>·</span>
                {(() => {
                  const sorted = sortedAttempts(selected);
                  const first  = sorted[0]?.semNo;
                  const last   = sorted[sorted.length - 1]?.semNo;
                  return <span>Sem {first}{last && last !== first ? ` → ${last}` : ''} · {sorted.length} semester{sorted.length !== 1 ? 's' : ''}</span>;
                })()}
              </div>
            </div>

            {/* The actual transcript */}
            <div className="shadow-lg rounded-lg overflow-hidden border border-slate-200">
              <TranscriptDoc student={selected} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
