import React, { useEffect, useState } from 'react';
import { Utensils, Star, Eye, Activity, Sparkles, MessageSquare, Clock, Bell, CheckCircle, XCircle } from 'lucide-react';
import io from 'socket.io-client';
import api from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';
import PlanBanner from '../components/PlanBanner';
import Button from '../components/Button';
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
  const [restaurantId, setRestaurantId] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const profileRes = await api.get('/restaurants/my-profile');
        const restId = profileRes.data.id;
        setRestaurantId(restId);

        const [dishesRes, reviewsRes, sessionRes, ordersRes] = await Promise.all([
          api.get(`/dishes/restaurant/${restId}`),
          api.get('/reviews/restaurant').catch(() => ({ data: [] })),
          api.get(`/analytics/dashboard/${restId}?timeFilter=all`).catch(() => ({ data: { overview: { totalViews: 0 } } })),
          api.get(`/orders/restaurant/${restId}`).catch(() => ({ data: [] }))
        ]);

        const dishes = dishesRes.data;
        const reviews = reviewsRes.data;
        const totalViews = sessionRes.data?.overview?.totalViews ?? 0;
        
        // Filter out completed and cancelled orders for the live view
        const activeOrders = ordersRes.data.filter(o => ['pending', 'accepted', 'ready'].includes(o.order_status));
        setLiveOrders(activeOrders);

        setStats({
          dishes: dishes.length,
          reviews: dishes.reduce((acc, curr) => acc + (curr.total_reviews || 0), 0),
          views: totalViews,
          ai: dishes.filter(d => d.ai_description || d.ai_category || d.ai_enhanced_image).length,
        });

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

  // Set up Socket.IO for real-time orders
  useEffect(() => {
    if (!restaurantId) return;

    // Use environment URL or fallback to localhost
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const socketUrl = rawBaseUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl);

    socket.emit('join_restaurant', restaurantId);

    socket.on('new_order', (order) => {
      setLiveOrders(prev => [order, ...prev]);
    });

    socket.on('order_status_update', ({ order_id, status }) => {
      setLiveOrders(prev => {
        // If order is completed, cancelled or delivered, remove it from live view
        if (['completed', 'cancelled', 'delivered'].includes(status)) {
          return prev.filter(o => o.id !== order_id);
        }
        // Otherwise, update its status
        return prev.map(o => o.id === order_id ? { ...o, order_status: status } : o);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      // Optimistic update
      setLiveOrders(prev => {
        if (['completed', 'cancelled', 'delivered'].includes(newStatus)) {
          return prev.filter(o => o.id !== orderId);
        }
        return prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o);
      });
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#fee2e2', text: '#991b1b' };
      case 'accepted': return { bg: '#fef3c7', text: '#92400e' };
      case 'ready': return { bg: '#dcfce7', text: '#166534' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
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

      {/* LIVE ORDERS PANEL */}
      <Card style={{ marginBottom: '1.5rem', border: '2px solid var(--primary-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
            <Bell size={20} className="animate-pulse" /> Live Orders 
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', background: 'var(--primary-color)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
            {liveOrders.length} Active
          </span>
        </div>

        {liveOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            <Utensils size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No active orders right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {liveOrders.map(order => {
               const statusStyle = getStatusColor(order.order_status);
               return (
                 <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                     <div>
                       <h4 style={{ margin: '0 0 0.25rem 0' }}>Table {order.table_number}</h4>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>📞 {order.customer_mobile}</div>
                       <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatTimeAgo(order.created_at)}</span>
                     </div>
                     <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: statusStyle.bg, color: statusStyle.text, textTransform: 'uppercase' }}>
                       {order.order_status}
                     </span>
                   </div>
                   
                   <div style={{ marginBottom: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                     {order.items && order.items.map((item, idx) => (
                       <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                         <span>{item.quantity}x {item.dish_name} <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({item.plate_type})</span></span>
                         <span style={{ fontWeight: '500' }}>₹{item.item_price * item.quantity}</span>
                       </div>
                     ))}
                   </div>
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
                     <span>Total</span>
                     <span>₹{Number(order.total_amount) ? order.total_amount : order.items?.reduce((s, item) => s + item.item_price * item.quantity, 0)}</span>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     {order.order_status === 'pending' && (
                       <Button style={{ flex: 1, padding: '0.5rem' }} onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}>Accept</Button>
                     )}
                     {order.order_status === 'accepted' && (
                       <Button style={{ flex: 1, padding: '0.5rem', backgroundColor: '#eab308' }} onClick={() => handleUpdateOrderStatus(order.id, 'ready')}>Mark Ready</Button>
                     )}
                     <Button style={{ flex: 1, padding: '0.5rem', backgroundColor: '#22c55e' }} onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}>Delivered</Button>
                     <Button variant="outline" style={{ padding: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}>
                       <XCircle size={18} />
                     </Button>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </Card>

      {/* Recent Activity Feed */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent Reviews Activity</h3>
          {activities.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: '99px' }}>
              {activities.length} total
            </span>
          )}
        </div>

        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No review activity yet. Share your menu to get reviews!</p>
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
