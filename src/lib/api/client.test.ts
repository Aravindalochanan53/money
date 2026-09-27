import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient, getAuthToken, setAuthToken, ApiError, API_BASE_URL } from './client';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('manages token storage correctly', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('test-jwt-token-123');
    expect(getAuthToken()).toBe('test-jwt-token-123');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it('attaches Authorization Bearer token to request headers', async () => {
    setAuthToken('my-secret-jwt-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'biz-1', name: 'Test Business' }),
    });
    globalThis.fetch = mockFetch;

    const res = await apiClient.business.getProfile();
    expect(res).toEqual({ id: 'biz-1', name: 'Test Business' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl).toContain('/business/profile');
    const headers = callOptions.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-secret-jwt-token');
  });

  it('handles 401 Unauthorized by clearing token and throwing ApiError', async () => {
    setAuthToken('expired-jwt-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Invalid token' }),
    });
    globalThis.fetch = mockFetch;

    await expect(apiClient.business.getProfile()).rejects.toThrow(ApiError);
    expect(getAuthToken()).toBeNull();
  });

  it('correctly posts form body and parses JSON response for login', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ access_token: 'new-token', token_type: 'bearer' }),
    });
    globalThis.fetch = mockFetch;

    const res = await apiClient.auth.login({ username: 'user@test.com', password: 'secret123' });
    expect(res.access_token).toBe('new-token');

    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl).toBe(`${API_BASE_URL}/auth/login`);
    expect(callOptions.method).toBe('POST');
  });
});
