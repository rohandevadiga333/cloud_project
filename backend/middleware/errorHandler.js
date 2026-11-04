// backend/middleware/errorHandler.js
// Centralised error handling middleware

const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack ? '\n' + err.stack : '');

  // Validation errors from express-validator handled at controller level,
  // but catch anything that slips through.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }

  const status = err.status || err.statusCode || 500;
    const message = err.message || 'An internal server error occurred.';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
