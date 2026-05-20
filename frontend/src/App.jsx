import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Loader from './components/Loader';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import Login from './auth/Login';
import Signup from './auth/Signup';
import DashboardLayout from './dashboard/DashboardLayout';
import DashboardOverview from './dashboard/DashboardOverview';
import RestaurantProfile from './dashboard/RestaurantProfile';
import ManageDishes from './dashboard/ManageDishes';
import ManageReviews from './dashboard/ManageReviews';
import AnalyticsOverview from './dashboard/AnalyticsOverview';
import QRMenu from './dashboard/QRMenu';
import PublicMenu from './menu/PublicMenu';
import Settings from './dashboard/Settings';
import PaymentHistory from './dashboard/PaymentHistory';
import AdminDashboard from './admin/AdminDashboard';
import Legal from './pages/Legal';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/menu/:slug" element={<PublicMenu />} />

      {/* Legal Routes */}
      <Route path="/legal/terms" element={<Legal />} />
      <Route path="/legal/privacy" element={<Legal />} />
      <Route path="/legal/refunds" element={<Legal />} />
      <Route path="/legal/contact" element={<Legal />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="profile" element={<RestaurantProfile />} />
        <Route path="dishes" element={<ManageDishes />} />
        <Route path="reviews" element={<ManageReviews />} />
        <Route path="analytics" element={<AnalyticsOverview />} />
        <Route path="qr-menu" element={<QRMenu />} />
        <Route path="settings" element={<Settings />} />
        <Route path="billing" element={<PaymentHistory />} />
      </Route>

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
