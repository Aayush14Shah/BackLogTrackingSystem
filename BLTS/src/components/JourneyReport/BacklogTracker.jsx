import { cn, GradeBox, isFail } from './shared';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';

export default function BacklogTracker({ subjectHistory = [], attempts = [] }) {
  if (!subjectHistory.length || !attempts.length) return null;

  // Only show subjects that had at least one backlog
  const backlogSubjects = subjectHistory.filter(s =>
    s.history.some(h => h.isBacklog)
  );
  if (!backlogSubjects.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-slate-800 mb-1">
        Subject-wise Backlog Tracker
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Grade progression per subject across all attempts. Highlighted cells show failed grades.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide min-w-[80px]">
                Code
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide min-w-[160px]">
                Subject
              </th>
              {attempts.map(a => (
                <th key={a.attemptNo} className="px-3 py-3 text-center font-semibold text-xs min-w-[110px]">
                  <div className="text-white/90">A{a.attemptNo}</div>
                  <div className="text-white/50 font-normal text-[10px] mt-0.5">{a.period}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wide min-w-[100px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {backlogSubjects.map((sub, idx) => {
              const isCleared = sub.isCurrentlyCleared;
              return (
                <tr
                  key={sub.code}
                  className={cn(
                    'border-b border-slate-100 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                    !isCleared && 'bg-red-50/30'
                  )}
                >
                  {/* Code */}
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {sub.code}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-xs leading-snug">{sub.name}</p>
                  </td>

                  {/* One cell per attempt */}
                  {attempts.map(a => {
                    const h = sub.history.find(hh => hh.attemptNo === a.attemptNo);
                    if (!h) {
                      return (
                        <td key={a.attemptNo} className="px-3 py-3 text-center">
                          <span className="text-slate-300 text-xs">—</span>
                        </td>
                      );
                    }
                    if (h.retained) {
                      return (
                        <td key={a.attemptNo} className="px-3 py-3 text-center bg-slate-50">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-slate-400 italic">Retained</span>
                            <GradeBox grade={h.grade} small />
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={a.attemptNo}
                        className={cn(
                          'px-3 py-3 text-center',
                          h.isBacklog ? 'bg-red-50' : 'bg-emerald-50/40'
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <GradeBox grade={h.grade} small />
                          {h.totalMarks && h.totalMarks !== '—' && (
                            <span className="font-mono text-[10px] text-slate-400">{h.totalMarks}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Final status */}
                  <td className="px-4 py-3 text-center">
                    {isCleared ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a6b3c] bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Cleared
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c0392b] bg-red-100 px-2 py-1 rounded-full border border-red-200">
                        <XCircle className="w-3 h-3" />
                        Uncleared
                      </span>
                    )}
                    {sub.clearedAtAttempt && (
                      <p className="text-[10px] text-slate-400 mt-0.5">A{sub.clearedAtAttempt}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
