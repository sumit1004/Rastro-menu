import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Store, Utensils, QrCode, Settings,
  LogOut, MessageSquare, TrendingUp, Crown, Clock, ShoppingBag
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import './Dashboard.css';

const PLAN_BADGE = {
  free:    { label: 'FREE',    bg: '#f1f5f9', color: '#64748b' },
  pro:     { label: 'PRO',     bg: '#ede9fe', color: '#4f46e5' },
  premium: { label: 'PREMIUM', bg: '#fef3c7', color: '#d97706' },
};

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { logout } = useContext(AuthContext);
  const { subscription } = useSubscription();

  const plan = subscription?.plan || 'free';
  const isTrial = subscription?.trial?.isActive;
  const trialDaysLeft = subscription?.trial?.daysLeft;
  const badge = PLAN_BADGE[plan] || PLAN_BADGE.free;

  const navItems = [
    { name: 'Overview',          path: '/dashboard',          icon: <LayoutDashboard size={20} />, exact: true },
    { name: 'Analytics',         path: '/dashboard/analytics', icon: <TrendingUp size={20} /> },
    { name: 'Restaurant Profile',path: '/dashboard/profile',   icon: <Store size={20} /> },
    { name: 'Manage Dishes',     path: '/dashboard/dishes',    icon: <Utensils size={20} /> },
    { name: 'Manage Reviews',    path: '/dashboard/reviews',   icon: <MessageSquare size={20} /> },
    { name: 'Orders',            path: '/dashboard/orders',    icon: <ShoppingBag size={20} /> },
    { name: 'QR Menu',           path: '/dashboard/qr-menu',  icon: <QrCode size={20} /> },
    { name: 'Settings',          path: '/dashboard/settings',  icon: <Settings size={20} /> },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">RASTRO<span>menu</span></Link>
        <div style={{ fontSize: '0.65rem', background: '#fef08a', color: '#854d0e', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold', marginLeft: '0.5rem' }}>
          TEST MODE
        </div>
      </div>

      {/* Plan Badge */}
      <div className="sidebar-plan-area">
        <div className="sidebar-plan-badge" style={{ background: badge.bg, color: badge.color }}>
          <Crown size={12} />
          <span>{badge.label}</span>
        </div>
        {isTrial && (
          <div className="sidebar-trial-warn">
            <Clock size={11} />
            <span>{trialDaysLeft}d trial left</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={logout} className="sidebar-logout">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
