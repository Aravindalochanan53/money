/**
 * FlowCred Formatting Engine
 * Centralized formatting for Indian currency, compact values, IST dates, and relative phrasing.
 * Money amounts are handled as decimal strings (e.g. "125000.00").
 */

/**
 * Format string or number into Indian Currency digit grouping:
 * e.g. "1234567.00" -> "₹12,34,567.00"
 */
export function formatIndianCurrency(amount: string | number, includeDecimals = true): string {
  if (amount === undefined || amount === null || amount === '') return '₹0.00';
  
  const numStr = typeof amount === 'number' ? amount.toFixed(2) : String(amount);
  const isNegative = numStr.startsWith('-');
  const cleanStr = isNegative ? numStr.slice(1) : numStr;
  
  const parts = cleanStr.split('.');
  let integerPart = parts[0] || '0';
  const decimalPart = parts[1] ? parts[1].slice(0, 2).padEnd(2, '0') : '00';

  // Indian numbering system grouping: rightmost 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = includeDecimals 
    ? `₹${formattedInteger}.${decimalPart}` 
    : `₹${formattedInteger}`;

  return isNegative ? `-${result}` : result;
}

/**
 * Format string or number into Compact Indian Currency:
 * e.g. 1240000 -> "₹12.4 L"
 * e.g. 12000000 -> "₹1.2 Cr"
 * e.g. 45000 -> "₹45 K"
 */
export function formatCompactCurrency(amount: string | number): string {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '₹0';

  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (absVal >= 10000000) { // 1 Crore
    const cr = absVal / 10000000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  if (absVal >= 100000) {   // 1 Lakh
    const lakh = absVal / 100000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} L`;
  }
  if (absVal >= 1000) {     // 1 Thousand
    const k = absVal / 1000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} K`;
  }

  return `${sign}₹${absVal.toLocaleString('en-IN')}`;
}

/**
 * Format ISO date string into Indian Standard Time display date (19 Sep 2026)
 */
export function formatDateIST(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return isoDateStr;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Calculate relative phrasing relative to base date (defaulting to 2026-09-19)
 */
export function formatRelativeDate(isoDateStr: string, baseDateStr = '2026-09-19'): string {
  if (!isoDateStr) return '';
  const target = new Date(isoDateStr);
  const base = new Date(baseDateStr);

  if (isNaN(target.getTime()) || isNaN(base.getTime())) return '';

  const diffTime = target.getTime() - base.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
