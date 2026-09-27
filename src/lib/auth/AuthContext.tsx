import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, getAuthToken, setAuthToken } from '../api/client';

export interface AuthUser {
  id?: string;
  email: string;
  fullName?: string;
  role?: string;
}

export interface BusinessContext {
  id: string;
  name: string;
  currency: string;
  current_cash: number;
  safety_cash_threshold: number;
  as_of_date?: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  business: BusinessContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<BusinessContext | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    setBusiness(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    try {
      const biz = await apiClient.business.getProfile();
      setBusiness(biz);
      // Derive basic user details from email in token payload or default
      try {
        const payloadBase64 = currentToken.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64));
          setUser({
            id: payload.sub,
            email: payload.email || 'owner@factory.com',
            role: payload.role || 'OWNER'
          });
        }
      } catch {
        setUser({ email: 'user@flowcred.local' });
      }
    } catch (err: any) {
      if (err.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('flowcred_unauthorized', handleUnauthorized);
    refreshProfile();

    return () => {
      window.removeEventListener('flowcred_unauthorized', handleUnauthorized);
    };
  }, [refreshProfile, logout]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login({ username: email, password });
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        business,
        isAuthenticated: !!token && !!business,
        isLoading,
        login,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
