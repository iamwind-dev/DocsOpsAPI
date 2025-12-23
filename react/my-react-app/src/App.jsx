import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import Features from './pages/Features';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentsCategory from './pages/DocumentsCategory';
import ESignature from './pages/ESignature';
import Audit from './pages/Audit';
import Storage from './pages/Storage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import './styles/App.css';

// Private Route - chỉ cho phép khi đã đăng nhập và đã load xong profile
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, userProfile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  }

  // Nếu đã authenticated nhưng chưa có profile, vẫn đợi
  if (isAuthenticated && !userProfile) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải thông tin người dùng...</div>;
  }

  // Chỉ render khi đã có cả user và profile
  if (isAuthenticated && userProfile) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Admin Route - chỉ cho phép admin
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Home Route - redirect to dashboard nếu đã login
const HomeRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  }

  // Nếu đã authenticated thì redirect về dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Chưa đăng nhập thì hiển thị trang chủ
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomeRoute><Layout><Home /></Layout></HomeRoute>} />
        <Route 
          path="/login" 
          element={
            <HomeRoute>
              <Login />
            </HomeRoute>
          } 
        />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/features" element={<Layout><Features /></Layout>} />
        
        {/* Dashboard routes - Protected */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/documents" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Documents />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/documents/category/:categoryKey" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <DocumentsCategory />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/esignature" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <ESignature />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/audit" 
          element={
            <AdminRoute>
              <DashboardLayout>
                <Audit />
              </DashboardLayout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/storage" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Storage />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;