import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './auth.model.js';
import env from '../../config/env.js';
import AppError from '../../shared/errors/AppError.js';
import ERROR_CODES from '../../shared/errors/errorCodes.js';

const generateTokens = (user) => {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
  });

  const refreshToken = jwt.sign({ id: user._id.toString() }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

export const registerUser = async ({ username, email, password }) => {
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new AppError('Username or email already exists', ERROR_CODES.CONFLICT);
  }

  const user = await User.create({ username, email, password });
  const { accessToken, refreshToken } = generateTokens(user);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

export const loginUser = async ({ email, password }) => {
   const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', ERROR_CODES.UNAUTHORIZED);
  }

  if (!user.password) {
    throw new AppError('Invalid email or password', ERROR_CODES.UNAUTHORIZED);
  }


  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', ERROR_CODES.UNAUTHORIZED);
  }

  const { accessToken, refreshToken } = generateTokens(user);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshUserToken = async (token) => {
  if (!token) {
    throw new AppError('Refresh token missing', ERROR_CODES.UNAUTHORIZED);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid refresh token', ERROR_CODES.UNAUTHORIZED);
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== token) {
    throw new AppError('Refresh token revoked or invalid', ERROR_CODES.UNAUTHORIZED);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  user.refreshToken = newRefreshToken;
  await user.save();

  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    accessToken,
    refreshToken: newRefreshToken,
  };
};
