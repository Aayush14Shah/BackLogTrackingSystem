import { useState } from 'react';
import {
  ArrowLeft, Home, Printer, User, BookOpen,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { cn, StatusBadge, ResultChip } from './shared';
import AttemptCard from './AttemptCard';
import BacklogTracker from './BacklogTracker';
import FileAuditPanel from './FileAuditPanel';

function Pill({ label, value, highlight = false }) {
  return (
    <div className={cn(
      'flex flex-col items-center px-4 py-2.5 rounded-xl border',
      highlight ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
    )}>
      <span className={cn(
        'text-2xl font-bold font-mono',
        highlight ? 'text-[#ea580c]' : 'text-slate-800'
      )}>{value ?? '—'}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}

export default function JourneyReport({ student, onBack, onBackToDashboard }) {
  if (!student) return null;

  const firstAttempt = student.attempts?.[0];
  const lastAttempt  = student.attempts?.[student.attempts.length - 1];
  const periodRange  = firstAttempt && lastAttempt && firstAttempt.period !== lastAttempt.period
    ? `${firstAttempt.period} – ${lastAttempt.period}`
    : firstAttempt?.period || '—';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-8 print:pt-4">

        {/* ── Header card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 print:rounded-none print:shadow-none">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              {/* Name */}
              <h1 className="text-3xl font-bold text-slate-900 mb-3 leading-tight text-xl uppercase tracking-wider">
                {student.name}
              </h1>

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Enrollment</span>
                  <p className="font-mono font-semibold text-slate-800">{student.enrollmentNo || '—'}</p>
                </div>
                {student.branch && (
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 text-xs uppercase tracking-wide">Program</span>
                    <p className="font-medium text-slate-700 text-xs leading-snug">{student.branch}</p>
                  </div>
                )}
                {student.semNo && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wide">Semester</span>
                    <p className="font-semibold text-slate-800">{student.semNo}</p>
                  </div>
                )}
                {student.gender && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wide">Gender</span>
                    <p className="font-medium text-slate-700">{student.gender}</p>
                  </div>
                )}
                {student.category && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wide">Category</span>
                    <p className="font-medium text-slate-700">{student.category}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Exam Period</span>
                  <p className="font-medium text-slate-700">{periodRange}</p>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <StatusBadge status={student.overallStatus} count={student.totalActiveBacklogs} />
              {lastAttempt?.result && (
                <ResultChip result={lastAttempt.result} />
              )}
            </div>
          </div>

          {/* Summary pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
            <Pill label="Total Attempts" value={student.totalAttempts} />
            <Pill label="Backlogs Remaining" value={student.totalActiveBacklogs} highlight={student.totalActiveBacklogs > 0} />
            <Pill label="Latest SPI" value={student.latestSPI || '—'} />
            <Pill label="Exam Range" value={student.attempts?.length > 1 ? `${student.attempts.length} cycles` : '1 cycle'} />
          </div>
        </div>

        {/* ── Current backlogs alert ───────────────────────────────────────── */}
        {student.currentBacklogs?.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex flex-wrap items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ea580c] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#ea580c] text-sm mb-2">
                {student.currentBacklogs.length} subject{student.currentBacklogs.length > 1 ? 's' : ''} still uncleared
              </p>
              <div className="flex flex-wrap gap-2">
                {student.currentBacklogs.map(b => (
                  <span key={b.code} className="inline-flex items-center gap-1.5 bg-white border border-orange-200 rounded-lg px-2.5 py-1 text-xs">
                    <span className="font-mono text-slate-500">{b.code}</span>
                    <span className="text-slate-700">{b.name}</span>
                    <span className="font-bold text-[#c0392b]">{b.grade}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {student.totalActiveBacklogs === 0 && student.attempts?.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1a6b3c] flex-shrink-0" />
            <p className="font-semibold text-[#1a6b3c] text-sm">All subjects cleared — no active backlogs.</p>
          </div>
        )}

        {/* ── Attempt Timeline ─────────────────────────────────────────────── */}
        <div className="mb-2">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Academic Journey</h2>
          <p className="text-sm text-slate-500 mb-5">
            {student.attempts?.length} exam attempt{student.attempts?.length !== 1 ? 's' : ''} on record
          </p>

          <div>
            {student.attempts?.map((attempt, idx) => (
              <AttemptCard
                key={attempt.attemptNo}
                attempt={attempt}
                student={student}
                isLast={idx === student.attempts.length - 1}
                subjectHistory={student.subjectHistory}
                defaultOpen={idx === student.attempts.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Backlog tracker table ────────────────────────────────────────── */}
        <BacklogTracker
          subjectHistory={student.subjectHistory}
          attempts={student.attempts}
        />

        {/* ── File audit ──────────────────────────────────────────────────── */}
        <FileAuditPanel sourceFiles={student.sourceFiles} />

      </main>
    </div>
  );
}
