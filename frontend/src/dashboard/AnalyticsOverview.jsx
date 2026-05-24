import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import Loader from '../components/Loader';
import UpgradeModal from '../components/UpgradeModal';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Eye, Search, Flame, Lightbulb, Lock } from 'lucide-react';
import './Dashboard.css';

import api from '../services/api';

const AnalyticsOverview = () => {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7days');
  const [error, setError] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const profileRes = await api.get('/restaurants/my-profile');
        const restaurantId = profileRes.data.id;
        
        const data = await analyticsService.getDashboardMetrics(restaurantId, timeFilter);
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [timeFilter]);

  if (loading) return <div style={{ height: '50vh', display: 'flex', alignItems: 'center' }}><Loader /></div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!metrics) return null;

  const { overview, topDishes, topSearches, dailyViews } = metrics;

  return (
    <div className="analytics-container fade-in">
      <div className="dashboard-page-header analytics-page-header">
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 'bold' }}>Intelligence & Analytics</h2>
          <p style={{ color: 'var(--text-muted)' }}>Understand customer behavior and optimize your menu.</p>
        </div>
        
        <div className="time-filters analytics-time-filters">
          {['today', '7days', '30days', 'all'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              style={{
                padding: '0.3rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: timeFilter === filter ? 'var(--primary-color)' : 'white',
                color: timeFilter === filter ? 'white' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}
            >
              {filter === 'all' ? 'All Time' : filter.replace('days', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="analytics-metrics-grid">
        <div className="analytics-metric-card">
          <div className="analytics-metric-head">
            <div className="analytics-metric-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Eye size={24} /></div>
            <h3>Total Menu Views</h3>
          </div>
          <p className="analytics-metric-value">{overview.totalViews}</p>
        </div>

        <div className="analytics-metric-card">
          <div className="analytics-metric-head">
            <div className="analytics-metric-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}><Users size={24} /></div>
            <h3>Unique Visitors</h3>
          </div>
          <p className="analytics-metric-value">{overview.uniqueVisitors}</p>
        </div>

        <div className="analytics-metric-card">
          <div className="analytics-metric-head">
            <div className="analytics-metric-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><Flame size={24} /></div>
            <h3>Trending Searches</h3>
          </div>
          <p className="analytics-metric-value analytics-metric-value--truncate">
            {topSearches.length > 0 ? topSearches[0].search_query : 'N/A'}
          </p>
        </div>
      </div>

      {/* Insights Section */}
      <div style={{ position: 'relative' }}>
        {!metrics.advanced && (
          <div className="pro-feature-overlay" onClick={() => setUpgradeModal(true)} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: '1rem', cursor: 'pointer'
          }}>
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={16} /> Upgrade to Pro to view Insights
            </div>
          </div>
        )}
        <div style={{ opacity: !metrics.advanced ? 0.3 : 1, pointerEvents: !metrics.advanced ? 'none' : 'auto' }}>
          {metrics.insights && metrics.insights.length > 0 && (
            <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'linear-gradient(to right, #fdf4ff, #f0fdfa)', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.25rem', color: '#0f172a' }}>
                <Lightbulb size={24} color="#eab308" /> AI Analytics Insights
              </h3>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {metrics.insights.map((insight, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '1.05rem', color: '#334155' }}>
                    <span style={{ color: '#10b981', marginTop: '2px' }}>•</span> {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <div className="analytics-chart-panel" style={{ padding: '1.5rem', background: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Menu Traffic Overview</h3>
          <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
            {dailyViews && dailyViews.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyViews}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                  <Area type="monotone" dataKey="views" stroke="#4f46e5" fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No traffic data available for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout for Top Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem' }}>
        
        {/* Most Viewed Dishes */}
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            <TrendingUp size={20} color="#3b82f6" /> Most Viewed Dishes
          </h3>
          {topDishes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topDishes.map((dish, index) => (
                <li key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: index !== topDishes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontWeight: '500' }}>{dish.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      {dish.viewCount} views
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No dish view data available.</p>
          )}
        </div>

        {/* Top Searches */}
        <div style={{ position: 'relative' }}>
          {!metrics.advanced && (
            <div className="pro-feature-overlay" onClick={() => setUpgradeModal(true)} style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: '1rem', cursor: 'pointer'
            }}>
              <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} /> Upgrade to Pro to view Search Intent
              </div>
            </div>
          )}
          <div style={{ opacity: !metrics.advanced ? 0.3 : 1, pointerEvents: !metrics.advanced ? 'none' : 'auto', padding: '1.5rem', background: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              <Search size={20} color="#8b5cf6" /> Customer Search Intent
            </h3>
            {topSearches && topSearches.length > 0 ? (
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSearches} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="search_query" type="category" width={100} tick={{fill: '#475569', fontSize: 14}} />
                    <Tooltip />
                    <Bar dataKey="searchCount" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Searches" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No search data available.</p>
            )}
          </div>
        </div>

      </div>

      <UpgradeModal 
        isOpen={upgradeModal} 
        onClose={() => setUpgradeModal(false)} 
        featureName="Advanced Analytics"
        message="Upgrade to Pro to unlock AI insights, search intent, and deep customer behavior analysis."
      />
    </div>
  );
};

export default AnalyticsOverview;
