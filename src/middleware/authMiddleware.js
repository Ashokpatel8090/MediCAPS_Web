import jwt from 'jsonwebtoken';
import config from '../config/config.js';



export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const decodedUnverified = jwt.decode(token);
    const decoded = jwt.verify(token, config.jwtSecret);
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
