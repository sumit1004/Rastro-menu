import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import AuthLayout, { AuthBrand } from './AuthLayout';
import AuthField from './AuthField';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <AuthBrand className="auth-brand-card" />
        <h2 className="auth-card-title">Create Your Account</h2>
        <p className="auth-card-subtitle">
          Start your immersive AR restaurant journey in minutes.
        </p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="Restaurant Owner Name"
            type="text"
            id="name"
            icon={User}
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
          <AuthField
            label="Email Address"
            type="email"
            id="email"
            icon={Mail}
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          <AuthField
            label="Password"
            type="password"
            id="password"
            icon={Lock}
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            showToggle
            required
            minLength={6}
          />
          <AuthField
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            icon={Lock}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            showToggle
            required
          />

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-submit-spinner" aria-label="Loading" />
            ) : (
              <>
                Sign Up
                <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Signup;
