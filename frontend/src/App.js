import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './services/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import MunicipalDashboard from './pages/MunicipalDashboard';
import EmergencyDashboard from './pages/EmergencyDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleRoutes = {
      citizen: '/citizen',
      police: '/police',
      municipal: '/municipal',
      emergency: '/emergency',
    };
    return <Navigate to={roleRoutes[role] || '/'} replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  const getRoleRedirect = () => {
    const routes = {
      citizen: '/citizen',
      police: '/police',
      municipal: '/municipal',
      emergency: '/emergency',
    };
    return routes[role] || '/citizen';
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated() ? <Navigate to={getRoleRedirect()} replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated() ? <Navigate to={getRoleRedirect()} replace /> : <Register />
        }
      />
      <Route
        path="/citizen"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/police"
        element={
          <ProtectedRoute allowedRoles={['police']}>
            <PoliceDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/municipal"
        element={
          <ProtectedRoute allowedRoles={['municipal']}>
            <MunicipalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/emergency"
        element={
          <ProtectedRoute allowedRoles={['emergency']}>
            <EmergencyDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const AppRouter = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
  
  return (
    <AuthProvider>
      <AppRouter>
        <AppRoutes />
      </AppRouter>
    </AuthProvider>
  );
}

export default App;
