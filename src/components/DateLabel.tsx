import React from 'react';
import { formatDateIST, formatRelativeDate } from '../lib/format';

interface DateLabelProps {
  date: string;
  showRelative?: boolean;
  baseDate?: string;
  className?: string;
}

export const DateLabel: React.FC<DateLabelProps> = ({
  date,
  showRelative = false,
  baseDate = '2026-09-19',
  className = ''
}) => {
  const formattedIST = formatDateIST(date);
  const relative = formatRelativeDate(date, baseDate);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-medium text-ink">{formattedIST}</span>
      {showRelative && relative && (
        <span className="text-xs text-ink-muted bg-paper px-1.5 py-0.5 rounded border border-rule">
          {relative}
        </span>
      )}
    </span>
  );
};
