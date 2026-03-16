import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  color = 'blue', 
  trend, 
  trendValue,
  subtext,
  size = 'default',
  loading = false 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200'
  };

  const sizeClasses = {
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  const valueSizeClasses = {
    sm: 'text-2xl',
    default: 'text-3xl',
    lg: 'text-4xl'
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-600';
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow",
      sizeClasses[size]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
            {label}
          </p>
          <p className={cn("font-bold text-slate-800 mb-1", valueSizeClasses[size])}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-slate-500">{subtext}</p>
          )}
          {(trend !== undefined || trendValue) && (
            <div className="flex items-center mt-2">
              {getTrendIcon()}
              <span className={cn("text-sm font-medium ml-1", getTrendColor())}>
                {trendValue || (trend !== undefined ? `${Math.abs(trend)}%` : '')}
              </span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-lg border shrink-0", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
