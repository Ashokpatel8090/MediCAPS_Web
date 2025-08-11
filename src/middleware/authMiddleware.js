import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// --- middleware/authMiddleware.js ---


export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    // 🧾 Decode without verifying just to see what's inside
    const decodedUnverified = jwt.decode(token);
    // console.log('🧾 Decoded (Unverified) Token Payload:', decodedUnverified);

    const decoded = jwt.verify(token, config.jwtSecret);
    // console.log('✅ Decoded & Verified Token:', decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ JWT Verification Error:', error.message);
    return res.status(400).json({ message: 'Invalid Token' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access Denied: Admin privileges required' });
  }
};
