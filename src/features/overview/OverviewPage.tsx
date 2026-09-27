import React, { useState, useEffect } from 'react';
import type { Forecast, ActionItem } from '../../contracts/api';
import { apiClient } from '../../lib/api/client';
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

interface DashboardOverview {
  business_name: string;
  currency: string;
  current_cash: number;
  safety_threshold: number;
  min_cash_30: number;
  min_cash_date_30: string;
  total_receivables: number;
  overdue_receivables: number;
  total_payables: number;
  net_working_capital_position: number;
  has_buffer_breach_30: boolean;
  has_deficit_30: boolean;
  critical_actions_count: number;
  warning_actions_count: number;
  sparkline: any[];
  top_actions: any[];
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenAffordDrawer
}) => {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverviewData() {
      setLoading(true);
      try {
        const [ovData, tlData, acts] = await Promise.all([
          apiClient.dashboard.getOverview(),
          apiClient.timeline.getTimeline(horizon),
          apiClient.actions.list()
        ]);

        setOverview(ovData);

        // Transform backend timeline to Forecast contract
        const points = (tlData.timeline || []).map((p: any) => ({
          date: p.date,
          openingCash: p.opening_balance.toFixed(2),
          inflow: p.inflows.toFixed(2),
          outflow: p.outflows.toFixed(2),
          closingCash: p.closing_balance.toFixed(2)
        }));

        const fc: Forecast = {
          asOf: tlData.anchor_date,
          horizonDays: horizon,
          safetyThreshold: tlData.safety_threshold.toFixed(2),
          points,
          events: tlData.events || [],
          summary: {
            openingCash: tlData.starting_cash.toFixed(2),
            minCash: tlData.min_projected_cash.toFixed(2),
            minCashDate: tlData.min_cash_date,
            endCash: tlData.ending_cash.toFixed(2),
            daysBelowThreshold: tlData.buffer_breach_count
          },
          trace: {
            formula: "Starting Cash + Total Projected Inflows - Total Projected Outflows",
            inputs: [
              { label: "Starting Cash", value: `₹${tlData.starting_cash.toLocaleString('en-IN')}` },
              { label: "Projected Inflows", value: `₹${tlData.total_projected_inflows.toLocaleString('en-IN')}` },
              { label: "Projected Outflows", value: `₹${tlData.total_projected_outflows.toLocaleString('en-IN')}` },
              { label: "Safety Threshold", value: `₹${tlData.safety_threshold.toLocaleString('en-IN')}` },
            ]
          }
        };

        setForecast(fc);

        // Normalize action items
        const normalizedActions: ActionItem[] = acts.map((a: any) => ({
          id: a.id,
          ruleId: a.action_code || 'RULE-01',
          title: a.title,
          reason: a.description,
          severity: a.severity.toLowerCase() as any,
          nextStep: a.suggested_action,
          status: a.status.toLowerCase() === 'resolved' ? 'done' : (a.status.toLowerCase() === 'dismissed' ? 'dismissed' : 'open'),
          amount: a.amount ? String(a.amount) : undefined,
          dueDate: a.target_date || undefined
        }));
        setActions(normalizedActions);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data from backend');
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

  if (error || !forecast || !overview) {
    return (
      <div className="p-8 bg-surface border border-rule rounded text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-shortfall mx-auto" />
        <h3 className="text-base font-semibold text-ink">Unable to load dashboard data</h3>
        <p className="text-xs text-ink-muted">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs px-3 py-1.5 bg-cash text-surface font-semibold rounded"
        >
          Retry Connection
        </button>
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

  // Deterministic Newsreader hero sentence from backend summary
  const heroSentence = isShortfall
    ? `Caution: Your cash drops to ₹${(parseFloat(summary.minCash) / 100000).toFixed(1)} L on ${formatDateIST(
        summary.minCashDate
      )}, breaching your safety threshold of ₹${(overview.safety_threshold / 100000).toFixed(1)} L.`
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
            Decision engine forecast for <span className="font-semibold text-ink">{overview.business_name}</span>
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

      {/* Quiet Key Metrics Instrument Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Current Cash', value: overview.current_cash.toFixed(2), trace },
          { label: `${horizon}-Day Money In`, value: totalIn.toFixed(2), trace },
          { label: `${horizon}-Day Money Out`, value: totalOut.toFixed(2), trace },
          {
            label: 'Overdue Receivables',
            value: overview.overdue_receivables.toFixed(2),
            trace,
            isWarning: overview.overdue_receivables > 0
          },
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
          {forecast.events.filter(e => e.direction === 'in').length === 0 ? (
            <p className="text-xs text-ink-muted py-4 text-center">No collections scheduled</p>
          ) : (
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
          )}
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
          {forecast.events.filter(e => e.direction === 'out').length === 0 ? (
            <p className="text-xs text-ink-muted py-4 text-center">No disbursements scheduled</p>
          ) : (
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
          )}
        </div>
      </div>

      {/* Needs Attention & Action Center Section */}
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

        {openActions.length === 0 ? (
          <p className="text-xs text-ink-muted py-2">No urgent action items. Business position is sound.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
};
