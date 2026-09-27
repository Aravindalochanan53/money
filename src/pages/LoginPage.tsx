import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';
import { apiClient, setAuthToken } from '../lib/api/client';
import { Lock, Mail, Building2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, refreshProfile } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Login form state
  const [email, setEmail] = useState('owner@lakshmicomponents.com');
  const [password, setPassword] = useState('SecurePassword123!');

  // Register form state
  const [fullName, setFullName] = useState('Rajesh Sharma');
  const [businessName, setBusinessName] = useState('Sri Lakshmi Components Pvt Ltd');
  const [startingCash, setStartingCash] = useState('500000.00');
  const [safetyThreshold, setSafetyThreshold] = useState('150000.00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.auth.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        business_name: businessName.trim(),
        starting_cash: parseFloat(startingCash) || 0,
        safety_cash_threshold: parseFloat(safetyThreshold) || 100000
      });
      setAuthToken(res.access_token);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      // First try logging into default demo user
      await login('owner@lakshmicomponents.com', 'SecurePassword123!');
    } catch {
      // If demo user does not exist in this database yet, register and load demo data
      try {
        const res = await apiClient.auth.register({
          email: 'owner@lakshmicomponents.com',
          password: 'SecurePassword123!',
          full_name: 'Rajesh Sharma',
          business_name: 'Sri Lakshmi Components Pvt Ltd',
          starting_cash: 500000.0,
          safety_cash_threshold: 150000.0
        });
        setAuthToken(res.access_token);
        await apiClient.business.loadDemoData();
        await refreshProfile();
      } catch (regErr: any) {
        setError(regErr.message || 'Unable to initialize demo workspace.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-cash text-surface font-bold text-xl shadow-sm">
          FC
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          FlowCred Decision Engine
        </h1>
        <p className="text-xs text-ink-muted">
          Deterministic cash-flow visibility and expenditure affordability for MSMEs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 border border-rule rounded shadow-card space-y-6">
          {error && (
            <div className="p-3 bg-shortfall/10 border border-shortfall/30 rounded text-xs text-shortfall flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-rule pb-2 gap-4 text-xs font-semibold">
            <button
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`pb-1 border-b-2 transition-colors ${!isRegistering ? 'border-cash text-cash' : 'border-transparent text-ink-muted hover:text-ink'}`}
            >
              Sign In to Existing Business
            </button>
            <button
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`pb-1 border-b-2 transition-colors ${isRegistering ? 'border-cash text-cash' : 'border-transparent text-ink-muted hover:text-ink'}`}
            >
              Register New Business
            </button>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                    placeholder="owner@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-cash text-surface text-xs font-semibold rounded hover:bg-cash/90 focus:outline-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                  placeholder="e.g. Rajesh Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Company / Business Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                    placeholder="e.g. Sri Lakshmi Components Pvt Ltd"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Starting Cash (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={startingCash}
                    onChange={e => setStartingCash(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Safety Buffer (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={safetyThreshold}
                    onChange={e => setSafetyThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Account Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                  placeholder="owner@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded text-ink focus:outline-none focus:border-cash"
                  placeholder="Min 8 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-cash text-surface text-xs font-semibold rounded hover:bg-cash/90 focus:outline-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? 'Setting up business...' : 'Create Business & Launch'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-rule space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Quick Development Access:</span>
              <span className="font-mono text-cash font-semibold">FastAPI Connected</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full py-2 px-3 bg-paper border border-rule hover:border-ink-muted rounded text-xs font-medium text-ink flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-cash" />
              <span>Launch Demo (Sri Lakshmi Components)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
