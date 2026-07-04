import app from './app.js';
import env from './config/env.js';
import logger from './shared/logger/winston.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () =>{
    logger.info('SIGINIT received, shutting down manually');
    server.close(() =>{
        logger.info('Server closed');
        process.exit(0);
    });
});
