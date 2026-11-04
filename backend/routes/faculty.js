// backend/routes/faculty.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/facultyController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('faculty'));

router.get('/dashboard',                 ctrl.getDashboard);
router.get('/student/:regNo',            ctrl.searchStudent);
router.get('/subjects',                  ctrl.getSubjects);
router.get('/results',                   ctrl.getResults);
router.post('/results',                  ctrl.enterMarks);
router.put('/results/:id',               ctrl.updateMarks);
router.put('/results/:id/publish',       ctrl.publishResult);

module.exports = router;
