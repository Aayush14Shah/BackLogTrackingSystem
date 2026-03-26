import { cn, isFail, GradeBox } from './shared';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

// Single subject card within an attempt
function SubjectCard({ sub, retained = false }) {
  const fail = sub.isBacklog && !retained;
  const cleared = !sub.isBacklog && !retained;

  return (
    <div className={cn(
      'rounded-lg border p-3 text-sm transition-colors',
      retained ? 'bg-slate-50 border-slate-200 opacity-70'
        : fail  ? 'bg-red-50 border-red-200'
                : 'bg-emerald-50/60 border-emerald-200'
    )}>
      {/* Code + status icon */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="font-mono text-[10px] text-slate-400 leading-tight">{sub.code}</span>
        {retained
          ? <RotateCcw className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
          : fail
            ? <XCircle className="w-3.5 h-3.5 text-[#c0392b] flex-shrink-0 mt-0.5" />
            : <CheckCircle2 className="w-3.5 h-3.5 text-[#1a6b3c] flex-shrink-0 mt-0.5" />
        }
      </div>

      {/* Subject name */}
      <p className={cn(
        'font-medium leading-snug mb-2 text-xs',
        retained ? 'text-slate-500' : fail ? 'text-slate-800' : 'text-slate-800'
      )} title={sub.name}>
        {sub.name || '—'}
      </p>

      {/* Grades row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {sub.subGrade && <GradeBox grade={sub.subGrade} small />}
        {sub.emGrade && sub.emGrade !== sub.subGrade && <GradeBox grade={sub.emGrade} small />}
        {sub.credits > 0 && (
          <span className="text-[10px] text-slate-400 font-mono">{sub.credits}cr</span>
        )}
      </div>

      {/* Marks row */}
      {(sub.theoryMarks || sub.midMarks || sub.vivaMarks) && (
        <div className="mt-1.5 flex gap-2 text-[10px] font-mono text-slate-500">
          {sub.theoryMarks && sub.theoryMarks !== '—' && <span>E:{sub.theoryMarks}</span>}
          {sub.midMarks    && sub.midMarks    !== '—' && <span>M:{sub.midMarks}</span>}
          {sub.vivaMarks   && sub.vivaMarks   !== '—' && <span>V:{sub.vivaMarks}</span>}
        </div>
      )}

      {/* Retained label */}
      {retained && (
        <p className="mt-1 text-[10px] text-slate-400 italic">Retained ✓</p>
      )}

      {/* Comment */}
      {sub.comment && sub.comment !== '—' && !retained && (
        <p className="mt-1 text-[10px] text-slate-500">{sub.comment}</p>
      )}
    </div>
  );
}

export default function SubjectGrid({ subjects = [], subjectHistory = [] }) {
  if (!subjects.length) return (
    <p className="text-sm text-slate-400 italic py-4 text-center">No subject data available.</p>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {subjects.map((sub, i) => {
        // Check if this subject was already cleared in a previous attempt
        const hist = subjectHistory.find(h => h.code === sub.code);
        const retained = hist?.history?.find(h =>
          h.attemptNo === (sub._attemptNo) && h.retained
        );
        return <SubjectCard key={sub.code || i} sub={sub} retained={!!retained} />;
      })}
    </div>
  );
}
