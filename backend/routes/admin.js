// backend/routes/admin.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Students
router.get('/students',                    ctrl.getStudents);
router.get('/students/:id',                ctrl.getStudent);
router.post('/students',                   ctrl.createStudent);
router.put('/students/:id',                ctrl.updateStudent);
router.put('/students/:id/reset-password', ctrl.resetStudentPassword);

// Faculty
router.get('/faculty',                     ctrl.getFaculty);
router.post('/faculty',                    ctrl.createFaculty);
router.put('/faculty/:id',                 ctrl.updateFaculty);
router.put('/faculty/:id/reset-password',  ctrl.resetFacultyPassword);

// Departments
router.get('/departments',    ctrl.getDepartments);
router.post('/departments',   ctrl.createDepartment);
router.put('/departments/:id', ctrl.updateDepartment);

// Subjects
router.get('/subjects',       ctrl.getSubjects);
router.post('/subjects',      ctrl.createSubject);
router.put('/subjects/:id',   ctrl.updateSubject);

// Faculty-Subject Assignment
router.post('/assign-faculty',        ctrl.assignFaculty);
router.get('/faculty-subjects',       ctrl.getFacultySubjects);
router.delete('/faculty-subjects/:id', ctrl.removeFacultyAssignment);

// Academic Years & Semesters
router.get('/academic-years',        ctrl.getAcademicYears);
router.post('/academic-years',       ctrl.createAcademicYear);
router.get('/semesters',             ctrl.getSemesters);

// Grading Scale
router.get('/grading-scale',         ctrl.getGradingScale);
router.put('/grading-scale/:id',     ctrl.updateGradingScale);

// Results
router.get('/results',               ctrl.getAllResults);
router.put('/results/:id/publish',   ctrl.adminPublishResult);
router.put('/results/:id/correct',   ctrl.adminCorrectResult);

// Reports
router.get('/reports/results',       ctrl.getResultReport);
router.get('/reports/departments',   ctrl.getDeptReport);

module.exports = router;
