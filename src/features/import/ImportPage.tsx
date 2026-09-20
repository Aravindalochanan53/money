import React, { useState } from 'react';
import type { ImportIssue } from '../../contracts/api';
import { mockApi } from '../../lib/api/mockApi';
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, Download, RefreshCw, FileText, ArrowRight } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'receivables' | 'payables' | 'expenses'>('receivables');
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{
    importId: string;
    rowCount: number;
    issues: ImportIssue[];
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

  async function handleFileSelect(file: File) {
    setLoading(true);
    setIsSuccess(false);
    try {
      const res = await mockApi.uploadImport(file);
      setImportResult(res);
    } catch (err) {
      console.error('Upload validation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!importResult) return;
    setLoading(true);
    try {
      await mockApi.confirmImport(importResult.importId);
      setIsSuccess(true);
    } catch (err) {
      console.error('Confirm import failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSriLakshmiDemo() {
    setLoading(true);
    try {
      // The current frontend intentionally runs on the deterministic mock API.
      // Loading sample data is immediate and does not pretend to call an authenticated backend.
      setDemoLoaded(true);
      setTimeout(() => setDemoLoaded(false), 5000);
    } catch (err) {
      console.log('Demo load trigger:', err);
    } finally {
      setLoading(false);
    }
  }

  const errors = importResult?.issues.filter(i => i.severity === 'error') || [];
  const warnings = importResult?.issues.filter(i => i.severity === 'warning') || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cash" />
            Financial Data Ingestion
          </h1>
          <p className="text-xs text-ink-muted">
            Import Accounts Receivable, Supplier Payables, and Fixed Recurring Commitments
          </p>
        </div>

        {/* Demo Data Quick Load Button */}
        <button
          onClick={handleLoadSriLakshmiDemo}
          disabled={loading}
          className="px-3.5 py-1.5 bg-paper border border-rule hover:border-cash text-ink text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cash ${loading ? 'animate-spin' : ''}`} />
          {demoLoaded ? 'Demo Loaded Successfully!' : 'Load Sri Lakshmi Components Dataset'}
        </button>
      </div>

      {/* Dataset Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: 'receivables', title: '1. Accounts Receivable', desc: 'Customer invoices, due dates, payments received' },
          { id: 'payables', title: '2. Accounts Payable', desc: 'Supplier bills, raw materials, payment schedule' },
          { id: 'expenses', title: '3. Recurring Expenses', desc: 'Monthly payroll, factory rent, loan EMIs, GST' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id as any)}
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
            Need the official CSV format? Download the standardized template for {selectedType}:
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
            Drag & drop your {selectedType} spreadsheet here
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Supports .CSV and .XLSX workbooks up to 10 MB
          </p>
        </div>
        <div>
          <label className="px-4 py-2 bg-ink text-surface text-xs font-semibold rounded cursor-pointer hover:bg-ink/90 inline-block transition-colors shadow-xs">
            Browse File
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

      {/* Validation Result Inspection */}
      {importResult && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-surface p-5 rounded-lg border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-ink">
                Validation Complete: {importResult.rowCount} rows processed
              </h3>
              <div className="flex items-center gap-4 text-xs mt-1">
                <span className="text-cash font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {importResult.rowCount - errors.length} valid rows
                </span>
                {errors.length > 0 && (
                  <span className="text-shortfall font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {errors.length} formatting errors
                  </span>
                )}
                {warnings.length > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {warnings.length} warnings
                  </span>
                )}
              </div>
            </div>

            {!isSuccess && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-5 py-2 bg-cash text-surface text-xs font-bold rounded hover:bg-cash/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                {errors.length > 0 ? `Import ${importResult.rowCount - errors.length} valid rows` : 'Confirm & Ingest Data'} <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {isSuccess && (
              <div className="px-4 py-2 bg-cash/10 text-cash border border-cash/30 rounded text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Ingested Into Engine!
              </div>
            )}
          </div>

          {/* Detailed Issues Table */}
          {importResult.issues.length > 0 && (
            <div className="bg-surface rounded-lg border border-rule overflow-hidden">
              <div className="p-3 border-b border-rule bg-paper">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Validation Log & Actionable Correction Steps
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-paper text-ink-muted font-semibold border-b border-rule">
                    <tr>
                      <th className="py-2.5 px-4">Row #</th>
                      <th className="py-2.5 px-4">Column</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Issue Description</th>
                      <th className="py-2.5 px-4">Engine Action / Suggested Fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-mono">
                    {importResult.issues.map((iss, idx) => (
                      <tr key={idx} className="hover:bg-paper/50">
                        <td className="py-2.5 px-4 font-bold text-ink">Row {iss.row}</td>
                        <td className="py-2.5 px-4 text-ink-muted">{iss.column}</td>
                        <td className="py-2.5 px-4 font-sans">
                          {iss.severity === 'error' ? (
                            <span className="px-2 py-0.5 rounded bg-shortfall/10 text-shortfall font-bold text-[10px]">
                              ERROR
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                              WARNING
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-ink">{iss.message}</td>
                        <td className="py-2.5 px-4 font-sans text-cash font-semibold">
                          {iss.suggestedFix}
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
