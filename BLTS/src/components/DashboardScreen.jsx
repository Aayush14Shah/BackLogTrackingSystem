import React, { useMemo } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  BookOpen,
  FileSpreadsheet,
  Eye,
  Download,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// KPI Card Component
function KPICard({ icon: Icon, label, value, color = 'blue', trend, subtext }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mb-1">{value}</p>
          {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-sm text-emerald-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg border', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions({ onViewStudents, onBacklogStudents, onDepartmentView, totalStudents }) {
  const actions = [
    {
      label: 'All Students',
      icon: Users,
      count: totalStudents,
      color: 'blue',
      onClick: onViewStudents
    },
    {
      label: 'Backlog Students',
      icon: AlertTriangle,
      count: '89', // This will be calculated from data
      color: 'amber',
      onClick: onBacklogStudents
    },
    {
      label: 'Department View',
      icon: BookOpen,
      count: '5',
      color: 'purple',
      onClick: onDepartmentView
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center">
              <action.icon className="w-5 h-5 text-slate-600 mr-3" />
              <span className="font-medium text-slate-700">{action.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-500">{action.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Backlog Trends Chart Component
function BacklogTrendsChart({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Backlog Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="semester" 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="backlogs" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Department Performance Component
function DepartmentPerformance({ data }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Department Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {data.map((dept, index) => (
          <div key={dept.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-slate-600">{dept.name}</span>
            </div>
            <span className="font-medium text-slate-800">{dept.value}% Clear</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Critical Alerts Component
function CriticalAlerts({ alerts }) {
  const alertIcons = {
    critical: XCircle,
    warning: AlertTriangle,
    info: CheckCircle
  };

  const alertColors = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Critical Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alertIcons[alert.type] || AlertTriangle;
          return (
            <div
              key={index}
              className={cn('flex items-start gap-3 p-3 rounded-lg border', alertColors[alert.type])}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs opacity-90 mt-1">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardScreen({ students = [], onNavigate, fileName }) {
  // Calculate metrics from student data
  const metrics = useMemo(() => {
    if (!students.length) {
      return {
        totalStudents: 0,
        withBacklog: 0,
        clearStatus: 0,
        detainedStudents: 0,
        averageSPI: 0
      };
    }

    const totalStudents = students.length;
    const withBacklog = students.filter(s => s.totalActiveBacklogs > 0).length;
    const clearStatus = students.filter(s => s.totalActiveBacklogs === 0).length;
    const detainedStudents = students.filter(s => s.overallStatus === 'DETAINED').length;
    
    const validSPI = students.filter(s => s.latestSPI && s.latestSPI > 0);
    const averageSPI = validSPI.length > 0 
      ? (validSPI.reduce((sum, s) => sum + s.latestSPI, 0) / validSPI.length).toFixed(1)
      : 0;

    return {
      totalStudents,
      withBacklog,
      clearStatus,
      detainedStudents,
      averageSPI
    };
  }, [students]);

  // Sample data for charts (replace with real calculations)
  const backlogTrendsData = useMemo(() => {
    // Calculate actual backlog trends from student data
    const semesterCounts = {};
    students.forEach(student => {
      student.semesters?.forEach(sem => {
        const key = `Sem ${sem.semLabel || sem.semNo}`;
        if (!semesterCounts[key]) {
          semesterCounts[key] = 0;
        }
        semesterCounts[key] += sem.subjects?.filter(s => s.isBacklog).length || 0;
      });
    });

    return Object.entries(semesterCounts)
      .map(([semester, backlogs]) => ({ semester, backlogs }))
      .sort((a, b) => {
        const aNum = parseInt(a.semester.replace('Sem ', ''));
        const bNum = parseInt(b.semester.replace('Sem ', ''));
        return aNum - bNum;
      });
  }, [students]);

  const departmentData = useMemo(() => {
    // Calculate department performance
    const deptStats = {};
    students.forEach(student => {
      const dept = student.branch || 'Unknown';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, clear: 0 };
      }
      deptStats[dept].total++;
      if (student.totalActiveBacklogs === 0) {
        deptStats[dept].clear++;
      }
    });

    return Object.entries(deptStats)
      .map(([name, stats]) => ({
        name,
        value: Math.round((stats.clear / stats.total) * 100)
      }))
      .slice(0, 5); // Top 5 departments
  }, [students]);

  const criticalAlerts = useMemo(() => {
    const alerts = [];
    
    if (metrics.detainedStudents > 0) {
      alerts.push({
        type: 'critical',
        title: `${metrics.detainedStudents} students detained`,
        description: 'Students with 4+ backlogs need immediate attention'
      });
    }

    const atRisk = students.filter(s => s.totalActiveBacklogs >= 3 && s.totalActiveBacklogs < 4).length;
    if (atRisk > 0) {
      alerts.push({
        type: 'warning',
        title: `${atRisk} students at risk`,
        description: 'Students with 3 backlogs are approaching detention'
      });
    }

    const lowSPI = students.filter(s => s.latestSPI && s.latestSPI < 5.0).length;
    if (lowSPI > 0) {
      alerts.push({
        type: 'warning',
        title: `${lowSPI} students with low SPI`,
        description: 'Students with SPI below 5.0 may need academic support'
      });
    }

    if (metrics.clearStatus > 0) {
      alerts.push({
        type: 'info',
        title: `${metrics.clearStatus} students performing well`,
        description: 'Students with clear academic status'
      });
    }

    return alerts;
  }, [metrics, students]);

  const handleViewStudents = () => onNavigate('students', {});
  const handleBacklogStudents = () => onNavigate('students', { status: 'backlog' });
  const handleDepartmentView = () => onNavigate('departments', {});

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Upload New
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Backlog Analytics Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time insights and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
              {fileName || 'Data Loaded'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            icon={Users}
            label="Total Students"
            value={metrics.totalStudents}
            color="blue"
          />
          <KPICard
            icon={AlertTriangle}
            label="With Backlog"
            value={metrics.withBacklog}
            color="amber"
            trend={`${((metrics.withBacklog / metrics.totalStudents) * 100).toFixed(1)}% of total`}
          />
          <KPICard
            icon={CheckCircle}
            label="Clear Status"
            value={metrics.clearStatus}
            color="green"
            trend={`${((metrics.clearStatus / metrics.totalStudents) * 100).toFixed(1)}% success rate`}
          />
          <KPICard
            icon={XCircle}
            label="Detained"
            value={metrics.detainedStudents}
            color="red"
          />
          <KPICard
            icon={TrendingUp}
            label="Average SPI"
            value={metrics.averageSPI}
            color="purple"
            subtext="Class performance"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BacklogTrendsChart data={backlogTrendsData} />
          <DepartmentPerformance data={departmentData} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QuickActions
              onViewStudents={handleViewStudents}
              onBacklogStudents={handleBacklogStudents}
              onDepartmentView={handleDepartmentView}
              totalStudents={metrics.totalStudents}
            />
          </div>
          <CriticalAlerts alerts={criticalAlerts} />
        </div>
      </main>
    </div>
  );
}
