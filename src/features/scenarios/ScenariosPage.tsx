import React, { useState } from 'react';
import type { AffordResult } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { ForecastChart } from '../../components/ForecastChart';
import { ShowWorking } from '../../components/ShowWorking';
import { formatIndianCurrency } from '../../lib/format';
import { Sliders, Play, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ScenariosPage: React.FC = () => {
  const [selectedScenarioType, setSelectedScenarioType] = useState('scen-purchase');
  const [amount, setAmount] = useState('500000');
  const [date, setDate] = useState('2026-10-05');
  const [customerDelayDays, setCustomerDelayDays] = useState(30);
  const [customerId, setCustomerId] = useState('cust-101');
  const [comparison, setComparison] = useState<AffordResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await mockApi.runScenario(selectedScenarioType, {
        amount,
        date,
        customerId,
        delayDays: customerDelayDays
      });
      setComparison(res.comparison);
    } catch (err) {
      console.error('Scenario simulation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const presetScenarios = [
    {
      id: 'scen-purchase',
      title: 'Unplanned Capital Expense',
      description: 'Simulate the liquidity impact of purchasing machinery or inventory upfront.',
    },
    {
      id: 'scen-delay',
      title: 'Major Customer Payment Delay',
      description: 'Simulate cash position if Apex Auto Components delays payment by 30 days.',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cash" />
            Scenario Simulator
          </h1>
          <p className="text-xs text-ink-muted">
            Model operational shocks, customer payment delays, and capital commitments non-destructively
          </p>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {presetScenarios.map(sc => (
          <button
            key={sc.id}
            onClick={() => setSelectedScenarioType(sc.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedScenarioType === sc.id
                ? 'bg-surface border-ink shadow-sm ring-1 ring-ink'
                : 'bg-paper border-rule hover:border-ink/40'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-ink">{sc.title}</h3>
              {selectedScenarioType === sc.id && (
                <CheckCircle2 className="w-4 h-4 text-cash" />
              )}
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">{sc.description}</p>
          </button>
        ))}
      </div>

      {/* Scenario Parameters Control Panel */}
      <div className="bg-surface p-5 rounded-lg border border-rule space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
          Configure Scenario Parameters
        </h3>

        {selectedScenarioType === 'scen-purchase' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Expense Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step="50000"
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-paper border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runSimulation}
                disabled={loading}
                className="w-full py-2 px-4 bg-ink text-surface text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-ink/90 transition-colors shadow-xs"
              >
                <Play className="w-4 h-4" /> Run Simulation
              </button>
            </div>
          </div>
        )}

        {selectedScenarioType === 'scen-delay' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Customer Name
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
              >
                <option value="cust-101">Apex Auto Components (₹4,50,000)</option>
                <option value="cust-103">Precision Tools Pvt Ltd (₹3,20,000)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Delay Duration
              </label>
              <select
                value={customerDelayDays}
                onChange={e => setCustomerDelayDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
              >
                <option value={15}>15 Days Delay</option>
                <option value={30}>30 Days Delay</option>
                <option value={45}>45 Days Delay</option>
                <option value={60}>60 Days Delay</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={runSimulation}
                disabled={loading}
                className="w-full py-2 px-4 bg-ink text-surface text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-ink/90 transition-colors shadow-xs"
              >
                <Play className="w-4 h-4" /> Run Simulation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparative Results & Chart */}
      {comparison && (
        <div className="space-y-6">
          {/* Headline Banner */}
          <div
            className={`p-4 rounded-lg border flex items-center gap-3 ${
              comparison.verdict === 'safe'
                ? 'bg-cash/10 border-cash/30 text-ink'
                : 'bg-shortfall/10 border-shortfall/30 text-ink'
            }`}
          >
            {comparison.verdict === 'safe' ? (
              <ShieldCheck className="w-6 h-6 text-cash shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-shortfall shrink-0" />
            )}
            <p className="text-sm font-semibold leading-relaxed">{comparison.headline}</p>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface p-4 rounded-lg border border-rule text-center">
              <span className="text-xs font-semibold text-ink-muted uppercase block">
                Baseline Min Cash
              </span>
              <span className="text-lg font-mono font-bold text-ink mt-1 block">
                {formatIndianCurrency(comparison.baseline.summary.minCash)}
              </span>
              <span className="text-[11px] text-ink-muted block mt-0.5">On {comparison.baseline.summary.minCashDate}</span>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-rule text-center">
              <span className="text-xs font-semibold text-ink-muted uppercase block">
                Simulated Min Cash
              </span>
              <span
                className={`text-lg font-mono font-bold mt-1 block ${
                  parseFloat(comparison.withDecision.summary.minCash) < 260000
                    ? 'text-shortfall'
                    : 'text-cash'
                }`}
              >
                {formatIndianCurrency(comparison.withDecision.summary.minCash)}
              </span>
              <span className="text-[11px] text-ink-muted block mt-0.5">Under simulated shock</span>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-rule text-center">
              <span className="text-xs font-semibold text-ink-muted uppercase block">
                Net Cash Impact
              </span>
              <span className="text-lg font-mono font-bold text-shortfall mt-1 block">
                {formatIndianCurrency(comparison.minCashDifference)}
              </span>
              <span className="text-[11px] text-ink-muted block mt-0.5">Peak liquidity delta</span>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-rule text-center">
              <span className="text-xs font-semibold text-ink-muted uppercase block">
                Safety Reserve
              </span>
              <span className="text-lg font-mono font-bold text-amber-600 mt-1 block">
                {formatIndianCurrency(comparison.baseline.safetyThreshold)}
              </span>
              <span className="text-[11px] text-ink-muted block mt-0.5">Required reserve line</span>
            </div>
          </div>

          {/* Comparative Chart */}
          <div className="bg-surface p-5 rounded-lg border border-rule space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                Comparative Forecast Curve (Solid: Baseline, Dashed: Scenario)
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-ink font-semibold">
                  <span className="w-3 h-0.5 bg-ink"></span> Baseline
                </span>
                <span className="flex items-center gap-1.5 text-shortfall font-semibold">
                  <span className="w-3 h-0.5 bg-shortfall border-dashed"></span> Simulated Scenario
                </span>
              </div>
            </div>

            <ForecastChart
              forecast={comparison.baseline}
              decisionForecast={comparison.withDecision}
              horizonDays={30}
            />
          </div>

          {/* Trace */}
          {comparison.trace && <ShowWorking trace={comparison.trace} />}
        </div>
      )}
    </div>
  );
};
