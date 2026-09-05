import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import { LandingPage } from './pages/LandingPage';

import { StudentLogin } from './pages/student/StudentLogin';
import { StudentRegister } from './pages/student/StudentRegister';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { DriverLogin } from './pages/driver/DriverLogin';
import { DriverRegister } from './pages/driver/DriverRegister';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLiveMap } from './pages/admin/AdminLiveMap';
import { AdminBuses } from './pages/admin/AdminBuses';
import { AdminDrivers } from './pages/admin/AdminDrivers';
import { AdminRoutes } from './pages/admin/AdminRoutes';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminTrips } from './pages/admin/AdminTrips';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminArrivals } from './pages/admin/AdminArrivals';

// Protected Route Guard with strict role authorization
const ProtectedRoute: React.FC<{
  allowedRoles: Array<'STUDENT' | 'DRIVER' | 'ADMIN'>;
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to user's authorized role dashboard
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'DRIVER') return <Navigate to="/driver/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Gateway */}
            <Route path="/" element={<LandingPage />} />

            {/* Student Routes */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Driver Routes */}
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/driver/register" element={<DriverRegister />} />
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute allowedRoles={['DRIVER']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="live-map" element={<AdminLiveMap />} />
              <Route path="arrivals" element={<AdminArrivals />} />
              <Route path="buses" element={<AdminBuses />} />
              <Route path="drivers" element={<AdminDrivers />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="trips" element={<AdminTrips />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

