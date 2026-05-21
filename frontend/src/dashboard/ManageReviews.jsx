import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import api, { getImageUrl } from '../services/api';
import Loader from '../components/Loader';
import Button from '../components/Button';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/restaurant');
      setReviews(res.data);
    } catch (err) {
      setError('Failed to fetch reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to delete review.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loader />;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="dashboard-content fade-in">
      <div className="dashboard-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Customer Reviews</h1>
          <p className="text-muted">Manage and monitor customer feedback for your dishes.</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={20} />{error}</div>}

      {/* Review Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#eef2ff', borderRadius: '50%', color: '#4f46e5' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Reviews</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reviews.length}</h3>
          </div>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#f59e0b' }}>
            <Star size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Average Rating</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{averageRating} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>/ 5</span></h3>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 && !error ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <MessageSquare size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
          <h3>No Reviews Yet</h3>
          <p className="text-muted">When customers leave reviews on your public menu, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {review.dish_image ? (
                <img src={getImageUrl(review.dish_image)} alt={review.dish_name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Img</div>
              )}
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{review.dish_name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < review.rating ? "#f59e0b" : "#e2e8f0"} color={i < review.rating ? "#f59e0b" : "#e2e8f0"} />
                      ))}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(review.id)}
                    disabled={deletingId === review.id}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', opacity: deletingId === review.id ? 0.5 : 1 }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
                
                {review.review ? (
                  <p style={{ color: '#334155', lineHeight: '1.5', marginTop: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #e2e8f0' }}>
                    "{review.review}"
                  </p>
                ) : (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '0.5rem' }}>No comment provided.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageReviews;
