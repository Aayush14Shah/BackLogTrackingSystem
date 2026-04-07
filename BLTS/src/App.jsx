import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import UploadScreen from './components/UploadScreen';
import EnhancedSearchScreen from './components/EnhancedSearchScreen';
import DashboardScreen from './components/DashboardScreen';
import JourneyReport from './components/JourneyReport/JourneyReport';
import TranscriptScreen from './components/TranscriptScreen';
import { buildStudents } from './services/studentBuilder';
import React from 'react';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-4 font-mono bg-slate-50 rounded p-2 text-left break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.hash = '#/upload'; }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Go back to Upload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Session storage helpers ──────────────────────────────────────────────────
const STORAGE_KEY = 'blts_session';

function saveSession(students, fileName) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ students, fileName }));
  } catch {
    // sessionStorage quota exceeded — silently ignore
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { students, fileName } = JSON.parse(raw);
    if (Array.isArray(students) && students.length > 0) {
      return { students, fileName };
    }
  } catch {
    // Corrupted data — ignore
  }
  return null;
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// ─── Report wrapper — resolves student from URL param ─────────────────────────
function ReportRoute({ students, onBack, onBackToDashboard }) {
  const { studentId } = useParams();

  // Find student by enrollment number (URL-decoded)
  const student = students.find(
    s => String(s.enrollmentNo) === decodeURIComponent(studentId || '')
  );

  if (!student) {
    return <Navigate to="/search" replace />;
  }

  return (
    <JourneyReport
      student={student}
      onBack={onBack}
      onBackToDashboard={onBackToDashboard}
    />
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();
  const [studentsData, setStudentsData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [searchFilters, setSearchFilters] = useState({});

  // Hydrate from sessionStorage on first mount
  useEffect(() => {
    const cached = loadSession();
    if (cached) {
      setStudentsData(cached.students);
      setFileName(cached.fileName || '');
    }
  }, []);

  const handleFileLoaded = useCallback(async (files, mode = 'backlog') => {
    const parsedData = await buildStudents(Array.isArray(files) ? files : [files]);
    setStudentsData(parsedData);
    const name = Array.isArray(files) ? `${files.length} files loaded` : files.name;
    setFileName(name);
    saveSession(parsedData, name);
    navigate(mode === 'transcript' ? '/transcript' : '/dashboard');
  }, [navigate]);

  const handleStudentSelect = useCallback((student) => {
    navigate(`/report/${encodeURIComponent(student.enrollmentNo)}`);
  }, [navigate]);

  const handleBackToSearch = useCallback(() => {
    navigate('/search');
  }, [navigate]);

  const handleBackToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleResetFile = useCallback(() => {
    setStudentsData([]);
    setFileName('');
    setSearchFilters({});
    clearSession();
    navigate('/upload');
  }, [navigate]);

  const handleNavigate = useCallback((destination, filters = {}) => {
    setSearchFilters(filters);
    switch (destination) {
      case 'upload':     handleResetFile(); break;
      case 'dashboard':  navigate('/dashboard'); break;
      case 'students':
      case 'departments': navigate('/search'); break;
      case 'transcript':  navigate('/transcript'); break;
      case 'report':
        if (filters.student) {
          navigate(`/report/${encodeURIComponent(filters.student.enrollmentNo)}`);
        }
        break;
      default: break;
    }
  }, [navigate, handleResetFile]);

  const hasData = studentsData.length > 0;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/upload" element={<UploadScreen onFileLoaded={handleFileLoaded} />} />

        <Route
          path="/dashboard"
          element={
            hasData
              ? <DashboardScreen students={studentsData} onNavigate={handleNavigate} fileName={fileName} />
              : <Navigate to="/upload" replace />
          }
        />

        <Route
          path="/search"
          element={
            hasData
              ? (
                <EnhancedSearchScreen
                  students={studentsData}
                  onStudentSelect={handleStudentSelect}
                  onResetFile={handleResetFile}
                  fileName={fileName}
                  initialFilters={searchFilters}
                  onBackToDashboard={handleBackToDashboard}
                />
              )
              : <Navigate to="/upload" replace />
          }
        />

        <Route
          path="/report/:studentId"
          element={
            hasData
              ? (
                <ReportRoute
                  students={studentsData}
                  onBack={handleBackToSearch}
                  onBackToDashboard={handleBackToDashboard}
                />
              )
              : <Navigate to="/upload" replace />
          }
        />

        {/* Legacy /report without param → redirect to search */}
        <Route path="/report" element={<Navigate to={hasData ? '/search' : '/upload'} replace />} />

        <Route
          path="/transcript"
          element={
            hasData
              ? <TranscriptScreen students={studentsData} onBack={handleBackToDashboard} />
              : <Navigate to="/upload" replace />
          }
        />

        {/* Default: redirect to dashboard if data exists, otherwise upload */}
        <Route path="*" element={<Navigate to={hasData ? '/dashboard' : '/upload'} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
