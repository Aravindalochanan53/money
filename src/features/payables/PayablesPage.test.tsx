import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PayablesPage } from './PayablesPage';
import { apiClient } from '../../lib/api/client';
import { AuthContext } from '../../lib/auth/AuthContext';

vi.mock('../../lib/api/client', () => ({
  apiClient: {
    financial: {
      getBills: vi.fn(),
      recordBillPayment: vi.fn(),
    }
  }
}));

const mockAuthContext = {
  user: {
    id: 'user-1',
    email: 'owner@precision.com',
    full_name: 'Rajesh Sharma',
    role: 'OWNER',
    business_id: 'biz-1',
    business_name: 'Precision Engineering',
  },
  business: {
    id: 'biz-1',
    name: 'Precision Engineering',
    currency: 'INR',
    current_cash: 500000,
    safety_cash_threshold: 150000,
    starting_cash: 500000,
  },
  token: 'mock-jwt-token',
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
};

describe('PayablesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially then displays bills from API', async () => {
    const mockBills = [
      {
        id: 'bill-1',
        supplier_id: 'supp-1',
        supplier_name: 'Apex Steel Tubes',
        bill_number: 'BILL-101',
        bill_date: '2026-09-01',
        due_date: '2026-10-01',
        category: 'RAW_MATERIAL',
        original_amount: 85000,
        paid_amount: 0,
        outstanding_balance: 85000,
        payment_status: 'UNPAID',
        scheduled_payment_date: '2026-10-01',
        days_past_due: 0,
        is_overdue: false,
      }
    ];

    (apiClient.financial.getBills as any).mockResolvedValue(mockBills);

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <PayablesPage />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Apex Steel Tubes')).toBeDefined();
      expect(screen.getByText('BILL-101')).toBeDefined();
    });

    expect(apiClient.financial.getBills).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no bills are returned by backend', async () => {
    (apiClient.financial.getBills as any).mockResolvedValue([]);

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <PayablesPage />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No bills found')).toBeDefined();
    });
  });

  it('renders error state if API fails', async () => {
    (apiClient.financial.getBills as any).mockRejectedValue(new Error('Network error loading bills'));

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <PayablesPage />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Network error loading bills')).toBeDefined();
    });
  });
});
