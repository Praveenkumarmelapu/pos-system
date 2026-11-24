import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Store, LogIn, AlertCircle, Eye, EyeOff, UserCheck, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotMessage(res.data?.message || 'Request submitted.');
    } catch {
      setForgotMessage('Could not submit the request. Check the email and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(result.user?.isSuperAdmin ? '/admin' : '/pos', { replace: true });
      } else {
        setError(result.message || 'Unable to sign in. Check your connection and try again.');
      }
    } catch (err) {
      const failure = err.response?.data?.error;
      setError(failure?.details?.map?.(detail => detail.message).filter(Boolean).join(' ') || failure?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-txt">Welcome back</h2>
        <p className="text-sm text-txt-secondary mt-1">
          Sign in to your store account to continue
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-danger-light border border-red-200 text-sm text-danger flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-txt mb-1.5">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="owner@yourstore.com"
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-txt">Password</label>
            <button
              type="button"
              onClick={() => setShowForgotHelp((v) => !v)}
              className="text-xs font-medium text-action hover:text-action-hover"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {showForgotHelp && (
        <form onSubmit={handleForgotSubmit} className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-slate-700 space-y-2">
          <p className="text-xs">Enter your account email. Staff get a temporary password from their shop owner (Staff page). Shop owners: contact platform support.</p>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="input flex-1 !py-1.5 text-xs"
              placeholder="you@yourstore.com"
            />
            <button type="submit" disabled={forgotLoading} className="btn-primary !py-1.5 px-3 text-xs">
              {forgotLoading ? 'Sending...' : 'Request reset'}
            </button>
          </div>
          {forgotMessage && <p className="text-xs font-semibold text-slate-800">{forgotMessage}</p>}
        </form>
      )}

      {/* Demo Quick Access */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">
          Quick Demo Access
        </p>
        <div className="space-y-2">
          {[
            { label: 'Shop Owner', sub: 'Full access', email: 'ramesh@kirana.local', password: 'Owner@123456', icon: Store, color: 'text-action' },
            { label: 'Cashier', sub: 'Billing only', email: 'suresh@kirana.local', password: 'Cashier@123456', icon: UserCheck, color: 'text-success' },
          ].map(({ label, sub, email: dEmail, password: dPass, icon: Icon, color }) => (
            <button
              key={label}
              type="button"
              onClick={() => fillDemo(dEmail, dPass)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-action/30 hover:bg-action-light flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${color}`} />
                <div>
                  <div className="text-sm font-medium text-txt">{label}</div>
                  <div className="text-xs text-txt-muted">{sub}</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-txt-muted group-hover:text-action transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-txt-secondary">
        New shopkeeper?{' '}
        <Link to="/register" className="font-semibold text-action hover:text-action-hover">
          Register Your Shop
        </Link>
      </p>
    </div>
  );
}
