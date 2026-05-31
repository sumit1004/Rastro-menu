import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { scrollToHash } from './utils/scroll';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Loader from './components/Loader';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import PublicMenu from './menu/PublicMenu';
import Legal from './pages/Legal';

// Lazy Loaded Pages
import { Suspense, lazy } from 'react';
const Login = lazy(() => import('./auth/Login'));
const Signup = lazy(() => import('./auth/Signup'));
const ForgotPassword = lazy(() => import('./auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./auth/ResetPassword'));
const DashboardLayout = lazy(() => import('./dashboard/DashboardLayout'));
const DashboardOverview = lazy(() => import('./dashboard/DashboardOverview'));
const RestaurantProfile = lazy(() => import('./dashboard/RestaurantProfile'));
const ManageDishes = lazy(() => import('./dashboard/ManageDishes'));
const ManageReviews = lazy(() => import('./dashboard/ManageReviews'));
const AnalyticsOverview = lazy(() => import('./dashboard/AnalyticsOverview'));
const QRMenu = lazy(() => import('./dashboard/QRMenu'));
const Settings = lazy(() => import('./dashboard/Settings'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const Orders = lazy(() => import('./dashboard/Orders'));

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
