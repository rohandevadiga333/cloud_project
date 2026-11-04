// backend/middleware/auth.js
// JWT authentication & role-based access control middleware

const jwt = require('jsonwebtoken');

/**
 * Verify JWT from HTTP-only cookie.
 * Attaches decoded user payload to req.user.
 */
const authenticate = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, identifier }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid session token.' });
  }
};

/**
 * Restrict access to one or more roles.
 * Usage: authorize('admin') or authorize('admin', 'faculty')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to perform this action.'
    });
  }
  next();
};

module.exports = { authenticate, authorize };
