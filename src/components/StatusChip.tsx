import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, ShieldAlert, Info } from 'lucide-react';

export type StatusVariant = 'safe' | 'tight' | 'unsafe' | 'low' | 'medium' | 'high' | 'rule_based';

interface StatusChipProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  className = ''
}) => {
  const normStatus = status.toLowerCase();

  let colorClass = 'bg-paper text-ink border-rule';
  let icon = <Info className="w-3.5 h-3.5" />;
  let defaultText = label || status;

  if (normStatus === 'safe' || normStatus === 'low') {
    colorClass = 'bg-cash/10 text-cash border-cash/30';
    icon = <CheckCircle2 className="w-3.5 h-3.5 text-cash" />;
    defaultText = label || (normStatus === 'safe' ? 'Safe' : 'Low Risk');
  } else if (normStatus === 'tight' || normStatus === 'medium' || normStatus === 'caution') {
    colorClass = 'bg-threshold/10 text-threshold border-threshold/30';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-threshold" />;
    defaultText = label || (normStatus === 'tight' ? 'Tight Buffer' : 'Medium Risk');
  } else if (normStatus === 'unsafe' || normStatus === 'high' || normStatus === 'shortfall') {
    colorClass = 'bg-shortfall/10 text-shortfall border-shortfall/30';
    icon = <AlertOctagon className="w-3.5 h-3.5 text-shortfall" />;
    defaultText = label || (normStatus === 'unsafe' ? 'Unsafe' : 'High Risk');
  } else if (normStatus === 'rule_based') {
    colorClass = 'bg-paper text-ink border-rule';
    icon = <ShieldAlert className="w-3.5 h-3.5 text-ink-muted" />;
    defaultText = label || 'Rule-based Rating';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${colorClass} ${className}`}
    >
      {icon}
      <span>{defaultText}</span>
    </span>
  );
};
