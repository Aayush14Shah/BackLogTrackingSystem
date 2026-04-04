import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, MapPin, Calendar, FileDown } from 'lucide-react';
import { cn, ResultChip, GradeBox, isFail } from './shared';
import SubjectGrid from './SubjectGrid';
import { downloadProvisionalMarksheet } from '../../utils/exportUtils';

const ATTEMPT_COLORS = {
  PASS:     { line: 'bg-[#1a6b3c]', dot: 'bg-[#1a6b3c]', card: 'border-l-[#1a6b3c]' },
  PROMOTED: { line: 'bg-[#1a4a7a]', dot: 'bg-[#1a4a7a]', card: 'border-l-[#1a4a7a]' },
  FAIL:     { line: 'bg-[#c0392b]', dot: 'bg-[#c0392b]', card: 'border-l-[#c0392b]' },
  DEFAULT:  { line: 'bg-slate-400',  dot: 'bg-slate-400',  card: 'border-l-slate-400'  },
};

function getColors(result) {
  const r = (result || '').toLowerCase();
  if (/^pass/.test(r))    return ATTEMPT_COLORS.PASS;
  if (/promoted/.test(r)) return ATTEMPT_COLORS.PROMOTED;
  if (/fail/.test(r))     return ATTEMPT_COLORS.FAIL;
  return ATTEMPT_COLORS.DEFAULT;
}

export default function AttemptCard({ attempt, student, isLast, subjectHistory, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = getColors(attempt.result);
  const failCount = attempt.subjects.filter(s => s.isBacklog).length;
  const passCount = attempt.subjects.length - failCount;

  // Tag subjects with their attemptNo for retained detection
  const taggedSubjects = attempt.subjects.map(s => ({ ...s, _attemptNo: attempt.attemptNo }));

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 ring-4 ring-slate-50', colors.dot)}>
          {attempt.attemptNo}
        </div>
        {!isLast && <div className={cn('w-0.5 flex-1 mt-1', colors.line, 'opacity-30')} style={{ minHeight: 24 }} />}
      </div>

      {/* Card */}
      <div className={cn(
        'flex-1 mb-6 bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm overflow-hidden',
        colors.card
      )}>
        {/* Header — always visible */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Left */}
            <div>
              <p className="text-base font-bold text-slate-800 mb-0.5 uppercase tracking-wide">
                {attempt.label}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {attempt.period || '—'}
                </span>
                {attempt.seatNo && (
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3" />
                    {attempt.seatNo}
                  </span>
                )}
              </div>
            </div>

            {/* Right: result + stats */}
            <div className="flex items-center gap-3 flex-wrap">
              {attempt.spi > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">SPI</p>
                  <p className="font-mono font-bold text-slate-800">{attempt.spi}</p>
                </div>
              )}
              {attempt.earnedCredits > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Credits</p>
                  <p className="font-mono font-bold text-slate-800">
                    {attempt.earnedCredits}
                    {attempt.totalCredits > 0 && <span className="text-slate-400 font-normal">/{attempt.totalCredits}</span>}
                  </p>
                </div>
              )}
              <ResultChip result={attempt.result} />
              {/* Provisional Marksheet button */}
              {student && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); downloadProvisionalMarksheet(student, attempt); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors shadow-sm"
                  title="Download Provisional Marksheet for this attempt"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Marksheet
                </button>
              )}
              <div className="text-slate-400">
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {/* Backlog/cleared summary pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {failCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-[#c0392b] border border-red-200">
                <XCircle className="w-3 h-3" />
                {failCount} not cleared
              </span>
            )}
            {passCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-[#1a6b3c] border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {passCount} cleared
              </span>
            )}
            {attempt.cleared.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                ✓ {attempt.cleared.length} confirmed cleared this attempt
              </span>
            )}
          </div>
        </button>

        {/* Expanded: subject grid */}
        {open && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-4 mb-3">
              Subjects
            </p>
            <SubjectGrid subjects={taggedSubjects} subjectHistory={subjectHistory} />

            {/* Backlog detail banner */}
            {failCount > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-xs font-semibold text-[#ea580c] mb-2">
                  Subjects not cleared this attempt:
                </p>
                <div className="flex flex-wrap gap-2">
                  {attempt.subjects.filter(s => s.isBacklog).map(s => (
                    <div key={s.code} className="flex items-center gap-1.5 bg-white border border-orange-200 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-[10px] text-slate-500">{s.code}</span>
                      <span className="text-xs text-slate-700 max-w-[120px] truncate">{s.name}</span>
                      <GradeBox grade={s.subGrade || s.emGrade} small />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
