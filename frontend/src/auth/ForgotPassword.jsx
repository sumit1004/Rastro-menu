import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react';
import api from '../services/api';
import AuthLayout, { AuthBrand } from './AuthLayout';
import AuthField from './AuthField';
import './Auth.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const maskEmail = (value) => {
  const email = value.trim();
  const at = email.indexOf('@');
  if (at < 1) return email;
  const user = email.slice(0, at);
  const domain = email.slice(at);
  if (user.length <= 2) return `${user[0]}***${domain}`;
  return `${user.slice(0, 2)}***${domain}`;
};

const getErrorMessage = (err) => {
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Cannot reach the server. Make sure the backend is running (npm start in the backend folder).';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  return err.response?.data?.message || 'Something went wrong. Please try again.';
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devResetUrl, setDevResetUrl] = useState(null);
  const [emailDispatched, setEmailDispatched] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const submitForgot = async (emailValue, { isResend = false } = {}) => {
    const trimmed = emailValue.trim().toLowerCase();

    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setInfo('');
    if (isResend) setResendLoading(true);
    else setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email: trimmed });

      setLastSubmittedEmail(trimmed);
      setSubmitted(true);
      setResendCooldown(60);

      if (import.meta.env.DEV) {
        setDevResetUrl(data.devResetUrl || null);
        setEmailDispatched(data.emailDispatched ?? null);
      }

      if (isResend) {
        setInfo('We sent another reset link if an account exists for that email.');
      }
    } catch (err) {
      console.error('[ForgotPassword]', err);
      setError(getErrorMessage(err));
      setSubmitted(false);
    } finally {
      setLoading(false);
      setResendLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitForgot(email);
  };

  const handleResend = () => {
    if (resendCooldown > 0 || resendLoading) return;
    submitForgot(lastSubmittedEmail || email, { isResend: true });
  };

  const handleTryDifferentEmail = () => {
    setSubmitted(false);
    setError('');
    setInfo('');
    setDevResetUrl(null);
    setEmailDispatched(null);
    setResendCooldown(0);
    setEmail(lastSubmittedEmail || email);
  };

  const handleCopyDevLink = async () => {
    if (!devResetUrl) return;
    try {
      await navigator.clipboard.writeText(devResetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link. Select and copy it manually.');
    }
  };

  const isBusy = loading || resendLoading;

  return (
    <AuthLayout>
      <div className="auth-card">
        <AuthBrand className="auth-brand-card" />
        <h2 className="auth-card-title">Forgot Password?</h2>
        <p className="auth-card-subtitle">
          Enter your email and we&apos;ll send you a secure link to reset your password.
        </p>

        {submitted ? (
          <div className="auth-success-panel">
            <CheckCircle size={48} className="auth-success-icon" aria-hidden />
            <h3>Check your inbox</h3>
            <p>
              If an account exists for <strong>{maskEmail(lastSubmittedEmail)}</strong>, a reset link
              has been sent. The link expires in 15 minutes.
            </p>

            {import.meta.env.DEV && emailDispatched === false && (
              <div className="auth-dev-panel" role="status">
                <p>
                  <strong>Dev:</strong> SMTP could not send the email. Use the link below to test
                  reset, then fix <code>SMTP_PASSWORD</code> in <code>backend/.env</code>.
                </p>
                {devResetUrl && (
                  <div className="auth-dev-link-row">
                    <input type="text" readOnly value={devResetUrl} className="auth-dev-link-input" />
                    <button type="button" className="auth-dev-copy-btn" onClick={handleCopyDevLink}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {devResetUrl && (
                  <a href={devResetUrl} className="auth-dev-open-link">
                    Open reset page
                  </a>
                )}
              </div>
            )}

            {import.meta.env.DEV && devResetUrl && emailDispatched === true && (
              <div className="auth-dev-panel" role="status">
                <p>
                  <strong>Dev:</strong> Email sent. Backup reset link:
                </p>
                <a href={devResetUrl} className="auth-dev-open-link">
                  Open reset page
                </a>
              </div>
            )}

            {import.meta.env.DEV && !devResetUrl && (
              <p className="auth-success-hint">
                Dev: No account found for this email, or backend is not in dev mode. Register first or
                use an email that exists in your database.
              </p>
            )}

            <p className="auth-success-hint">
              Didn&apos;t receive it? Check your spam folder, wait a minute, then resend.
            </p>

            {info && <div className="auth-info-banner">{info}</div>}
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <div className="auth-success-actions">
              <button
                type="button"
                className="auth-submit"
                onClick={handleResend}
                disabled={isBusy || resendCooldown > 0}
              >
                {resendLoading ? (
                  <>
                    <span className="auth-submit-spinner" aria-label="Sending" />
                    Sending…
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} aria-hidden />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend reset link'}
                  </>
                )}
              </button>
              <button type="button" className="auth-secondary-btn" onClick={handleTryDifferentEmail}>
                Try a different email
              </button>
            </div>

            <Link to="/login" className="auth-inline-link auth-success-back">
              <ArrowLeft size={14} aria-hidden />
              Back to Login
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
                label="Email Address"
                type="email"
                id="forgot-email"
                icon={Mail}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isBusy}
              />

              <button type="submit" className="auth-submit" disabled={isBusy}>
                {loading ? (
                  <>
                    <span className="auth-submit-spinner" aria-label="Sending" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer-text">
              <Link to="/login" className="auth-inline-link">
                <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                Back to Login
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
