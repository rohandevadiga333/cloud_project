// backend/routes/student.js
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

// All student routes require authentication and 'student' role
router.use(authenticate, authorize('student'));

router.get('/dashboard',          ctrl.getDashboard);
router.get('/profile',            ctrl.getProfile);
router.get('/results',            ctrl.getAllResults);
router.get('/results/:semester',  ctrl.getSemesterResults);
router.get('/marksheet/:semester', ctrl.downloadMarksheet);

module.exports = router;
