import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
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
import QRMenu from './dashboard/QRMenu';
import PublicMenu from './menu/PublicMenu';

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
      
      {/* Protected Routes */}
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
        <Route path="qr-menu" element={<QRMenu />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
