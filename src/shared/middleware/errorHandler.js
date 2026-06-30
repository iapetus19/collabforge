import logger from '../logger/winston.js';
import env from '../../config/env.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (!err.isOperational) {
    logger.error(message, { stack: err.stack, statusCode });
  } else {
    logger.warn(message, { statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
