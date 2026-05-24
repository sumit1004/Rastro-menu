import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../services/api';
import AuthLayout, { AuthBrand } from './AuthLayout';
import AuthField from './AuthField';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message || 'Too many requests. Please wait and try again.');
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
              If an account exists with that email, a reset link has been sent. The link expires in
              15 minutes.
            </p>
            <p className="auth-success-hint">
              Didn&apos;t receive it? Check spam or try again with the correct email.
            </p>
            <Link to="/login" className="auth-submit auth-success-btn">
              Back to Login
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
                label="Email Address"
                type="email"
                id="email"
                icon={Mail}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? (
                  <span className="auth-submit-spinner" aria-label="Loading" />
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
