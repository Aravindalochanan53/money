/**
 * FlowCred Authenticated API Client
 * Connects React frontend directly to FastAPI backend endpoints.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('flowcred_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('flowcred_token', token);
  } else {
    localStorage.removeItem('flowcred_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If body is not FormData, ensure Content-Type is json
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Unauthorized: token expired or invalid
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('flowcred_unauthorized'));
    throw new ApiError(401, 'Session expired or invalid credentials. Please log in again.');
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || (typeof data === 'string' ? data : 'API request failed');
    throw new ApiError(response.status, errorMsg, data);
  }

  return data as T;
}

export const apiClient = {
  // Authentication
  auth: {
    login: (formData: FormData | URLSearchParams | Record<string, string>) => {
      // FastAPI OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
      let body: URLSearchParams;
      if (formData instanceof URLSearchParams) {
        body = formData;
      } else if (formData instanceof FormData) {
        body = new URLSearchParams();
        formData.forEach((val, key) => body.append(key, String(val)));
      } else {
        body = new URLSearchParams(formData);
      }
      return request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
    },
    register: (payload: any) =>
      request<{ access_token: string; token_type: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Business Profile
  business: {
    getProfile: () => request<any>('/business/profile'),
    updateProfile: (payload: any) =>
      request<any>('/business/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    loadDemoData: () =>
      request<any>('/business/load-demo-data', {
        method: 'POST'
      }),
    setOpeningBalance: (payload: { balance_amount: number; as_of_date?: string; notes?: string }) =>
      request<any>('/business/opening-balance', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Dashboard Overview
  dashboard: {
    getOverview: () => request<any>('/dashboard/overview')
  },

  // Cash Timeline
  timeline: {
    getTimeline: (days = 90, applyRiskDelay = true) =>
      request<any>(`/timeline?days=${days}&apply_risk_delay=${applyRiskDelay}`)
  },

  // Receivable Risk
  risk: {
    getReceivableRisk: () => request<any>('/risk/receivables'),
    listAlerts: (status?: string) =>
      request<any[]>(`/risk/alerts${status ? `?status=${status}` : ''}`),
    updateAlertStatus: (alertId: string, status: string) =>
      request<any>(`/risk/alerts/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    exportCsv: () => request<string>('/risk/export'),
    downloadExport: async (filename?: string) => {
      const csvText = await request<string>('/risk/export');
      const targetFilename = filename || `flowcred_risk_radar_${new Date().toISOString().split('T')[0]}.csv`;
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', targetFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return csvText;
    }
  },

  // Financial Entities & Traceability
  financial: {
    getInvoices: (status?: string) =>
      request<any[]>(`/financial/invoices${status ? `?status=${status}` : ''}`),
    payInvoice: (invoiceId: string, payload: { amount: number; payment_date?: string; payment_method?: string; reference_number?: string; notes?: string }) =>
      request<any>(`/financial/invoices/${invoiceId}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getBills: (status?: string) =>
      request<any[]>(`/financial/bills${status ? `?status=${status}` : ''}`),
    payBill: (billId: string, payload: { amount: number; payment_date?: string; payment_method?: string; reference_number?: string; notes?: string }) =>
      request<any>(`/financial/bills/${billId}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getExpenses: () => request<any[]>('/financial/expenses'),
    getCustomers: () => request<any[]>('/financial/customers'),
    getSuppliers: () => request<any[]>('/financial/suppliers'),
    getPayments: (type?: string) =>
      request<any[]>(`/financial/payments${type ? `?payment_type=${type}` : ''}`),
    getTransactions: (direction?: string) =>
      request<any[]>(`/financial/transactions${direction ? `?direction=${direction}` : ''}`)
  },

  // Scenarios
  scenarios: {
    list: () => request<any[]>('/scenarios'),
    get: (id: string) => request<any>(`/scenarios/${id}`),
    create: (payload: any) =>
      request<any>('/scenarios', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) =>
      request<any>(`/scenarios/${id}`, {
        method: 'DELETE'
      }),
    simulate: (payload: { scenario_type: string; params: any; days?: number }) =>
      request<any>('/scenarios/simulate', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    simulatePersisted: (scenarioId: string, days = 90) =>
      request<any>(`/scenarios/${scenarioId}/simulate?days=${days}`, {
        method: 'POST'
      }),
    addChange: (scenarioId: string, changePayload: any) =>
      request<any>(`/scenarios/${scenarioId}/changes`, {
        method: 'POST',
        body: JSON.stringify(changePayload)
      })
  },

  // Action Center
  actions: {
    list: () => request<any[]>('/actions'),
    updateStatus: (actionId: string, status: string) =>
      request<any>(`/actions/${actionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  },

  // Affordability Decision Engine
  affordability: {
    check: (payload: { purchase_title: string; amount: number; planned_date: string }) =>
      request<any>('/affordability/check', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Data Import
  import: {
    validate: (file: File, fileType: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);
      return request<any>('/import/validate', {
        method: 'POST',
        body: formData
      });
    },
    confirm: (batchId: string) =>
      request<any>('/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ batch_id: batchId })
      })
  }
};
