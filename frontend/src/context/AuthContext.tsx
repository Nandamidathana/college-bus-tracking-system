import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { connectSocket, disconnectSocket } from '../services/socket';
import { studentApi, driverApi, adminApi } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('bus_tracker_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bus_tracker_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Background sync helper
  const syncFreshProfile = async (currentToken: string, currentUser: AuthUser) => {
    try {
      if (currentUser.role === 'STUDENT') {
        const res = await studentApi.getProfile();
        if (res.data.success && res.data.student) {
          const updatedUser: AuthUser = {
            ...currentUser,
            name: res.data.student.user?.name || currentUser.name,
            student: res.data.student,
            college: res.data.student.college || currentUser.college,
          };
          setUser(updatedUser);
          localStorage.setItem('bus_tracker_user', JSON.stringify(updatedUser));
        }
      } else if (currentUser.role === 'DRIVER') {
        const res = await driverApi.getProfile();
        if (res.data.success && res.data.driver) {
          const updatedUser: AuthUser = {
            ...currentUser,
            name: res.data.driver.driverName || currentUser.name,
            driver: res.data.driver,
            college: res.data.driver.college || currentUser.college,
          };
          setUser(updatedUser);
          localStorage.setItem('bus_tracker_user', JSON.stringify(updatedUser));
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.warn('Session expired or invalid token detected during background sync.');
        logout();
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('bus_tracker_token');
      const savedUser = localStorage.getItem('bus_tracker_user');

      if (savedToken && savedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          connectSocket(savedToken);

          // Perform non-blocking silent sync with database to retrieve fresh data
          syncFreshProfile(savedToken, parsedUser);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();

    // Auto-refresh when tab gains focus or device reconnects to network
    const handleFocusOrOnline = () => {
      const savedToken = localStorage.getItem('bus_tracker_token');
      const savedUser = localStorage.getItem('bus_tracker_user');
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          syncFreshProfile(savedToken, parsed);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
    };
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('bus_tracker_token', newToken);
    localStorage.setItem('bus_tracker_user', JSON.stringify(newUser));

    if (newUser.role === 'STUDENT') {
      localStorage.setItem('bus_tracker_student_token', newToken);
    } else if (newUser.role === 'DRIVER') {
      localStorage.setItem('bus_tracker_driver_token', newToken);
    } else if (newUser.role === 'ADMIN') {
      localStorage.setItem('bus_tracker_admin_token', newToken);
    }

    setToken(newToken);
    setUser(newUser);
    connectSocket(newToken);
  };

  const logout = () => {
    localStorage.removeItem('bus_tracker_token');
    localStorage.removeItem('bus_tracker_user');
    localStorage.removeItem('bus_tracker_student_token');
    localStorage.removeItem('bus_tracker_driver_token');
    localStorage.removeItem('bus_tracker_admin_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const refreshUser = async () => {
    const curToken = token || localStorage.getItem('bus_tracker_token');
    const curUser = user || (localStorage.getItem('bus_tracker_user') ? JSON.parse(localStorage.getItem('bus_tracker_user')!) : null);
    if (!curToken || !curUser) return;
    await syncFreshProfile(curToken, curUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
