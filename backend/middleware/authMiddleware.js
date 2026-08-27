const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const rateLimit = require('express-rate-limit');

// Rate limiter for authentication routes (login / register) to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
});

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });

  try {
    const secret = process.env.JWT_SECRET || 'hr_system_default_secret_key_2026';
    const decoded = jwt.verify(token, secret);
    const [rows] = await pool.query(
      'SELECT UserID, Username, Role, ReferenceID FROM users WHERE UserID = ?',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'User account no longer exists' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or has expired' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.Role)) {
    return res.status(403).json({ success: false, message: `Access denied: Requires one of [${roles.join(', ')}] role` });
  }
  next();
};

module.exports = { protect, requireRole, authLimiter, apiLimiter };
