import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/Loader';
import PlanEditModal from './PlanEditModal';
import AdminARModelLibrary from './AdminARModelLibrary';
import {
  Users, Activity, CheckCircle, BrainCircuit,
  UtensilsCrossed, Star, Eye, Edit2, BarChart2
} from 'lucide-react';
import './AdminDashboard.css';

const PLAN_COLORS = {
  free: '#94a3b8',
  pro: '#4f46e5',
  premium: '#d97706',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const PlanBadge = ({ plan }) => (
  <span style={{
    background: PLAN_COLORS[plan] + '22',
    color: PLAN_COLORS[plan],
    padding: '3px 10px',
    borderRadius: '99px',
    fontWeight: 700,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: `1px solid ${PLAN_COLORS[plan]}44`
  }}>
    {plan}
  </span>
);

const AdminDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [metrics, setMetrics] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMetrics = async () => {
    try {
      const { data } = await api.get('/admin/metrics');
      setMetrics(data);
    } catch (err) {
      setError('Failed to load admin metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const { data } = await api.get('/admin/restaurants');
      setRestaurants(data);
    } catch (err) {
      setError('Failed to load restaurant data.');
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchMetrics();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'restaurants' && user?.role === 'admin') {
      fetchRestaurants();
    }
  }, [activeTab]);

  if (authLoading || loadingMetrics) return <Loader />;
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" />;

  const filteredRestaurants = restaurants.filter(r =>
    r.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const metricCards = metrics ? [
    { icon: <Users size={22} />, label: 'Total Restaurants', value: metrics.totalRestaurants, color: '#4f46e5', bg: '#eff6ff' },
    { icon: <UtensilsCrossed size={22} />, label: 'Total Dishes', value: metrics.totalDishes, color: '#16a34a', bg: '#f0fdf4' },
    { icon: <Star size={22} />, label: 'Total Reviews', value: metrics.totalReviews, color: '#d97706', bg: '#fef3c7' },
    { icon: <Eye size={22} />, label: 'Menu Views', value: metrics.totalMenuViews, color: '#0891b2', bg: '#ecfeff' },
    { icon: <BrainCircuit size={22} />, label: 'AI Generations', value: metrics.totalAiGenerations, color: '#7c3aed', bg: '#f5f3ff' },
    { icon: <Activity size={22} />, label: 'Active Trials', value: metrics.activeTrials, color: '#dc2626', bg: '#fff1f2' },
  ] : [];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>⚡ Admin Control Center</h1>
          <p>Full visibility and control over the Rastro-menu SaaS platform.</p>
        </div>
        <div className="admin-badge">
          <span>👑 ADMIN</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart2 size={16} /> Platform Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'restaurants' ? 'active' : ''}`}
          onClick={() => setActiveTab('restaurants')}
        >
          <Users size={16} /> Restaurant CRM
        </button>
        <button
          className={`admin-tab ${activeTab === 'ar-library' ? 'active' : ''}`}
          onClick={() => setActiveTab('ar-library')}
        >
          <Star size={16} /> AR Library
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && metrics && (
        <>
          <div className="admin-metrics-grid">
            {metricCards.map((m, i) => (
              <div key={i} className="metric-card" style={{ borderTop: `3px solid ${m.color}` }}>
                <div className="metric-icon-wrap" style={{ background: m.bg, color: m.color }}>
                  {m.icon}
                </div>
                <div className="metric-info">
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-value">{Number(m.value).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="plan-dist-section">
            <h3>Plan Distribution</h3>
            <div className="plan-dist-grid">
              {(metrics.planDistribution || []).map(p => (
                <div key={p.subscription_plan} className="plan-dist-card">
                  <PlanBadge plan={p.subscription_plan} />
                  <span className="plan-dist-count">{p.count}</span>
                  <span className="plan-dist-label">restaurants</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* RESTAURANT CRM TAB */}
      {activeTab === 'restaurants' && (
        <>
          <div className="crm-toolbar">
            <input
              type="text"
              className="crm-search"
              placeholder="🔍 Search by name, owner, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="crm-count">{filteredRestaurants.length} restaurants</span>
          </div>

          {loadingRestaurants ? (
            <Loader />
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Cycle</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Expires</th>
                    <th>Dishes</th>
                    <th>Reviews</th>
                    <th>Views</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="crm-restaurant-name">{r.restaurant_name}</div>
                        <div className="crm-restaurant-slug">/{r.slug}</div>
                      </td>
                      <td>
                        <div className="crm-owner-name">{r.owner_name}</div>
                        <div className="crm-owner-email">{r.owner_email}</div>
                      </td>
                      <td><PlanBadge plan={r.subscription_plan || 'free'} /></td>
                      <td>
                        {r.billing_cycle ? (
                          <span className="crm-cycle-badge">{r.billing_cycle}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`crm-status crm-status-${r.subscription_status || 'free'}`}>
                          {r.subscription_status || 'free'}
                        </span>
                      </td>
                      <td>{formatDate(r.created_at)}</td>
                      <td>
                        {r.plan_expiry ? (
                          <span style={{ color: new Date(r.plan_expiry) < new Date() ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                            {formatDate(r.plan_expiry)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="crm-num">{r.total_dishes}</td>
                      <td className="crm-num">{r.total_reviews}</td>
                      <td className="crm-num">{r.total_menu_views}</td>
                      <td>
                        <button
                          className="crm-edit-btn"
                          onClick={() => setEditTarget(r)}
                        >
                          <Edit2 size={14} /> Edit Plan
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRestaurants.length === 0 && (
                    <tr>
                      <td colSpan="11" className="crm-empty">No restaurants found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* AR LIBRARY TAB */}
      {activeTab === 'ar-library' && (
        <AdminARModelLibrary />
      )}

      {/* Plan Edit Modal */}
      {editTarget && (
        <PlanEditModal
          restaurant={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={fetchRestaurants}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
