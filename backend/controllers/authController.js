const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'hr_system_default_secret_key_2026';
  return jwt.sign({ id, role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, password, role = 'employee', referenceId, adminSecret } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    if (!['hr', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be hr or employee' });
    }

    // Security check: HR registration requires admin passcode if configured
    const expectedSecret = process.env.HR_ADMIN_SECRET || 'admin123';
    if (role === 'hr') {
      const [hrCount] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE Role="hr"');
      // If HR already exists and secret doesn't match
      if (hrCount[0].c > 0 && adminSecret !== expectedSecret) {
        return res.status(403).json({
          success: false,
          message: 'An HR Administrator passcode is required to create an HR account.',
        });
      }
    }

    const [existing] = await pool.query('SELECT UserID FROM users WHERE Username = ?', [username]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Username is already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (Username, PasswordHash, Role, ReferenceID) VALUES (?, ?, ?, ?)',
      [username, hash, role, referenceId || null]
    );

    const token = generateToken(result.insertId, role);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      role,
      username,
      user_id: result.insertId,
      reference_id: referenceId || null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE Username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = generateToken(user.UserID, user.Role);
    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      role: user.Role,
      username: user.Username,
      user_id: user.UserID,
      reference_id: user.ReferenceID,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, getMe };
