require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/authMiddleware');

const authRoutes        = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const candidateRoutes   = require('./routes/candidateRoutes');
const interviewRoutes   = require('./routes/interviewRoutes');
const offerRoutes       = require('./routes/offerRoutes');
const trainingRoutes    = require('./routes/trainingRoutes');
const employeeRoutes    = require('./routes/employeeRoutes');
const salaryRoutes      = require('./routes/salaryRoutes');
const orgRoutes         = require('./routes/departmentRoutes');
const complaintRoutes   = require('./routes/complaintRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const attendanceRoutes  = require('./routes/attendanceRoutes');
const analyticsRoutes   = require('./routes/analyticsRoutes');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin Nginx proxy)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for EC2 reverse-proxy setups
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API requests
app.use('/api', apiLimiter);

// Serve static uploads (local fallback for resumes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    message: '⚡ HR Recruitment & Management System API is running',
    environment: process.env.NODE_ENV || 'development',
    s3_enabled: !!(process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME),
    database: process.env.DB_NAME || 'hr_recruitment_db',
  })
);

// Route Bindings
app.use('/api/auth',         authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/candidates',   candidateRoutes);
app.use('/api/interviews',   interviewRoutes);
app.use('/api/offers',       offerRoutes);
app.use('/api/training',     trainingRoutes);
app.use('/api/employees',    employeeRoutes);
app.use('/api/salary',       salaryRoutes);
app.use('/api/org',          orgRoutes);
app.use('/api/complaints',   complaintRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/attendance',   attendanceRoutes);
app.use('/api/analytics',    analyticsRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.url} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 HR System API running → http://localhost:${PORT}`);
  console.log(`📋 Health Check         → http://localhost:${PORT}/api/health`);
  console.log(`💾 Database Target      → ${process.env.DB_NAME || 'hr_recruitment_db'}\n`);
});
