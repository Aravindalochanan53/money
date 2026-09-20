import React, { useState, useEffect } from 'react';
import type { ActionItem } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { formatDateIST, formatIndianCurrency } from '../../lib/format';
import { CheckSquare, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export const ActionsPage: React.FC = () => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done' | 'dismissed'>('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await mockApi.listActions();
        setActions(data);
      } catch (err) {
        console.error('Failed to load action items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleStatusChange(actionId: string, newStatus: 'open' | 'done' | 'dismissed') {
    try {
      await mockApi.updateActionStatus(actionId, newStatus);
      setActions(prev =>
        prev.map(a => (a.id === actionId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update action status:', err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto p-4">
        <div className="h-8 bg-rule/40 rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-28 bg-surface border border-rule rounded"></div>
          <div className="h-28 bg-surface border border-rule rounded"></div>
        </div>
      </div>
    );
  }

  const filteredActions = actions.filter(a =>
    statusFilter === 'all' ? true : a.status === statusFilter
  );

  const openCount = actions.filter(a => a.status === 'open').length;
  const criticalCount = actions.filter(a => a.status === 'open' && a.severity === 'critical').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cash" />
            Action Center
          </h1>
          <p className="text-xs text-ink-muted">
            Deterministic liquidity interventions prioritized by financial urgency
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex bg-paper border border-rule rounded p-0.5">
          {[
            { id: 'open', label: `Open Tasks (${openCount})` },
            { id: 'done', label: 'Completed' },
            { id: 'dismissed', label: 'Dismissed' },
            { id: 'all', label: 'All' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`text-xs px-3 py-1 font-semibold rounded transition-colors ${
                statusFilter === tab.id
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Open Action Items
          </span>
          <span className="text-xl font-bold font-mono text-ink mt-1 block">
            {openCount}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">Pending business decisions</span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Critical Deficit Warnings
          </span>
          <span className="text-xl font-bold font-mono text-shortfall mt-1 block">
            {criticalCount}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">Immediate attention needed</span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Resolved Interventions
          </span>
          <span className="text-xl font-bold font-mono text-cash mt-1 block">
            {actions.filter(a => a.status === 'done').length}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">Liquidity preserved</span>
        </div>
      </div>

      {/* Action Cards List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-rule rounded-lg space-y-2">
            <CheckCircle2 className="w-8 h-8 text-cash mx-auto" />
            <h3 className="text-sm font-bold text-ink">No action items in this view</h3>
            <p className="text-xs text-ink-muted">All liquidity protection tasks are up to date.</p>
          </div>
        ) : (
          filteredActions.map(action => {
            const isCritical = action.severity === 'critical';
            const isHigh = action.severity === 'high';

            return (
              <div
                key={action.id}
                className={`p-5 rounded-lg border bg-surface transition-all ${
                  action.status === 'done'
                    ? 'opacity-60 border-rule'
                    : isCritical
                    ? 'border-l-4 border-l-shortfall border-rule shadow-xs'
                    : isHigh
                    ? 'border-l-4 border-l-amber-500 border-rule shadow-xs'
                    : 'border-rule'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Severity & Rule Code */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCritical
                            ? 'bg-shortfall text-surface'
                            : isHigh
                            ? 'bg-amber-500 text-surface'
                            : 'bg-paper text-ink-muted border border-rule'
                        }`}
                      >
                        {action.severity.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs font-semibold text-ink-muted">
                        {action.ruleId}
                      </span>
                      {action.dueDate && (
                        <span className="text-xs text-ink-muted flex items-center gap-1 font-sans">
                          <Clock className="w-3.5 h-3.5" /> Due: {formatDateIST(action.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-ink tracking-tight">
                      {action.title}
                    </h3>

                    {/* Financial Reason */}
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {action.reason}
                    </p>

                    {/* Suggested Next Step Callout */}
                    <div className="p-3 bg-paper rounded border border-rule flex items-start gap-2 text-xs">
                      <ArrowRight className="w-4 h-4 text-cash shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-ink">Suggested Action: </span>
                        <span className="text-ink">{action.nextStep}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Amount & Action Buttons */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 shrink-0">
                    {action.amount && (
                      <div className="text-right">
                        <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
                          Associated Amount
                        </span>
                        <span className="text-base font-mono font-bold text-ink">
                          {formatIndianCurrency(action.amount)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {action.status === 'open' ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(action.id, 'done')}
                            className="px-3 py-1.5 bg-cash text-surface text-xs font-semibold rounded hover:bg-cash/90 transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                          </button>
                          <button
                            onClick={() => handleStatusChange(action.id, 'dismissed')}
                            className="px-2.5 py-1.5 bg-paper text-ink-muted hover:text-ink text-xs font-medium rounded border border-rule hover:bg-surface transition-colors"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(action.id, 'open')}
                          className="px-3 py-1 bg-paper text-xs text-ink font-semibold rounded border border-rule hover:bg-surface"
                        >
                          Reopen Task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
