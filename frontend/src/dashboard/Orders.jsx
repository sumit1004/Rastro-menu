import React, { useState, useEffect } from 'react';
import { Clock, ShoppingBag, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';
import './Dashboard.css';

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

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
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
    <article className="order-history-row">
      <button
        type="button"
        className="order-history-row-head"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="order-history-status" style={{ backgroundColor: style.bg, color: style.text }}>
          {order.order_status}
        </span>
        <div className="order-history-main">
          <p className="order-history-table">Table {order.table_number}</p>
          <p className="order-history-meta">
            <span>{order.customer_mobile}</span>
            <span className="order-history-dot">·</span>
            <span className="order-history-time">
              <Clock size={11} aria-hidden />
              <span className="order-history-time-full">{formatDateTime(order.created_at)}</span>
              <span className="order-history-time-short">{formatDateShort(order.created_at)}</span>
            </span>
          </p>
        </div>
        <div className="order-history-end">
          <span className="order-history-amount">₹{total}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && order.items && (
        <div className="order-history-details">
          <h5>Items</h5>
          {order.items.map((item, idx) => (
            <div key={idx} className="order-history-item">
              <span>
                {item.quantity}× <strong>{item.dish_name}</strong>
                <span className="order-history-plate">({item.plate_type})</span>
                {item.item_note && <span className="order-history-note">Note: {item.item_note}</span>}
              </span>
              <span>₹{item.item_price * item.quantity}</span>
            </div>
          ))}
          <div className="order-history-total">Total: ₹{total}</div>
        </div>
      )}
    </article>
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
    { label: 'All', value: '' },
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
  const completedCount = filteredOrders.filter((o) =>
    ['completed', 'delivered'].includes(o.order_status)
  ).length;
  const cancelledCount = filteredOrders.filter((o) => o.order_status === 'cancelled').length;
  const totalRevenue = filteredOrders
    .filter((o) => ['completed', 'delivered'].includes(o.order_status))
    .reduce((sum, o) => sum + (o.items?.reduce((s, item) => s + item.item_price * item.quantity, 0) || 0), 0);

  const applyFilter = (value) => {
    setFilter(value);
    setCustomDate('');
  };

  const mobileStats = [
    { label: 'Total', value: filteredOrders.length, tone: 'default' },
    { label: 'Done', value: completedCount, tone: 'success' },
    { label: 'Revenue', value: `₹${totalRevenue}`, tone: 'info' },
    { label: 'Cancelled', value: cancelledCount, tone: 'danger' },
  ];

  return (
    <div className="orders-page">
      <header className="dashboard-page-header orders-page-header">
        <div>
          <h2>Orders History</h2>
          <p className="text-muted orders-page-subtitle">View and track all orders placed at your restaurant.</p>
        </div>
      </header>

      {/* Mobile: compact toolbar then list first */}
      <div className="orders-mobile-shell">
        <div className="orders-mobile-toolbar">
          <div className="orders-stat-strip" role="group" aria-label="Order summary">
            {mobileStats.map((s) => (
              <div key={s.label} className={`orders-stat-pill orders-stat-pill--${s.tone}`}>
                <span className="orders-stat-pill-value">{s.value}</span>
                <span className="orders-stat-pill-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="orders-filter-scroll">
            <div className="orders-filter-pills">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  className={`orders-filter-pill ${filter === f.value ? 'active' : ''}`}
                  onClick={() => applyFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className={`orders-date-pill ${filter === 'custom' ? 'active' : ''}`}>
              <Calendar size={14} aria-hidden />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setFilter('custom');
                }}
                aria-label="Filter by custom date"
              />
            </label>
          </div>
        </div>

        <section className="orders-list-section orders-list-section--mobile">
          <div className="orders-list-head">
            <h3>Orders</h3>
            <span className="orders-result-badge">
              {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
            </span>
          </div>
          {loading ? (
            <Loader />
          ) : filteredOrders.length === 0 ? (
            <div className="orders-empty">
              <ShoppingBag size={36} strokeWidth={1.5} />
              <p>No orders found for the selected filters.</p>
            </div>
          ) : (
            <div className="orders-list-stack">
              {filteredOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Desktop: original layout */}
      <div className="orders-desktop-shell">
        <div className="stats-grid stats-grid-4">
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
              <p style={{ color: '#166534' }}>{completedCount}</p>
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
              <p style={{ color: '#991b1b' }}>{cancelledCount}</p>
            </div>
          </Card>
        </div>

        <Card className="orders-filter-card">
          <div className="order-filters-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => applyFilter(f.value)}
                style={btnStyle(filter === f.value, true)}
              >
                {f.label === 'All' ? 'All Time' : f.label}
              </button>
            ))}
            <div className="order-date-filter" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </Card>

        <Card className="orders-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Orders</h3>
            <span className="orders-result-badge">
              {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
            </span>
          </div>
          {loading ? (
            <Loader />
          ) : filteredOrders.length === 0 ? (
            <div className="orders-empty orders-empty--desktop">
              <ShoppingBag size={40} style={{ opacity: 0.4 }} />
              <p>No orders found for the selected filters.</p>
            </div>
          ) : (
            filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </Card>
      </div>
    </div>
  );
};

export default Orders;
