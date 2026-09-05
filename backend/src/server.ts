import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ENV } from './config/env';
import { setupWebSocket } from './websocket/socketHandler';
import { startStaleTracker, stopStaleTracker } from './services/staleTracker.service';
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import driverRoutes from './routes/driver.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Attach io to express app for route broadcasting
app.set('io', io);

// Middleware
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check (Supports both /health and /api/health)
app.get(['/health', '/api/health'], (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'College Bus Live Tracking Server',
    time: new Date().toISOString(),
  });
});

// API Routes (Mounted on both /api/* and root /* for universal client URL compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);

app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/driver', driverRoutes);
app.use('/admin', adminRoutes);

// Setup Socket.IO Event Handlers
setupWebSocket(io);

// Start Watchdog for Stale GPS locations
startStaleTracker(io);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

import { bootstrapDatabase } from './services/bootstrap.service';

// Start listening
server.listen(ENV.PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`🚌 College Bus Tracker Server running on port ${ENV.PORT} (0.0.0.0)`);
  console.log(`📡 Socket.IO Realtime Engine active`);
  console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
  console.log(`=======================================================`);

  // Auto-initialize default College, Admin, Student, and Driver credentials
  await bootstrapDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  stopStaleTracker();
  server.close(() => {
    console.log('Server terminated.');
  });
});

export { app, server, io };
