// backend/routes/faculty.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/facultyController');
const { authenticate, authorize } = require('../middleware/auth');
const db      = require('../config/db'); // Added DB import

router.use(authenticate, authorize('faculty'));

router.get('/dashboard',                 ctrl.getDashboard);
router.get('/student/:regNo',            ctrl.searchStudent);
router.get('/subjects',                  ctrl.getSubjects);
router.get('/results',                   ctrl.getResults);
router.post('/results',                  ctrl.enterMarks);
router.put('/results/:id',               ctrl.updateMarks);
router.put('/results/:id/publish',       ctrl.publishResult);

// ADDED THIS ROUTE to populate the Academic Year dropdown
router.get('/academic-years', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM academic_years ORDER BY year_label DESC');
    res.json({ success: true, data: rows });
  } catch (err) { 
    next(err); 
  }
});

module.exports = router;