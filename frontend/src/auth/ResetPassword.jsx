import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import AuthLayout, { AuthBrand } from './AuthLayout';
import AuthField from './AuthField';
import { getPasswordStrength, validateStrongPassword } from '../utils/passwordStrength';
import './Auth.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token || token.length < 32) {
        setTokenValid(false);
        setVerifying(false);
        return;
      }

      try {
        await api.get(`/auth/reset-password/verify/${encodeURIComponent(token)}`);
        if (!cancelled) setTokenValid(true);
      } catch {
        if (!cancelled) setTokenValid(false);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pwdError = validateStrongPassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 4000);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to reset password. Please request a new link.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout>
        <div className="auth-card auth-card-centered">
          <span className="auth-submit-spinner auth-spinner-dark" aria-label="Verifying link" />
          <p className="auth-card-subtitle" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Verifying your reset link…
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!tokenValid) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <AuthBrand className="auth-brand-card" />
          <div className="auth-error-panel">
            <AlertCircle size={40} aria-hidden />
            <h3>Link expired or invalid</h3>
            <p>
              This password reset link is invalid, already used, or has expired. Request a new one
              to continue.
            </p>
            <Link to="/forgot-password" className="auth-submit" style={{ textDecoration: 'none' }}>
              Request New Link
              <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <AuthBrand className="auth-brand-card" />
        <h2 className="auth-card-title">Set New Password</h2>
        <p className="auth-card-subtitle">Choose a strong password for your RASTROmenu account.</p>

        {success ? (
          <div className="auth-success-panel">
            <CheckCircle size={48} className="auth-success-icon" aria-hidden />
            <h3>Password updated</h3>
            <p>Your password has been reset successfully. Redirecting you to login…</p>
            <Link to="/login" className="auth-submit auth-success-btn">
              Login Now
              <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <AuthField
                label="New Password"
                type="password"
                id="password"
                icon={Lock}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                showToggle
                required
              />

              {password && (
                <div className="auth-strength">
                  <div className="auth-strength-bar">
                    <span
                      className="auth-strength-fill"
                      style={{ width: `${strength.percent}%`, background: strength.color }}
                    />
                  </div>
                  <span className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              <AuthField
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                icon={Lock}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                showToggle
                required
              />

              <ul className="auth-password-rules">
                <li className={password.length >= 8 ? 'met' : ''}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'met' : ''}>One uppercase letter</li>
                <li className={/[a-z]/.test(password) ? 'met' : ''}>One lowercase letter</li>
                <li className={/[0-9]/.test(password) ? 'met' : ''}>One number</li>
              </ul>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? (
                  <span className="auth-submit-spinner" aria-label="Loading" />
                ) : (
                  <>
                    Reset Password
                    <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
