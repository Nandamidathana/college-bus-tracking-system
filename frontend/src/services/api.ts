import axios from 'axios';

export const getApiBaseUrl = (): string => {
  let custom = '';
  if (typeof window !== 'undefined') {
    custom = localStorage.getItem('bus_tracker_backend_url') || '';
  }

  let raw = custom || import.meta.env.VITE_API_BASE_URL || '';
  if (raw) {
    return raw.trim().replace(/\/+$/, '');
  }

  return '/api';
};

export const setCustomBackendUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('bus_tracker_backend_url');
    } else {
      localStorage.setItem('bus_tracker_backend_url', url.trim().replace(/\/+$/, ''));
    }
  }
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Dynamically resolve role-specific tokens strictly
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const url = config.url || '';
    let token: string | null = null;

    if (url.startsWith('/student')) {
      token = localStorage.getItem('bus_tracker_student_token') || localStorage.getItem('bus_tracker_token');
    } else if (url.startsWith('/driver')) {
      token = localStorage.getItem('bus_tracker_driver_token') || localStorage.getItem('bus_tracker_token');
    } else if (url.startsWith('/admin')) {
      // Strictly require admin token or verified admin user token to prevent 403 Forbidden
      const adminToken = localStorage.getItem('bus_tracker_admin_token');
      if (adminToken) {
        token = adminToken;
      } else {
        const storedUser = localStorage.getItem('bus_tracker_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.role === 'ADMIN') {
              token = localStorage.getItem('bus_tracker_token');
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } else {
      token = localStorage.getItem('bus_tracker_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.config?.url?.startsWith('/admin')) {
      console.warn('Admin route 403 Forbidden: User is not authorized as Admin.');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getColleges: () => api.get('/auth/colleges'),
  createCollege: (data: any) => api.post('/auth/colleges/create', data),
  studentRegister: (data: any) => api.post('/auth/student/register', data),
  studentLogin: (data: any) => api.post('/auth/student/login', data),
  studentRecoverPin: (data: { rollNumber: string; newPassword: string; collegeId?: string }) =>
    api.post('/auth/student/recover-pin', data),
  driverRegister: (data: any) => api.post('/auth/driver/register', data),
  driverLogin: (data: any) => api.post('/auth/driver/login', data),
  driverRecoverPin: (data: { identifier: string; newPassword: string; collegeId?: string }) =>
    api.post('/auth/driver/recover-pin', data),
  adminLogin: (data: any) => api.post('/auth/admin/login', data),
  adminRecoverPassword: (data: { email: string; collegeCode?: string; newPassword: string }) =>
    api.post('/auth/admin/recover-password', data),
};

export const studentApi = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data: any) => api.put('/student/profile', data),
  getBuses: () => api.get('/student/buses'),
  getBusDetails: (busId: string) => api.get(`/student/buses/${busId}`),
  getBusLiveLocation: (busId: string) => api.get(`/student/buses/${busId}/location`),
  updateBoardingPoint: (data: { name?: string; latitude: number; longitude: number }) =>
    api.put('/student/boarding-point', data),
  getNotifications: () => api.get('/student/notifications'),
  getPreferences: () => api.get('/student/preferences'),
  updatePreferences: (data: any) => api.post('/student/preferences', data),
  subscribePush: (data: any) => api.post('/student/push-subscribe', data),
  unsubscribePush: (data: any) => api.post('/student/push-unsubscribe', data),
  confirmBoarding: (tripId: string) => api.post(`/student/trips/${tripId}/board`),
  alightBoarding: (tripId: string) => api.post(`/student/trips/${tripId}/alight`),
  getBoardingStatus: (tripId: string) => api.get(`/student/boarding-status/${tripId}`),
  createGuardianLink: (data: { busId?: string; label?: string; expiryHours?: number }) =>
    api.post('/student/guardian-link', data),
  getGuardianLinks: () => api.get('/student/guardian-links'),
  revokeGuardianLink: (id: string) => api.delete(`/student/guardian-links/${id}`),
  markNotificationRead: (id: string) => api.put(`/student/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/student/notifications/read-all'),
};

export const driverApi = {
  getProfile: () => api.get('/driver/profile'),
  getBuses: () => api.get('/driver/buses'),
  getCurrentTrip: () => api.get('/driver/current-trip'),
  startTrip: (data: { busId?: string; busNumber?: string; latitude?: number; longitude?: number; accuracy?: number }) =>
    api.post('/driver/trips/start', data),
  endTrip: () => api.post('/driver/trips/end'),
  changeBus: (data: { newBusId?: string; newBusNumber?: string }) => api.put('/driver/change-bus', data),
  updateOccupancy: (busId: string, data: { currentOccupancy?: number; occupancyStatus?: string }) =>
    api.put(`/driver/buses/${busId}/occupancy`, data),
  reportIncident: (data: {
    type: string;
    severity?: string;
    description?: string;
    delayMinutes?: number;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => api.post('/driver/incidents', data),
  getIncidents: () => api.get('/driver/incidents'),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getBuses: () => api.get('/admin/buses'),
  createBus: (data: any) => api.post('/admin/buses', data),
  updateBus: (id: string, data: any) => api.put(`/admin/buses/${id}`, data),
  getDrivers: () => api.get('/admin/drivers'),
  updateDriver: (id: string, data: any) => api.put(`/admin/drivers/${id}`, data),
  getRoutes: () => api.get('/admin/routes'),
  createRoute: (data: any) => api.post('/admin/routes', data),
  updateRoute: (id: string, data: any) => api.put(`/admin/routes/${id}`, data),
  getStudents: () => api.get('/admin/students'),
  getTrips: () => api.get('/admin/trips'),
  updateCollegeLocation: (data: any) => api.put('/admin/college-location', data),
  getArrivals: (params?: any) => api.get('/admin/arrivals', { params }),
  getArrivalAnalytics: (params?: any) => api.get('/admin/arrivals/analytics', { params }),
  exportDailyArrivals: (date: string) =>
    api.get('/admin/arrivals/export/daily', { params: { date }, responseType: 'blob' }),
  exportDelayedBuses: (date: string) =>
    api.get('/admin/arrivals/export/delayed', { params: { date }, responseType: 'blob' }),
  exportMonthlyPerformance: (year: number, month: number) =>
    api.get('/admin/arrivals/export/monthly', { params: { year, month }, responseType: 'blob' }),
  simulateArrival: (data: any) => api.post('/admin/arrivals/simulate', data),
  getIncidents: (params?: any) => api.get('/admin/incidents', { params }),
  updateIncidentStatus: (id: string, data: { status?: string; resolutionNotes?: string }) =>
    api.put(`/admin/incidents/${id}/status`, data),
};

export const publicApi = {
  getVapidKey: () => api.get('/public/vapid-key'),
  getGuardianTracking: (busId: string, token: string) =>
    api.get(`/public/track/bus/${busId}`, { params: { token } }),
};
