import React, { useState, useEffect } from 'react';
import type { ReceivableRisk } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { formatDateIST, formatIndianCurrency } from '../../lib/format';
import { ShieldAlert, AlertTriangle, CheckCircle, Search } from 'lucide-react';

export const RiskPage: React.FC = () => {
  const [risks, setRisks] = useState<ReceivableRisk[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await mockApi.getReceivableRisk();
        setRisks(data);
      } catch (err) {
        console.error('Failed to load risk analysis:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto p-4">
        <div className="h-8 bg-rule/40 rounded w-1/3"></div>
        <div className="h-64 bg-surface border border-rule rounded"></div>
      </div>
    );
  }

  const filteredRisks = risks.filter(r => {
    const matchesLevel = filterLevel === 'all' || r.level === filterLevel;
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const totalAR = risks.reduce((acc, r) => acc + parseFloat(r.amount), 0);
  const overdueAR = risks
    .filter(r => r.daysOverdue > 0)
    .reduce((acc, r) => acc + parseFloat(r.amount), 0);
  const highRiskCount = risks.filter(r => r.level === 'high').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-shortfall" />
            Receivable Risk Radar
          </h1>
          <p className="text-xs text-ink-muted">
            Customer payment discipline scoring, overdue severity, and concentration tracking
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Total Outstanding Receivables
          </span>
          <span className="text-xl font-bold font-mono text-ink mt-1 block">
            {formatIndianCurrency(totalAR)}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">{risks.length} active invoices</span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            Overdue Balance
          </span>
          <span className="text-xl font-bold font-mono text-shortfall mt-1 block">
            {formatIndianCurrency(overdueAR)}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">
            {((overdueAR / (totalAR || 1)) * 100).toFixed(1)}% of outstanding receivables
          </span>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-rule">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">
            High-Risk Invoices
          </span>
          <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
            {highRiskCount}
          </span>
          <span className="text-[11px] text-ink-muted mt-0.5 block">Requiring immediate follow-up</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name or invoice #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-rule rounded focus:outline-none focus:ring-1 focus:ring-cash text-ink"
          />
        </div>

        {/* Risk Level Filter Pills */}
        <div className="flex bg-paper border border-rule rounded p-0.5 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Risks' },
            { id: 'high', label: 'High Risk' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low / Safe' },
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setFilterLevel(lvl.id as any)}
              className={`text-xs px-3 py-1 font-semibold rounded transition-colors ${
                filterLevel === lvl.id
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-surface rounded-lg border border-rule overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-paper text-ink-muted font-semibold border-b border-rule">
              <tr>
                <th className="py-3 px-4">Customer & Invoice</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Days Overdue</th>
                <th className="py-3 px-4">Historical Delay</th>
                <th className="py-3 px-4">Risk Rating</th>
                <th className="py-3 px-4">Deterministic Rule Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-mono">
              {filteredRisks.map(r => {
                const isOverdue = r.daysOverdue > 0;
                return (
                  <tr key={r.invoiceId} className="hover:bg-paper/60 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <span className="font-bold text-ink block">{r.customerName}</span>
                      <span className="text-[11px] text-ink-muted font-mono">{r.invoiceNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-ink">
                      {formatIndianCurrency(r.amount)}
                    </td>
                    <td className="py-3 px-4 text-ink-muted font-sans">
                      {formatDateIST(r.dueDate)}
                    </td>
                    <td className="py-3 px-4">
                      {isOverdue ? (
                        <span className="font-bold text-shortfall">
                          {r.daysOverdue} Days Late
                        </span>
                      ) : (
                        <span className="text-cash font-sans">On Time</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-ink-muted">
                      {r.customerTypicalDelayDays ? `Avg +${r.customerTypicalDelayDays} days` : 'No delay history'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {r.level === 'high' && (
                        <span className="px-2 py-0.5 rounded bg-shortfall/10 text-shortfall font-bold text-[11px] inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> High Risk
                        </span>
                      )}
                      {r.level === 'medium' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[11px] inline-flex items-center gap-1">
                          Medium Risk
                        </span>
                      )}
                      {r.level === 'low' && (
                        <span className="px-2 py-0.5 rounded bg-cash/10 text-cash font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Prompt Payer
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-[11px] text-ink-muted max-w-xs">
                      {r.ruleHits.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {r.ruleHits.map((rh, idx) => (
                            <li key={idx}>
                              <span className="font-mono text-[10px] font-semibold text-ink">
                                {rh.ruleId}:
                              </span>{' '}
                              {rh.description}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-ink-muted">No penalty triggers</span>
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
  );
};
