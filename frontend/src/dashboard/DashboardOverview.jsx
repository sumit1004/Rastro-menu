import React, { useEffect, useState } from 'react';
import { Utensils, Star, Activity, Eye, Sparkles } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would fetch these stats from the backend.
    // For MVP, we will simulate this by fetching dishes and calculating.
    const fetchStats = async () => {
      try {
        const profileRes = await api.get('/restaurants/my-profile');
        const restaurantId = profileRes.data.id;
        
        const dishesRes = await api.get(`/dishes/restaurant/${restaurantId}`);
        const dishes = dishesRes.data;
        
        const totalDishes = dishes.length;
        const totalReviews = dishes.reduce((acc, curr) => acc + (curr.total_reviews || 0), 0);
        const aiEnhanced = dishes.filter(d => d.ai_description || d.ai_category || d.ai_enhanced_image).length;
        
        setStats({
          dishes: totalDishes,
          reviews: totalReviews,
          views: Math.floor(Math.random() * 500) + 100, // Simulated views
          ai: aiEnhanced
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <div className="dashboard-page-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-muted">Welcome to your restaurant management console.</p>
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

      <Card>
        <h3>Recent Activity</h3>
        <p className="text-muted mt-4">Your recent reviews and updates will appear here.</p>
      </Card>
    </div>
  );
};

export default DashboardOverview;
