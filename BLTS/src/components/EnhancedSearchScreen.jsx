import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  XCircle,
  AlertTriangle,
  Users,
  CheckCircle,
  ArrowLeft,
  Printer,
  Download
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import StatusBadge from './ui/StatusBadge';
import { exportToExcel } from '../utils/exportUtils';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── Backlog category helpers ─────────────────────────────────────────────────
const BACKLOG_CATEGORIES = [
  { value: 'all',      label: 'All Types',    color: 'slate' },
  { value: 'external', label: 'External',     color: 'red'   },
  { value: 'internal', label: 'Internal',     color: 'amber' },
  { value: 'pra_viva', label: 'Pra / Viva',   color: 'violet' },
];

function getBacklogCategories(student) {
  const cats = new Set();
  student.semesters?.forEach(sem => {
    sem.subjects?.forEach(sub => {
      if (!sub.isBacklog) return;
      const c = (sub.comment || '').trim().toLowerCase();
      if (c === 'external') cats.add('external');
      else if (c === 'internal') cats.add('internal');
      else if (c === 'pra/viva') cats.add('pra_viva');
    });
  });
  return cats;
}

function categoryColorClass(cat) {
  if (cat === 'external') return 'bg-red-100 text-red-700 border-red-200';
  if (cat === 'internal') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (cat === 'pra_viva') return 'bg-violet-100 text-violet-700 border-violet-200';
  return 'bg-slate-100 text-slate-600';
}
function categoryDotClass(cat) {
  if (cat === 'external') return 'bg-red-500';
  if (cat === 'internal') return 'bg-amber-500';
  if (cat === 'pra_viva') return 'bg-violet-500';
  return 'bg-slate-400';
}
function categoryLabel(cat) {
  if (cat === 'external') return 'External';
  if (cat === 'internal') return 'Internal';
  if (cat === 'pra_viva') return 'Pra/Viva';
  return cat;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ filters, onFilterChange, onReset, departments, semesters, dynamicCounts }) {
  
  // As requested, ONLY keep 'All Students' and 'All Clear' in the Status buttons.
  // We handle dashboard-injected filters (detained/backlog) gracefully visually, but they aren't explicit permanent buttons.
  const statusOptions = [
    { value: 'all',      label: 'All Students', icon: Users,          active: 'bg-slate-800 text-white border-slate-800 shadow' },
    { value: 'backlog',  label: 'Backlogs',     icon: AlertTriangle, active: 'bg-amber-500 text-white border-amber-500 shadow' },
    { value: 'detained', label: 'Detained',     icon: XCircle,       active: 'bg-red-600 text-white border-red-600 shadow' },
    { value: 'clear',    label: 'All Clear',    icon: CheckCircle,   active: 'bg-emerald-600 text-white border-emerald-600 shadow' },
  ];



  const activeCount = [
    filters.status !== 'all',
    filters.backlogCategory !== 'all',
    filters.department !== 'all',
    filters.semester !== 'all',
    !!filters.spiMin || !!filters.spiMax,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 print:hidden">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="space-y-4">
        
        {/* Row 1: Status & Category */}
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Status buttons */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Student Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(opt => {
                const Icon = opt.icon;
                const isActive = filters.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onFilterChange('status', opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      isActive ? opt.active : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
              
            </div>
          </div>

          <div className="hidden md:block w-px bg-slate-100 self-stretch" />

          {/* Backlog Type buttons */}
          <div className="flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Backlog Type</p>
            <div className="flex flex-wrap gap-2">
              {BACKLOG_CATEGORIES.map(cat => {
                const isActive = filters.backlogCategory === cat.value;
                // Only show counts if we're not "all clear", otherwise counts are implicitly 0
                const countVal = filters.status === 'clear' ? 0 : dynamicCounts[cat.value];
                const countMatches = cat.value !== 'all' ? countVal : null;

                return (
                  <button
                    key={cat.value}
                    onClick={() => onFilterChange('backlogCategory', cat.value)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all shadow-sm min-w-[110px]',
                      isActive && cat.value === 'all'     ? 'bg-slate-800 text-white border-slate-800' :
                      isActive && cat.value === 'external'? 'bg-red-600 text-white border-red-600' :
                      isActive && cat.value === 'internal'? 'bg-amber-500 text-white border-amber-500' :
                      isActive && cat.value === 'pra_viva'? 'bg-violet-600 text-white border-violet-600' :
                      'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {cat.value !== 'all' && (
                        <span className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          !isActive && cat.value === 'external' ? 'bg-red-500' :
                          !isActive && cat.value === 'internal' ? 'bg-amber-500' :
                          !isActive && cat.value === 'pra_viva' ? 'bg-violet-500' : 'bg-white'
                        )} />
                      )}
                      {cat.label}
                    </div>
                    {/* Explicitly display matching count if not 'All Types' */}
                    {cat.value !== 'all' && (
                      <span className={cn(
                        'text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}>
                        {countMatches}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {filters.status === 'clear' && filters.backlogCategory !== 'all' && (
              <p className="text-[11px] text-amber-600 mt-2 font-medium bg-amber-50 inline-block px-2 py-1 rounded-md">
                No backlogs exist for "All Clear" students.
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Select Dropdowns (Branch, Sem, SPI) */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
          <div className="min-w-[180px]">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Branch</p>
            <select
              value={filters.department}
              onChange={e => onFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 hover:bg-white transition-colors"
            >
              <option value="all">All Branches</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="min-w-[140px]">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Semester</p>
            <select
              value={filters.semester}
              onChange={e => onFilterChange('semester', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 hover:bg-white transition-colors"
            >
              <option value="all">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">SPI Range</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" max="10" step="0.1"
                placeholder="Min"
                value={filters.spiMin || ''}
                onChange={e => onFilterChange('spiMin', e.target.value)}
                className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
              <span className="text-slate-300 font-bold">—</span>
              <input
                type="number" min="0" max="10" step="0.1"
                placeholder="Max"
                value={filters.spiMax || ''}
                onChange={e => onFilterChange('spiMax', e.target.value)}
                className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Print View Header ────────────────────────────────────────────────────────
function PrintHeader({ filters, totalShown, totalAll, fileName }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const activeFilters = [];
  if (filters.status !== 'all') activeFilters.push(`Status: ${filters.status}`);
  if (filters.backlogCategory !== 'all') activeFilters.push(`Backlog Type: ${categoryLabel(filters.backlogCategory)}`);
  if (filters.department !== 'all') activeFilters.push(`Branch: ${filters.department}`);
  if (filters.semester !== 'all') activeFilters.push(`Semester: ${filters.semester}`);
  if (filters.spiMin) activeFilters.push(`SPI ≥ ${filters.spiMin}`);
  if (filters.spiMax) activeFilters.push(`SPI ≤ ${filters.spiMax}`);

  return (
    <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-800">
      <h1 className="text-2xl font-bold text-slate-900 leading-tight">Student Backlog Report</h1>
      {fileName && <p className="text-sm font-medium text-slate-500 mt-1">Source file: {fileName}</p>}
      <div className="flex items-center gap-6 mt-3 text-sm text-slate-700">
        <span>Report generated: <strong>{dateStr}, {timeStr}</strong></span>
        <span>Showing: <strong>{totalShown}</strong> out of <strong>{totalAll}</strong> total students</span>
      </div>
      {activeFilters.length > 0 && (
        <div className="mt-2 text-sm text-slate-600">
          <strong>Applied Filters:</strong> {activeFilters.join(' · ')}
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EnhancedSearchScreen({
  students = [],
  onStudentSelect,
  onResetFile,
  fileName,
  initialFilters = {},
  onBackToDashboard
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',          // 'all', 'clear', 'detained', 'backlog'
    backlogCategory: 'all', // 'all', 'external', 'internal', 'pra_viva'
    department: 'all',
    semester: 'all',
    spiMin: '',
    spiMax: '',
    ...initialFilters       // Injects the dashboard 'status' (e.g. 'detained' or 'backlog') initially
  });

  // Extract unique departments and semesters for the dropdowns
  const departments = useMemo(() => {
    const depts = new Set();
    students.forEach(s => { if (s.branch) depts.add(s.branch); });
    return [...depts].sort();
  }, [students]);

  const semesters = useMemo(() => {
    const sems = new Set();
    students.forEach(s => {
      s.semesters?.forEach(sem => sems.add(`Sem ${sem.semLabel || sem.semNo}`));
    });
    return [...sems].sort((a, b) => parseInt(a.replace('Sem ', '')) - parseInt(b.replace('Sem ', '')));
  }, [students]);

  // 1. BASE LIST: Apply Search, Status, Branch, Sem, SPI (everything EXCEPT Backlog Category)
  // This helps us calculate how many students currently exist for each Backlog Type.
  const baseListForCategoryCounts = useMemo(() => {
    let list = students;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.enrollmentNo && String(s.enrollmentNo).toLowerCase().includes(q))
      );
    }

    if (filters.status !== 'all') {
      list = list.filter(s => {
        if (filters.status === 'clear')    return s.totalActiveBacklogs === 0;
        if (filters.status === 'backlog')  return s.totalActiveBacklogs > 0;
        if (filters.status === 'detained') return s.overallStatus === 'DETAINED';
        return true;
      });
    }

    if (filters.department !== 'all') {
      list = list.filter(s => s.branch === filters.department);
    }

    if (filters.semester !== 'all') {
      list = list.filter(s =>
        s.semesters?.some(sem => `Sem ${sem.semLabel || sem.semNo}` === filters.semester)
      );
    }

    if (filters.spiMin || filters.spiMax) {
      list = list.filter(s => {
        const spi = s.latestSPI;
        if (spi === undefined || spi === null || isNaN(spi)) return false;
        if (filters.spiMin && spi < parseFloat(filters.spiMin)) return false;
        if (filters.spiMax && spi > parseFloat(filters.spiMax)) return false;
        return true;
      });
    }

    return list;
  }, [students, searchTerm, filters.status, filters.department, filters.semester, filters.spiMin, filters.spiMax]);

  // 2. DYNAMIC COUNTS: Accurately calculate exactly how many matching students there are for each Backlog Type
  const dynamicCounts = useMemo(() => {
    const counts = { external: 0, internal: 0, pra_viva: 0 };
    baseListForCategoryCounts.forEach(s => {
      const cats = getBacklogCategories(s);
      if (cats.has('external')) counts.external++;
      if (cats.has('internal')) counts.internal++;
      if (cats.has('pra_viva')) counts.pra_viva++;
    });
    return counts;
  }, [baseListForCategoryCounts]);

  // 3. FINAL LIST: Apply the Backlog Category filter strictly.
  // IMPORTANT: The count in the pill and the length of this final list MUST be exactly identical.
  const filteredStudents = useMemo(() => {
    let list = baseListForCategoryCounts;
    if (filters.backlogCategory !== 'all') {
      list = list.filter(s => getBacklogCategories(s).has(filters.backlogCategory));
    }
    return list;
  }, [baseListForCategoryCounts, filters.backlogCategory]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      // 1. If clicking "External" (a backlog type), AND the overall Status is "All Clear",
      // the result would be 0 permanently. We should auto-reset Status to "All Students".
      if (key === 'backlogCategory' && value !== 'all' && prev.status === 'clear') {
        return { ...prev, [key]: value, status: 'all' };
      }
      
      // 2. If clicking "All Clear", AND a backlog type is selected, auto-reset the Backlog Type filter.
      if (key === 'status' && value === 'clear' && prev.backlogCategory !== 'all') {
        return { ...prev, [key]: value, backlogCategory: 'all' };
      }

      // 3. Otherwise, just apply normally.
      return { ...prev, [key]: value };
    });
  };

  const handleResetFilters = () => {
    setFilters({ status: 'all', backlogCategory: 'all', department: 'all', semester: 'all', spiMin: '', spiMax: '' });
    setSearchTerm('');
  };

  const handlePrint = () => window.print();

  const handleExport = async () => {
    await exportToExcel(filteredStudents, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:m-0 print:p-0">

      {/* ── Print styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:table-cell { display: table-cell !important; }
          .print\\:block { display: block !important; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onBackToDashboard}
              className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors gap-1.5 shrink-0 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-6 bg-slate-200 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 text-lg leading-tight">Student Directory</h1>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                {filteredStudents.length} Students Listed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {fileName && (
              <div className="hidden lg:flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full gap-1.5 border border-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate max-w-[200px]">{fileName}</span>
              </div>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-200"
              title="Export exact list to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export List</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow focus:ring-2 focus:ring-blue-500"
              title="Print exact filtered list"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Exact List</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-none">

        {/* ── Print-only header ─────────────────────────────────────────────── */}
        <PrintHeader
          filters={filters}
          totalShown={filteredStudents.length}
          totalAll={students.length}
          fileName={fileName}
        />

        {/* ── Search Bar ───────────────────────────────────────────────────── */}
        <div className="relative mb-5 print:hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="block w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
            placeholder="Search student by name or enrollment number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-colors"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Filters (always visible) ──────────────────────────────────────── */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          departments={departments}
          semesters={semesters}
          dynamicCounts={dynamicCounts}
        />

        {/* ── Students Table ────────────────────────────────────────────────── */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center shadow-sm print:hidden">
            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4 border border-slate-100">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-700">No students match</p>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              We couldn't find any students matching exactly all those active filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Clear Search & Filters
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider print:bg-white print:text-black print:border-b-2">
                    <th className="px-5 py-4">Student Information</th>
                    <th className="px-5 py-4 hidden sm:table-cell print:table-cell">Branch</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 hidden md:table-cell print:table-cell">Backlog Categories</th>
                    <th className="px-5 py-4 text-center hidden lg:table-cell print:table-cell w-[100px]">SPI</th>
                    <th className="px-5 py-4 text-center hidden lg:table-cell print:table-cell w-[100px]">Sem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, i) => {
                    const cats = getBacklogCategories(student);
                    const isOdd = i % 2 !== 0;

                    return (
                      <tr
                        key={`${student.enrollmentNo}-${student.name}-${i}`}
                        onClick={() => onStudentSelect(student)}
                        className={cn(
                          'cursor-pointer border-b border-slate-100 transition-colors group print:border-slate-200 print:break-inside-avoid print:bg-white',
                          isOdd ? 'bg-slate-50/50' : 'bg-white',
                          'hover:bg-blue-50/60'
                        )}
                      >
                        {/* Name + enrollment */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold print:hidden',
                              student.overallStatus === 'DETAINED' ? 'bg-red-100 text-red-700' :
                              student.overallStatus === 'BACKLOG'  ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            )}>
                              {(student.name || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-[13.5px] group-hover:text-blue-700 transition-colors print:text-[12px] truncate max-w-[200px] sm:max-w-none">
                                {student.name}
                              </p>
                              <p className="text-[11.5px] text-slate-500 font-mono mt-0.5">{student.enrollmentNo}</p>
                            </div>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="px-5 py-4 text-[13px] text-slate-600 hidden sm:table-cell font-medium print:table-cell print:text-[11px]">
                          <span className="truncate max-w-[160px] block">{student.branch || '—'}</span>
                        </td>

                        {/* Status (Badge) */}
                        <td className="px-5 py-4 print:align-middle print:pl-5">
                          <StatusBadge status={student.overallStatus} count={student.totalActiveBacklogs} />
                        </td>

                        {/* Backlog categories */}
                        <td className="px-5 py-4 hidden md:table-cell print:table-cell">
                          {cats.size === 0 ? (
                            <span className="text-[11.5px] text-slate-300 font-medium">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {[...cats].map(cat => (
                                <span
                                  key={cat}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-md border tracking-wide uppercase',
                                    categoryColorClass(cat),
                                    'print:border-slate-300 print:text-slate-800 print:bg-transparent print:rounded-none'
                                  )}
                                >
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 print:hidden', categoryDotClass(cat))} />
                                  {categoryLabel(cat)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* SPI */}
                        <td className="px-5 py-4 text-[13.5px] text-slate-700 text-center hidden lg:table-cell print:table-cell print:text-[12px]">
                          <span className={cn(
                            'font-bold',
                            student.latestSPI >= 8 ? 'text-emerald-600 print:text-slate-800' :
                            student.latestSPI >= 6 ? 'text-blue-600 print:text-slate-800' :
                            student.latestSPI > 0  ? 'text-amber-600 print:text-slate-800' : 'text-slate-400'
                          )}>
                            {student.latestSPI || '—'}
                          </span>
                        </td>

                        {/* Sem */}
                        <td className="px-5 py-4 text-xs text-slate-500 font-bold text-center hidden lg:table-cell print:table-cell print:text-[12px]">
                          {student.latestSemNo ? `Sem ${student.latestSemNo}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between text-[11.5px] font-bold text-slate-400 uppercase tracking-widest print:hidden">
              <span>End of list</span>
              <span className="text-slate-600 bg-slate-200 px-2 py-1 rounded-md">{filteredStudents.length} Matching Student(s)</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
