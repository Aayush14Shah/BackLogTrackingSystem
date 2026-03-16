import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  XCircle, 
  Filter,
  Eye,
  Printer,
  ChevronDown,
  ChevronUp,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle as XCircleIcon,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import StatusBadge from './ui/StatusBadge';
import ExportButton from './ui/ExportButton';
import { exportToCSV, exportToExcel, printSelectedStudents } from '../utils/exportUtils';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Filter Panel Component
function FilterPanel({ filters, onFilterChange, onReset, departments, semesters }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Students', icon: Users },
    { value: 'clear', label: 'Clear Status', icon: CheckCircle },
    { value: 'backlog', label: 'Backlog', icon: AlertTriangle },
    { value: 'detained', label: 'Detained', icon: XCircleIcon }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Filters</h3>
          <span className="text-sm text-slate-500">
            ({Object.values(filters).filter(v => v && v !== 'all').length} active)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => onFilterChange('status', option.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                      filters.status === option.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => onFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => onFilterChange('semester', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Semesters</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          {/* SPI Range Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">SPI Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="Min"
                value={filters.spiMin || ''}
                onChange={(e) => onFilterChange('spiMin', e.target.value)}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="text-slate-400">—</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="Max"
                value={filters.spiMax || ''}
                onChange={(e) => onFilterChange('spiMax', e.target.value)}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Backlog Count Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Backlog Count</label>
            <select
              value={filters.backlogCount}
              onChange={(e) => onFilterChange('backlogCount', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Any</option>
              <option value="0">0 (Clear)</option>
              <option value="1-3">1-3</option>
              <option value="4+">4+ (Detained)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Student Table Component
function StudentTable({ students, onStudentSelect, selectedStudents, onSelectionChange }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(students.map(s => s.enrollmentNo));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectStudent = (enrollmentNo, checked) => {
    if (checked) {
      onSelectionChange([...selectedStudents, enrollmentNo]);
    } else {
      onSelectionChange(selectedStudents.filter(id => id !== enrollmentNo));
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortConfig]);

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-700">No students found</p>
        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  Name
                  {sortConfig.key === 'name' && (
                    <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('enrollmentNo')}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  Enrollment
                  {sortConfig.key === 'enrollmentNo' && (
                    <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('totalActiveBacklogs')}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  Status
                  {sortConfig.key === 'totalActiveBacklogs' && (
                    <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('latestSPI')}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  SPI
                  {sortConfig.key === 'latestSPI' && (
                    <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedStudents.map((student) => (
              <tr key={student.enrollmentNo} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.enrollmentNo)}
                    onChange={(e) => handleSelectStudent(student.enrollmentNo, e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{student.name}</p>
                    {student.latestSemNo && (
                      <p className="text-xs text-slate-500">Sem {student.latestSemNo}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">
                    {student.enrollmentNo}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{student.branch || 'Unknown'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={student.overallStatus} count={student.totalActiveBacklogs} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700">{student.latestSPI || '—'}</span>
                    {student.latestSPI && student.latestSPI >= 8.0 && (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStudentSelect(student)}
                      className="p-1 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Print Report"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EnhancedSearchScreen({ students = [], onStudentSelect, onResetFile, fileName, initialFilters = {}, onBackToDashboard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    semester: 'all',
    spiMin: '',
    spiMax: '',
    backlogCount: 'all',
    ...initialFilters
  });
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Extract unique departments and semesters
  const departments = useMemo(() => {
    const depts = new Set();
    students.forEach(student => {
      if (student.branch) depts.add(student.branch);
    });
    return Array.from(depts).sort();
  }, [students]);

  const semesters = useMemo(() => {
    const sems = new Set();
    students.forEach(student => {
      student.semesters?.forEach(sem => {
        sems.add(`Sem ${sem.semLabel || sem.semNo}`);
      });
    });
    return Array.from(sems).sort((a, b) => {
      const aNum = parseInt(a.replace('Sem ', ''));
      const bNum = parseInt(b.replace('Sem ', ''));
      return aNum - bNum;
    });
  }, [students]);

  // Apply filters and search
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Apply search
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        (student.name && student.name.toLowerCase().includes(lowerSearch)) ||
        (student.enrollmentNo && String(student.enrollmentNo).toLowerCase().includes(lowerSearch))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(student => {
        switch (filters.status) {
          case 'clear':
            return student.totalActiveBacklogs === 0;
          case 'backlog':
            return student.totalActiveBacklogs > 0 && student.totalActiveBacklogs < 4;
          case 'detained':
            return student.overallStatus === 'DETAINED';
          default:
            return true;
        }
      });
    }

    // Apply department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(student => student.branch === filters.department);
    }

    // Apply semester filter
    if (filters.semester !== 'all') {
      filtered = filtered.filter(student => {
        return student.semesters?.some(sem => `Sem ${sem.semLabel || sem.semNo}` === filters.semester);
      });
    }

    // Apply SPI range filter
    if (filters.spiMin || filters.spiMax) {
      filtered = filtered.filter(student => {
        const spi = student.latestSPI;
        if (!spi) return false;
        if (filters.spiMin && spi < parseFloat(filters.spiMin)) return false;
        if (filters.spiMax && spi > parseFloat(filters.spiMax)) return false;
        return true;
      });
    }

    // Apply backlog count filter
    if (filters.backlogCount !== 'all') {
      filtered = filtered.filter(student => {
        switch (filters.backlogCount) {
          case '0':
            return student.totalActiveBacklogs === 0;
          case '1-3':
            return student.totalActiveBacklogs >= 1 && student.totalActiveBacklogs <= 3;
          case '4+':
            return student.totalActiveBacklogs >= 4;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [students, searchTerm, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      department: 'all',
      semester: 'all',
      spiMin: '',
      spiMax: '',
      backlogCount: 'all'
    });
    setSearchTerm('');
  };

  const handleReset = () => {
    if (window.confirm('This will clear the current data. Continue?')) {
      onResetFile();
    }
  };

  const handleExport = (format, data) => {
    switch (format) {
      case 'csv':
        exportToCSV(data, `student_export_${new Date().toISOString().split('T')[0]}.csv`);
        break;
      case 'excel':
        exportToExcel(data, `student_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        break;
      case 'print':
        printSelectedStudents(data);
        break;
      default:
        console.warn('Unsupported export format:', format);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToDashboard}
              className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div>
              <h1 className="font-bold text-xl text-slate-800">Student Management</h1>
              <p className="text-sm text-slate-500 mt-1">
                {filteredStudents.length} of {students.length} students
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
              {fileName || 'Data Loaded'}
            </div>
            {selectedStudents.length > 0 && (
              <ExportButton
                data={filteredStudents.filter(s => selectedStudents.includes(s.enrollmentNo))}
                selectedCount={selectedStudents.length}
                onExport={handleExport}
              />
            )}
            <button
              onClick={handleReset}
              className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              Change File
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-base shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
            placeholder="Search by name or enrollment no."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              onClick={() => setSearchTerm('')}
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          departments={departments}
          semesters={semesters}
        />

        {/* Results Table */}
        <StudentTable
          students={filteredStudents}
          onStudentSelect={onStudentSelect}
          selectedStudents={selectedStudents}
          onSelectionChange={setSelectedStudents}
        />
      </main>
    </div>
  );
}
