import React, { useState, useEffect } from 'react';
import { Clock, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';

const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATUS_STYLES = {
  pending:   { bg: '#fee2e2', text: '#991b1b' },
  accepted:  { bg: '#fef3c7', text: '#92400e' },
  ready:     { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#f1f5f9', text: '#475569' },
};

const OrderRow = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[order.order_status] || STATUS_STYLES.pending;
  const total = order.items?.reduce((sum, item) => sum + (item.item_price * item.quantity), 0) || 0;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: 'white',
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            padding: '0.25rem 0.625rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            backgroundColor: style.bg,
            color: style.text,
            textTransform: 'uppercase',
          }}
        >
          {order.order_status}
        </span>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>Table {order.table_number}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{order.customer_mobile}</p>
        </div>
        <div style={{ flex: 1, minWidth: '160px', color: '#64748b', fontSize: '0.8rem' }}>
          <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
          {formatDateTime(order.created_at)}
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>Rs.{total}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      {expanded && order.items && (
        <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
          <h5 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b' }}>
            Items
          </h5>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                padding: '0.3rem 0',
                borderBottom: idx < order.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
              }}
            >
              <span>
                {item.quantity}x <strong>{item.dish_name}</strong>
                <span style={{ color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                  ({item.plate_type} plate)
                </span>
                {item.item_note && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      fontStyle: 'italic',
                    }}
                  >
                    Note: {item.item_note}
                  </span>
                )}
              </span>
              <span style={{ fontWeight: 500 }}>Rs.{item.item_price * item.quantity}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', fontWeight: 'bold' }}>
            Total: Rs.{total}
          </div>
        </div>
      )}
    </div>
  );
};

const Orders = () => {
  const [restaurantId, setRestaurantId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const DATE_FILTERS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'All Time', value: '' },
  ];

  const btnStyle = (active, primary) => ({
    padding: '0.4rem 0.875rem',
    borderRadius: '1rem',
    fontSize: '0.8rem',
    border: '2px solid',
    backgroundColor: active ? (primary ? '#0f172a' : '#334155') : 'white',
    color: active ? 'white' : '#475569',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    marginRight: '0.5rem',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/restaurants/my-profile');
        setRestaurantId(data.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let url = `/orders/restaurant/${restaurantId}?filter=${filter}`;
        if (filter === 'custom' && customDate) {
          url += `&date=${customDate}`;
        }
        const { data } = await api.get(url);
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [restaurantId, filter, customDate]);

  const filteredOrders = orders;
  const totalRevenue = filteredOrders
    .filter((o) => ['completed', 'delivered'].includes(o.order_status))
    .reduce((sum, o) => sum + (o.items?.reduce((s, item) => s + item.item_price * item.quantity, 0) || 0), 0);

  return (
    <div>
      <div className="dashboard-page-header">
        <div>
          <h2>Orders History</h2>
          <p className="text-muted">View and track all orders placed at your restaurant.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <Card className="stat-card">
          <div className="stat-icon"><ShoppingBag size={24} /></div>
          <div className="stat-info">
            <h4>Total Orders</h4>
            <p>{filteredOrders.length}</p>
          </div>
        </Card>
        <Card className="stat-card" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
          <div className="stat-icon" style={{ backgroundColor: '#bbf7d0', color: '#166534' }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h4 style={{ color: '#166534' }}>Completed</h4>
            <p style={{ color: '#166534' }}>{filteredOrders.filter((o) => ['completed', 'delivered'].includes(o.order_status)).length}</p>
          </div>
        </Card>
        <Card className="stat-card" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h4 style={{ color: '#1e40af' }}>Revenue</h4>
            <p style={{ color: '#1e40af' }}>Rs.{totalRevenue}</p>
          </div>
        </Card>
        <Card className="stat-card" style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fecaca', color: '#991b1b' }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h4 style={{ color: '#991b1b' }}>Cancelled</h4>
            <p style={{ color: '#991b1b' }}>{filteredOrders.filter((o) => o.order_status === 'cancelled').length}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setCustomDate(''); }}
              style={btnStyle(filter === f.value, true)}
            >
              {f.label}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#64748b' }}>Custom Date:</span>
            <input 
              type="date" 
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setFilter('custom');
              }}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Orders</h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: '99px' }}>
            {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
        {loading ? (
          <Loader />
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <ShoppingBag size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No orders found for the selected filters.</p>
          </div>
        ) : (
          filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)
        )}
      </Card>
    </div>
  );
};

export default Orders;