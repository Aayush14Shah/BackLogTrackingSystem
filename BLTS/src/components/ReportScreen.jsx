import React, { useState } from 'react';
import { ArrowLeft, Printer, AlertTriangle, ChevronDown, ChevronUp, BookX } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// ─── Status badge config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
    CLEAR: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    BACKLOG: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    DETAINED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="px-3 py-3 font-semibold">Code</th>
                        <th className="px-3 py-3 font-semibold">Subject Name</th>
                        <th className="px-3 py-3 text-center font-semibold">Credits</th>
                        <th className="px-3 py-3 text-center font-semibold">Theory<br /><span className="font-normal normal-case">/70</span></th>
                        <th className="px-3 py-3 text-center font-semibold">Mid<br /><span className="font-normal normal-case">/30</span></th>
                        <th className="px-3 py-3 text-center font-semibold">Viva<br /><span className="font-normal normal-case">/50</span></th>
                        <th className="px-3 py-3 text-center font-semibold">Total<br /><span className="font-normal normal-case">/150</span></th>
                        <th className="px-3 py-3 text-center font-semibold">T.Grade</th>
                        <th className="px-3 py-3 text-center font-semibold">M.Grade</th>
                        <th className="px-3 py-3 text-center font-semibold">V.Grade</th>
                        <th className="px-3 py-3 text-center font-semibold">Sub Grade</th>
                        <th className="px-3 py-3 text-center font-semibold">GP</th>
                        <th className="px-3 py-3 text-center font-semibold">Comment</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((sub, idx) => (
                        <tr
                            key={idx}
                            className={cn(
                                'border-b last:border-b-0 transition-colors print:border-slate-200',
                                sub.isBacklog
                                    ? 'bg-red-50 hover:bg-red-100'
                                    : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'
                            )}
                        >
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">{sub.code}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[180px]">
                                <span className="block truncate" title={sub.name}>{sub.name || '-'}</span>
                                {sub.isBacklog && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 text-[9px] font-bold uppercase rounded bg-red-200 text-red-800 print:border print:border-red-500">
                                        FAIL
                                    </span>
                                )}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{sub.credits || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-700">{sub.theoryMarks || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-700">{sub.midMarks || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-700">{sub.vivaMarks || '-'}</td>
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-800">{sub.totalMarks || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{sub.theoryGrade || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{sub.midGrade || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{sub.vivaGrade || '-'}</td>
                            <td className={cn(
                                'px-3 py-2.5 text-center font-bold text-base',
                                sub.isBacklog ? 'text-red-700' : 'text-emerald-700'
                            )}>{sub.subGrade || '-'}</td>
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-800">{sub.gradePoint ?? '-'}</td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-500">{sub.comment || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SemesterSection({ sem, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    const semBacklogs = sem.subjects.filter(s => s.isBacklog).length;
    const hasBacklogs = semBacklogs > 0;

    const resultColor = sem.result && sem.result !== '-'
        ? (sem.result.toLowerCase().includes('fail') || sem.result === 'WITHHELD' || sem.result === '-'
            ? 'text-red-600' : 'text-emerald-700')
        : 'text-slate-500';

    return (
        <div className={cn(
            'border rounded-xl overflow-hidden mb-4 print:mb-6 print:border-slate-300',
            hasBacklogs ? 'border-red-200' : 'border-slate-200',
            'shadow-sm print:shadow-none'
        )}>
            {/* Semester header – clickable to expand */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'w-full flex items-center justify-between px-6 py-4 text-left transition-colors print:hidden',
                    hasBacklogs ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
                )}
            >
                <div className="flex items-center gap-3">
                    {hasBacklogs && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className="font-semibold text-slate-800 text-base">
                        Semester {sem.semLabel || sem.semNo}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">{sem.period}</span>
                    {hasBacklogs && (
                        <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold">
                            {semBacklogs} Backlog{semBacklogs > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-500">SPI</p>
                        <p className={cn('font-bold text-lg', sem.spi > 0 ? 'text-blue-700' : 'text-slate-400')}>
                            {sem.spi > 0 ? sem.spi : '-'}
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-500">Credits</p>
                        <p className="font-bold text-lg text-slate-700">{sem.earnedCredits || '-'}</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-500">Result</p>
                        <p className={cn('font-semibold text-sm', resultColor)}>{sem.result || '-'}</p>
                    </div>
                    {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
            </button>

            {/* Print header (always visible in print) */}
            <div className="hidden print:flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Semester {sem.semLabel || sem.semNo}</span>
                    <span className="text-sm text-slate-500">— {sem.period}</span>
                </div>
                <div className="flex items-center gap-6 text-sm font-semibold">
                    <span>SPI: <span className="text-blue-700">{sem.spi || '-'}</span></span>
                    <span>Credits: {sem.earnedCredits || '-'}</span>
                    <span>GP: {sem.gradePoints || '-'}</span>
                    <span className={resultColor}>Result: {sem.result || '-'}</span>
                </div>
            </div>

            {/* Subject table – hidden on screen until expanded; always shown for print */}
            <div className={cn('print:block', open ? 'block' : 'hidden')}>
                <SubjectTable subjects={sem.subjects} semLabel={`Semester ${sem.semLabel || sem.semNo}`} />
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportScreen({ student, onBack }) {
    if (!student) return null;

    const [showAllSems, setShowAllSems] = useState(false);

    const { bg, text, border } = STATUS_CONFIG[student.overallStatus] || STATUS_CONFIG.CLEAR;
    const statusLabel = student.overallStatus === 'BACKLOG'
        ? `BACKLOG (${student.totalActiveBacklogs})`
        : student.overallStatus;

    const activeBlogSems = student.backlogSummary?.filter(b => b.backlogCount > 0) || [];

    // Sort semesters descending for default display (latest first)
    const semsDescending = [...(student.semesters || [])].reverse();
    const latestSem = semsDescending[0];
    const pastSems = semsDescending.slice(1);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">

            {/* ── Top Bar (hidden in print) ─────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Search
                    </button>
                    <button onClick={() => window.print()} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Full Report
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 mt-8 print:mt-0 print:pt-4">

                {/* ── Profile Card ─────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center print:shadow-none print:border-slate-300 print:rounded-none">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">{student.name}</h1>
                        <div className="flex flex-wrap items-center text-slate-600 gap-x-4 gap-y-1.5 text-sm">
                            <span>
                                <span className="text-slate-400 mr-1.5">Enrollment:</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{student.enrollmentNo}</span>
                            </span>
                            {student.branch && (
                                <>
                                    <span className="text-slate-300 hidden md:inline">•</span>
                                    <span className="text-slate-600 max-w-sm truncate">{student.branch}</span>
                                </>
                            )}
                            {latestSem && (
                                <>
                                    <span className="text-slate-300 hidden md:inline">•</span>
                                    <span>Current Sem: <strong>Sem {latestSem.semLabel || latestSem.semNo}</strong></span>
                                </>
                            )}
                        </div>
                        {student.latestResult && student.latestResult !== '-' && (
                            <p className="mt-2 text-sm text-slate-500">
                                Latest Result: <span className="font-semibold text-slate-700">{student.latestResult}</span>
                            </p>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0 shrink-0">
                        <div className={cn('px-6 py-3 rounded-xl border-2 font-bold text-2xl tracking-wide', bg, text, border)}>
                            {statusLabel}
                        </div>
                    </div>
                </div>

                {/* ── Summary Chips ─────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatChip label="Latest SPI" value={student.latestSPI || '-'} />
                    <StatChip label="Total Semesters" value={student.semesters?.length || 0} />
                    <StatChip label="Active Backlogs" value={student.totalActiveBacklogs} alert={student.totalActiveBacklogs > 0} />
                    <StatChip label="Sems w/ Backlog" value={activeBlogSems.length} alert={activeBlogSems.length > 0} />
                </div>

                {/* ── Backlog summary strip (only shown when there are backlogs) ───── */}
                {activeBlogSems.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3">
                        <BookX className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="font-semibold text-amber-800 mr-2">Backlogs summary:</span>
                        {activeBlogSems.map(s => (
                            <span key={s.semester} className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-sm font-medium">
                                Sem {s.semester}: {s.backlogCount} backlog{s.backlogCount > 1 ? 's' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Section header ────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Detailed Marksheets — All Semesters</h2>
                    <span className="text-sm text-slate-500">{student.semesters?.length} semester{student.semesters?.length !== 1 ? 's' : ''} on record</span>
                </div>

                {/* ── Latest semester (always expanded) ────────────────────────────── */}
                {latestSem && (
                    <SemesterSection key={latestSem.semNo} sem={latestSem} defaultOpen={true} />
                )}

                {/* ── Past semesters ────────────────────────────────────────────────── */}
                {pastSems.length > 0 && (
                    <>
                        <button
                            onClick={() => setShowAllSems(s => !s)}
                            className="w-full mb-4 px-6 py-3 flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-white transition-all font-medium print:hidden"
                        >
                            {showAllSems
                                ? <><ChevronUp className="w-4 h-4" /> Hide past semesters</>
                                : <><ChevronDown className="w-4 h-4" /> Show {pastSems.length} past semester{pastSems.length > 1 ? 's' : ''}</>}
                        </button>

                        <div className={cn('print:block', showAllSems ? 'block' : 'hidden')}>
                            {pastSems.map(sem => (
                                <SemesterSection key={sem.semNo} sem={sem} defaultOpen={false} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
