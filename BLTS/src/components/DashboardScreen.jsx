import React, { useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  BookOpen,
  FileSpreadsheet,
  Search,
  Download,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  BookX,
  BarChart2,
  Upload
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import { masterExport } from '../utils/masterExport';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function ActionButton({ icon: Icon, label, sublabel, onClick, variant = 'default', badge, badgeColor = 'red' }) {
  const variants = {
    default: 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700',
    blue: 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white',
    amber: 'bg-amber-500 border-amber-500 hover:bg-amber-600 text-white',
    red: 'bg-red-600 border-red-600 hover:bg-red-700 text-white',
    emerald: 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white',
    violet: 'bg-violet-600 border-violet-600 hover:bg-violet-700 text-white',
    slate: 'bg-slate-700 border-slate-700 hover:bg-slate-800 text-white',
  };

  const badgeColors = {
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-400 text-amber-900',
    blue: 'bg-blue-400 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-1.5 px-5 py-4 rounded-xl border shadow-sm',
        'transition-all duration-150 active:scale-95 text-left w-full',
        variants[variant]
      )}
    >
      {/* Badge */}
      {badge !== undefined && badge !== null && (
        <span className={cn(
          'absolute top-3 right-3 min-w-[22px] h-[22px] flex items-center justify-center',
          'text-[11px] font-bold rounded-full px-1.5',
          badgeColors[badgeColor]
        )}>
          {badge}
        </span>
      )}

      <div className={cn(
        'p-2 rounded-lg mb-0.5',
        variant === 'default' ? 'bg-slate-100' : 'bg-white/20'
      )}>
        <Icon className="w-5 h-5" />
      </div>

      <span className="font-semibold text-sm leading-tight pr-6">{label}</span>
      {sublabel && (
        <span className={cn(
          'text-[11px] leading-tight',
          variant === 'default' ? 'text-slate-400' : 'text-white/70'
        )}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, color = 'blue', trend, subtext }) {
  const colorMap = {
    blue:   { ring: 'bg-blue-50 border-blue-200',   icon: 'text-blue-600',   val: 'text-blue-700' },
    green:  { ring: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', val: 'text-emerald-700' },
    amber:  { ring: 'bg-amber-50 border-amber-200', icon: 'text-amber-600',  val: 'text-amber-700' },
    red:    { ring: 'bg-red-50 border-red-200',     icon: 'text-red-600',    val: 'text-red-700' },
    purple: { ring: 'bg-purple-50 border-purple-200', icon: 'text-purple-600', val: 'text-purple-700' },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4">
      <div className={cn('p-3 rounded-xl border shrink-0', c.ring)}>
        <Icon className={cn('w-6 h-6', c.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={cn('text-3xl font-bold leading-none', c.val)}>{value}</p>
        {(trend || subtext) && (
          <p className="text-xs text-slate-400 mt-1">{trend || subtext}</p>
        )}
      </div>
    </div>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────
function AlertStrip({ alerts }) {
  if (!alerts.length) return null;
  const iconMap = { critical: XCircle, warning: AlertTriangle, info: CheckCircle };
  const colorMap = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning:  'bg-amber-50 border-amber-200 text-amber-800',
    info:     'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const iconColorMap = { critical: 'text-red-500', warning: 'text-amber-500', info: 'text-emerald-500' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {alerts.map((alert, i) => {
        const Icon = iconMap[alert.type] || AlertTriangle;
        return (
          <div key={i} className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border text-sm', colorMap[alert.type])}>
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', iconColorMap[alert.type])} />
            <div>
              <p className="font-semibold text-[13px]">{alert.title}</p>
              <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{alert.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Backlog Trends Chart ─────────────────────────────────────────────────────
function BacklogTrendsChart({ data }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm">
          <p className="font-semibold text-slate-700 mb-1">{label}</p>
          <p className="text-red-600 font-bold">{payload[0].value} backlog subjects</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-blue-50">
          <BarChart2 className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Backlog Subjects by Semester</h3>
      </div>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="semester"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="backlogs" fill="#ef4444" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Department Performance Chart ─────────────────────────────────────────────
function DepartmentPerformance({ data }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm">
          <p className="font-semibold text-slate-700">{payload[0].name}</p>
          <p className="text-emerald-600 font-bold">{payload[0].value}% Clear</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-violet-50">
          <BookOpen className="w-4 h-4 text-violet-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Branch-wise Clear Rate</h3>
      </div>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {data.map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 truncate text-xs" title={dept.name}>{dept.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${dept.value}%`, backgroundColor: COLORS[index % COLORS.length] }}
                    />
                  </div>
                  <span className="font-semibold text-slate-700 text-xs w-10 text-right">{dept.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Backlog Students Table (top 5 most urgent) ───────────────────────────────
function UrgentStudentsTable({ students, onNavigate }) {
  const urgent = useMemo(() =>
    [...students]
      .filter(s => s.totalActiveBacklogs > 0)
      .sort((a, b) => b.totalActiveBacklogs - a.totalActiveBacklogs)
      .slice(0, 6),
    [students]
  );

  if (!urgent.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50">
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Students Needing Attention</h3>
        </div>
        <button
          onClick={() => onNavigate('students', { status: 'backlog' })}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {urgent.map((student, i) => (
          <div
            key={i}
            onClick={() => onNavigate('report', { student })}
            className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
                student.overallStatus === 'DETAINED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              )}>
                {(student.name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{student.enrollmentNo} · {student.branch}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold',
                student.overallStatus === 'DETAINED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              )}>
                {student.overallStatus === 'DETAINED' ? 'DETAINED' : `${student.totalActiveBacklogs} backlog`}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard Screen ────────────────────────────────────────────────────
export default function DashboardScreen({ students = [], onNavigate, fileName }) {
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const withBacklog = students.filter(s => s.totalActiveBacklogs > 0).length;
    const clearStatus = students.filter(s => s.totalActiveBacklogs === 0).length;
    const detainedStudents = students.filter(s => s.overallStatus === 'DETAINED').length;
    const validSPI = students.filter(s => s.latestSPI && s.latestSPI > 0);
    const averageSPI = validSPI.length > 0
      ? (validSPI.reduce((sum, s) => sum + s.latestSPI, 0) / validSPI.length).toFixed(1)
      : '—';
    return { totalStudents, withBacklog, clearStatus, detainedStudents, averageSPI };
  }, [students]);

  const backlogTrendsData = useMemo(() => {
    const semesterCounts = {};
    students.forEach(student => {
      student.semesters?.forEach(sem => {
        const key = `Sem ${sem.semLabel || sem.semNo}`;
        semesterCounts[key] = (semesterCounts[key] || 0) + (sem.subjects?.filter(s => s.isBacklog).length || 0);
      });
    });
    return Object.entries(semesterCounts)
      .map(([semester, backlogs]) => ({ semester, backlogs }))
      .sort((a, b) => parseInt(a.semester.replace('Sem ', '')) - parseInt(b.semester.replace('Sem ', '')));
  }, [students]);

  const departmentData = useMemo(() => {
    const deptStats = {};
    students.forEach(student => {
      const dept = student.branch || 'Unknown';
      if (!deptStats[dept]) deptStats[dept] = { total: 0, clear: 0 };
      deptStats[dept].total++;
      if (student.totalActiveBacklogs === 0) deptStats[dept].clear++;
    });
    return Object.entries(deptStats)
      .map(([name, stats]) => ({ name, value: Math.round((stats.clear / stats.total) * 100) }))
      .slice(0, 6);
  }, [students]);

  const criticalAlerts = useMemo(() => {
    const alerts = [];
    if (metrics.detainedStudents > 0) {
      alerts.push({
        type: 'critical',
        title: `${metrics.detainedStudents} student${metrics.detainedStudents > 1 ? 's' : ''} detained`,
        description: 'Students with 4+ backlogs need immediate attention'
      });
    }
    const atRisk = students.filter(s => s.totalActiveBacklogs >= 3 && s.totalActiveBacklogs < 4).length;
    if (atRisk > 0) {
      alerts.push({
        type: 'warning',
        title: `${atRisk} at risk of detention`,
        description: '3 backlogs — approaching detention threshold'
      });
    }
    const lowSPI = students.filter(s => s.latestSPI && s.latestSPI < 5.0).length;
    if (lowSPI > 0) {
      alerts.push({
        type: 'warning',
        title: `${lowSPI} students with low SPI`,
        description: 'SPI below 5.0 — may need academic counselling'
      });
    }
    if (metrics.clearStatus > 0) {
      alerts.push({
        type: 'info',
        title: `${metrics.clearStatus} students fully clear`,
        description: 'No active backlogs — performing well'
      });
    }
    return alerts;
  }, [metrics, students]);

  const handleExportBacklog = async () => {
    const backlogStudents = students.filter(s => s.totalActiveBacklogs > 0);
    await exportToExcel(backlogStudents, 'backlog_students.xlsx');
  };

  const handleExportAll = async () => {
    await exportToExcel(students, 'all_students.xlsx');
  };

  const handleMasterExport = async () => {
    await masterExport(students, 'Master_Backlog_Report.xlsx');
  };

  // Date for header
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-600 shrink-0">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Backlog Analytics</h1>
              <p className="text-xs text-slate-400 hidden sm:block">{dateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {fileName && (
              <div className="hidden md:flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate max-w-[200px]">{fileName}</span>
              </div>
            )}
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Change File
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Section: Quick Actions ──────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <ActionButton
              icon={Search}
              label="Search Student"
              sublabel="Find any student"
              onClick={() => onNavigate('students', {})}
              variant="blue"
            />
            <ActionButton
              icon={BookX}
              label="View Backlog"
              sublabel="Students with backlogs"
              onClick={() => onNavigate('students', { status: 'backlog' })}
              variant="amber"
              badge={metrics.withBacklog}
              badgeColor="amber"
            />
            <ActionButton
              icon={ShieldAlert}
              label="View Detained"
              sublabel="Critical status students"
              onClick={() => onNavigate('students', { status: 'detained' })}
              variant="red"
              badge={metrics.detainedStudents || null}
              badgeColor="red"
            />
            <ActionButton
              icon={Download}
              label="Master Export"
              sublabel="Full report · 4 sheets"
              onClick={handleMasterExport}
              variant="slate"
            />
            <ActionButton
              icon={Download}
              label="Export Backlog"
              sublabel="Download as Excel"
              onClick={handleExportBacklog}
              variant="violet"
            />
            <ActionButton
              icon={Download}
              label="Export All"
              sublabel="Full list as Excel"
              onClick={handleExportAll}
              variant="emerald"
            />
            <ActionButton
              icon={RefreshCw}
              label="Upload New File"
              sublabel="Load different data"
              onClick={() => onNavigate('upload')}
              variant="default"
            />
          </div>
        </div>

        {/* ── Section: KPI Cards ──────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Summary</h2>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">{metrics.totalStudents} students loaded</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard
              icon={Users}
              label="Total Students"
              value={metrics.totalStudents}
              color="blue"
            />
            <KPICard
              icon={CheckCircle}
              label="Clear Status"
              value={metrics.clearStatus}
              color="green"
              trend={metrics.totalStudents ? `${((metrics.clearStatus / metrics.totalStudents) * 100).toFixed(1)}% success rate` : undefined}
            />
            <KPICard
              icon={AlertTriangle}
              label="With Backlog"
              value={metrics.withBacklog}
              color="amber"
              trend={metrics.totalStudents ? `${((metrics.withBacklog / metrics.totalStudents) * 100).toFixed(1)}% of total` : undefined}
            />
            <KPICard
              icon={XCircle}
              label="Detained"
              value={metrics.detainedStudents}
              color="red"
            />
            <KPICard
              icon={TrendingUp}
              label="Avg. SPI"
              value={metrics.averageSPI}
              color="purple"
              subtext="Batch performance"
            />
          </div>
        </div>

        {/* ── Section: Alert Strip ────────────────────────────────────────── */}
        <AlertStrip alerts={criticalAlerts} />

        {/* ── Section: Urgent Students + Charts ──────────────────────────── */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Analytics</h2>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Urgent students list spans 1 col */}
          <div className="lg:col-span-1">
            <UrgentStudentsTable students={students} onNavigate={onNavigate} />
          </div>
          {/* Charts span 2 cols */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
            <BacklogTrendsChart data={backlogTrendsData} />
            <DepartmentPerformance data={departmentData} />
          </div>
        </div>

      </main>
    </div>
  );
}
