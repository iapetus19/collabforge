import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import logger from './shared/logger/winston.js';
import connectDB from './config/db.js';
import { initSocketGateway } from './modules/socket/socket.gateway.js';

await connectDB();

const httpServer = http.createServer(app);
initSocketGateway(httpServer);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down manually');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
