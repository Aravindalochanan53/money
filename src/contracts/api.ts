/**
 * FlowCred API Contract Layer
 * Strictly typed interfaces for all domain data structures.
 * Money is represented exclusively as decimal strings (e.g., "125000.00").
 */

export type Money = string;       // Decimal string, e.g. "125000.00". Never float.
export type ISODate = string;     // YYYY-MM-DD string

export interface Trace {
  formula: string;               // Human-readable formula (e.g. "Opening Cash + Total Inflows - Total Outflows")
  inputs: { label: string; value: string }[];
  sourceRows?: {
    type: 'invoice' | 'payable' | 'expense';
    id: string;
    label: string;
    amount: Money;
  }[];
}

export interface ForecastPoint {
  date: ISODate;
  openingCash: Money;
  inflow: Money;
  outflow: Money;
  closingCash: Money;
}

export interface ForecastEvent {
  id: string;
  date: ISODate;
  direction: 'in' | 'out';
  kind: 'customer_receipt' | 'supplier_payment' | 'expense' | 'scenario_adjustment';
  label: string;
  counterparty?: string;
  amount: Money;
  confidence?: 'scheduled' | 'at_risk' | 'assumed_delay';
  sourceRef?: {
    type: 'invoice' | 'payable' | 'expense';
    id: string;
  };
}

export interface Forecast {
  asOf: ISODate;
  horizonDays: 30 | 60 | 90;
  safetyThreshold: Money;
  points: ForecastPoint[];
  events: ForecastEvent[];
  summary: {
    openingCash: Money;
    minCash: Money;
    minCashDate: ISODate;
    endCash: Money;
    daysBelowThreshold: number;
    firstShortfallDate?: ISODate;
  };
  trace: Trace;
}

export interface AffordResult {
  input: { amount: Money; date: ISODate };
  baseline: Forecast;
  withDecision: Forecast;
  minCashDifference: Money;
  verdict: 'safe' | 'tight' | 'unsafe';
  headline: string;               // Server-built deterministic sentence
  facts: { label: string; value: string }[];
  trace: Trace;
}

export interface ReceivableRisk {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: Money;
  dueDate: ISODate;
  daysOverdue: number;
  level: 'low' | 'medium' | 'high';
  customerTypicalDelayDays: number | null;
  ruleHits: {
    ruleId: string;
    description: string;
    inputs: Record<string, string | number>;
  }[];
}

export interface ActionItem {
  id: string;
  ruleId: string;
  title: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  relatedEvent?: {
    type: string;
    id: string;
    label: string;
  };
  amount?: Money;
  dueDate?: ISODate;
  nextStep: string;
  status: 'open' | 'done' | 'dismissed';
}

export interface ImportIssue {
  row: number;
  column: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  suggestedFix: string;
}

export interface ScenarioTypeSchema {
  id: string;
  name: string;
  description: string;
  parameters: {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: { label: string; value: string }[];
    defaultValue?: string | number;
    required: boolean;
  }[];
}

export interface BusinessProfile {
  name: string;
  currentCash: Money;
  safetyThreshold: Money;
  currency: string;
  asOf: ISODate;
}

/**
 * FlowCred API Contract Interface
 */
export interface FlowCredApi {
  login(email: string, password: string): Promise<{ token: string; user: { email: string; name: string } }>;
  getBusiness(): Promise<BusinessProfile>;
  saveBusiness(profile: Partial<BusinessProfile>): Promise<BusinessProfile>;
  uploadImport(file: File): Promise<{ importId: string; rowCount: number; issues: ImportIssue[] }>;
  getImportPreview(importId: string): Promise<{
    rows: any[];
    totals: { receivables: Money; payables: Money; expenses: Money };
    dateRange: { start: ISODate; end: ISODate };
  }>;
  confirmImport(importId: string): Promise<{ success: boolean; importedRows: number }>;
  getForecast(horizonDays?: 30 | 60 | 90): Promise<Forecast>;
  checkAffordability(amount: Money, date: ISODate): Promise<AffordResult>;
  getReceivableRisk(): Promise<ReceivableRisk[]>;
  listScenarioTypes(): Promise<ScenarioTypeSchema[]>;
  runScenario(typeId: string, params: Record<string, any>): Promise<{ scenarioId: string; comparison: AffordResult }>;
  listActions(): Promise<ActionItem[]>;
  updateActionStatus(actionId: string, status: 'open' | 'done' | 'dismissed'): Promise<ActionItem>;
}
