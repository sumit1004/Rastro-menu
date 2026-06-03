import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { scrollToHash } from './utils/scroll';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Loader from './components/Loader';

// Lazy Loaded Pages
import { Suspense } from 'react';
import { lazyRetry } from './utils/lazyRetry';
const LandingPage = lazyRetry(() => import('./pages/Landing/LandingPage'));
const PublicMenu = lazyRetry(() => import('./menu/PublicMenu'));
const Legal = lazyRetry(() => import('./pages/Legal'));


const Login = lazyRetry(() => import('./auth/Login'));
const Signup = lazyRetry(() => import('./auth/Signup'));
const ForgotPassword = lazyRetry(() => import('./auth/ForgotPassword'));
const ResetPassword = lazyRetry(() => import('./auth/ResetPassword'));
const DashboardLayout = lazyRetry(() => import('./dashboard/DashboardLayout'));
const DashboardOverview = lazyRetry(() => import('./dashboard/DashboardOverview'));
const RestaurantProfile = lazyRetry(() => import('./dashboard/RestaurantProfile'));
const ManageDishes = lazyRetry(() => import('./dashboard/ManageDishes'));
const ManageReviews = lazyRetry(() => import('./dashboard/ManageReviews'));
const AnalyticsOverview = lazyRetry(() => import('./dashboard/AnalyticsOverview'));
const QRMenu = lazyRetry(() => import('./dashboard/QRMenu'));
const Settings = lazyRetry(() => import('./dashboard/Settings'));
const AdminDashboard = lazyRetry(() => import('./admin/AdminDashboard'));
const Orders = lazyRetry(() => import('./dashboard/Orders'));

const HashScrollHandler = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToHash(location.hash));
      });
    }
  }, [location.pathname, location.hash]);
  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
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
        <Route path="billing" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="orders" element={<Orders />} />
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
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Router>
          <HashScrollHandler />
          <AppRoutes />
        </Router>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
