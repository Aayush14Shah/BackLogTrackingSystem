// Re-export cn from centralized utility
export { cn } from '../../utils/cn';
import { cn } from '../../utils/cn';

export const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
export const isFail = (g) => FAIL_GRADES.has((g || '').trim().toUpperCase());

// Result → color config
export function resultConfig(result) {
  const r = (result || '').toLowerCase();
  if (/^pass/.test(r))     return { bg: 'bg-[#1a6b3c]',  text: 'text-white',          label: 'PASS',     border: 'border-[#1a6b3c]' };
  if (/promoted/.test(r))  return { bg: 'bg-[#1a4a7a]',  text: 'text-white',          label: 'PROMOTED', border: 'border-[#1a4a7a]' };
  if (/fail/.test(r))      return { bg: 'bg-[#c0392b]',  text: 'text-white',          label: 'FAIL',     border: 'border-[#c0392b]' };
  return                          { bg: 'bg-slate-500',   text: 'text-white',          label: result || '—', border: 'border-slate-500' };
}

export function ResultChip({ result, small = false }) {
  const cfg = resultConfig(result);
  return (
    <span className={cn(
      'inline-flex items-center font-bold rounded-full tracking-wide',
      cfg.bg, cfg.text,
      small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'
    )}>
      {cfg.label}
    </span>
  );
}

export function GradeBox({ grade, small = false }) {
  const g = (grade || '').trim();
  if (!g || g === '-' || g === '—') {
    return <span className={cn('font-mono text-slate-300', small ? 'text-xs' : 'text-sm')}>—</span>;
  }
  const fail = isFail(g);
  return (
    <span className={cn(
      'inline-flex items-center justify-center font-mono font-bold rounded',
      fail ? 'bg-red-100 text-[#c0392b] ring-1 ring-red-300' : 'bg-emerald-50 text-[#1a6b3c] ring-1 ring-emerald-200',
      small ? 'text-[10px] px-1.5 py-0.5 min-w-[22px]' : 'text-xs px-2 py-1 min-w-[28px]'
    )}>
      {g}
    </span>
  );
}

export function StatusBadge({ status, count }) {
  const cfg = {
    CLEAR:    { bg: 'bg-emerald-100', text: 'text-[#1a6b3c]', border: 'border-emerald-300', label: 'CLEAR' },
    BACKLOG:  { bg: 'bg-orange-100',  text: 'text-[#ea580c]',  border: 'border-orange-300',  label: `BACKLOG${count ? ` (${count})` : ''}` },
    DETAINED: { bg: 'bg-red-100',     text: 'text-[#c0392b]',  border: 'border-red-300',     label: 'DETAINED' },
  }[status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', label: status };

  return (
    <span className={cn('inline-flex items-center font-bold text-xs px-3 py-1 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
      {cfg.label}
    </span>
  );
}
