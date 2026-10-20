import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import logger from '../../shared/logger/winston.js';
import { registerSocketHandlers } from './socket.handlers.js';

export const initSocketGateway = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };
      next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (${socket.user.username})`);
    registerSocketHandlers(io, socket);
  });

  return io;
};
