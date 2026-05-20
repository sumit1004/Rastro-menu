import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './Dashboard.css';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    closeSidebar();
  }, [location]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Header */}
      <div className="dashboard-mobile-header">
        <div className="mobile-header-logo">
          RASTRO<span>menu</span>
        </div>
        <button className="mobile-menu-btn-dash" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
