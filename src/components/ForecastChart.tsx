import React, { useState, useId } from 'react';
import type { Forecast, ForecastPoint } from '../contracts/api';
import { formatCompactCurrency, formatDateIST } from '../lib/format';
import { Table, BarChart2 } from 'lucide-react';

interface ForecastChartProps {
  forecast: Forecast;
  decisionForecast?: Forecast;
  horizonDays?: 30 | 60 | 90;
  onSelectDay?: (point: ForecastPoint) => void;
  className?: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  decisionForecast,
  horizonDays = 30,
  onSelectDay,
  className = ''
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTableView, setShowTableView] = useState(false);
  const patternId = useId();

  const points = forecast.points.slice(0, horizonDays + 1);
  const decisionPoints = decisionForecast ? decisionForecast.points.slice(0, horizonDays + 1) : null;
  const threshold = parseFloat(forecast.safetyThreshold);

  if (!points || points.length === 0) {
    return <div className="p-8 text-center text-ink-muted text-xs">No forecast data available.</div>;
  }

  // Calculate Y domain bounds (including zero, threshold, min cash, max cash)
  let minVal = Math.min(0, threshold, ...points.map(p => parseFloat(p.closingCash)));
  let maxVal = Math.max(threshold * 1.5, ...points.map(p => parseFloat(p.closingCash)));
  
  if (decisionPoints) {
    minVal = Math.min(minVal, ...decisionPoints.map(p => parseFloat(p.closingCash)));
    maxVal = Math.max(maxVal, ...decisionPoints.map(p => parseFloat(p.closingCash)));
  }

  // Add 15% padding to Y bounds
  const yPadding = (maxVal - minVal) * 0.15 || 100000;
  const yMin = minVal - yPadding;
  const yMax = maxVal + yPadding;

  // Chart dimensions
  const width = 800;
  const height = 300;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 55;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (index / (points.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    if (yMax === yMin) return paddingTop + chartH / 2;
    const ratio = (val - yMin) / (yMax - yMin);
    return paddingTop + chartH - ratio * chartH;
  };

  // Build SVG step path for baseline cash
  const buildStepPath = (pts: ForecastPoint[]) => {
    let d = '';
    pts.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(parseFloat(pt.closingCash));
      if (i === 0) {
        d += `M ${x},${y}`;
      } else {
        d += ` H ${x} V ${y}`;
      }
    });
    return d;
  };

  const baselinePath = buildStepPath(points);
  const decisionPath = decisionPoints ? buildStepPath(decisionPoints) : '';

  const thresholdY = getY(threshold);
  const zeroY = getY(0);

  // Find lowest point marker
  let minPointIndex = 0;
  let minCashVal = parseFloat(points[0].closingCash);
  points.forEach((pt, idx) => {
    const val = parseFloat(pt.closingCash);
    if (val < minCashVal) {
      minCashVal = val;
      minPointIndex = idx;
    }
  });

  const activeIdx = hoverIndex !== null ? hoverIndex : selectedIndex !== null ? selectedIndex : minPointIndex;
  const activePoint = points[activeIdx];
  const activeDecisionPoint = decisionPoints ? decisionPoints[activeIdx] : null;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const current = activeIdx;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(points.length - 1, current + 1);
      setSelectedIndex(next);
      if (onSelectDay) onSelectDay(points[next]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, current - 1);
      setSelectedIndex(prev);
      if (onSelectDay) onSelectDay(points[prev]);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      const jump = Math.max(0, current - 7);
      setSelectedIndex(jump);
      if (onSelectDay) onSelectDay(points[jump]);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      const jump = Math.min(points.length - 1, current + 7);
      setSelectedIndex(jump);
      if (onSelectDay) onSelectDay(points[jump]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
      if (onSelectDay) onSelectDay(points[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(points.length - 1);
      if (onSelectDay) onSelectDay(points[points.length - 1]);
    }
  };

  // Generate 5 friendly Y-axis ticks
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }).map((_, i) => {
    const val = yMin + (i / (tickCount - 1)) * (yMax - yMin);
    return { val, y: getY(val) };
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Chart Accessibility Controls & Summary */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-4 text-ink-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cash rounded-full"></span>
            <span>Baseline Cash</span>
          </div>
          {decisionPoints && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-decision rounded-full"></span>
              <span>With Decision</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-threshold"></span>
            <span>Safety Threshold ({formatCompactCurrency(threshold)})</span>
          </div>
        </div>

        <button
          onClick={() => setShowTableView(!showTableView)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-paper border border-rule text-ink-muted hover:text-ink focus:outline-none"
        >
          {showTableView ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          <span>{showTableView ? 'Show Chart' : 'Show Accessible Data Table'}</span>
        </button>
      </div>

      {showTableView ? (
        /* Accessible Data Table View */
        <div className="border border-rule rounded overflow-x-auto max-h-[320px]">
          <table className="w-full text-xs text-left tabular-nums">
            <thead className="bg-paper border-b border-rule sticky top-0">
              <tr>
                <th className="p-2 font-semibold text-ink">Date</th>
                <th className="p-2 font-semibold text-ink">Opening Cash</th>
                <th className="p-2 font-semibold text-cash">Inflow</th>
                <th className="p-2 font-semibold text-shortfall">Outflow</th>
                <th className="p-2 font-semibold text-ink">Closing Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {points.map((pt, idx) => (
                <tr key={pt.date} className={idx === activeIdx ? 'bg-cash/10 font-medium' : 'hover:bg-paper/50'}>
                  <td className="p-2">{formatDateIST(pt.date)}</td>
                  <td className="p-2">₹{parseFloat(pt.openingCash).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-cash">+₹{parseFloat(pt.inflow).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-shortfall">-₹{parseFloat(pt.outflow).toLocaleString('en-IN')}</td>
                  <td className="p-2 font-bold">
                    <span className={parseFloat(pt.closingCash) < threshold ? 'text-shortfall' : ''}>
                      ₹{parseFloat(pt.closingCash).toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Interactive Step Chart SVG Container */
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="relative bg-surface border border-rule rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-cash select-none"
          role="region"
          aria-label="Cash Forecast Step Line Chart. Use Left and Right arrow keys to inspect daily cash values."
        >
          {/* Active Hover / Focus Mobile Readout Bar */}
          {activePoint && (
            <div className="bg-paper border border-rule rounded p-2 text-xs flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{formatDateIST(activePoint.date)}</span>
                <span className="text-ink-muted">Opening: ₹{parseFloat(activePoint.openingCash).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-cash font-medium">+In: ₹{parseFloat(activePoint.inflow).toLocaleString('en-IN')}</span>
                <span className="text-shortfall font-medium">-Out: ₹{parseFloat(activePoint.outflow).toLocaleString('en-IN')}</span>
                <span className="font-bold text-ink border-l border-rule pl-2">
                  Closing: ₹{parseFloat(activePoint.closingCash).toLocaleString('en-IN')}
                </span>
                {activeDecisionPoint && (
                  <span className="font-bold text-decision border-l border-rule pl-2">
                    With Purchase: ₹{parseFloat(activeDecisionPoint.closingCash).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Subtle hatched pattern for area below safety threshold */}
              <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--threshold)" strokeWidth="1" strokeOpacity="0.15" />
              </pattern>

              {/* Baseline animation styling */}
              <style>{`
                @media (prefers-reduced-motion: no-preference) {
                  .draw-line {
                    stroke-dasharray: 2000;
                    stroke-dashoffset: 2000;
                    animation: draw 1.2s ease-out forwards;
                  }
                }
                @keyframes draw {
                  to { stroke-dashoffset: 0; }
                }
              `}</style>
            </defs>

            {/* Background Grid Lines */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={width - paddingRight}
                  y2={tick.y}
                  stroke="var(--rule)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-ink-muted text-[10px] tabular-nums"
                >
                  {formatCompactCurrency(tick.val)}
                </text>
              </g>
            ))}

            {/* Area below safety threshold hatched fill */}
            <rect
              x={paddingLeft}
              y={thresholdY}
              width={chartW}
              height={Math.max(0, height - paddingBottom - thresholdY)}
              fill={`url(#${patternId})`}
            />

            {/* Safety Threshold Line */}
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={width - paddingRight}
              y2={thresholdY}
              stroke="var(--threshold)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={width - paddingRight - 4}
              y={thresholdY - 4}
              textAnchor="end"
              className="fill-threshold text-[9px] font-semibold tracking-wider uppercase"
            >
              Safety Threshold ({formatCompactCurrency(threshold)})
            </text>

            {/* Zero Cash Line (if within Y range) */}
            {zeroY >= paddingTop && zeroY <= height - paddingBottom && (
              <line
                x1={paddingLeft}
                y1={zeroY}
                x2={width - paddingRight}
                y2={zeroY}
                stroke="var(--shortfall)"
                strokeWidth="1"
                strokeDasharray="1 3"
              />
            )}

            {/* Decision Scenario Step Line (if active) */}
            {decisionPath && (
              <path
                d={decisionPath}
                fill="none"
                stroke="var(--decision)"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
            )}

            {/* Baseline Cash Step Line */}
            <path
              d={baselinePath}
              fill="none"
              stroke="var(--cash)"
              strokeWidth="2.5"
              className="draw-line"
            />

            {/* Event Lane Markers (Bottom axis) */}
            {points.map((pt, i) => {
              const x = getX(i);
              const hasInflow = parseFloat(pt.inflow) > 0;
              const hasOutflow = parseFloat(pt.outflow) > 0;
              const isSelected = i === activeIdx;

              return (
                <g
                  key={pt.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onClick={() => {
                    setSelectedIndex(i);
                    if (onSelectDay) onSelectDay(pt);
                  }}
                >
                  {/* Vertical Hover Indicator Line */}
                  {isSelected && (
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={height - paddingBottom + 20}
                      stroke="var(--ink)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Baseline Point Marker */}
                  <circle
                    cx={x}
                    cy={getY(parseFloat(pt.closingCash))}
                    r={isSelected ? 5 : 3}
                    className={`${isSelected ? 'fill-cash stroke-surface stroke-2' : 'fill-cash'}`}
                  />

                  {/* Event Lane Inflow / Outflow Markers */}
                  {hasInflow && (
                    <polygon
                      points={`${x-3},${height - paddingBottom + 12} ${x+3},${height - paddingBottom + 12} ${x},${height - paddingBottom + 6}`}
                      className="fill-cash"
                    />
                  )}
                  {hasOutflow && (
                    <polygon
                      points={`${x-3},${height - paddingBottom + 18} ${x+3},${height - paddingBottom + 18} ${x},${height - paddingBottom + 24}`}
                      className="fill-shortfall"
                    />
                  )}

                  {/* X-axis Date Ticks (Every 5th day) */}
                  {(i % 5 === 0 || i === points.length - 1) && (
                    <text
                      x={x}
                      y={height - paddingBottom + 38}
                      textAnchor="middle"
                      className="fill-ink-muted text-[9px] tabular-nums"
                    >
                      {new Date(pt.date).getDate()} {new Date(pt.date).toLocaleString('default', { month: 'short' })}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Minimum Cash Point Callout Badge */}
            {points[minPointIndex] && (
              <g transform={`translate(${getX(minPointIndex)}, ${getY(parseFloat(points[minPointIndex].closingCash))})`}>
                <circle r="6" className="fill-shortfall stroke-surface stroke-2" />
                <rect
                  x="-55"
                  y="-26"
                  width="110"
                  height="18"
                  rx="3"
                  className="fill-ink stroke-rule"
                />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  className="fill-paper text-[9px] font-semibold tabular-nums"
                >
                  Lowest: {formatCompactCurrency(minCashVal)} ({new Date(points[minPointIndex].date).getDate()} {new Date(points[minPointIndex].date).toLocaleString('default', { month: 'short' })})
                </text>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};
