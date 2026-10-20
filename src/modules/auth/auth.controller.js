import * as authService from './auth.service.js';
import env from '../../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(req.body);

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.status(201).json({
    success: true,
    data: { user, accessToken },
  });
};

export const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.status(200).json({
    success: true,
    data: { user, accessToken },
  });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refreshUserToken(token);

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.status(200).json({
    success: true,
    data: { user, accessToken },
  });
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken', cookieOptions);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const me = async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};
