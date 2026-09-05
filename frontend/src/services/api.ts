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

// Dynamically resolve role-specific tokens
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const url = config.url || '';
    let token = localStorage.getItem('bus_tracker_token');

    if (url.startsWith('/student') && localStorage.getItem('bus_tracker_student_token')) {
      token = localStorage.getItem('bus_tracker_student_token');
    } else if (url.startsWith('/driver') && localStorage.getItem('bus_tracker_driver_token')) {
      token = localStorage.getItem('bus_tracker_driver_token');
    } else if (url.startsWith('/admin') && localStorage.getItem('bus_tracker_admin_token')) {
      token = localStorage.getItem('bus_tracker_admin_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
};

export const driverApi = {
  getProfile: () => api.get('/driver/profile'),
  getBuses: () => api.get('/driver/buses'),
  getCurrentTrip: () => api.get('/driver/current-trip'),
  startTrip: (data: { busId?: string; busNumber?: string; latitude?: number; longitude?: number; accuracy?: number }) =>
    api.post('/driver/trips/start', data),
  endTrip: () => api.post('/driver/trips/end'),
  changeBus: (data: { newBusId?: string; newBusNumber?: string }) => api.put('/driver/change-bus', data),
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
};
