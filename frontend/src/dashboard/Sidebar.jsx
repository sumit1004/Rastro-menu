import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Store, Utensils, QrCode, Settings, LogOut, MessageSquare } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={20} />, exact: true },
    { name: 'Restaurant Profile', path: '/dashboard/profile', icon: <Store size={20} /> },
    { name: 'Manage Dishes', path: '/dashboard/dishes', icon: <Utensils size={20} /> },
    { name: 'Manage Reviews', path: '/dashboard/reviews', icon: <MessageSquare size={20} /> },
    { name: 'QR Menu', path: '/dashboard/qr-menu', icon: <QrCode size={20} /> },
    // { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">RASTRO<span>menu</span></Link>
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
