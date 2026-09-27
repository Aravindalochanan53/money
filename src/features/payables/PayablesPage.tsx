import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api/client';
import { Money } from '../../components/Money';
import { StatusChip } from '../../components/StatusChip';
import { formatDateIST } from '../../lib/format';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  X
} from 'lucide-react';

interface Bill {
  id: string;
  supplier_id: string;
  supplier_name: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  category: string;
  original_amount: number;
  paid_amount: number;
  outstanding_balance: number;
  payment_status: string;
  scheduled_payment_date: string;
  days_past_due: number;
  is_overdue: boolean;
}

export const PayablesPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pay Modal State
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState<string>('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await apiClient.financial.getBills(
        statusFilter === 'all' ? undefined : statusFilter
      );
      setBills(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier payables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [statusFilter]);

  const openPayModal = (bill: Bill) => {
    setPayingBill(bill);
    setPayAmount(bill.outstanding_balance.toFixed(2));
    setPayMethod('BANK_TRANSFER');
    setPayRef('');
    setPayError(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    setPayLoading(true);
    setPayError(null);
    try {
      await apiClient.financial.payBill(payingBill.id, {
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        reference_number: payRef || undefined
      });
      setPayingBill(null);
      await loadBills();
      await refreshProfile();
    } catch (err: any) {
      setPayError(err.message || 'Payment recording failed');
    } finally {
      setPayLoading(false);
    }
  };

  const totalOutstanding = bills.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const overdueBills = bills.filter(b => b.is_overdue);
  const totalOverdue = overdueBills.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-shortfall" />
            Accounts Payable & Supplier Dues
          </h1>
          <p className="text-xs text-ink-muted">
            Track unpaid supplier bills, scheduled disbursements, and trace cash outflows
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-rule rounded p-4 space-y-1">
          <span className="text-[11px] font-medium text-ink-muted block uppercase tracking-wider">
            Total Outstanding Payables
          </span>
          <Money
            amount={totalOutstanding.toFixed(2)}
            compact
            className="text-xl font-bold text-ink"
          />
          <span className="text-[10px] text-ink-muted block">
            Across {bills.length} registered bills
          </span>
        </div>

        <div className="bg-surface border border-rule rounded p-4 space-y-1">
          <span className="text-[11px] font-medium text-ink-muted block uppercase tracking-wider">
            Overdue Commitments
          </span>
          <Money
            amount={totalOverdue.toFixed(2)}
            compact
            className={`text-xl font-bold ${totalOverdue > 0 ? 'text-shortfall' : 'text-cash'}`}
          />
          <span className="text-[10px] text-ink-muted block">
            {overdueBills.length} bill(s) past due date
          </span>
        </div>

        <div className="bg-surface border border-rule rounded p-4 space-y-1">
          <span className="text-[11px] font-medium text-ink-muted block uppercase tracking-wider">
            Payment Integrity
          </span>
          <div className="text-sm font-semibold text-cash flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Traceable to Cash Ledger</span>
          </div>
          <span className="text-[10px] text-ink-muted block">
            Every payment creates a linked CashTransaction
          </span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface border border-rule rounded-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <span>Supplier Bills Ledger</span>
            <span className="text-xs font-normal text-ink-muted font-mono">({bills.length})</span>
          </h2>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-ink-muted" />
            <div className="flex bg-paper border border-rule rounded p-0.5 text-xs">
              {(['all', 'unpaid', 'partially_paid', 'paid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                    statusFilter === f
                      ? 'bg-surface text-ink font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-2 animate-pulse">
            <div className="h-4 bg-rule/50 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-rule/30 rounded w-1/4 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-2 text-shortfall">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p className="text-xs">{error}</p>
            <button
              onClick={loadBills}
              className="text-xs px-3 py-1 bg-paper border border-rule rounded text-ink"
            >
              Retry
            </button>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-ink-muted text-xs">
            <Clock className="w-8 h-8 mx-auto text-ink-muted/50" />
            <p className="font-semibold text-ink">No bills found</p>
            <p>Import bills via Data Import or create them through the API.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-rule text-ink-muted font-mono text-[11px]">
                  <th className="py-2.5 px-3">Bill #</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Original Amount</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-sans">
                {bills.map(b => (
                  <tr key={b.id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-ink">
                      {b.bill_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-ink">{b.supplier_name}</div>
                      <span className="text-[10px] text-ink-muted">{b.category}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div>{formatDateIST(b.due_date)}</div>
                      {b.is_overdue && (
                        <span className="text-[10px] text-shortfall font-semibold">
                          {b.days_past_due}d Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <Money amount={b.original_amount.toFixed(2)} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                      <Money amount={b.outstanding_balance.toFixed(2)} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusChip status={b.payment_status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {b.payment_status !== 'PAID' && b.outstanding_balance > 0 ? (
                        <button
                          onClick={() => openPayModal(b)}
                          className="px-2.5 py-1 bg-cash text-surface text-xs font-semibold rounded hover:bg-cash/90 transition-colors"
                        >
                          Record Payment
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-muted font-medium">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-surface border border-rule rounded-md max-w-md w-full p-6 shadow-dropdown space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink">Record Supplier Payment</h3>
                <p className="text-xs text-ink-muted">
                  Bill {payingBill.bill_number} • {payingBill.supplier_name}
                </p>
              </div>
              <button
                onClick={() => setPayingBill(null)}
                className="text-ink-muted hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payError && (
              <div className="p-2.5 bg-shortfall/10 border border-shortfall/30 rounded text-xs text-shortfall">
                {payError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">
                  Payment Amount (Max ₹{payingBill.outstanding_balance.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={payingBill.outstanding_balance}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-rule rounded text-ink font-mono font-bold focus:outline-none focus:border-cash"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">
                  UTR / Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="e.g. UTR12345678"
                  className="w-full px-3 py-2 bg-paper border border-rule rounded text-ink font-mono focus:outline-none focus:border-cash"
                />
              </div>

              <div className="pt-3 border-t border-rule flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingBill(null)}
                  className="px-3 py-1.5 bg-paper border border-rule rounded text-ink hover:bg-paper/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-4 py-1.5 bg-cash text-surface font-semibold rounded hover:bg-cash/90 disabled:opacity-50"
                >
                  {payLoading ? 'Recording...' : 'Confirm Outflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
