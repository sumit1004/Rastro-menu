import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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

    setLoading(true);

    try {
      const { data } = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password
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
    <div className="auth-container">
      <Link to="/" className="auth-back-home">
        <ArrowLeft size={18} />
        Back to Home
      </Link>
      <Link to="/" className="auth-logo">RASTRO<span>menu</span></Link>
      <Card className="auth-card">
        <h2 className="text-center mb-4">Create Your Account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <Input 
            label="Restaurant Owner Name" 
            type="text" 
            id="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
          <Input 
            label="Email Address" 
            type="email" 
            id="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            id="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            minLength={6}
          />
          <Input 
            label="Confirm Password" 
            type="password" 
            id="confirmPassword" 
            value={formData.confirmPassword} 
            onChange={handleChange} 
            required 
          />
          <Button type="submit" className="w-full mt-4" loading={loading}>
            Sign Up
          </Button>
        </form>
        <p className="text-center mt-4 text-muted">
          Already have an account? <Link to="/login" className="text-primary">Login</Link>
        </p>
      </Card>
    </div>
  );
};

export default Signup;
