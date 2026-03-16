import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Users } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function StatusBadge({ status, count, size = 'sm', showIcon = true }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'CLEAR':
        return { 
          bg: 'bg-emerald-100', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200', 
          icon: CheckCircle 
        };
      case 'BACKLOG':
        return { 
          bg: 'bg-amber-100', 
          text: 'text-amber-700', 
          border: 'border-amber-200', 
          icon: AlertTriangle 
        };
      case 'DETAINED':
        return { 
          bg: 'bg-red-100', 
          text: 'text-red-700', 
          border: 'border-red-200', 
          icon: XCircle 
        };
      default:
        return { 
          bg: 'bg-slate-100', 
          text: 'text-slate-700', 
          border: 'border-slate-200', 
          icon: Users 
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getLabelText = () => {
    if (count === 0) return 'Clear';
    if (count === 1) return '1 backlog';
    return `${count} backlogs`;
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded-full border',
      config.bg,
      config.text,
      config.border,
      sizeClasses[size]
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {getLabelText()}
    </span>
  );
}
