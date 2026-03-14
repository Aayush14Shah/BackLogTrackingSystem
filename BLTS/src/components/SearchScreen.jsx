import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, XCircle } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Result Row Component
const SearchResult = ({ student, onClick }) => {
    // Green 0, Amber 1-3, Red 4+
    const badgeColor = student.activeBacklogsCount === 0
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : student.activeBacklogsCount < 4
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-red-100 text-red-700 border-red-200";

    const badgeText = student.activeBacklogsCount === 0
        ? "0 backlogs"
        : student.activeBacklogsCount === 1
            ? "1 backlog"
            : `${student.activeBacklogsCount} backlogs`;

    return (
        <div
            onClick={() => onClick(student)}
            className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors group"
        >
            <div>
                <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{student.name}</p>
                <div className="flex items-center text-sm text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{student.enrollmentNo}</span>
                    <span className="mx-2">•</span>
                    <span>{student.branch || 'Unknown Branch'}</span>
                </div>
            </div>
            <div>
                <span className={cn("px-3 py-1 font-medium text-sm rounded-full border", badgeColor)}>
                    {badgeText}
                </span>
            </div>
        </div>
    );
};


export default function SearchScreen({ students = [], onStudentSelect, onResetFile, fileName }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Instant filter (no debounce needed since data is in memory)
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const lowerSearch = searchTerm.toLowerCase();

        return students.filter(student =>
            (student.name && student.name.toLowerCase().includes(lowerSearch)) ||
            (student.enrollmentNo && String(student.enrollmentNo).toLowerCase().includes(lowerSearch))
        );
    }, [students, searchTerm]);

    const handleReset = () => {
        if (window.confirm('This will clear the current data. Continue?')) {
            onResetFile();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <h1 className="font-bold text-xl text-slate-800">Student Backlog Tracker</h1>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
                        {fileName || 'Data Loaded'}
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
                    >
                        Change File
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-8">
                {/* Search Input Area */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-10 py-4 bg-white border border-slate-200 rounded-xl text-lg shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
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

                {/* Results List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {filteredStudents.length > 0 ? (
                        <div className="max-h-[600px] overflow-y-auto">
                            {/* Render up to 50 items to avoid DOM lag, though React handles 100s fine */}
                            {filteredStudents.slice(0, 50).map(student => (
                                <SearchResult
                                    key={student.enrollmentNo}
                                    student={student}
                                    onClick={onStudentSelect}
                                />
                            ))}
                            {filteredStudents.length > 50 && (
                                <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 border-t border-slate-100">
                                    Showing top 50 results. Keep typing to refine.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                            <Search className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-700">No students match</p>
                            <p className="text-sm mt-1">Try searching a different name or ID.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
