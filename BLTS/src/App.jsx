import React, { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import EnhancedSearchScreen from './components/EnhancedSearchScreen';
import ReportScreen from './components/ReportScreen';
import DashboardScreen from './components/DashboardScreen';
import { parseFile } from './utils/parseExcel';

function App() {
  const [appState, setAppState] = useState('upload'); // 'upload', 'dashboard', 'search', 'report'
  const [studentsData, setStudentsData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [searchFilters, setSearchFilters] = useState({});

  const handleFileLoaded = async (file) => {
    try {
      const parsedData = await parseFile(file);
      setStudentsData(parsedData);
      setFileName(file.name);
      setAppState('dashboard');
    } catch (error) {
      console.error(error);
      throw error; // Let UploadScreen handle showing the error
    }
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
      case 'upload':
        handleResetFile();
        break;
      case 'dashboard':
        setAppState('dashboard');
        break;
      case 'students':
        setAppState('search');
        break;
      case 'departments':
        setAppState('search');
        break;
      case 'report':
        if (filters.student) {
          setSelectedStudent(filters.student);
          setAppState('report');
        }
        break;
      default:
        console.warn('Unknown navigation destination:', destination);
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
        <ReportScreen
          student={selectedStudent}
          onBack={handleBackToSearch}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </>
  );
}

export default App;
