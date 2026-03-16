import React, { useState } from 'react';
import { Download, FileText, Table, Printer } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function ExportButton({ 
  data, 
  selectedCount = 0, 
  disabled = false,
  onExport,
  size = 'default'
}) {
  const [isOpen, setIsOpen] = useState(false);

  const exportFormats = [
    {
      label: 'Export as CSV',
      icon: Table,
      format: 'csv',
      description: 'Comma-separated values'
    },
    {
      label: 'Export as Excel',
      icon: FileText,
      format: 'excel',
      description: 'Microsoft Excel format'
    },
    {
      label: 'Print Selected',
      icon: Printer,
      format: 'print',
      description: 'Print-friendly format'
    }
  ];

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const handleExport = (format) => {
    setIsOpen(false);
    onExport?.(format, data);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm font-medium transition-colors",
          "disabled:bg-slate-300 disabled:cursor-not-allowed",
          sizeClasses[size]
        )}
      >
        <Download className="w-4 h-4" />
        Export
        {selectedCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
            {selectedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
            <div className="p-2">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.format}
                    onClick={() => handleExport(format.format)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="p-2 rounded bg-slate-100">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {format.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {format.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {selectedCount === 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Select students to export specific data
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
