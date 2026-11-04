// backend/controllers/studentController.js
// Student-facing API endpoints

const db = require('../config/db');
const { calculateSGPA, calculateCGPA, getSemesterWiseSGPA } = require('../services/calculationService');
const { generateMarksheetPDF } = require('../services/pdfService');

/**
 * GET /api/student/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Fetch student record
    const { rows: [student] } = await db.query(
      `SELECT s.*, d.name AS dept_name
       FROM students s
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // CGPA
    const { cgpa, totalCredits } = await calculateCGPA(studentId);

    // Latest SGPA
    const semSGPAs = await getSemesterWiseSGPA(studentId);
    const latestSGPA = semSGPAs.length ? semSGPAs[semSGPAs.length - 1].sgpa : 0;

    // Counts
    const { rows: counts } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='published')           AS total_published,
         COUNT(*) FILTER (WHERE status='published' AND is_pass=TRUE)  AS passed,
         COUNT(*) FILTER (WHERE status='published' AND is_pass=FALSE) AS failed
       FROM results WHERE student_id=$1`,
      [studentId]
    );

    // Current academic year
    const { rows: [ay] } = await db.query("SELECT * FROM academic_years WHERE is_current=TRUE LIMIT 1");

    return res.json({
      success: true,
      data: {
        student: {
          id:              student.id,
          name:            student.full_name,
          registrationNo:  student.registration_no,
          email:           student.email,
          phone:           student.phone,
          department:      student.dept_name,
          programme:       student.programme,
          admissionYear:   student.admission_year,
          currentSemester: student.current_semester,
        },
        academics: {
          cgpa:            cgpa,
          latestSGPA:      latestSGPA,
          totalCredits:    totalCredits,
          totalPublished:  parseInt(counts[0].total_published),
          passed:          parseInt(counts[0].passed),
          failed:          parseInt(counts[0].failed),
          semesterSGPAs:   semSGPAs,
          currentYear:     ay ? ay.year_label : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const { rows: [student] } = await db.query(
      `SELECT s.id, s.registration_no, s.full_name, s.email, s.phone,
              s.programme, s.admission_year, s.current_semester,
              d.name AS department, d.code AS dept_code
       FROM students s
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.id = $1`,
      [req.user.id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/results
 * Returns all published semester results grouped by semester.
 */
exports.getAllResults = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { rows } = await db.query(
      `SELECT r.*, s.subject_code, s.subject_name, s.credits,
              s.max_internal_marks, s.max_external_marks,
              ay.year_label AS academic_year
       FROM results r
       JOIN subjects       s  ON s.id  = r.subject_id
       JOIN academic_years ay ON ay.id = r.academic_year_id
       WHERE r.student_id = $1
         AND r.status     = 'published'
       ORDER BY ay.year_label, r.semester_no, s.subject_code`,
      [studentId]
    );

    // Group by semester
    const grouped = {};
    for (const row of rows) {
      const key = `${row.academic_year}-S${row.semester_no}`;
      if (!grouped[key]) {
        grouped[key] = { semesterNo: row.semester_no, academicYear: row.academic_year, subjects: [] };
      }
      grouped[key].subjects.push(row);
    }

    // Attach SGPA per group
    const academicYears = await db.query('SELECT * FROM academic_years');
    const ayMap = {};
    for (const ay of academicYears.rows) ayMap[ay.year_label] = ay.id;

    const result = [];
    for (const key of Object.keys(grouped)) {
      const g   = grouped[key];
      const ayId = ayMap[g.academicYear];
      const { sgpa, totalCredits } = await calculateSGPA(studentId, g.semesterNo, ayId);
      result.push({ ...g, sgpa, totalCredits });
    }

    const { cgpa } = await calculateCGPA(studentId);

    return res.json({ success: true, data: { semesters: result, cgpa } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/results/:semester
 */
exports.getSemesterResults = async (req, res, next) => {
  try {
    const studentId  = req.user.id;
    const semesterNo = parseInt(req.params.semester);
    const { academicYearId } = req.query;

    if (isNaN(semesterNo)) {
      return res.status(400).json({ success: false, message: 'Invalid semester number.' });
    }

    let queryParams = [studentId, semesterNo];
    let ayFilter = '';
    if (academicYearId) {
      ayFilter = ' AND r.academic_year_id = $3';
      queryParams.push(academicYearId);
    }

    const { rows } = await db.query(
      `SELECT r.*, s.subject_code, s.subject_name, s.credits,
              s.max_internal_marks, s.max_external_marks,
              ay.year_label AS academic_year, ay.id AS academic_year_id
       FROM results r
       JOIN subjects       s  ON s.id  = r.subject_id
       JOIN academic_years ay ON ay.id = r.academic_year_id
       WHERE r.student_id = $1
         AND r.semester_no= $2
         AND r.status     = 'published'
         ${ayFilter}
       ORDER BY s.subject_code`,
      queryParams
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: { subjects: [], sgpa: 0, cgpa: 0, totalCredits: 0 } });
    }

    const ayId = rows[0].academic_year_id;
    const { sgpa, totalCredits } = await calculateSGPA(studentId, semesterNo, ayId);
    const { cgpa } = await calculateCGPA(studentId);

    return res.json({
      success: true,
      data: {
        semesterNo,
        academicYear: rows[0].academic_year,
        subjects:     rows,
        sgpa,
        cgpa,
        totalCredits,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/marksheet/:semester
 * Generates and streams a PDF marks card.
 */
exports.downloadMarksheet = async (req, res, next) => {
  try {
    const studentId  = req.user.id;
    const semesterNo = parseInt(req.params.semester);
    const { academicYearId } = req.query;

    if (isNaN(semesterNo)) {
      return res.status(400).json({ success: false, message: 'Invalid semester number.' });
    }

    // Fetch student
    const { rows: [student] } = await db.query(
      `SELECT s.*, d.name AS dept_name FROM students s
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.id = $1`, [studentId]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Determine academic year
    let ayId   = academicYearId;
    let ayLabel = '';
    if (ayId) {
      const { rows: [ay] } = await db.query('SELECT * FROM academic_years WHERE id=$1', [ayId]);
      if (ay) ayLabel = ay.year_label;
    } else {
      const { rows: [ay] } = await db.query('SELECT * FROM academic_years WHERE is_current=TRUE LIMIT 1');
      if (ay) { ayId = ay.id; ayLabel = ay.year_label; }
    }

    // Fetch published results for this semester
    const { rows: results } = await db.query(
      `SELECT r.*, s.subject_code, s.subject_name, s.credits,
              s.max_internal_marks, s.max_external_marks
       FROM results r
       JOIN subjects s ON s.id = r.subject_id
       WHERE r.student_id       = $1
         AND r.semester_no      = $2
         AND r.academic_year_id = $3
         AND r.status           = 'published'
       ORDER BY s.subject_code`,
      [studentId, semesterNo, ayId]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No published results found for this semester.' });
    }

    await generateMarksheetPDF(student, semesterNo, ayLabel, ayId, results, res);
  } catch (err) {
    next(err);
  }
};
