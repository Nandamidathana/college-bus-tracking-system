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
    const saved = localStorage.getItem('bus_tracker_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bus_tracker_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

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
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
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
    if (!token || !user) return;
    try {
      if (user.role === 'STUDENT') {
        const res = await studentApi.getProfile();
        if (res.data.success && res.data.student) {
          const updatedUser: AuthUser = {
            ...user,
            student: res.data.student,
            college: res.data.student.college,
          };
          setUser(updatedUser);
          localStorage.setItem('bus_tracker_user', JSON.stringify(updatedUser));
        }
      } else if (user.role === 'DRIVER') {
        const res = await driverApi.getProfile();
        if (res.data.success && res.data.driver) {
          const updatedUser: AuthUser = {
            ...user,
            driver: res.data.driver,
            college: res.data.driver.college,
          };
          setUser(updatedUser);
          localStorage.setItem('bus_tracker_user', JSON.stringify(updatedUser));
        }
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
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
