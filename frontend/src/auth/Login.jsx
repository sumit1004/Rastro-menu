import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import AuthLayout, { AuthBrand } from './AuthLayout';
import AuthField from './AuthField';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data);
      if (remember) {
        localStorage.setItem('rastro_remember_email', email);
      } else {
        localStorage.removeItem('rastro_remember_email');
      }
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('rastro_remember_email');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  return (
    <AuthLayout>
      <div className="auth-card">
        <AuthBrand className="auth-brand-card" />
        <h2 className="auth-card-title">Welcome Back</h2>
        <p className="auth-card-subtitle">
          Login to manage your immersive AR restaurant experience.
        </p>

        {error && <div className="auth-error" role="alert">{error}</div>}

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
          <AuthField
            label="Password"
            type="password"
            id="password"
            icon={Lock}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            showToggle
            required
          />

          <div className="auth-row-between">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="auth-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-submit-spinner" aria-label="Loading" />
            ) : (
              <>
                Login
                <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
