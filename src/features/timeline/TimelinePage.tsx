import React, { useState, useEffect } from 'react';
import type { Forecast, ForecastPoint } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { ForecastChart } from '../../components/ForecastChart';
import { ShowWorking } from '../../components/ShowWorking';
import { AsOfStamp } from '../../components/AsOfStamp';
import { formatDateIST, formatIndianCurrency } from '../../lib/format';
import { Calendar, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(60);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ForecastPoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fc = await mockApi.getForecast(horizon);
        setForecast(fc);
        if (fc.points.length > 0) {
          setSelectedPoint(fc.points[0]);
        }
      } catch (err) {
        console.error('Failed to load timeline forecast:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [horizon]);

  if (loading || !forecast) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto p-4">
        <div className="h-8 bg-rule/40 rounded w-1/3"></div>
        <div className="h-72 bg-surface border border-rule rounded"></div>
      </div>
    );
  }

  const { summary } = forecast;
  const isBufferBreach = summary.daysBelowThreshold > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Horizon Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-cash" />
            Cash Timeline Radar
          </h1>
          <p className="text-xs text-ink-muted">
            Daily rolling bank balance, expected receivables, and scheduled commitments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AsOfStamp date={forecast.asOf} />
          {/* Horizon Pill Group */}
          <div className="flex bg-paper border border-rule rounded p-0.5">
            {[30, 60, 90].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h as 30 | 60 | 90)}
                className={`text-xs px-3 py-1 font-semibold rounded transition-colors ${
                  horizon === h
                    ? 'bg-ink text-surface shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Opening Cash Balance
          </span>
          <span className="text-xl font-bold font-mono text-ink mt-1 block">
            {formatIndianCurrency(summary.openingCash)}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">As of {formatDateIST(forecast.asOf)}</span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Lowest Projected Cash
          </span>
          <span
            className={`text-xl font-bold font-mono mt-1 block ${
              isBufferBreach ? 'text-shortfall' : 'text-cash'
            }`}
          >
            {formatIndianCurrency(summary.minCash)}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">
            Occurs on {formatDateIST(summary.minCashDate)}
          </span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Safety Cash Reserve
          </span>
          <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
            {formatIndianCurrency(forecast.safetyThreshold)}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">Non-negotiable buffer</span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Liquidity Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            {isBufferBreach ? (
              <>
                <AlertTriangle className="w-5 h-5 text-shortfall" />
                <span className="text-sm font-bold text-shortfall">Buffer Breach Expected</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-cash" />
                <span className="text-sm font-bold text-cash">Comfortably Covered</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-ink-muted mt-0.5 block">
            {isBufferBreach
              ? `${summary.daysBelowThreshold} days below safety threshold`
              : 'Full safety buffer maintained'}
          </span>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <div className="bg-surface p-5 rounded-lg border border-rule space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
            {horizon}-Day Daily Projected Liquidity Curve
          </h2>
          <span className="text-xs text-ink-muted">
            Hover over any day or click to inspect transaction items
          </span>
        </div>
        <ForecastChart
          forecast={forecast}
          horizonDays={horizon}
          onSelectDay={pt => setSelectedPoint(pt)}
        />
      </div>

      {/* Day Inspector & Itemized Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Day Inspector */}
        <div className="bg-surface p-5 rounded-lg border border-rule space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cash" />
              Day Detail: {selectedPoint ? formatDateIST(selectedPoint.date) : 'Select a date'}
            </h3>
          </div>

          {selectedPoint && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-muted">Opening Cash:</span>
                <span className="font-mono font-semibold text-ink">
                  {formatIndianCurrency(selectedPoint.openingCash)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-muted flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-cash" /> Inflows:
                </span>
                <span className="font-mono font-semibold text-cash">
                  +{formatIndianCurrency(selectedPoint.inflow)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-muted flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-shortfall" /> Outflows:
                </span>
                <span className="font-mono font-semibold text-shortfall">
                  -{formatIndianCurrency(selectedPoint.outflow)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-rule pt-2 font-bold">
                <span className="text-ink">Closing Balance:</span>
                <span
                  className={`font-mono text-sm ${
                    parseFloat(selectedPoint.closingCash) < parseFloat(forecast.safetyThreshold)
                      ? 'text-shortfall'
                      : 'text-ink'
                  }`}
                >
                  {formatIndianCurrency(selectedPoint.closingCash)}
                </span>
              </div>
            </div>
          )}

          {/* Events on this day */}
          <div className="border-t border-rule pt-3 space-y-2">
            <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Transactions On This Day
            </h4>
            {selectedPoint &&
            forecast.events.filter(e => e.date === selectedPoint.date).length > 0 ? (
              <div className="space-y-2">
                {forecast.events
                  .filter(e => e.date === selectedPoint.date)
                  .map(ev => (
                    <div
                      key={ev.id}
                      className="p-2 bg-paper rounded border border-rule text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-ink block">{ev.label}</span>
                        <span className="text-[10px] text-ink-muted capitalize">
                          {ev.kind.replace('_', ' ')}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          ev.direction === 'in' ? 'text-cash' : 'text-shortfall'
                        }`}
                      >
                        {ev.direction === 'in' ? '+' : '-'}
                        {formatIndianCurrency(ev.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted italic py-2">
                No active inflows or scheduled outflows on this date.
              </p>
            )}
          </div>
        </div>

        {/* Milestone Days Table */}
        <div className="lg:col-span-2 bg-surface p-5 rounded-lg border border-rule space-y-3">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
            Key Timeline Milestone Days
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-paper text-ink-muted font-semibold border-b border-rule">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Inflows (₹)</th>
                  <th className="py-2.5 px-3">Outflows (₹)</th>
                  <th className="py-2.5 px-3">Projected Closing (₹)</th>
                  <th className="py-2.5 px-3">Buffer Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-mono">
                {forecast.points
                  .filter(p => parseFloat(p.inflow) > 0 || parseFloat(p.outflow) > 0 || p.date === summary.minCashDate)
                  .slice(0, 10)
                  .map(p => {
                    const closingNum = parseFloat(p.closingCash);
                    const thresholdNum = parseFloat(forecast.safetyThreshold);
                    const isBreach = closingNum < thresholdNum;
                    const isLowest = p.date === summary.minCashDate;

                    return (
                      <tr
                        key={p.date}
                        onClick={() => setSelectedPoint(p)}
                        className={`cursor-pointer transition-colors ${
                          selectedPoint?.date === p.date
                            ? 'bg-cash/10 font-semibold'
                            : 'hover:bg-paper'
                        }`}
                      >
                        <td className="py-2 px-3 font-sans font-medium text-ink flex items-center gap-1.5">
                          {formatDateIST(p.date)}
                          {isLowest && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-600 font-bold rounded">
                              LOWEST
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-cash">
                          {parseFloat(p.inflow) > 0 ? `+${formatIndianCurrency(p.inflow)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-shortfall">
                          {parseFloat(p.outflow) > 0 ? `-${formatIndianCurrency(p.outflow)}` : '—'}
                        </td>
                        <td className={`py-2 px-3 font-bold ${isBreach ? 'text-shortfall' : 'text-ink'}`}>
                          {formatIndianCurrency(p.closingCash)}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {isBreach ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-shortfall/10 text-shortfall font-semibold">
                              Breach
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cash/10 text-cash font-semibold">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Show Working Formula */}
      {forecast.trace && <ShowWorking trace={forecast.trace} />}
    </div>
  );
};
