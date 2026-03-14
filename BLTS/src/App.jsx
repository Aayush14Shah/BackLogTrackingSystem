import React, { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import SearchScreen from './components/SearchScreen';
import ReportScreen from './components/ReportScreen';
import { parseFile } from './utils/parseExcel';

function App() {
  const [appState, setAppState] = useState('upload'); // 'upload', 'search', 'report'
  const [studentsData, setStudentsData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileLoaded = async (file) => {
    try {
      const parsedData = await parseFile(file);
      setStudentsData(parsedData);
      setFileName(file.name);
      setAppState('search');
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

  const handleResetFile = () => {
    setStudentsData([]);
    setSelectedStudent(null);
    setFileName('');
    setAppState('upload');
  };

  return (
    <>
      {appState === 'upload' && (
        <UploadScreen onFileLoaded={handleFileLoaded} />
      )}

      {appState === 'search' && (
        <SearchScreen
          students={studentsData}
          onStudentSelect={handleStudentSelect}
          onResetFile={handleResetFile}
          fileName={fileName}
        />
      )}

      {appState === 'report' && selectedStudent && (
        <ReportScreen
          student={selectedStudent}
          onBack={handleBackToSearch}
        />
      )}
    </>
  );
}

export default App;
