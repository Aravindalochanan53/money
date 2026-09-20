import React from 'react';
import { formatIndianCurrency, formatCompactCurrency } from '../lib/format';

interface MoneyProps {
  amount: string | number;
  compact?: boolean;
  showSymbol?: boolean;
  className?: string;
  isShortfall?: boolean;
}

export const Money: React.FC<MoneyProps> = ({
  amount,
  compact = false,
  showSymbol = true,
  className = '',
  isShortfall
}) => {
  const fullFormatted = formatIndianCurrency(amount);
  const compactFormatted = formatCompactCurrency(amount);
  const numVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  const negative = isNaN(numVal) ? false : numVal < 0 || isShortfall;

  const displayText = compact ? compactFormatted : fullFormatted;
  const symbol = showSymbol ? '' : displayText.replace(/₹/g, '');

  return (
    <span
      className={`tabular-nums font-medium inline-flex items-baseline gap-0.5 ${
        negative ? 'text-shortfall' : ''
      } ${className}`}
      title={`Exact value: ${fullFormatted}`}
    >
      {negative && <span className="mr-0.5 text-xs font-semibold uppercase tracking-wider text-shortfall">(Shortfall)</span>}
      <span>{symbol || displayText}</span>
    </span>
  );
};
