import React, { useState } from 'react';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  FileText,
  ArrowRight,
  AlertCircle,
  Copy
} from 'lucide-react';

interface ValidationError {
  row_number: number;
  column?: string;
  message: string;
  raw_data: Record<string, any>;
}

interface BatchPreview {
  batch_id: string;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_count: number;
  preview_data: any[];
  errors: ValidationError[];
  is_ready_to_import: boolean;
}

export const ImportPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [selectedType, setSelectedType] = useState<'receivables' | 'payables' | 'expenses'>('receivables');
  const [isDragging, setIsDragging] = useState(false);
  const [batchPreview, setBatchPreview] = useState<BatchPreview | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ inserted: number; updated: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);

  async function handleFileSelect(file: File) {
    setLoading(true);
    setError(null);
    setConfirmResult(null);
    try {
      const res = await apiClient.import.validate(file, selectedType);
      setBatchPreview(res);
    } catch (err: any) {
      console.error('Upload validation failed:', err);
      setError(err.message || 'File validation failed. Please check format.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!batchPreview || !batchPreview.batch_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.import.confirm(batchPreview.batch_id);
      setConfirmResult({
        inserted: res.inserted_count,
        updated: res.updated_count,
        message: res.message
      });
      await refreshProfile();
    } catch (err: any) {
      console.error('Confirm import failed:', err);
      setError(err.message || 'Failed to atomically confirm import batch.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSriLakshmiDemo() {
    setDemoLoading(true);
    setDemoSuccess(null);
    setError(null);
    try {
      const res = await apiClient.business.loadDemoData();
      setDemoSuccess(
        `Loaded golden demo dataset: ${res.receivables_count} receivables, ${res.payables_count} payables, ${res.expenses_count} recurring expenses!`
      );
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to load demo data into database.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cash" />
            Server-Side Financial Data Ingestion
          </h1>
          <p className="text-xs text-ink-muted">
            Two-stage batch verification: validate file, inspect preview & duplicate detection, confirm atomically by Batch ID
          </p>
        </div>

        {/* Demo Data Quick Load Button */}
        <button
          onClick={handleLoadSriLakshmiDemo}
          disabled={demoLoading}
          className="px-3.5 py-1.5 bg-paper border border-rule hover:border-cash text-ink text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cash ${demoLoading ? 'animate-spin' : ''}`} />
          <span>{demoLoading ? 'Ingesting Demo...' : 'Load Golden Demo Dataset'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-shortfall/10 border border-shortfall/30 rounded text-xs text-shortfall flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {demoSuccess && (
        <div className="p-3 bg-cash/10 border border-cash/30 rounded text-xs text-cash flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{demoSuccess}</span>
        </div>
      )}

      {/* Dataset Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: 'receivables', title: '1. Accounts Receivable', desc: 'Customer invoices, due dates, payments received' },
          { id: 'payables', title: '2. Accounts Payable', desc: 'Supplier bills, raw materials, payment schedule' },
          { id: 'expenses', title: '3. Recurring Expenses', desc: 'Monthly payroll, factory rent, loan EMIs, GST' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedType(tab.id as any);
              setBatchPreview(null);
              setConfirmResult(null);
            }}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedType === tab.id
                ? 'bg-surface border-ink shadow-sm ring-1 ring-ink'
                : 'bg-paper border-rule hover:border-ink/40'
            }`}
          >
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">{tab.title}</h3>
            <p className="text-xs text-ink-muted leading-relaxed">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Template Download Prompt */}
      <div className="bg-surface p-4 rounded-lg border border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cash shrink-0" />
          <span className="text-ink">
            Download standard format template for <span className="font-semibold">{selectedType}</span>:
          </span>
        </div>
        <a
          href={`/templates/${selectedType}_template.csv`}
          download
          className="px-3 py-1 bg-paper border border-rule hover:bg-surface text-ink font-semibold rounded inline-flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Download Template CSV
        </a>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        className={`p-10 border-2 border-dashed rounded-xl text-center space-y-3 transition-colors ${
          isDragging
            ? 'border-cash bg-cash/5'
            : 'border-rule hover:border-ink/40 bg-surface'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-paper border border-rule flex items-center justify-center mx-auto text-ink-muted">
          <UploadCloud className="w-6 h-6 text-cash" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink">
            {loading ? 'Processing & Validating on Server...' : `Drag & drop ${selectedType} workbook here`}
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Strict row-level schema validation, intra-file and cross-db duplicate checking
          </p>
        </div>
        <div>
          <label className="px-4 py-2 bg-ink text-surface text-xs font-semibold rounded cursor-pointer hover:bg-ink/90 inline-block transition-colors shadow-xs">
            Browse File (.csv, .xlsx)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Batch Validation Results Inspection */}
      {batchPreview && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-surface p-5 rounded-lg border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 bg-paper border border-rule rounded text-ink-muted">
                  Batch ID: {batchPreview.batch_id.slice(0, 8)}...
                </span>
                <span className="text-xs text-ink-muted capitalize">• {batchPreview.file_type}</span>
              </div>
              <h3 className="text-sm font-bold text-ink">
                Server Validation: {batchPreview.total_rows} total rows processed
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <span className="text-cash font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {batchPreview.valid_rows} ready rows
                </span>
                {batchPreview.duplicate_count > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> {batchPreview.duplicate_count} updates/duplicates detected
                  </span>
                )}
                {batchPreview.error_rows > 0 && (
                  <span className="text-shortfall font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {batchPreview.error_rows} error rows
                  </span>
                )}
              </div>
            </div>

            {!confirmResult ? (
              <button
                onClick={handleConfirm}
                disabled={loading || !batchPreview.is_ready_to_import}
                className="px-5 py-2 bg-cash text-surface text-xs font-bold rounded hover:bg-cash/90 transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Confirming Atomic Ingestion...' : `Confirm & Commit Batch`}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="px-4 py-2 bg-cash/10 text-cash border border-cash/30 rounded text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Ingested: {confirmResult.inserted} added, {confirmResult.updated} updated!
                </span>
              </div>
            )}
          </div>

          {/* Validated Rows Preview Table */}
          {batchPreview.preview_data && batchPreview.preview_data.length > 0 && (
            <div className="bg-surface rounded-lg border border-rule overflow-hidden">
              <div className="p-3 border-b border-rule bg-paper flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Validated Staged Rows (First {batchPreview.preview_data.length})
                </h4>
                <span className="text-[11px] text-ink-muted">Server Preview Cache</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-paper text-ink-muted font-mono text-[11px] border-b border-rule sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Identifier / Ref</th>
                      <th className="py-2 px-3">Counterparty</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                      <th className="py-2 px-3">Due / Date</th>
                      <th className="py-2 px-3 text-center">Record Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-mono">
                    {batchPreview.preview_data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-paper/50">
                        <td className="py-1.5 px-3 text-ink-muted">{row.row_num || idx + 1}</td>
                        <td className="py-1.5 px-3 font-semibold text-ink">
                          {row.invoice_number || row.bill_number || row.title}
                        </td>
                        <td className="py-1.5 px-3 font-sans">
                          {row.customer_name || row.supplier_name || row.category}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {(row.original_amount || row.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-1.5 px-3 font-sans">
                          {row.due_date || (row.recurrence_day_of_month ? `Day ${row.recurrence_day_of_month}` : '-')}
                        </td>
                        <td className="py-1.5 px-3 text-center font-sans text-[10px]">
                          {row.is_existing_record ? (
                            <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                              Will Update
                            </span>
                          ) : (
                            <span className="text-cash font-semibold bg-cash/10 px-1.5 py-0.5 rounded">
                              New Record
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Error Log */}
          {batchPreview.errors && batchPreview.errors.length > 0 && (
            <div className="bg-surface rounded-lg border border-rule overflow-hidden">
              <div className="p-3 border-b border-rule bg-shortfall/5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-shortfall uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Validation Errors ({batchPreview.errors.length})</span>
                </h4>
                <span className="text-[11px] text-ink-muted">Row-Level Integrity Protection</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-paper text-ink-muted font-semibold border-b border-rule">
                    <tr>
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3">Field / Column</th>
                      <th className="py-2 px-3">Validation Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-sans">
                    {batchPreview.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-paper/50">
                        <td className="py-2 px-3 font-mono font-bold text-shortfall">
                          Row {err.row_number}
                        </td>
                        <td className="py-2 px-3 font-mono text-ink-muted">
                          {err.column || 'Row Schema'}
                        </td>
                        <td className="py-2 px-3 text-ink">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
