import { io, Socket } from 'socket.io-client';

export const getSocketUrl = (): string => {
  let custom = '';
  if (typeof window !== 'undefined') {
    custom = localStorage.getItem('bus_tracker_backend_url') || '';
  }

  let raw = custom || import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || '';
  if (raw) {
    return raw.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const authToken = token || localStorage.getItem('bus_tracker_token');
  const targetUrl = getSocketUrl();

  if (!socket) {
    socket = io(targetUrl, {
      auth: { token: authToken },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected successfully to', targetUrl, 'ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  } else if (authToken && socket.auth) {
    socket.auth = { token: authToken };
  }

  return socket;
}

export function connectSocket(token?: string): Socket {
  const s = getSocket(token);
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
