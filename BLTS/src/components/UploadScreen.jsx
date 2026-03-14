import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';

export default function UploadScreen({ onFileLoaded }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [error, setError] = useState(null);
    const [fileData, setFileData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const validateAndProcessFile = (file) => {
        setError(null);
        setFileData(null);

        if (!file) return;

        // Check if excel or csv
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        // Some basic validation
        if (!isValid) {
            setError('Could not read file. Please check the format. Accepts .xlsx, .xls, and .csv files only.');
            return;
        }

        setFileData({
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB',
            rawFile: file
        });
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const file = e.dataTransfer.files[0];
        validateAndProcessFile(file);
    }, []);

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        validateAndProcessFile(file);
    };

    const processData = async () => {
        if (!fileData || !fileData.rawFile) return;
        setIsLoading(true);
        setError(null);

        try {
            // parseExcel is passed in or imported in App
            await onFileLoaded(fileData.rawFile);
        } catch (err) {
            setError(err.message || 'Error processing file.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Student Backlog Tracker</h1>
                <p className="text-slate-500 mt-2">Upload Excel result sheets to view backlog reports instantly.</p>
            </div>

            <div
                className={`w-full max-w-xl bg-white rounded-2xl shadow-sm border-2 border-dashed transition-all duration-200 
          ${isDragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-slate-300 hover:border-slate-400'}
          ${error ? 'border-red-400 bg-red-50/30' : ''}
          ${fileData && !error ? 'border-emerald-400' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <label className="flex flex-col items-center justify-center w-full h-72 cursor-pointer p-8">

                    {/* Default State */}
                    {!fileData && !error && (
                        <>
                            <Upload
                                className={`w-14 h-14 mb-4 transition-all duration-300 ${isDragActive ? 'text-blue-500 -translate-y-2' : 'text-slate-400'}`}
                            />
                            <span className="text-lg font-medium text-slate-700 mb-1">
                                {isDragActive ? 'Drop file here' : 'Click or drop file here'}
                            </span>
                            <span className="text-sm text-slate-500">Accepts .xlsx, .xls, and .csv files</span>
                        </>
                    )}

                    {/* Error State */}
                    {error && (
                        <>
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <span className="text-red-600 font-medium text-center">{error}</span>
                        </>
                    )}

                    {/* Success / File Selected State */}
                    {fileData && !error && (
                        <div className="flex flex-col items-center justify-center w-full">
                            <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                            </div>
                            <span className="font-semibold text-slate-800 text-lg">{fileData.name}</span>
                            <span className="text-slate-500 text-sm mb-6">{fileData.size}</span>

                            {isLoading ? (
                                <div className="flex items-center text-blue-600 font-medium">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                                    Reading file...
                                </div>
                            ) : (
                                <button
                                    type="button" // Prevent form submission if wrapped
                                    onClick={(e) => {
                                        e.preventDefault();
                                        processData();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-sm transition-colors flex items-center"
                                >
                                    Load Results
                                </button>
                            )}
                        </div>
                    )}

                    <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileInput}
                    />
                </label>
            </div>

        </div>
    );
}
