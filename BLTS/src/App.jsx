import { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import EnhancedSearchScreen from './components/EnhancedSearchScreen';
import DashboardScreen from './components/DashboardScreen';
import JourneyReport from './components/JourneyReport/JourneyReport';
import { buildStudents } from './services/studentBuilder';

function App() {
  const [appState, setAppState] = useState('upload'); // 'upload' | 'dashboard' | 'search' | 'report'
  const [studentsData, setStudentsData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [searchFilters, setSearchFilters] = useState({});

  const handleFileLoaded = async (files) => {
    const parsedData = await buildStudents(Array.isArray(files) ? files : [files]);
    setStudentsData(parsedData);
    setFileName(Array.isArray(files) ? `${files.length} files loaded` : files.name);
    setAppState('dashboard');
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setAppState('report');
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setAppState('search');
  };

  const handleBackToDashboard = () => {
    setSelectedStudent(null);
    setAppState('dashboard');
  };

  const handleResetFile = () => {
    setStudentsData([]);
    setSelectedStudent(null);
    setFileName('');
    setSearchFilters({});
    setAppState('upload');
  };

  const handleNavigate = (destination, filters = {}) => {
    setSearchFilters(filters);
    switch (destination) {
      case 'upload':     handleResetFile(); break;
      case 'dashboard':  setAppState('dashboard'); break;
      case 'students':
      case 'departments': setAppState('search'); break;
      case 'report':
        if (filters.student) {
          setSelectedStudent(filters.student);
          setAppState('report');
        }
        break;
      default: break;
    }
  };

  return (
    <>
      {appState === 'upload' && (
        <UploadScreen onFileLoaded={handleFileLoaded} />
      )}
      {appState === 'dashboard' && (
        <DashboardScreen
          students={studentsData}
          onNavigate={handleNavigate}
          fileName={fileName}
        />
      )}
      {appState === 'search' && (
        <EnhancedSearchScreen
          students={studentsData}
          onStudentSelect={handleStudentSelect}
          onResetFile={handleResetFile}
          fileName={fileName}
          initialFilters={searchFilters}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
      {appState === 'report' && selectedStudent && (
        <JourneyReport
          student={selectedStudent}
          onBack={handleBackToSearch}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </>
  );
}

export default App;
