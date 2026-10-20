import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import AppError from '../errors/AppError.js';
import ERROR_CODES from '../errors/errorCodes.js';

const authGuard = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', ERROR_CODES.UNAUTHORIZED));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', ERROR_CODES.UNAUTHORIZED));
  }
};

export default authGuard;
