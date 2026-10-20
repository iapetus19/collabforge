import winston from 'winston';
import env from '../../config/env.js';

const { combine, timestamp, json, simple } = winston.format;

const transports = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: simple(),
    })
  );
}

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports,
});

export default logger;
