import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// 12 Reference Screens
import { SplashScreen } from './pages/student/SplashScreen';
import { StudentLogin } from './pages/student/StudentLogin';
import { StudentRegister } from './pages/student/StudentRegister';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { LiveTrackingScreen } from './pages/student/LiveTrackingScreen';
import { RoutesScreen } from './pages/student/RoutesScreen';
import { SeatAvailabilityScreen } from './pages/student/SeatAvailabilityScreen';
import { NotificationsScreen } from './pages/student/NotificationsScreen';
import { SosEmergencyScreen } from './pages/student/SosEmergencyScreen';
import { ParentTrackingScreen } from './pages/student/ParentTrackingScreen';
import { ProfileScreen } from './pages/student/ProfileScreen';
import { SettingsScreen } from './pages/student/SettingsScreen';
import { BusDetailsScreen } from './pages/student/BusDetailsScreen';
import { ScreensGalleryPage } from './pages/student/ScreensGalleryPage';

// Multi-Role & Public Pages
import { LandingPage } from './pages/LandingPage';
import { GuardianTrackingPage } from './pages/public/GuardianTrackingPage';

// Driver Pages
import { DriverLogin } from './pages/driver/DriverLogin';
import { DriverRegister } from './pages/driver/DriverRegister';
import { DriverDashboard } from './pages/driver/DriverDashboard';

// Admin Pages
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
    return <Navigate to="/student/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
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
            {/* Screen 1: Splash Screen (Default Home Route) */}
            <Route path="/" element={<SplashScreen />} />
            <Route path="/splash" element={<SplashScreen />} />

            {/* Screen 2: Login Screen */}
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />

            {/* 12-Screen Overview / Gallery Mode */}
            <Route path="/student/gallery" element={<ScreensGalleryPage />} />

            {/* Screen 3: Student Dashboard */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Screen 4: Live Tracking */}
            <Route
              path="/student/live-tracking"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <LiveTrackingScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 5: Bus Routes */}
            <Route
              path="/student/routes"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <RoutesScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 6: Seat Availability */}
            <Route
              path="/student/seat-availability"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <SeatAvailabilityScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 7: Notifications */}
            <Route
              path="/student/notifications"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <NotificationsScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 8: SOS / Emergency */}
            <Route
              path="/student/sos"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <SosEmergencyScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/emergency"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <SosEmergencyScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 9: Parent Tracking */}
            <Route
              path="/student/parent-tracking"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <ParentTrackingScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 10: Profile */}
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <ProfileScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 11: Settings */}
            <Route
              path="/student/settings"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <SettingsScreen />
                </ProtectedRoute>
              }
            />

            {/* Screen 12: Bus Details */}
            <Route
              path="/student/bus-details"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <BusDetailsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/bus/:busId"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <BusDetailsScreen />
                </ProtectedRoute>
              }
            />

            {/* Public Parent Guardian Live Tracking Endpoint */}
            <Route path="/track/bus/:busId" element={<GuardianTrackingPage />} />

            {/* Classic Multi-Role Landing Page */}
            <Route path="/landing" element={<LandingPage />} />

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
