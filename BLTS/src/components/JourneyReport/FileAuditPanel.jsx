import { useState } from 'react';
import { ChevronDown, ChevronUp, FileSpreadsheet, FileText, FileX } from 'lucide-react';
import { cn, ResultChip } from './shared';

const ROLE_CONFIG = {
  OR:         { label: 'Official Result',  icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  PASS_MFEED: { label: 'Pass Markfeed',    icon: FileText,        color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  FAIL_MFEED: { label: 'Fail Markfeed',    icon: FileX,           color: 'text-red-600 bg-red-50 border-red-200' },
  UNKNOWN:    { label: 'Unknown',          icon: FileSpreadsheet, color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default function FileAuditPanel({ sourceFiles = [] }) {
  const [open, setOpen] = useState(false);
  if (!sourceFiles.length) return null;

  return (
    <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">
            Source File Audit
          </span>
          <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
            {sourceFiles.length} file{sourceFiles.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {sourceFiles.map((sf, i) => {
            const cfg = ROLE_CONFIG[sf.role] || ROLE_CONFIG.UNKNOWN;
            const Icon = cfg.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white">
                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-slate-700 truncate">{sf.filename}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sf.period || '—'}</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0', cfg.color)}>
                  {cfg.label}
                </span>
                {sf.result && <ResultChip result={sf.result} small />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
