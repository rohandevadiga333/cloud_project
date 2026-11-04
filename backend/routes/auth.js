// backend/routes/auth.js
const express = require('express');
const router  = express.Router();
const authCtrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter }  = require('../middleware/rateLimiter');

router.post('/login', authCtrl.login);
router.post('/logout',          authenticate, authCtrl.logout);
router.get('/me',               authenticate, authCtrl.me);
router.put('/change-password',  authenticate, authCtrl.changePassword);

module.exports = router;
