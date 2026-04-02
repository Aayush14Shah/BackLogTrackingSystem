import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import UploadScreen from './components/UploadScreen';
import EnhancedSearchScreen from './components/EnhancedSearchScreen';
import DashboardScreen from './components/DashboardScreen';
import JourneyReport from './components/JourneyReport/JourneyReport';
import { buildStudents } from './services/studentBuilder';

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

  const handleFileLoaded = useCallback(async (files) => {
    const parsedData = await buildStudents(Array.isArray(files) ? files : [files]);
    setStudentsData(parsedData);
    const name = Array.isArray(files) ? `${files.length} files loaded` : files.name;
    setFileName(name);
    saveSession(parsedData, name);
    navigate('/dashboard');
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

      {/* Default: redirect to dashboard if data exists, otherwise upload */}
      <Route path="*" element={<Navigate to={hasData ? '/dashboard' : '/upload'} replace />} />
    </Routes>
  );
}

export default App;
