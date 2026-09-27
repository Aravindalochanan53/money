import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api/client';
import { formatIndianCurrency, formatDateIST } from '../../lib/format';
import { Sliders, Play, AlertTriangle, CheckCircle2, BookmarkPlus, Trash2, AlertCircle } from 'lucide-react';

interface ComparisonPoint {
  date: string;
  baseline_closing: number;
  simulated_closing: number;
  difference: number;
  is_buffer_breach: boolean;
  is_deficit: boolean;
}

interface SimResult {
  scenario_name: string;
  scenario_type: string;
  scenario_description: string;
  params: any;
  baseline_min_cash: number;
  simulated_min_cash: number;
  min_cash_impact: number;
  simulated_ending_cash: number;
  has_buffer_breach: boolean;
  has_deficit: boolean;
  comparison_timeline: ComparisonPoint[];
}

export const ScenariosPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState<'UNPLANNED_EXPENSE' | 'DELAY_CUSTOMER_PAYMENT' | 'REDUCE_COLLECTIONS_PERCENT' | 'POSTPONE_SUPPLIER_PAYABLE'>('UNPLANNED_EXPENSE');
  const [scenarioName, setScenarioName] = useState('New Equipment Purchase');
  const [amount, setAmount] = useState('200000');
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [delayDays, setDelayDays] = useState('20');
  const [dropPercent, setDropPercent] = useState('15');
  const [postponeDays, setPostponeDays] = useState('15');

  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persisted scenarios
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [savingScenario, setSavingScenario] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadSavedScenarios = async () => {
    try {
      const data = await apiClient.scenarios.list();
      setSavedScenarios(data);
    } catch (err) {
      console.error('Failed to load saved scenarios:', err);
    }
  };

  useEffect(() => {
    loadSavedScenarios();
  }, []);

  const getPayload = () => {
    let params: any = { name: scenarioName };
    if (scenarioType === 'UNPLANNED_EXPENSE') {
      params = {
        ...params,
        amount: parseFloat(amount) || 0,
        expense_date: expenseDate,
        title: scenarioName
      };
    } else if (scenarioType === 'DELAY_CUSTOMER_PAYMENT') {
      params = {
        ...params,
        delay_days: parseInt(delayDays, 10) || 15,
        customer_name: 'Key Customer'
      };
    } else if (scenarioType === 'REDUCE_COLLECTIONS_PERCENT') {
      params = {
        ...params,
        drop_percent: parseFloat(dropPercent) || 10
      };
    } else if (scenarioType === 'POSTPONE_SUPPLIER_PAYABLE') {
      params = {
        ...params,
        postpone_days: parseInt(postponeDays, 10) || 15,
        supplier_name: 'Key Supplier'
      };
    }
    return { scenario_type: scenarioType, params, days: 90 };
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.scenarios.simulate(getPayload());
      setSimResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    setSavingScenario(true);
    setSaveSuccess(null);
    try {
      const payload = getPayload();
      await apiClient.scenarios.create({
        name: scenarioName,
        description: simResult?.scenario_description || `${scenarioType} simulation`,
        scenario_type: scenarioType,
        params: payload.params
      });
      setSaveSuccess('Scenario successfully persisted to database!');
      await loadSavedScenarios();
    } catch (err: any) {
      setError(err.message || 'Failed to save scenario');
    } finally {
      setSavingScenario(false);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      await apiClient.scenarios.delete(id);
      await loadSavedScenarios();
    } catch (err: any) {
      setError(err.message || 'Failed to delete scenario');
    }
  };

  const handleRunSaved = async (sc: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.scenarios.simulatePersisted(sc.id, 90);
      setSimResult(res);
      setScenarioName(sc.name);
      setScenarioType(sc.scenario_type as any);
    } catch (err: any) {
      setError(err.message || 'Failed to execute saved scenario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cash" />
            Scenario Simulator & Stress Testing
          </h1>
          <p className="text-xs text-ink-muted">
            Model operational shocks, customer payment delays, and capital commitments non-destructively
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-shortfall/10 border border-shortfall/30 rounded text-xs text-shortfall flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-cash/10 border border-cash/30 rounded text-xs text-cash flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Main Grid: Controls vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-surface p-5 rounded border border-rule space-y-4">
          <h2 className="text-sm font-bold text-ink">1. Define Scenario Parameters</h2>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Scenario Title</label>
            <input
              type="text"
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Simulation Archetype</label>
            <select
              value={scenarioType}
              onChange={e => setScenarioType(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
            >
              <option value="UNPLANNED_EXPENSE">Unplanned Capital Outflow</option>
              <option value="DELAY_CUSTOMER_PAYMENT">Customer Payment Delay Shock</option>
              <option value="REDUCE_COLLECTIONS_PERCENT">Market Slowdown (% Haircut on Collections)</option>
              <option value="POSTPONE_SUPPLIER_PAYABLE">Supplier Bill Postponement</option>
            </select>
          </div>

          {scenarioType === 'UNPLANNED_EXPENSE' && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Outflow Amount (₹)</label>
                <input
                  type="number"
                  step="1000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded font-mono font-bold text-ink focus:outline-none focus:border-cash"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Outflow Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded font-mono text-ink focus:outline-none focus:border-cash"
                />
              </div>
            </>
          )}

          {scenarioType === 'DELAY_CUSTOMER_PAYMENT' && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Additional Delay (Days)</label>
              <input
                type="number"
                value={delayDays}
                onChange={e => setDelayDays(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded font-mono text-ink focus:outline-none focus:border-cash"
              />
            </div>
          )}

          {scenarioType === 'REDUCE_COLLECTIONS_PERCENT' && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Collection Haircut (%)</label>
              <input
                type="number"
                value={dropPercent}
                onChange={e => setDropPercent(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded font-mono text-ink focus:outline-none focus:border-cash"
              />
            </div>
          )}

          {scenarioType === 'POSTPONE_SUPPLIER_PAYABLE' && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Postpone By (Days)</label>
              <input
                type="number"
                value={postponeDays}
                onChange={e => setPostponeDays(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-paper border border-rule rounded font-mono text-ink focus:outline-none focus:border-cash"
              />
            </div>
          )}

          <div className="pt-3 border-t border-rule space-y-2">
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-2 bg-cash text-surface text-xs font-semibold rounded hover:bg-cash/90 focus:outline-none flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>

            {simResult && (
              <button
                onClick={handleSaveScenario}
                disabled={savingScenario}
                className="w-full py-1.5 bg-paper border border-rule hover:border-ink-muted text-ink text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-cash" />
                <span>{savingScenario ? 'Persisting...' : 'Persist to Database'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-4">
          {simResult ? (
            <div className="bg-surface p-5 rounded border border-rule space-y-5">
              <div className="flex items-start justify-between border-b border-rule pb-3">
                <div>
                  <h2 className="text-base font-bold text-ink">{simResult.scenario_name}</h2>
                  <p className="text-xs text-ink-muted">{simResult.scenario_description}</p>
                </div>
                {simResult.has_deficit ? (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-shortfall text-surface flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> DEFICIT RISK
                  </span>
                ) : simResult.has_buffer_breach ? (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-threshold text-ink flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> BUFFER BREACH
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-cash text-surface flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ABSORBABLE
                  </span>
                )}
              </div>

              {/* Impact Comparison Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-paper p-3 rounded border border-rule space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted block">Baseline Low Cash</span>
                  <span className="text-sm font-bold font-mono text-ink block">
                    {formatIndianCurrency(simResult.baseline_min_cash)}
                  </span>
                </div>

                <div className="bg-paper p-3 rounded border border-rule space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted block">Simulated Low Cash</span>
                  <span className="text-sm font-bold font-mono text-ink block">
                    {formatIndianCurrency(simResult.simulated_min_cash)}
                  </span>
                </div>

                <div className="bg-paper p-3 rounded border border-rule space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted block">Cash Headroom Delta</span>
                  <span className={`text-sm font-bold font-mono block ${simResult.min_cash_impact < 0 ? 'text-shortfall' : 'text-cash'}`}>
                    {simResult.min_cash_impact < 0 ? '-' : '+'}
                    {formatIndianCurrency(Math.abs(simResult.min_cash_impact))}
                  </span>
                </div>
              </div>

              {/* Trajectory Table Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  Key Horizon Trajectory Points (Next 90 Days)
                </h3>
                <div className="max-h-56 overflow-y-auto border border-rule rounded text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-paper text-ink-muted border-b border-rule font-mono text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Baseline (₹)</th>
                        <th className="py-2 px-3 text-right">Simulated (₹)</th>
                        <th className="py-2 px-3 text-right">Impact (₹)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule font-mono">
                      {simResult.comparison_timeline.slice(0, 15).map(pt => (
                        <tr key={pt.date} className="hover:bg-paper/50">
                          <td className="py-1.5 px-3 font-sans">{formatDateIST(pt.date)}</td>
                          <td className="py-1.5 px-3 text-right">{pt.baseline_closing.toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-ink">{pt.simulated_closing.toLocaleString('en-IN')}</td>
                          <td className={`py-1.5 px-3 text-right ${pt.difference < 0 ? 'text-shortfall' : 'text-cash'}`}>
                            {pt.difference < 0 ? '-' : '+'}{Math.abs(pt.difference).toLocaleString('en-IN')}
                          </td>
                          <td className="py-1.5 px-3 text-center font-sans text-[10px]">
                            {pt.is_deficit ? (
                              <span className="text-shortfall font-bold">Deficit</span>
                            ) : pt.is_buffer_breach ? (
                              <span className="text-threshold font-bold">Breach</span>
                            ) : (
                              <span className="text-cash font-medium">Safe</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface p-12 rounded border border-rule text-center space-y-2 text-ink-muted">
              <Sliders className="w-8 h-8 mx-auto text-ink-muted/50" />
              <p className="text-xs font-semibold text-ink">Ready to simulate</p>
              <p className="text-xs">Adjust scenario parameters on the left and click "Run Simulation".</p>
            </div>
          )}

          {/* Persisted Scenarios List */}
          <div className="bg-surface p-4 rounded border border-rule space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4 text-cash" />
              <span>Persisted Scenarios in Database ({savedScenarios.length})</span>
            </h3>

            {savedScenarios.length === 0 ? (
              <p className="text-xs text-ink-muted py-2">No persisted scenarios saved yet.</p>
            ) : (
              <div className="divide-y divide-rule text-xs">
                {savedScenarios.map(sc => (
                  <div key={sc.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-ink block">{sc.name}</span>
                      <span className="text-[10px] text-ink-muted block">{sc.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRunSaved(sc)}
                        className="px-2.5 py-1 bg-paper border border-rule hover:border-cash rounded text-ink text-xs font-medium flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 text-cash" />
                        <span>Re-simulate</span>
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(sc.id)}
                        className="p-1 text-ink-muted hover:text-shortfall rounded"
                        title="Delete scenario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
