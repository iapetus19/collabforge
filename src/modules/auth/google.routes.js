import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from './auth.model.js';

const router = Router();

router.post('/google', async (req, res, next) => {
  try {
    let email = '';
    let name = '';
    let picture = '';

    // 1. Verify OAuth2 accessToken (from AuthPortal.jsx initTokenClient popup)
    if (req.body.accessToken) {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${req.body.accessToken}` },
      });

      if (!resp.ok) {
        return res.status(401).json({ status: 'fail', message: 'Invalid or expired Google access token.' });
      }

      const payload = await resp.json();
      email = payload?.email?.toLowerCase() || '';
      name = payload?.name || email.split('@')[0];
      picture = payload?.picture || '';
    }
    // 2. Verify Google ID Token (credential) via Google's tokeninfo endpoint
    else if (req.body.credential) {
      const resp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(req.body.credential)}`
      );

      if (!resp.ok) {
        return res.status(401).json({ status: 'fail', message: 'Invalid Google ID token.' });
      }

      const payload = await resp.json();
      if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ status: 'fail', message: 'Google token audience mismatch.' });
      }

      email = payload?.email?.toLowerCase() || '';
      name = payload?.name || email.split('@')[0];
      picture = payload?.picture || '';
    }
    // 3. Fallback for local dev modal when VITE_GOOGLE_CLIENT_ID is not set
    else if (req.body.email) {
      email = String(req.body.email).trim().toLowerCase();
      name = String(req.body.name || email.split('@')[0]).trim();
    }

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Valid Google email is required.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const baseUsername =
        name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || email.split('@')[0];
      const uniqueSuffix = crypto.randomBytes(2).toString('hex');
      user = await User.create({
        username: `${baseUsername}_${uniqueSuffix}`,
        email,
        password: crypto.randomBytes(24).toString('hex'),
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'collabforge-dev-secret';
    const accessToken = jwt.sign(
      { userId: user._id, id: user._id, username: user.username, email: user.email },
      secret,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: picture,
    };

    // Include both top-level and `data`-wrapped fields so apiRequest() unwraps cleanly
    return res.status(200).json({
      status: 'success',
      accessToken,
      user: userPayload,
      data: {
        accessToken,
        user: userPayload,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
