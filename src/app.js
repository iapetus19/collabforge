//express, helmet, cors, morgan, cookie-parser
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import errorHandler from './shared/middleware/errorHandler.js';
import limiter from './shared/middleware/rateLimiter.js'

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(limiter);

app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  try {
    res.status(200).json(healthStatus);
  } catch (error) {
    healthStatus.status = 'DOWN';
    res.status(503).json(healthStatus);
  }
});

app.use(errorHandler);

export default app;
