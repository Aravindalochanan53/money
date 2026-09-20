import { describe, it, expect } from 'vitest';
import {
  formatIndianCurrency,
  formatCompactCurrency,
  formatDateIST,
  formatRelativeDate
} from './format';

describe('formatIndianCurrency', () => {
  it('formats standard Indian digit grouping correctly', () => {
    expect(formatIndianCurrency('1234567.00')).toBe('₹12,34,567.00');
    expect(formatIndianCurrency('910000.00')).toBe('₹9,10,000.00');
    expect(formatIndianCurrency('260000.00')).toBe('₹2,60,000.00');
    expect(formatIndianCurrency('500.00')).toBe('₹500.00');
  });

  it('handles negative values correctly with true minus sign', () => {
    expect(formatIndianCurrency('-470000.00')).toBe('-₹4,70,000.00');
  });

  it('formats numbers without decimal portion when specified', () => {
    expect(formatIndianCurrency('1234567.00', false)).toBe('₹12,34,567');
  });
});

describe('formatCompactCurrency', () => {
  it('formats Lakhs correctly', () => {
    expect(formatCompactCurrency('1240000')).toBe('₹12.4 L');
    expect(formatCompactCurrency('380000')).toBe('₹3.8 L');
  });

  it('formats Crores correctly', () => {
    expect(formatCompactCurrency('12000000')).toBe('₹1.2 Cr');
  });

  it('formats negative compact amounts correctly', () => {
    expect(formatCompactCurrency('-190000')).toBe('-₹1.9 L');
  });
});

describe('formatDateIST', () => {
  it('formats YYYY-MM-DD into 19 Sep 2026 format', () => {
    expect(formatDateIST('2026-09-19')).toBe('19 Sep 2026');
    expect(formatDateIST('2026-10-14')).toBe('14 Oct 2026');
  });
});

describe('formatRelativeDate', () => {
  it('calculates relative days accurately', () => {
    expect(formatRelativeDate('2026-10-01', '2026-09-19')).toBe('in 12 days');
    expect(formatRelativeDate('2026-09-19', '2026-09-19')).toBe('Today');
    expect(formatRelativeDate('2026-09-01', '2026-09-19')).toBe('18 days ago');
  });
});
