import React, { useState } from 'react';
import { HelpCircle, X, FileText, Calculator } from 'lucide-react';
import type { Trace } from '../contracts/api';

interface ShowWorkingProps {
  trace?: Trace;
  title?: string;
  className?: string;
}

export const ShowWorking: React.FC<ShowWorkingProps> = ({
  trace,
  title = 'Calculation Breakdown & Provenance',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!trace) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className={`inline-flex items-center gap-1 text-xs font-medium text-cash hover:underline focus:outline-none ${className}`}
        title="View formula and inputs used to calculate this figure"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Show working</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="bg-surface border border-rule rounded-md shadow-overlay w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule bg-paper/50">
              <div className="flex items-center gap-2 text-ink font-medium text-sm">
                <Calculator className="w-4 h-4 text-cash" />
                <span>{title}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-sm focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-sm">
              {/* Formula */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Formula
                </span>
                <div className="p-2.5 bg-paper rounded border border-rule font-mono text-xs text-ink leading-relaxed">
                  {trace.formula}
                </div>
              </div>

              {/* Inputs */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1.5">
                  Calculation Inputs
                </span>
                <div className="divide-y divide-rule border border-rule rounded overflow-hidden">
                  {trace.inputs.map((inp, idx) => (
                    <div key={idx} className="flex justify-between p-2.5 bg-surface text-xs">
                      <span className="text-ink-muted">{inp.label}</span>
                      <span className="font-semibold text-ink tabular-nums">{inp.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Underlying Source Rows */}
              {trace.sourceRows && trace.sourceRows.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1.5">
                    Underlying Source Records ({trace.sourceRows.length})
                  </span>
                  <div className="divide-y divide-rule border border-rule rounded overflow-hidden">
                    {trace.sourceRows.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-surface text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="font-medium text-ink">{row.label}</span>
                          <span className="text-[10px] uppercase px-1 py-0.2 bg-paper border border-rule rounded text-ink-muted">
                            {row.type} #{row.id}
                          </span>
                        </div>
                        <span className="font-mono text-ink tabular-nums">₹{parseFloat(row.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-5 py-3 border-t border-rule bg-paper/30">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-ink bg-surface border border-rule rounded hover:bg-paper focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
