import React, { useState, useEffect } from 'react';
import type { ReceivableRisk } from '../../contracts/api';
import { apiClient } from '../../lib/api/client';
import { formatDateIST, formatIndianCurrency } from '../../lib/format';
import { ShieldAlert, AlertTriangle, CheckCircle, Search, AlertCircle, RefreshCw, Download, Check } from 'lucide-react';

export const RiskPage: React.FC = () => {
  const [risks, setRisks] = useState<ReceivableRisk[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [riskSummary, invoices] = await Promise.all([
        apiClient.risk.getReceivableRisk(),
        apiClient.financial.getInvoices()
      ]);

      const customerMap = new Map<string, any>();
      (riskSummary.customers || []).forEach((c: any) => {
        customerMap.set(c.customer_id, c);
      });

      const today = new Date();
      const riskItems: ReceivableRisk[] = invoices.map((inv: any) => {
        const custInfo = customerMap.get(inv.customer_id);
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));

        let level: 'low' | 'medium' | 'high' = 'low';
        if (custInfo?.risk_tier === 'HIGH' || daysOverdue > 30) {
          level = 'high';
        } else if (custInfo?.risk_tier === 'MEDIUM' || daysOverdue > 0) {
          level = 'medium';
        }

        const ruleHits: Array<{ ruleId: string; description: string; inputs: Record<string, string | number> }> = [];
        if (daysOverdue > 30) {
          ruleHits.push({
            ruleId: 'RULE-OVERDUE-30',
            description: `Invoice is ${daysOverdue} days past due date`,
            inputs: { daysOverdue }
          });
        }
        if (custInfo?.risk_tier === 'HIGH') {
          ruleHits.push({
            ruleId: 'RULE-CUST-HIGH-RISK',
            description: `Customer scored high risk (${custInfo.explanation || 'Severe payment delays'})`,
            inputs: { avgDelayDays: custInfo.avg_delay_days || 0 }
          });
        }
        if (ruleHits.length === 0) {
          ruleHits.push({
            ruleId: 'RULE-STANDARD-COLLECTION',
            description: 'Routine collection schedule within credit grace period',
            inputs: { standardCreditDays: 30 }
          });
        }

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id,
          customerName: inv.customer_name || custInfo?.customer_name || 'Customer',
          amount: inv.outstanding_balance.toFixed(2),
          dueDate: inv.due_date,
          daysOverdue,
          level,
          customerTypicalDelayDays: custInfo?.avg_delay_days ? Math.round(custInfo.avg_delay_days) : null,
          ruleHits
        };
      });

      setRisks(riskItems);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load risk analysis:', err);
      setError(err.message || 'Failed to load receivable risk analysis from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  if (error) {
    return (
      <div className="p-8 bg-surface border border-rule rounded text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-shortfall mx-auto" />
        <h3 className="text-base font-semibold text-ink">Unable to load risk radar</h3>
        <p className="text-xs text-ink-muted">{error}</p>
        <button
          onClick={loadData}
          className="text-xs px-3 py-1.5 bg-cash text-surface font-semibold rounded"
        >
          Retry Connection
        </button>
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

  const exportItemsToCsv = (items: ReceivableRisk[], label = 'Risk_Radar') => {
    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer ID',
      'Outstanding Balance (INR)',
      'Due Date',
      'Days Overdue',
      'Aging Status',
      'Customer Avg Delay (Days)',
      'Risk Rating',
      'Primary Rule ID',
      'Rule Explanation'
    ];

    const rows = items.map(r => [
      `"${(r.invoiceNumber || '').replace(/"/g, '""')}"`,
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${(r.customerId || '').replace(/"/g, '""')}"`,
      `"${parseFloat(r.amount).toFixed(2)}"`,
      `"${r.dueDate}"`,
      r.daysOverdue,
      `"${r.daysOverdue > 0 ? `${r.daysOverdue} days overdue` : 'Current'}"`,
      `"${r.customerTypicalDelayDays !== null && r.customerTypicalDelayDays !== undefined ? `${r.customerTypicalDelayDays}d` : '0d (On-time)'}"`,
      `"${r.level.toUpperCase()}"`,
      `"${(r.ruleHits[0]?.ruleId || 'RULE-STD').replace(/"/g, '""')}"`,
      `"${(r.ruleHits[0]?.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      `# FlowCred Receivable Risk Radar Export`,
      `# Generated: ${new Date().toISOString()}`,
      `# Total Invoices: ${items.length}`,
      `# Total Outstanding Amount: INR ${items.reduce((s, i) => s + parseFloat(i.amount), 0).toFixed(2)}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `flowcred_${label.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullReport = async () => {
    setIsExporting(true);
    try {
      await apiClient.risk.downloadExport();
      setDownloadSuccess('Risk Radar report downloaded');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.warn('Server export failed, falling back to local CSV generation:', err);
      exportItemsToCsv(risks, 'receivable_risk_radar');
      setDownloadSuccess('Risk Radar exported (CSV)');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFilteredReport = () => {
    exportItemsToCsv(filteredRisks, `filtered_risk_radar_${filterLevel}`);
    setDownloadSuccess(`Exported ${filteredRisks.length} filtered items`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

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
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {downloadSuccess && (
            <span className="text-[11px] font-medium text-cash bg-cash/10 border border-cash/20 px-2.5 py-1 rounded inline-flex items-center gap-1 transition-all">
              <Check className="w-3 h-3" /> {downloadSuccess}
            </span>
          )}

          <button
            onClick={handleDownloadFullReport}
            disabled={isExporting || risks.length === 0}
            className="text-xs px-3 py-1.5 bg-cash text-surface font-semibold rounded hover:bg-cash/90 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Download complete Receivable Risk Radar CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Downloading...' : 'Download CSV'}</span>
          </button>

          {(filterLevel !== 'all' || searchQuery.trim() !== '') && filteredRisks.length > 0 && (
            <button
              onClick={handleDownloadFilteredReport}
              className="text-xs px-3 py-1.5 bg-paper border border-rule rounded text-ink hover:bg-paper/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download currently filtered view as CSV"
            >
              <Download className="w-3.5 h-3.5 text-ink-muted" />
              <span>Export Filtered ({filteredRisks.length})</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="text-xs px-3 py-1.5 bg-paper border border-rule rounded text-ink hover:bg-paper/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Analysis</span>
          </button>
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
        {risks.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            <p className="font-semibold text-ink">No open receivables found</p>
            <p>Upload invoices via Data Import to populate the receivable risk radar.</p>
          </div>
        ) : (
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
              <tbody className="divide-y divide-rule font-sans">
                {filteredRisks.map(r => (
                  <tr key={r.invoiceId} className="hover:bg-paper/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-ink block">{r.customerName}</span>
                      <span className="text-[11px] font-mono text-ink-muted">{r.invoiceNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-ink">
                      {formatIndianCurrency(parseFloat(r.amount))}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-muted">{formatDateIST(r.dueDate)}</td>
                    <td className="py-3 px-4 font-mono">
                      {r.daysOverdue > 0 ? (
                        <span className="text-shortfall font-bold">+{r.daysOverdue} days</span>
                      ) : (
                        <span className="text-cash">Current</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-muted">
                      {r.customerTypicalDelayDays ? `+${r.customerTypicalDelayDays}d avg` : 'On-time payer'}
                    </td>
                    <td className="py-3 px-4">
                      {r.level === 'high' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-shortfall bg-shortfall/10 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> HIGH
                        </span>
                      )}
                      {r.level === 'medium' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> MEDIUM
                        </span>
                      )}
                      {r.level === 'low' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cash bg-cash/10 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" /> SAFE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-ink-muted font-mono block">
                        {r.ruleHits[0]?.ruleId || 'RULE-STD'}
                      </span>
                      <span className="text-[11px] text-ink block">{r.ruleHits[0]?.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
