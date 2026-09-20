import type {
  FlowCredApi,
  BusinessProfile,
  Forecast,
  ForecastPoint,
  ForecastEvent,
  AffordResult,
  ReceivableRisk,
  ActionItem,
  ImportIssue,
  ScenarioTypeSchema,
  Money,
  ISODate
} from '../../contracts/api';

/**
 * MockFlowCredApi Implementation
 * Provides deterministic, internally consistent mock data for Sri Lakshmi Components Pvt Ltd.
 * Displays DEMO DATA banner when active.
 */
export class MockFlowCredApi implements FlowCredApi {
  private business: BusinessProfile = {
    name: 'Sri Lakshmi Components Pvt Ltd',
    currentCash: '910000.00',
    safetyThreshold: '260000.00',
    currency: 'INR',
    asOf: '2026-09-19'
  };

  private actions: ActionItem[] = [
    {
      id: 'act-001',
      ruleId: 'R-102',
      title: 'Follow up on overdue invoice INV-904 from Apex Auto Components',
      reason: 'Invoice INV-904 for ₹2,40,000.00 is overdue by 18 days. Cash buffer drops in October.',
      severity: 'critical',
      relatedEvent: { type: 'invoice', id: 'INV-904', label: 'Invoice #INV-904' },
      amount: '240000.00',
      dueDate: '2026-09-01',
      nextStep: 'Send immediate payment reminder or request explicit commitment date.',
      status: 'open'
    },
    {
      id: 'act-002',
      ruleId: 'R-204',
      title: 'Negotiate 15-day supplier credit extension with Tata Steel Industries',
      reason: 'Upcoming payable of ₹8,00,000.00 due on 28 Sep coincided with raw material purchases.',
      severity: 'high',
      relatedEvent: { type: 'payable', id: 'PAY-881', label: 'Payable #PAY-881' },
      amount: '800000.00',
      dueDate: '2026-09-28',
      nextStep: 'Request extension of due date from 28 Sep to 13 Oct.',
      status: 'open'
    },
    {
      id: 'act-003',
      ruleId: 'R-305',
      title: 'Review credit terms for MetalFab Ltd before releasing next order',
      reason: 'Average payment delay has increased from 10 days to 28 days over last 3 billing cycles.',
      severity: 'medium',
      amount: '160000.00',
      nextStep: 'Hold dispatch for pending order until ₹1.6 L balance is cleared.',
      status: 'open'
    }
  ];

  private readonly events: ForecastEvent[] = [
    { id: 'ev-1', date: '2026-09-24', direction: 'in', kind: 'customer_receipt', label: 'Receipt: Apex Auto Components', counterparty: 'Apex Auto Components', amount: '450000.00', confidence: 'at_risk', sourceRef: { type: 'invoice', id: 'INV-904' } },
    { id: 'ev-2', date: '2026-09-28', direction: 'out', kind: 'supplier_payment', label: 'Payment: Tata Steel Industries', counterparty: 'Tata Steel', amount: '800000.00', confidence: 'scheduled', sourceRef: { type: 'payable', id: 'PAY-881' } },
    { id: 'ev-3', date: '2026-10-01', direction: 'out', kind: 'expense', label: 'Rent & Utility Operating Expenses', amount: '150000.00', confidence: 'scheduled' },
    { id: 'ev-4', date: '2026-10-02', direction: 'in', kind: 'customer_receipt', label: 'Receipt: Precision Tools Pvt Ltd', counterparty: 'Precision Tools', amount: '320000.00', confidence: 'scheduled', sourceRef: { type: 'invoice', id: 'INV-981' } },
    { id: 'ev-5', date: '2026-10-14', direction: 'out', kind: 'supplier_payment', label: 'Payment: MetalFab Raw Materials', counterparty: 'MetalFab Ltd', amount: '350000.00', confidence: 'scheduled' },
    { id: 'ev-6', date: '2026-10-22', direction: 'in', kind: 'customer_receipt', label: 'Receipt: Bharat Forgings Ltd', counterparty: 'Bharat Forgings', amount: '580000.00', confidence: 'scheduled' }
  ];

  private toISODate(value: Date): ISODate {
    return value.toISOString().slice(0, 10);
  }

  private buildForecast(horizonDays: 30 | 60 | 90, events: ForecastEvent[] = this.events): Forecast {
    const points: ForecastPoint[] = [];
    const startDate = new Date(`${this.business.asOf}T00:00:00Z`);
    let currentCash = Number(this.business.currentCash);

    for (let day = 0; day <= horizonDays; day += 1) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + day);
      const date = this.toISODate(currentDate);
      const dayEvents = events.filter(event => event.date === date);
      const inflow = dayEvents.filter(event => event.direction === 'in').reduce((sum, event) => sum + Number(event.amount), 0);
      const outflow = dayEvents.filter(event => event.direction === 'out').reduce((sum, event) => sum + Number(event.amount), 0);
      const openingCash = currentCash;
      currentCash += inflow - outflow;
      points.push({ date, openingCash: openingCash.toFixed(2), inflow: inflow.toFixed(2), outflow: outflow.toFixed(2), closingCash: currentCash.toFixed(2) });
    }

    const minPoint = points.reduce((lowest, point) => Number(point.closingCash) < Number(lowest.closingCash) ? point : lowest, points[0]);
    const threshold = Number(this.business.safetyThreshold);
    const firstShortfall = points.find(point => Number(point.closingCash) < threshold);
    const visibleEvents = events.filter(event => event.date >= points[0].date && event.date <= points.at(-1)!.date);
    const totalIn = visibleEvents.filter(event => event.direction === 'in').reduce((sum, event) => sum + Number(event.amount), 0);
    const totalOut = visibleEvents.filter(event => event.direction === 'out').reduce((sum, event) => sum + Number(event.amount), 0);

    return {
      asOf: this.business.asOf,
      horizonDays,
      safetyThreshold: this.business.safetyThreshold,
      points,
      events: visibleEvents,
      summary: {
        openingCash: this.business.currentCash,
        minCash: minPoint.closingCash,
        minCashDate: minPoint.date,
        endCash: points.at(-1)!.closingCash,
        daysBelowThreshold: points.filter(point => Number(point.closingCash) < threshold).length,
        firstShortfallDate: firstShortfall?.date
      },
      trace: {
        formula: 'Closing Cash = Opening Cash + Confirmed Receipts - Scheduled Outflows',
        inputs: [
          { label: 'Current Opening Cash', value: `₹${Number(this.business.currentCash).toLocaleString('en-IN')}` },
          { label: `${horizonDays}-Day Receivables`, value: `₹${totalIn.toLocaleString('en-IN')}` },
          { label: `${horizonDays}-Day Payables & Expenses`, value: `₹${totalOut.toLocaleString('en-IN')}` },
          { label: 'Safety Cash Threshold', value: `₹${threshold.toLocaleString('en-IN')}` }
        ],
        sourceRows: visibleEvents.filter(event => event.sourceRef).map(event => ({
          type: event.sourceRef!.type,
          id: event.sourceRef!.id,
          label: event.counterparty || event.label,
          amount: event.amount
        }))
      }
    };
  }

  async login(email: string): Promise<{ token: string; user: { email: string; name: string } }> {
    return {
      token: 'mock-jwt-token-flowcred',
      user: { email, name: 'Finance Lead (Sri Lakshmi)' }
    };
  }

  async getBusiness(): Promise<BusinessProfile> {
    return { ...this.business };
  }

  async saveBusiness(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    this.business = { ...this.business, ...profile };
    return { ...this.business };
  }

  async uploadImport(_file: File): Promise<{ importId: string; rowCount: number; issues: ImportIssue[] }> {
    return {
      importId: 'imp-' + Date.now(),
      rowCount: 142,
      issues: [
        {
          row: 12,
          column: 'Due Date',
          severity: 'error',
          code: 'ERR_INVALID_DATE',
          message: 'Date "31/09/2026" is invalid (September has 30 days).',
          suggestedFix: 'Correct to 2026-09-30'
        },
        {
          row: 45,
          column: 'Amount',
          severity: 'error',
          code: 'ERR_NEGATIVE_AMOUNT',
          message: 'Payable amount "-150000.00" must be a positive number.',
          suggestedFix: 'Enter 150000.00 and rely on Direction column'
        },
        {
          row: 78,
          column: 'Customer',
          severity: 'warning',
          code: 'WARN_UNKNOWN_CUSTOMER',
          message: 'Customer "TechFab India" is not in master customer directory.',
          suggestedFix: 'System will auto-create customer profile'
        },
        {
          row: 104,
          column: 'Invoice',
          severity: 'error',
          code: 'ERR_DUPLICATE_ROW',
          message: 'Invoice "INV-882" matches an existing invoice imported on 10 Sep 2026.',
          suggestedFix: 'Skip or mark as duplicate update'
        },
        {
          row: 119,
          column: 'Due Date',
          severity: 'error',
          code: 'ERR_PAST_DUE',
          message: 'Due date is 45 days in the past without payment record.',
          suggestedFix: 'Confirm if invoice was paid or mark as defaulted'
        },
        {
          row: 135,
          column: 'Expense',
          severity: 'warning',
          code: 'WARN_MISSING_CATEGORY',
          message: 'Expense category missing for row 135.',
          suggestedFix: 'Defaults to "General & Administrative"'
        }
      ]
    };
  }

  async getImportPreview(_importId: string) {
    return {
      rows: [
        { id: '1', date: '2026-09-24', customer: 'Apex Auto Components', invoice: 'INV-904', amount: '240000.00', status: 'Overdue' },
        { id: '2', date: '2026-09-28', customer: 'Tata Steel Industries', payable: 'PAY-881', amount: '800000.00', status: 'Scheduled' },
        { id: '3', date: '2026-10-02', customer: 'Precision Tools Pvt Ltd', invoice: 'INV-981', amount: '450000.00', status: 'Scheduled' }
      ],
      totals: {
        receivables: '1200000.00',
        payables: '1730000.00',
        expenses: '450000.00'
      },
      dateRange: { start: '2026-09-19', end: '2026-12-18' }
    };
  }

  async confirmImport(_importId: string) {
    return { success: true, importedRows: 138 };
  }

  async getForecast(horizonDays: 30 | 60 | 90 = 30): Promise<Forecast> {
    return this.buildForecast(horizonDays);
  }

  async checkAffordability(amount: Money, date: ISODate): Promise<AffordResult> {
    const purchaseAmt = Math.max(0, Number(amount) || 0);
    const baseline = await this.getForecast(30);
    const scenarioEvents: ForecastEvent[] = [...this.events, {
      id: 'scenario-purchase', date, direction: 'out', kind: 'scenario_adjustment',
      label: 'Proposed purchase', amount: purchaseAmt.toFixed(2), confidence: 'scheduled'
    }];
    const withDecisionForecast = this.buildForecast(30, scenarioEvents);
    const withMinNum = Number(withDecisionForecast.summary.minCash);
    const safetyThresholdNum = Number(this.business.safetyThreshold);
    
    let verdict: 'safe' | 'tight' | 'unsafe' = 'safe';
    let headline = '';

    if (withMinNum < safetyThresholdNum) {
      verdict = 'unsafe';
      const shortfallAmt = (safetyThresholdNum - withMinNum).toFixed(2);
      const formattedShortfall = (parseFloat(shortfallAmt) / 100000).toFixed(1);
      headline = `Not safely. This would take you ₹${formattedShortfall} L below your safety threshold on ${withDecisionForecast.summary.minCashDate}.`;
    } else if (withMinNum < safetyThresholdNum * 1.1) {
      verdict = 'tight';
      headline = `Caution. Cash buffer remains thin, staying within 10% of safety threshold on 14 Oct 2026.`;
    } else {
      verdict = 'safe';
      headline = `Yes, safely. Your lowest projected cash stays above safety threshold at all times.`;
    }

    return {
      input: { amount, date },
      baseline,
      withDecision: withDecisionForecast,
      minCashDifference: (-purchaseAmt).toFixed(2),
      verdict,
      headline,
      facts: [
        { label: 'Lowest Cash Without Purchase', value: `₹${Number(baseline.summary.minCash).toLocaleString('en-IN')}` },
        { label: 'Lowest Cash With Purchase', value: `₹${(withMinNum / 100000).toFixed(1)} L` },
        { label: 'Net Difference', value: `-₹${(purchaseAmt / 100000).toFixed(1)} L` },
        { label: 'Safety Threshold', value: '₹2,60,000.00' }
      ],
      trace: {
        formula: 'With-Decision Cash = Baseline Forecast Cash - Proposed Purchase Amount',
        inputs: [
          { label: 'Purchase Amount', value: `₹${purchaseAmt.toLocaleString('en-IN')}` },
          { label: 'Purchase Date', value: date },
          { label: `Baseline Min Cash (${baseline.summary.minCashDate})`, value: `₹${Number(baseline.summary.minCash).toLocaleString('en-IN')}` },
          { label: 'Safety Threshold', value: '₹2,60,000.00' }
        ]
      }
    };
  }

  async getReceivableRisk(): Promise<ReceivableRisk[]> {
    return [
      {
        invoiceId: 'inv-904',
        invoiceNumber: 'INV-904',
        customerId: 'cust-101',
        customerName: 'Apex Auto Components Ltd',
        amount: '240000.00',
        dueDate: '2026-09-01',
        daysOverdue: 18,
        level: 'high',
        customerTypicalDelayDays: 22,
        ruleHits: [
          { ruleId: 'R-102', description: 'Overdue by more than 15 calendar days', inputs: { daysOverdue: 18, threshold: 15 } },
          { ruleId: 'R-301', description: 'Customer historical payment delay exceeds credit terms', inputs: { avgDelay: 22, termDays: 30 } }
        ]
      },
      {
        invoiceId: 'inv-882',
        invoiceNumber: 'INV-882',
        customerId: 'cust-102',
        customerName: 'MetalFab Industrial Corp',
        amount: '160000.00',
        dueDate: '2026-09-10',
        daysOverdue: 9,
        level: 'medium',
        customerTypicalDelayDays: 14,
        ruleHits: [
          { ruleId: 'R-101', description: 'Overdue between 7 and 15 calendar days', inputs: { daysOverdue: 9 } }
        ]
      },
      {
        invoiceId: 'inv-981',
        invoiceNumber: 'INV-981',
        customerId: 'cust-103',
        customerName: 'Precision Tools Pvt Ltd',
        amount: '450000.00',
        dueDate: '2026-10-02',
        daysOverdue: 0,
        level: 'low',
        customerTypicalDelayDays: 2,
        ruleHits: []
      }
    ];
  }

  async listScenarioTypes(): Promise<ScenarioTypeSchema[]> {
    return [
      {
        id: 'scen-delay',
        name: 'Customer Payment Delay',
        description: 'Simulate the impact if a customer delays their scheduled invoice payment.',
        parameters: [
          { name: 'customerId', label: 'Select Customer', type: 'select', options: [
            { label: 'Apex Auto Components', value: 'cust-101' },
            { label: 'MetalFab Industrial Corp', value: 'cust-102' }
          ], required: true },
          { name: 'delayDays', label: 'Delay Duration (Days)', type: 'number', defaultValue: 30, required: true }
        ]
      },
      {
        id: 'scen-purchase',
        name: 'Unplanned Capital Expense',
        description: 'Simulate purchasing new machinery, inventory, or asset.',
        parameters: [
          { name: 'amount', label: 'Purchase Amount (₹)', type: 'number', defaultValue: 500000, required: true },
          { name: 'date', label: 'Purchase Date', type: 'date', defaultValue: '2026-10-05', required: true }
        ]
      }
    ];
  }

  async runScenario(typeId: string, params: Record<string, any>) {
    if (typeId !== 'scen-delay') {
      const comparison = await this.checkAffordability(String(params.amount || '500000.00'), params.date || '2026-10-05');
      return { scenarioId: 'scen-run-' + Date.now(), comparison };
    }

    const delayDays = Math.max(0, Number(params.delayDays) || 30);
    const customer = params.customerId === 'cust-103' ? 'Precision Tools' : 'Apex Auto Components';
    const delayedEvents = this.events.map(event => {
      if (event.direction !== 'in' || event.counterparty !== customer) return event;
      const delayedDate = new Date(`${event.date}T00:00:00Z`);
      delayedDate.setUTCDate(delayedDate.getUTCDate() + delayDays);
      return { ...event, date: this.toISODate(delayedDate), confidence: 'assumed_delay' as const, label: `${event.label} (${delayDays}-day delay)` };
    });
    const baseline = this.buildForecast(30);
    const withDecision = this.buildForecast(30, delayedEvents);
    const minDifference = Number(withDecision.summary.minCash) - Number(baseline.summary.minCash);
    const threshold = Number(this.business.safetyThreshold);
    const verdict: AffordResult['verdict'] = Number(withDecision.summary.minCash) < threshold ? 'unsafe' : Number(withDecision.summary.minCash) < threshold * 1.1 ? 'tight' : 'safe';
    const headline = verdict === 'safe'
      ? `${customer}'s ${delayDays}-day delay remains manageable; the safety reserve is maintained.`
      : `${customer}'s ${delayDays}-day delay pushes projected cash below the safety reserve on ${withDecision.summary.minCashDate}.`;
    return {
      scenarioId: 'scen-run-' + Date.now(),
      comparison: {
        input: { amount: '0.00', date: this.business.asOf }, baseline, withDecision,
        minCashDifference: minDifference.toFixed(2), verdict, headline,
        facts: [
          { label: 'Customer', value: customer },
          { label: 'Payment delay', value: `${delayDays} days` },
          { label: 'Baseline minimum', value: `₹${Number(baseline.summary.minCash).toLocaleString('en-IN')}` },
          { label: 'Scenario minimum', value: `₹${Number(withDecision.summary.minCash).toLocaleString('en-IN')}` }
        ],
        trace: {
          formula: 'Delayed receipt date = Original receipt date + Customer delay',
          inputs: [
            { label: 'Customer receipt', value: customer },
            { label: 'Delay applied', value: `${delayDays} days` },
            { label: 'Safety threshold', value: `₹${threshold.toLocaleString('en-IN')}` }
          ]
        }
      }
    };
  }

  async listActions(): Promise<ActionItem[]> {
    return [...this.actions];
  }

  async updateActionStatus(actionId: string, status: 'open' | 'done' | 'dismissed'): Promise<ActionItem> {
    const act = this.actions.find(a => a.id === actionId);
    if (act) act.status = status;
    return act || this.actions[0];
  }
}

export const mockApi = new MockFlowCredApi();
