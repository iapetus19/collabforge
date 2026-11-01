import { Router } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from './auth.model.js';
import env from '../../config/env.js';

const router = Router();

// In-memory fallback store in case campus Wi-Fi blocks MongoDB port 27017
const memoryUsers = new Map();

const signToken = (userObj) =>
  jwt.sign(
    { id: userObj.id || userObj._id, username: userObj.username, email: userObj.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/google — Sign in or Register via Google / Gmail
router.post('/google', async (req, res) => {
  try {
    let { credential, email, name, picture } = req.body;

    // If a real Google ID Token (JWT) was sent from Google Identity Services, decode it
    if (credential) {
      const payloadBase64 = credential.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
      email = decoded.email;
      name = decoded.name || decoded.given_name || email.split('@')[0];
      picture = decoded.picture;
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const baseUsername = (name || cleanEmail.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || 'coder';

    // 1. If MongoDB is connected (readyState === 1), use MongoDB with a 2.5s timeout race
    if (mongoose.connection.readyState === 1) {
      try {
        let user = await Promise.race([
          User.findOne({ email: cleanEmail }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 2500)),
        ]);

        if (!user) {
          const uniqueUsername = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
          user = await User.create({
            username: uniqueUsername,
            email: cleanEmail,
            password: crypto.randomBytes(16).toString('hex'),
          });
        }

        const userData = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: picture || null,
        };
        const accessToken = signToken(userData);

        return res.status(200).json({
          success: true,
          data: { user: userData, accessToken },
        });
      } catch (dbErr) {
        console.warn('MongoDB slow/unreachable, using instant memory session:', dbErr.message);
      }
    }

    // 2. Instant In-Memory Fallback (0ms latency if campus firewall blocks MongoDB)
    if (!memoryUsers.has(cleanEmail)) {
      memoryUsers.set(cleanEmail, {
        id: crypto.randomBytes(8).toString('hex'),
        username: baseUsername,
        email: cleanEmail,
        avatar: picture || null,
      });
    }
    const memUser = memoryUsers.get(cleanEmail);
    const accessToken = signToken(memUser);

    return res.status(200).json({
      success: true,
      data: { user: memUser, accessToken },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Google auth failed' });
  }
});

export default router;
