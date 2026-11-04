// backend/app.js
// Express application setup

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

const authRoutes    = require('./routes/auth');
const studentRoutes = require('./routes/student');
const facultyRoutes = require('./routes/faculty');
const adminRoutes   = require('./routes/admin');
const errorHandler  = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      scriptSrc:      ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr:  ["'unsafe-inline'"],   // 👈 ADD THIS — allows onclick/onsubmit
      fontSrc:        ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      imgSrc:         ["'self'", 'data:', 'https:'],
      connectSrc:     ["'self'"],            // 👈 ADD THIS — allows fetch()
    },
  },
}));

// ─── CORS (only if frontend served from different origin) ─────────────────────
// Since frontend and backend are on the same domain, we don't need CORS.
// This prevents the browser from sending an OPTIONS preflight request that AWS blocks.
// Replace the old cors block with this
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.options('*', cors()); // This tells the server to accept the browser's preflight check
// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Serve frontend static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));
// ─── API rate limiting ────────────────────────────────────────────────────────
// app.use('/api', apiLimiter);

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin',   adminRoutes);

// ─── Catch-all: serve frontend for any non-API route ─────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
res.sendFile(path.join(__dirname, 'frontend/login.html'));  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
});

// ─── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
