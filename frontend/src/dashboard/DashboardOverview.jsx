import React, { useEffect, useState } from 'react';
import { Utensils, Star, Eye, Activity, Sparkles, MessageSquare, Clock } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';
import PlanBanner from '../components/PlanBanner';
import FeatureGrid from '../components/FeatureGrid';
import { useSubscription } from '../context/SubscriptionContext';


const StarRating = ({ rating }) => (
  <span style={{ color: '#f59e0b', fontSize: '0.8rem', letterSpacing: '-1px' }}>
    {Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}
  </span>
);

const formatTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DashboardOverview = () => {
  const { subscription } = useSubscription();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const profileRes = await api.get('/restaurants/my-profile');
        const restaurantId = profileRes.data.id;

        const [dishesRes, reviewsRes, sessionRes] = await Promise.all([
          api.get(`/dishes/restaurant/${restaurantId}`),
          api.get('/reviews/restaurant').catch(() => ({ data: [] })),
          api.get(`/analytics/dashboard/${restaurantId}?timeFilter=all`).catch(() => ({ data: { overview: { totalViews: 0 } } })),
        ]);

        const dishes = dishesRes.data;
        const reviews = reviewsRes.data;
        const totalViews = sessionRes.data?.overview?.totalViews ?? 0;

        setStats({
          dishes: dishes.length,
          reviews: dishes.reduce((acc, curr) => acc + (curr.total_reviews || 0), 0),
          views: totalViews,
          ai: dishes.filter(d => d.ai_description || d.ai_category || d.ai_enhanced_image).length,
        });

        // Build activity feed from reviews
        const reviewActivities = reviews.map(r => ({
          id: `review-${r.id}`,
          type: 'review',
          icon: <MessageSquare size={16} />,
          color: '#4f46e5',
          bg: '#eff6ff',
          text: (
            <span>
              New review on <strong>{r.dish_name}</strong>: "{r.review ? r.review.slice(0, 60) + (r.review.length > 60 ? '…' : '') : 'No comment'}"
            </span>
          ),
          rating: r.rating,
          time: r.created_at,
        }));

        // Sort all activities newest first
        reviewActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
        setActivities(reviewActivities);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({ dishes: 0, reviews: 0, views: 0, ai: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      {/* Subscription Plan Banner */}
      <PlanBanner />

      <div className="dashboard-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            Dashboard Overview
            {subscription?.trial?.isActive && subscription?.trial?.daysLeft !== null && (
              <span className="overview-trial-badge">
                ⏰ {subscription.trial.daysLeft} day{subscription.trial.daysLeft !== 1 ? 's' : ''} left in trial
              </span>
            )}
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>Welcome to your restaurant management console.</p>
        </div>
      </div>


      {/* Stats Grid */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-icon"><Utensils size={24} /></div>
          <div className="stat-info">
            <h4>Total Dishes</h4>
            <p>{stats?.dishes || 0}</p>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon"><Star size={24} /></div>
          <div className="stat-info">
            <h4>Total Reviews</h4>
            <p>{stats?.reviews || 0}</p>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon"><Eye size={24} /></div>
          <div className="stat-info">
            <h4>Menu Views</h4>
            <p>{stats?.views || 0}</p>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h4>Active Status</h4>
            <p className="text-primary" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Online</p>
          </div>
        </Card>
        <Card className="stat-card" style={{ backgroundColor: '#fdf4ff', border: '1px solid #f0abfc' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fae8ff', color: '#c026d3' }}><Sparkles size={24} /></div>
          <div className="stat-info">
            <h4 style={{ color: '#86198f' }}>AI Enhanced</h4>
            <p style={{ color: '#a21caf' }}>{stats?.ai || 0}</p>
          </div>
        </Card>
      </div>

      {/* Feature Access Section */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.25rem' }}>Your Feature Access</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
          Features available on your current plan.
        </p>
        <FeatureGrid compact />
      </Card>

      {/* Recent Activity Feed */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent Activity</h3>
          {activities.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: '99px' }}>
              {activities.length} total
            </span>
          )}
        </div>

        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No activity yet. Share your menu to get reviews!</p>
          </div>
        ) : (
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#e2e8f0 transparent',
              paddingRight: '0.25rem',
            }}
          >
            {activities.map((activity, idx) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 0',
                  borderBottom: idx < activities.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: activity.bg,
                  color: activity.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                    {activity.text}
                  </p>
                  {activity.rating && (
                    <div style={{ marginTop: '0.2rem' }}>
                      <StarRating rating={activity.rating} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Clock size={12} />
                  {formatTimeAgo(activity.time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardOverview;
