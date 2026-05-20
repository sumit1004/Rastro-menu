import React, { useState } from 'react';
import api from '../services/api';
import './AdminDashboard.css';

const PLANS = ['free', 'pro', 'premium'];
const CYCLES = ['monthly', 'yearly'];

const PlanEditModal = ({ restaurant, onClose, onSuccess }) => {
  const [plan, setPlan] = useState(restaurant.subscription_plan || 'free');
  const [cycle, setCycle] = useState(restaurant.billing_cycle || 'monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { plan, billing_cycle: plan === 'free' ? null : cycle };
      await api.put(`/admin/restaurants/${restaurant.id}/plan`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>Edit Subscription Plan</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <p className="admin-modal-subtitle">
          Restaurant: <strong>{restaurant.restaurant_name}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-field">
            <label>Plan</label>
            <div className="plan-toggle-group">
              {PLANS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`plan-toggle-btn ${plan === p ? 'active plan-' + p : ''}`}
                  onClick={() => setPlan(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {plan !== 'free' && (
            <div className="admin-modal-field">
              <label>Billing Cycle</label>
              <div className="plan-toggle-group">
                {CYCLES.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`plan-toggle-btn ${cycle === c ? 'active' : ''}`}
                    onClick={() => setCycle(c)}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {plan !== 'free' && (
            <div className="admin-expiry-preview">
              <span>New Expiry: </span>
              <strong>
                {(() => {
                  const d = new Date();
                  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
                  else d.setFullYear(d.getFullYear() + 1);
                  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                })()}
              </strong>
            </div>
          )}

          {error && <div className="admin-modal-error">{error}</div>}

          <div className="admin-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanEditModal;
