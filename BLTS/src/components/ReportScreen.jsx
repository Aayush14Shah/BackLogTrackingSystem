import React, { useState } from 'react';
import {
    ArrowLeft, Printer, AlertTriangle, ChevronDown, ChevronUp,
    BookX, ShieldAlert, Info, CheckCircle2, XCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    CLEAR: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    BACKLOG: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    DETAINED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

// ─── Data Quality Warnings ───────────────────────────────────────────────────
function DataWarningsPanel({ warnings = [] }) {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="mt-10 print:mt-6 border-t border-slate-200 pt-6" id="data-warnings">
            <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">File Warnings</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                    {warnings.length}
                </span>
            </div>

            <div className="flex flex-col gap-2">
                {warnings.map((w, i) => {
                    const isWarning = w.severity !== 'info';
                    return (
                        <div
                            key={i}
                            className={cn(
                                'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm',
                                isWarning
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-blue-50 border-blue-200 text-blue-900'
                            )}
                        >
                            {isWarning
                                ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                : <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />}
                            <span className="leading-relaxed">{w.message}</span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-2 text-xs text-slate-400 italic">
                These are file-level notices only. The marks and grades shown above are accurate and taken directly from the source files.
            </p>
        </div>
    );
}

// ─── Summary chip ─────────────────────────────────────────────────────────────
function StatChip({ label, value, alert = false }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:shadow-none print:border-slate-300">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <span className={cn('text-3xl font-bold tracking-tight', alert ? 'text-red-600' : 'text-slate-800')}>
                {value ?? '-'}
            </span>
        </div>
    );
}

// ─── Subject mark cell — shows value; greyed out if empty/zero-and-not-graded ─
function MarkCell({ val, max, bold = false }) {
    const display = val === '' || val === '-' || val === undefined || val === null ? '—' : val;
    const isEmpty = display === '—';
    return (
        <td className={cn(
            'px-3 py-2.5 text-center tabular-nums',
            isEmpty ? 'text-slate-300' : bold ? 'font-semibold text-slate-800' : 'text-slate-700'
        )}>
            {display}
            {!isEmpty && max && (
                <span className="text-slate-400 text-[10px] font-normal">/{max}</span>
            )}
        </td>
    );
}

function GradeCell({ grade, isSubGrade = false }) {
    const g = (grade || '').trim();
    if (!g || g === '-') return <td className="px-3 py-2.5 text-center text-slate-300">—</td>;
    const isFail = ['F', 'FF', 'I', 'W', 'AB'].includes(g.toUpperCase());
    return (
        <td className={cn(
            'px-3 py-2.5 text-center',
            isSubGrade ? 'font-bold text-base' : 'font-medium',
            isFail ? 'text-red-700' : isSubGrade ? 'text-emerald-700' : 'text-slate-700'
        )}>
            {g}
        </td>
    );
}

// ─── Subject table (per semester) ────────────────────────────────────────────
function SubjectTable({ subjects = [], semLabel }) {
    if (!subjects.length) {
        return (
            <div className="py-10 text-center text-slate-400 italic text-sm">
                No subject data available for {semLabel}.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    {/* Row 1 – Column group labels */}
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-white bg-slate-600">
                        <th colSpan={2} className="px-3 py-2 text-left">Subject</th>
                        <th colSpan={5} className="px-3 py-2 text-center border-l border-slate-500">
                            Marks — Theory / Mid / Viva (each out of 50)
                        </th>
                        <th colSpan={4} className="px-3 py-2 text-center border-l border-slate-500">
                            Component Grades
                        </th>
                        <th colSpan={3} className="px-3 py-2 text-center border-l border-slate-500">
                            Final Result
                        </th>
                        <th className="px-3 py-2 text-center border-l border-slate-500">Remarks</th>
                    </tr>
                    {/* Row 2 – individual column headers */}
                    <tr className="text-xs uppercase tracking-wide text-slate-500 border-b-2 border-slate-200 bg-slate-50">
                        <th className="px-3 py-2.5 font-semibold text-left">Code</th>
                        <th className="px-3 py-2.5 font-semibold text-left min-w-[160px]">Subject Name</th>
                        <th className="px-3 py-2.5 font-semibold text-center border-l border-slate-200">Credits</th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                            Theory<br /><span className="font-normal normal-case text-slate-400">/50</span>
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                            Mid<br /><span className="font-normal normal-case text-slate-400">/50</span>
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                            Viva<br /><span className="font-normal normal-case text-slate-400">/50</span>
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                            Total<br /><span className="font-normal normal-case text-slate-400">/150</span>
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center border-l border-slate-200">T. Grade</th>
                        <th className="px-3 py-2.5 font-semibold text-center">M. Grade</th>
                        <th className="px-3 py-2.5 font-semibold text-center">V. Grade</th>
                        <th className="px-3 py-2.5 font-semibold text-center">Sub Grade</th>
                        <th className="px-3 py-2.5 font-semibold text-center border-l border-slate-200">GP</th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                            EM Cr<br /><span className="font-normal normal-case text-slate-400">Credits</span>
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">EM Grade</th>
                        <th className="px-3 py-2.5 font-semibold text-center border-l border-slate-200">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((sub, idx) => {
                        const isFail = sub.isBacklog;
                        return (
                            <tr key={idx} className={cn('border-b transition-colors print:border-slate-200',
                                isFail ? 'bg-red-50 hover:bg-red-100/80'
                                    : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-50')}>

                                {/* Code */}
                                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{sub.code}</td>

                                {/* Subject name + badge */}
                                <td className="px-3 py-2.5">
                                    <p className="font-medium text-slate-800 leading-snug" title={sub.name}>{sub.name || '—'}</p>
                                    {isFail && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mt-0.5 text-[9px] font-bold uppercase rounded bg-red-200 text-red-800">
                                            <XCircle className="w-2.5 h-2.5" /> Not Cleared
                                        </span>
                                    )}
                                </td>

                                {/* Credits — marks group start */}
                                <td className="px-3 py-2.5 text-center border-l border-slate-100">
                                    <span className="font-semibold text-slate-700">{sub.credits || '—'}</span>
                                    {sub.credits ? <span className="text-[10px] text-slate-400 ml-0.5">cr</span> : ''}
                                </td>

                                <MarkCell val={sub.theoryMarks} />
                                <MarkCell val={sub.midMarks} />
                                <MarkCell val={sub.vivaMarks} />
                                <MarkCell val={sub.totalMarks} bold />

                                {/* Grades group — border left on first cell */}
                                <td className="border-l border-slate-100 p-0"><GradeCell grade={sub.theoryGrade} /></td>
                                <GradeCell grade={sub.midGrade} />
                                <GradeCell grade={sub.vivaGrade} />
                                <GradeCell grade={sub.subGrade} isSubGrade />

                                {/* Final result group — border left */}
                                <td className="px-3 py-2.5 text-center font-semibold text-slate-800 tabular-nums border-l border-slate-100">
                                    {sub.gradePoint !== null && sub.gradePoint !== undefined && sub.gradePoint !== '' ? sub.gradePoint : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-700 font-medium tabular-nums">
                                    {sub.emCredits != null ? <>{sub.emCredits}<span className="text-[10px] text-slate-400 ml-0.5">cr</span></> : '—'}
                                </td>
                                <GradeCell grade={sub.emGrade} isSubGrade />

                                {/* Remarks */}
                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 border-l border-slate-100">{sub.comment || '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── One semester accordion block ─────────────────────────────────────────────
function SemesterSection({ sem, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    const failCount = sem.subjects.filter(s => s.isBacklog).length;
    const passCount = sem.subjects.length - failCount;
    const resultColor =
        sem.result && !sem.result.toLowerCase().includes('fail') && sem.result !== '-'
            ? 'text-emerald-700'
            : sem.result
                ? 'text-red-600'
                : 'text-slate-400';

    return (
        <div className={cn(
            'rounded-xl overflow-hidden mb-5 print:mb-6 shadow-sm print:shadow-none',
            'border print:border-slate-300',
            failCount > 0 ? 'border-red-200' : 'border-slate-200'
        )}>
            {/* ── Clickable header (screen only) ── */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'w-full flex items-center justify-between px-5 py-4 text-left transition-colors print:hidden',
                    failCount > 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
                )}
            >
                {/* Left: label + pills */}
                <div className="flex items-center gap-3 flex-wrap">
                    {failCount > 0
                        ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}

                    <span className="font-bold text-slate-800 text-base">
                        Semester {sem.semLabel || sem.semNo}
                    </span>

                    {sem.period && (
                        <span className="text-xs text-slate-400 font-normal">{sem.period}</span>
                    )}

                    {failCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold">
                            {failCount} subject{failCount > 1 ? 's' : ''} not cleared
                        </span>
                    )}
                    {passCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                            {passCount} cleared
                        </span>
                    )}
                </div>

                {/* Right: SPI / Credits / Result */}
                <div className="flex items-center gap-5 shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">SPI</p>
                        <p className={cn('font-bold text-lg', sem.spi > 0 ? 'text-blue-700' : 'text-slate-300')}>
                            {sem.spi > 0 ? sem.spi : '—'}
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Credits</p>
                        <p className="font-bold text-lg text-slate-700">
                            {sem.earnedCredits || '—'}
                            {sem.totalCredits > 0 && (
                                <span className="text-slate-400 font-normal text-sm">/{sem.totalCredits}</span>
                            )}
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Result</p>
                        <p className={cn('font-semibold text-sm', resultColor)}>{sem.result || '—'}</p>
                    </div>
                    <div className="text-slate-400">
                        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>
            </button>

            {/* ── Print-always-visible header ── */}
            <div className="hidden print:flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <span className="font-bold text-slate-800">
                    Semester {sem.semLabel || sem.semNo}
                    {sem.period && <span className="font-normal text-slate-500 ml-2 text-sm">— {sem.period}</span>}
                </span>
                <div className="flex items-center gap-5 text-sm font-semibold">
                    <span>SPI: <span className="text-blue-700">{sem.spi || '—'}</span></span>
                    <span>Credits: {sem.earnedCredits || '—'}/{sem.totalCredits || '?'}</span>
                    <span>Grade Points: {sem.gradePoints || '—'}</span>
                    <span className={resultColor}>{sem.result || '—'}</span>
                </div>
            </div>

            {/* ── Subject table (collapsible on screen, always shown in print) ── */}
            <div className={cn('print:block', open ? 'block' : 'hidden')}>
                <SubjectTable
                    subjects={sem.subjects}
                    semLabel={`Semester ${sem.semLabel || sem.semNo}`}
                />

                {/* Semester footer summary */}
                {sem.subjects.length > 0 && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                        <span><strong>{sem.subjects.length}</strong> subjects total</span>
                        <span className="text-emerald-700"><strong>{passCount}</strong> cleared</span>
                        {failCount > 0 && (
                            <span className="text-red-600"><strong>{failCount}</strong> not cleared</span>
                        )}
                        {sem.gradePoints > 0 && (
                            <span>Grade Points: <strong>{sem.gradePoints}</strong></span>
                        )}
                        {sem.classification && (
                            <span>Class: <strong>{sem.classification}</strong></span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Report Screen ───────────────────────────────────────────────────────
export default function ReportScreen({ student, onBack }) {
    if (!student) return null;

    const [showPastSems, setShowPastSems] = useState(false);

    const { bg, text, border } = STATUS_CONFIG[student.overallStatus] || STATUS_CONFIG.CLEAR;
    const statusLabel = student.overallStatus === 'BACKLOG'
        ? `BACKLOG (${student.totalActiveBacklogs})`
        : student.overallStatus;

    const activeBlogSems = student.backlogSummary?.filter(b => b.backlogCount > 0) || [];

    // Latest semester = highest semNo; past = everything else, descending
    const semsDesc = [...(student.semesters || [])].reverse();
    const latestSem = semsDesc[0];
    const pastSems = semsDesc.slice(1);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">

            {/* ── Top bar ───────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Search
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors">
                        <Printer className="w-4 h-4" />
                        Print Full Report
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 mt-8 print:mt-0 print:pt-4">

                {/* ── Profile card ──────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center print:shadow-none print:border-slate-300 print:rounded-none">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">{student.name}</h1>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                            <span>
                                <span className="text-slate-400 mr-1">Enrollment:</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{student.enrollmentNo}</span>
                            </span>
                            {student.branch && <span className="text-slate-600 max-w-sm truncate">{student.branch}</span>}
                            {latestSem && (
                                <span>
                                    Latest Semester: <strong>Sem {latestSem.semLabel || latestSem.semNo}</strong>
                                </span>
                            )}
                        </div>
                        {student.latestResult && student.latestResult !== '-' && (
                            <p className="mt-2 text-sm text-slate-500">
                                Latest Result: <span className="font-semibold text-slate-700">{student.latestResult}</span>
                            </p>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0 shrink-0">
                        <div className={cn('px-6 py-3 rounded-xl border-2 font-bold text-2xl tracking-wide text-center', bg, text, border)}>
                            {statusLabel}
                        </div>
                    </div>
                </div>

                {/* ── Summary chips ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatChip label="Latest SPI" value={student.latestSPI || '—'} />
                    <StatChip label="Semesters on Record" value={student.semesters?.length || 0} />
                    <StatChip label="Active Backlogs" value={student.totalActiveBacklogs} alert={student.totalActiveBacklogs > 0} />
                    <StatChip label="Sems with Backlog" value={activeBlogSems.length} alert={activeBlogSems.length > 0} />
                </div>

                {/* ── Backlog summary strip ─────────────────────────────────── */}
                {activeBlogSems.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3">
                        <BookX className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-800 text-sm">Backlog summary:</span>
                        {activeBlogSems.map(s => (
                            <span key={s.semester} className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-sm font-medium">
                                Sem {s.semester}: {s.backlogCount} backlog{s.backlogCount > 1 ? 's' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Section title ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800">Full Semester Records</h2>
                    <span className="text-sm text-slate-400">
                        {student.semesters?.length} semester{student.semesters?.length !== 1 ? 's' : ''} found
                    </span>
                </div>

                {/* ── Latest semester — always expanded ─────────────────────── */}
                {latestSem && (
                    <SemesterSection key={latestSem.semNo} sem={latestSem} defaultOpen={true} />
                )}

                {/* ── Past semesters toggle ─────────────────────────────────── */}
                {pastSems.length > 0 && (
                    <>
                        <button
                            onClick={() => setShowPastSems(v => !v)}
                            className="w-full mb-5 px-6 py-3 flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-white transition-all font-medium text-sm print:hidden"
                        >
                            {showPastSems
                                ? <><ChevronUp className="w-4 h-4" /> Hide past semesters</>
                                : <><ChevronDown className="w-4 h-4" /> Show {pastSems.length} earlier semester{pastSems.length > 1 ? 's' : ''}</>}
                        </button>

                        {/* Print always shows all; on screen shows only when toggled */}
                        <div className={cn('print:block', showPastSems ? 'block' : 'hidden')}>
                            {pastSems.map(sem => (
                                <SemesterSection key={sem.semNo} sem={sem} defaultOpen={false} />
                            ))}
                        </div>
                    </>
                )}

                {/* ── Data quality warnings ─────────────────────────────────── */}
                <DataWarningsPanel warnings={student.dataWarnings} />

            </main>
        </div>
    );
}
