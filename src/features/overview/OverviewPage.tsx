import React, { useState, useEffect } from 'react';
import type { Forecast, ActionItem } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { ForecastChart } from '../../components/ForecastChart';
import { Money } from '../../components/Money';
import { ShowWorking } from '../../components/ShowWorking';
import { AsOfStamp } from '../../components/AsOfStamp';
import { StatusChip } from '../../components/StatusChip';
import { formatDateIST } from '../../lib/format';
import { AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (path: string) => void;
  onOpenAffordDrawer: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenAffordDrawer
}) => {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverviewData() {
      setLoading(true);
      try {
        const fc = await mockApi.getForecast(horizon);
        const acts = await mockApi.listActions();
        setForecast(fc);
        setActions(acts);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch overview forecast data');
      } finally {
        setLoading(false);
      }
    }
    loadOverviewData();
  }, [horizon]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-rule/40 rounded w-2/3"></div>
        <div className="h-20 bg-surface border border-rule rounded p-4 space-y-2">
          <div className="h-4 bg-rule/50 rounded w-full"></div>
          <div className="h-4 bg-rule/30 rounded w-4/5"></div>
        </div>
        <div className="h-72 bg-surface border border-rule rounded"></div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="p-8 bg-surface border border-rule rounded text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-shortfall mx-auto" />
        <h3 className="text-base font-semibold text-ink">Unable to load forecast data</h3>
        <p className="text-xs text-ink-muted">{error}</p>
      </div>
    );
  }

  const { summary, trace } = forecast;
  const isShortfall = summary.daysBelowThreshold > 0;
  const openActions = actions.filter(a => a.status === 'open').slice(0, 3);
  const totalIn = forecast.events
    .filter(event => event.direction === 'in')
    .reduce((sum, event) => sum + Number(event.amount), 0);
  const totalOut = forecast.events
    .filter(event => event.direction === 'out')
    .reduce((sum, event) => sum + Number(event.amount), 0);

  // Deterministic Newsreader hero sentence from API summary
  const heroSentence = isShortfall
    ? `Caution: Your cash drops to -₹${Math.abs(parseFloat(summary.minCash) / 100000).toFixed(1)} L on ${formatDateIST(
        summary.minCashDate
      )}, breaching your safety threshold.`
    : `Your cash is lowest on ${formatDateIST(summary.minCashDate)} at ₹${(
        parseFloat(summary.minCash) / 100000
      ).toFixed(1)} L, which is ₹${(
        (parseFloat(summary.minCash) - parseFloat(forecast.safetyThreshold)) /
        100000
      ).toFixed(1)} L above your safety threshold.`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Freshness */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Cash Flow Overview</h1>
          <p className="text-xs text-ink-muted">
            Decision engine forecast for Sri Lakshmi Components Pvt Ltd
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AsOfStamp date={forecast.asOf} />
          <button
            onClick={onOpenAffordDrawer}
            className="bg-cash text-surface text-xs font-semibold px-3 py-1.5 rounded hover:bg-cash/90 focus:outline-none transition-colors"
          >
            Can I afford this?
          </button>
        </div>
      </div>

      {/* Hero Decision Sentence (Newsreader Serif) */}
      <div
        className={`p-5 rounded border ${
          isShortfall
            ? 'bg-shortfall/10 border-shortfall/30 text-shortfall'
            : 'bg-surface border-rule text-ink'
        }`}
      >
        <div className="flex items-start gap-3">
          {isShortfall ? (
            <AlertCircle className="w-6 h-6 text-shortfall shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-cash shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block">
              Forecast Summary & Position
            </span>
            <p className="verdict-serif text-xl sm:text-2xl italic leading-snug">
              "{heroSentence}"
            </p>
          </div>
        </div>
      </div>

      {/* Horizon Selector & Step Chart Section */}
      <div className="bg-surface border border-rule rounded-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Cash Balance Forecast</h2>
          <div className="flex items-center gap-1 bg-paper p-1 rounded border border-rule">
            {([30, 60, 90] as const).map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  horizon === h
                    ? 'bg-surface text-cash shadow-xs border border-rule'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>

        <ForecastChart forecast={forecast} horizonDays={horizon} />
      </div>

      {/* Quiet Key Metrics Instrument Row (With "Show working" on each) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Current Cash', value: summary.openingCash, trace },
          { label: `${horizon}-Day Money In`, value: totalIn.toFixed(2), trace },
          { label: `${horizon}-Day Money Out`, value: totalOut.toFixed(2), trace },
          { label: 'Overdue Receivables', value: '240000.00', trace, isWarning: true },
          { label: 'Min Projected Cash', value: summary.minCash, trace, isMin: true }
        ].map((item, idx) => (
          <div key={idx} className="bg-surface border border-rule rounded p-3 space-y-1">
            <span className="text-[11px] font-medium text-ink-muted block truncate">{item.label}</span>
            <Money
              amount={item.value}
              compact
              className={`text-base font-bold ${
                item.isWarning ? 'text-threshold' : item.isMin ? (isShortfall ? 'text-shortfall' : 'text-cash') : 'text-ink'
              }`}
            />
            <div className="pt-1 border-t border-rule/50">
              <ShowWorking trace={item.trace} title={`Working for ${item.label}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Money In / Money Out Split Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Money In */}
        <div className="bg-surface border border-rule rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-cash" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Money In (Next {horizon} Days)
              </h3>
            </div>
            <Money amount={totalIn.toFixed(2)} compact className="text-sm font-bold text-cash" />
          </div>
          <div className="divide-y divide-rule text-xs">
            {forecast.events
              .filter(e => e.direction === 'in')
              .slice(0, 5)
              .map(ev => (
                <div key={ev.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-ink">{ev.counterparty || ev.label}</div>
                    <div className="text-[10px] text-ink-muted">{formatDateIST(ev.date)}</div>
                  </div>
                  <div className="text-right">
                    <Money amount={ev.amount} compact className="font-bold text-cash" />
                    {ev.confidence === 'at_risk' && (
                      <span className="block text-[9px] text-threshold font-semibold uppercase">At Risk</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Money Out */}
        <div className="bg-surface border border-rule rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-shortfall" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Money Out (Next {horizon} Days)
              </h3>
            </div>
            <Money amount={totalOut.toFixed(2)} compact className="text-sm font-bold text-shortfall" />
          </div>
          <div className="divide-y divide-rule text-xs">
            {forecast.events
              .filter(e => e.direction === 'out')
              .slice(0, 5)
              .map(ev => (
                <div key={ev.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-ink">{ev.counterparty || ev.label}</div>
                    <div className="text-[10px] text-ink-muted">{formatDateIST(ev.date)}</div>
                  </div>
                  <Money amount={ev.amount} compact className="font-bold text-shortfall" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Needs Attention & Money at Risk Section */}
      <div className="bg-surface border border-rule rounded p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-shortfall" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Needs Your Attention ({openActions.length} Open Actions)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('/actions')}
            className="text-xs font-semibold text-cash hover:underline inline-flex items-center gap-1"
          >
            <span>View all actions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {openActions.map(act => (
            <div
              key={act.id}
              className="p-3 bg-paper border border-rule rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <StatusChip status={act.severity} />
                  <span className="font-semibold text-ink">{act.title}</span>
                </div>
                <p className="text-ink-muted">{act.reason}</p>
              </div>
              <button
                onClick={() => onNavigate('/actions')}
                className="self-start sm:self-center px-3 py-1 bg-surface border border-rule rounded font-medium text-ink hover:bg-paper shrink-0"
              >
                Take Action
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
