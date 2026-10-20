import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import errorHandler from './shared/middleware/errorHandler.js';
import limiter from './shared/middleware/rateLimiter.js';
import authRoutes from './modules/auth/auth.routes.js';
import roomRoutes from './modules/room/room.routes.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(cookieParser());
app.use(limiter);

app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    res.status(200).json(healthStatus);
  } catch (error) {
    healthStatus.status = 'DOWN';
    res.status(503).json(healthStatus);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.use(errorHandler);

export default app;
