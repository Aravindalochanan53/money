import React, { useState, useEffect } from 'react';
import type { AffordResult } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { ForecastChart } from '../../components/ForecastChart';
import { ShowWorking } from '../../components/ShowWorking';
import { formatIndianCurrency } from '../../lib/format';
import { X, CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, Calendar, Calculator, Loader2 } from 'lucide-react';

interface AffordabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: string;
  defaultDate?: string;
}

export const AffordabilityDrawer: React.FC<AffordabilityDrawerProps> = ({
  isOpen,
  onClose,
  defaultAmount = '200000',
  defaultDate = '2026-10-06'
}) => {
  const [purchaseTitle, setPurchaseTitle] = useState('CNC Tool Presetter');
  const [amount, setAmount] = useState(defaultAmount);
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);
  const [result, setResult] = useState<AffordResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function evaluate() {
      setLoading(true);
      try {
        const res = await mockApi.checkAffordability(amount, purchaseDate);
        if (isMounted) {
          setResult(res);
        }
      } catch (err) {
        console.error('Affordability calculation error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(evaluate, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, amount, purchaseDate]);

  if (!isOpen) return null;

  const quickPresets = [
    { label: '₹1.5 L (Small Tooling)', val: '150000' },
    { label: '₹2.0 L (CNC Presetter)', val: '200000' },
    { label: '₹4.5 L (Raw Material Batch)', val: '450000' },
    { label: '₹8.0 L (CapEx Machine)', val: '800000' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-surface border-l border-rule w-full max-w-2xl h-full flex flex-col justify-between shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-rule bg-paper/60 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cash/10 text-cash flex items-center justify-center border border-cash/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
                Can I afford this?
                {loading && <Loader2 className="w-4 h-4 animate-spin text-cash" />}
              </h2>
              <p className="text-xs text-ink-muted">
                Test planned expenses against your ₹2,60,000.00 safety buffer before spending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-rule/40 text-ink-muted hover:text-ink transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Inputs Section */}
          <div className="bg-paper p-5 rounded-lg border border-rule space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Expense Description
                </label>
                <input
                  type="text"
                  value={purchaseTitle}
                  onChange={e => setPurchaseTitle(e.target.value)}
                  placeholder="e.g. CNC Presetter, Raw Material"
                  className="w-full px-3 py-2 text-sm bg-surface border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Planned Purchase Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
                  />
                  <Calendar className="w-4 h-4 text-ink-muted absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Amount (₹)
                </label>
                <span className="text-xs font-mono font-semibold text-cash">
                  {formatIndianCurrency(amount || 0)}
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step="10000"
                min="0"
                className="w-full px-3 py-2 text-base font-semibold font-mono bg-surface border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              {quickPresets.map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setAmount(p.val)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                    amount === p.val
                      ? 'bg-ink text-surface border-ink font-semibold'
                      : 'bg-surface border-rule text-ink-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verdict Banner */}
          {result && (
            <div
              className={`p-5 rounded-lg border flex items-start gap-4 transition-all duration-200 ${
                result.verdict === 'safe'
                  ? 'bg-cash/5 border-cash/30 text-ink'
                  : result.verdict === 'tight'
                  ? 'bg-amber-500/10 border-amber-500/30 text-ink'
                  : 'bg-shortfall/10 border-shortfall/30 text-ink'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {result.verdict === 'safe' && (
                  <CheckCircle2 className="w-6 h-6 text-cash" />
                )}
                {result.verdict === 'tight' && (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
                {result.verdict === 'unsafe' && (
                  <AlertOctagon className="w-6 h-6 text-shortfall" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      result.verdict === 'safe'
                        ? 'bg-cash text-surface'
                        : result.verdict === 'tight'
                        ? 'bg-amber-500 text-surface'
                        : 'bg-shortfall text-surface'
                    }`}
                  >
                    {result.verdict === 'safe'
                      ? 'AFFORDABLE'
                      : result.verdict === 'tight'
                      ? 'CAUTION — TIGHT BUFFER'
                      : 'UNSAFE — DEFICIT RISK'}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{result.headline}</p>

                {/* Earliest Safe Date recommendation trigger */}
                {result.verdict !== 'safe' && (
                  <div className="pt-2 flex items-center gap-2 text-xs">
                    <span className="text-ink-muted">Suggested Safe Date:</span>
                    <button
                      onClick={() => setPurchaseDate('2026-10-15')}
                      className="font-semibold text-cash hover:underline inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-cash/30"
                    >
                      Reschedule to 15 Oct 2026 <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Side-by-Side Impact Comparison Table */}
          {result && (
            <div className="bg-paper rounded-lg border border-rule p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Decision Financial Impact Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-surface rounded border border-rule">
                  <span className="text-[11px] text-ink-muted block">Lowest Without</span>
                  <span className="text-sm font-mono font-bold text-ink">
                    ₹3,80,000
                  </span>
                </div>
                <div className="p-3 bg-surface rounded border border-rule">
                  <span className="text-[11px] text-ink-muted block">Lowest With</span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      parseFloat(result.withDecision.summary.minCash) < 260000
                        ? 'text-shortfall'
                        : 'text-cash'
                    }`}
                  >
                    ₹{parseFloat(result.withDecision.summary.minCash).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-surface rounded border border-rule">
                  <span className="text-[11px] text-ink-muted block">Cash Impact</span>
                  <span className="text-sm font-mono font-bold text-shortfall">
                    -₹{parseFloat(amount || '0').toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-surface rounded border border-rule">
                  <span className="text-[11px] text-ink-muted block">Safety Reserve</span>
                  <span className="text-sm font-mono font-bold text-amber-600">
                    ₹2,60,000
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Comparative Forecast Chart */}
          {result && (
            <div className="bg-surface rounded-lg border border-rule p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  30-Day Liquidity Curve (Baseline vs With-Decision)
                </h3>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <span className="w-3 h-0.5 bg-ink"></span> Baseline
                  </span>
                  <span className="flex items-center gap-1.5 text-shortfall font-semibold">
                    <span className="w-3 h-0.5 bg-shortfall border-dashed"></span> With Purchase
                  </span>
                </div>
              </div>
              <ForecastChart
                forecast={result.baseline}
                decisionForecast={result.withDecision}
                horizonDays={30}
              />
            </div>
          )}

          {/* Show Working Formula */}
          {result?.trace && <ShowWorking trace={result.trace} />}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-rule bg-paper/50 flex justify-between items-center">
          <span className="text-xs text-ink-muted">
            Evaluation uses real deterministic balance projection
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ink text-surface text-xs font-semibold rounded hover:bg-ink/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
