import React, { useState } from 'react';
import { Money } from '../components/Money';
import { DateLabel } from '../components/DateLabel';
import { ShowWorking } from '../components/ShowWorking';
import { AsOfStamp } from '../components/AsOfStamp';
import { StatusChip } from '../components/StatusChip';
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [simState, setSimState] = useState<'success' | 'loading' | 'empty' | 'error' | 'partial'>('success');

  const demoTrace = {
    formula: 'Lowest Projected Cash = Minimum (Opening Cash + Receipts - Outflows over 30 Days)',
    inputs: [
      { label: 'Current Opening Balance', value: '₹9,10,000.00' },
      { label: 'Total Receivables (Inflow)', value: '₹12,00,000.00' },
      { label: 'Total Outflows (Payables)', value: '₹17,30,000.00' },
      { label: 'Safety Threshold', value: '₹2,60,000.00' }
    ],
    sourceRows: [
      { type: 'invoice' as const, id: 'INV-904', label: 'Apex Auto Components', amount: '450000.00' },
      { type: 'payable' as const, id: 'PAY-881', label: 'Tata Steel Industries', amount: '800000.00' }
    ]
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-1">
          FlowCred Design System & Living Component Library
        </h1>
        <p className="text-sm text-ink-muted">
          Internal design specification, token mappings, typography rules, and shared UI component inventory.
        </p>
      </div>

      {/* 1. Theme Color Tokens */}
      <section className="bg-surface border border-rule rounded-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink border-b border-rule pb-2">
          1. Color Tokens & Semantic Roles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { name: '--paper', hex: '#F1F4F2', role: 'Canvas Background', text: 'dark' },
            { name: '--surface', hex: '#FFFFFF', role: 'Raised Cards / Fills', text: 'dark' },
            { name: '--ink', hex: '#14262B', role: 'Primary Petrol Text', text: 'light' },
            { name: '--ink-muted', hex: '#5F7377', role: 'Secondary Micro-copy', text: 'light' },
            { name: '--rule', hex: '#D5DDDB', role: 'Hairline Dividers', text: 'dark' },
            { name: '--cash', hex: '#0E7C7B', role: 'Safe / Primary Inflow', text: 'light' },
            { name: '--threshold', hex: '#B7791F', role: 'Safety Line / Caution', text: 'light' },
            { name: '--shortfall', hex: '#B3261E', role: 'Below Threshold / Error', text: 'light' },
            { name: '--decision', hex: '#4B4FD1', role: 'Scenario / Split Line', text: 'light' }
          ].map(tok => (
            <div key={tok.name} className="border border-rule rounded p-2.5 bg-paper space-y-1.5">
              <div
                className="h-10 rounded border border-rule flex items-center justify-center font-mono text-xs font-semibold"
                style={{ backgroundColor: `var(${tok.name})`, color: tok.text === 'light' ? '#FFFFFF' : '#14262B' }}
              >
                {tok.hex}
              </div>
              <div className="text-xs font-semibold text-ink">{tok.name}</div>
              <div className="text-[11px] text-ink-muted">{tok.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Typography & Rupee Glyph Verification */}
      <section className="bg-surface border border-rule rounded-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink border-b border-rule pb-2">
          2. Typography & Rupee Glyph Verification (₹)
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-paper rounded border border-rule space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block">
              Editorial Verdict Serif (Newsreader)
            </span>
            <p className="verdict-serif text-xl sm:text-2xl text-ink italic leading-snug">
              "Your cash is lowest on 14 Oct 2026 at ₹3.8 L, which is ₹1.2 L above your safety threshold."
            </p>
          </div>

          <div className="p-4 bg-paper rounded border border-rule space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block">
              Tabular Numerals & Currency Formatting (Schibsted Grotesk)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-ink-muted block">Standard Indian Grouping:</span>
                <Money amount="1234567.00" className="text-lg font-bold" />
              </div>
              <div>
                <span className="text-xs text-ink-muted block">Compact Lakhs (L):</span>
                <Money amount="1240000.00" compact className="text-lg font-bold" />
              </div>
              <div>
                <span className="text-xs text-ink-muted block">Compact Crores (Cr):</span>
                <Money amount="12000000.00" compact className="text-lg font-bold" />
              </div>
              <div>
                <span className="text-xs text-ink-muted block">Negative Shortfall:</span>
                <Money amount="-470000.00" compact className="text-lg font-bold text-shortfall" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Component Inventory */}
      <section className="bg-surface border border-rule rounded-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink border-b border-rule pb-2">
          3. Shared Component Inventory
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AsOfStamp */}
          <div className="p-4 border border-rule rounded space-y-2">
            <span className="text-xs font-semibold text-ink-muted block">AsOfStamp (Freshness Indicator)</span>
            <AsOfStamp date="2026-09-19" />
          </div>

          {/* ShowWorking */}
          <div className="p-4 border border-rule rounded space-y-2">
            <span className="text-xs font-semibold text-ink-muted block">ShowWorking (Formula Transparency)</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink">Lowest Cash: ₹3.8 L</span>
              <ShowWorking trace={demoTrace} />
            </div>
          </div>

          {/* StatusChip */}
          <div className="p-4 border border-rule rounded space-y-2 md:col-span-2">
            <span className="text-xs font-semibold text-ink-muted block">StatusChip Variants</span>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="safe" />
              <StatusChip status="tight" />
              <StatusChip status="unsafe" />
              <StatusChip status="low" />
              <StatusChip status="medium" />
              <StatusChip status="high" />
              <StatusChip status="rule_based" label="Rule-based Rating" />
            </div>
          </div>

          {/* DateLabel */}
          <div className="p-4 border border-rule rounded space-y-2">
            <span className="text-xs font-semibold text-ink-muted block">DateLabel with Relative Phrasing</span>
            <div className="space-y-1">
              <DateLabel date="2026-10-14" showRelative />
              <br />
              <DateLabel date="2026-09-01" showRelative />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Five Standard Page States */}
      <section className="bg-surface border border-rule rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <h2 className="text-base font-semibold text-ink">
            4. Five Standard Page States Test Bench
          </h2>
          <div className="flex gap-1">
            {(['success', 'loading', 'empty', 'error', 'partial'] as const).map(st => (
              <button
                key={st}
                onClick={() => setSimState(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize border ${
                  simState === st
                    ? 'bg-cash text-surface border-cash'
                    : 'bg-paper text-ink border-rule hover:bg-surface'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border border-rule rounded bg-paper min-h-[160px] flex items-center justify-center">
          {simState === 'success' && (
            <div className="text-center space-y-2">
              <div className="text-sm font-semibold text-cash">Success State Rendered Cleanly</div>
              <p className="text-xs text-ink-muted max-w-md">
                Data loaded from API. Key figures, step charts, and action center items are fully interactive.
              </p>
            </div>
          )}

          {simState === 'loading' && (
            <div className="w-full space-y-3 animate-pulse max-w-lg">
              <div className="h-4 bg-rule/50 rounded w-3/4"></div>
              <div className="h-24 bg-rule/40 rounded w-full"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-rule/40 rounded"></div>
                <div className="h-10 bg-rule/40 rounded"></div>
                <div className="h-10 bg-rule/40 rounded"></div>
              </div>
            </div>
          )}

          {simState === 'empty' && (
            <div className="text-center space-y-2">
              <Inbox className="w-8 h-8 text-ink-muted mx-auto" />
              <div className="text-sm font-semibold text-ink">No Overdue or At-Risk Items</div>
              <p className="text-xs text-ink-muted">Everything owed to you is currently on track.</p>
            </div>
          )}

          {simState === 'error' && (
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-shortfall mx-auto" />
              <div className="text-sm font-semibold text-shortfall">Failed to connect to forecast service</div>
              <p className="text-xs text-ink-muted">Check your network connection or verify API status.</p>
              <button className="px-3 py-1 bg-surface border border-rule rounded text-xs font-medium text-ink hover:bg-paper inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry Request
              </button>
            </div>
          )}

          {simState === 'partial' && (
            <div className="text-center space-y-2">
              <div className="text-sm font-semibold text-threshold">Partial Data Snapshot</div>
              <p className="text-xs text-ink-muted">
                Showing 90 rows from last import. 12 rows skipped due to missing due dates.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
