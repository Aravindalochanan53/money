import React from 'react';
import { Calendar } from 'lucide-react';
import { formatDateIST } from '../lib/format';

interface AsOfStampProps {
  date?: string;
  className?: string;
}

export const AsOfStamp: React.FC<AsOfStampProps> = ({
  date = '2026-09-19',
  className = ''
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-paper border border-rule text-xs text-ink-muted ${className}`}
      title="FlowCred relies on imported financial snapshots. No live bank integration."
    >
      <Calendar className="w-3.5 h-3.5 text-ink-muted" />
      <span>Based on your data as of <strong>{formatDateIST(date)}</strong></span>
    </div>
  );
};
