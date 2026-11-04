// backend/controllers/facultyController.js
// Faculty-facing API endpoints

const db = require('../config/db');
const { calculateGrade } = require('../services/calculationService');

/**
 * GET /api/faculty/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const facultyId = req.user.id;

    const { rows: [faculty] } = await db.query(
      `SELECT f.*, d.name AS dept_name
       FROM faculty f LEFT JOIN departments d ON d.id = f.department_id
       WHERE f.id = $1`, [facultyId]
    );
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    // Assigned subjects
    const { rows: subjects } = await db.query(
      `SELECT s.*, d.name AS dept_name, ay.year_label AS academic_year
       FROM faculty_subjects fs
       JOIN subjects s ON s.id = fs.subject_id
       JOIN academic_years ay ON ay.id = fs.academic_year_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE fs.faculty_id = $1
       ORDER BY ay.year_label DESC, s.semester_no, s.subject_code`,
      [facultyId]
    );

    // Recent results entered by this faculty
    const { rows: recentResults } = await db.query(
      `SELECT r.id, r.semester_no, r.status, r.created_at,
              st.full_name AS student_name, st.registration_no,
              s.subject_name, s.subject_code,
              r.total_marks, r.grade
       FROM results r
       JOIN students st ON st.id = r.student_id
       JOIN subjects  s  ON s.id  = r.subject_id
       WHERE r.entered_by = $1
       ORDER BY r.updated_at DESC
       LIMIT 10`,
      [facultyId]
    );

    // Stats
    const { rows: [stats] } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='draft')     AS draft_count,
         COUNT(*) FILTER (WHERE status='published') AS published_count
       FROM results WHERE entered_by=$1`, [facultyId]
    );

    return res.json({
      success: true,
      data: {
        faculty: {
          id:         faculty.id,
          facultyId:  faculty.faculty_id,
          name:       faculty.full_name,
          email:      faculty.email,
          phone:      faculty.phone,
          department: faculty.dept_name,
        },
        subjects,
        recentResults,
        stats: {
          draftCount:     parseInt(stats.draft_count),
          publishedCount: parseInt(stats.published_count),
          totalSubjects:  subjects.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faculty/student/:regNo
 * Search student by registration number.
 */
exports.searchStudent = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.registration_no, s.full_name, s.email, s.phone,
              s.programme, s.admission_year, s.current_semester,
              d.name AS department, d.code AS dept_code
       FROM students s
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.registration_no = $1 AND s.is_active = TRUE`,
      [req.params.regNo.trim().toUpperCase()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Student not found with this registration number.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faculty/subjects
 * Subjects assigned to the logged-in faculty for a given academic year.
 */
exports.getSubjects = async (req, res, next) => {
  try {
    const { academicYearId } = req.query;
    let query = `SELECT s.*, ay.year_label AS academic_year, ay.id AS academic_year_id,
                        d.name AS dept_name
                 FROM faculty_subjects fs
                 JOIN subjects       s  ON s.id  = fs.subject_id
                 JOIN academic_years ay ON ay.id = fs.academic_year_id
                 LEFT JOIN departments d ON d.id  = s.department_id
                 WHERE fs.faculty_id = $1`;
    const params = [req.user.id];
    if (academicYearId) { query += ' AND fs.academic_year_id = $2'; params.push(academicYearId); }
    query += ' ORDER BY s.semester_no, s.subject_code';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/faculty/results
 * Enter marks for a student.
 */
exports.enterMarks = async (req, res, next) => {
  try {
    const facultyId = req.user.id;
    const { studentRegNo, subjectId, academicYearId, semesterNo, internalMarks, externalMarks } = req.body;

    // Validate student exists
    const { rows: [student] } = await db.query(
      'SELECT id FROM students WHERE registration_no=$1 AND is_active=TRUE',
      [studentRegNo.trim().toUpperCase()]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Validate faculty is assigned to this subject
    const { rows: assignment } = await db.query(
      'SELECT id FROM faculty_subjects WHERE faculty_id=$1 AND subject_id=$2 AND academic_year_id=$3',
      [facultyId, subjectId, academicYearId]
    );
    if (!assignment.length) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject.' });
    }

    // Validate marks against configured max
    const { rows: [subject] } = await db.query(
      'SELECT max_internal_marks, max_external_marks FROM subjects WHERE id=$1', [subjectId]
    );
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const intMarks = parseFloat(internalMarks);
    const extMarks = parseFloat(externalMarks);

    if (isNaN(intMarks) || isNaN(extMarks) || intMarks < 0 || extMarks < 0) {
      return res.status(400).json({ success: false, message: 'Marks must be non-negative numbers.' });
    }
    if (intMarks > subject.max_internal_marks) {
      return res.status(400).json({ success: false, message: `Internal marks cannot exceed ${subject.max_internal_marks}.` });
    }
    if (extMarks > subject.max_external_marks) {
      return res.status(400).json({ success: false, message: `External marks cannot exceed ${subject.max_external_marks}.` });
    }

    // Check duplicate
    const { rows: existing } = await db.query(
      'SELECT id, status FROM results WHERE student_id=$1 AND subject_id=$2 AND academic_year_id=$3',
      [student.id, subjectId, academicYearId]
    );
    if (existing.length && existing[0].status === 'published') {
      return res.status(409).json({ success: false, message: 'Results already published. Contact admin for corrections.' });
    }
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Result already exists. Use the update endpoint.' });
    }

    // Calculate grade
    const { grade, gradePoints, isPass } = await calculateGrade(
      intMarks + extMarks,
      subject.max_internal_marks,
      subject.max_external_marks
    );

    const { rows: [result] } = await db.query(
      `INSERT INTO results
         (student_id, subject_id, academic_year_id, semester_no, internal_marks, external_marks,
          grade, grade_points, is_pass, status, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10)
       RETURNING *`,
      [student.id, subjectId, academicYearId, semesterNo, intMarks, extMarks, grade, gradePoints, isPass, facultyId]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action,entity_type,entity_id,performed_by,role,new_data,ip_address)
       VALUES ('MARKS_ENTRY','result',$1,$2,'faculty',$3,$4)`,
      [result.id, facultyId, JSON.stringify(result), req.ip]
    );

    return res.status(201).json({ success: true, message: 'Marks entered successfully.', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/faculty/results/:id
 * Update draft marks.
 */
exports.updateMarks = async (req, res, next) => {
  try {
    const facultyId = req.user.id;
    const resultId  = parseInt(req.params.id);
    const { internalMarks, externalMarks } = req.body;

    const { rows: [existing] } = await db.query(
      `SELECT r.*, s.max_internal_marks, s.max_external_marks
       FROM results r JOIN subjects s ON s.id = r.subject_id
       WHERE r.id = $1`, [resultId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Result not found.' });
    if (existing.entered_by !== facultyId) {
      return res.status(403).json({ success: false, message: 'You can only update results you entered.' });
    }
    if (existing.status === 'published') {
      return res.status(403).json({ success: false, message: 'Cannot modify published results. Contact admin.' });
    }

    const intMarks = parseFloat(internalMarks);
    const extMarks = parseFloat(externalMarks);

    if (isNaN(intMarks) || isNaN(extMarks) || intMarks < 0 || extMarks < 0) {
      return res.status(400).json({ success: false, message: 'Marks must be non-negative numbers.' });
    }
    if (intMarks > existing.max_internal_marks) {
      return res.status(400).json({ success: false, message: `Internal marks cannot exceed ${existing.max_internal_marks}.` });
    }
    if (extMarks > existing.max_external_marks) {
      return res.status(400).json({ success: false, message: `External marks cannot exceed ${existing.max_external_marks}.` });
    }

    const { grade, gradePoints, isPass } = await calculateGrade(
      intMarks + extMarks,
      existing.max_internal_marks,
      existing.max_external_marks
    );

    const { rows: [updated] } = await db.query(
      `UPDATE results
       SET internal_marks=$1, external_marks=$2, grade=$3, grade_points=$4, is_pass=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [intMarks, extMarks, grade, gradePoints, isPass, resultId]
    );

    await db.query(
      `INSERT INTO audit_logs (action,entity_type,entity_id,performed_by,role,old_data,new_data,ip_address)
       VALUES ('MARKS_UPDATE','result',$1,$2,'faculty',$3,$4,$5)`,
      [resultId, facultyId, JSON.stringify(existing), JSON.stringify(updated), req.ip]
    );

    return res.json({ success: true, message: 'Marks updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/faculty/results/:id/publish
 * Publish a result (make visible to student).
 */
exports.publishResult = async (req, res, next) => {
  try {
    const facultyId = req.user.id;
    const resultId  = parseInt(req.params.id);

    const { rows: [existing] } = await db.query('SELECT * FROM results WHERE id=$1', [resultId]);
    if (!existing) return res.status(404).json({ success: false, message: 'Result not found.' });
    if (existing.entered_by !== facultyId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (existing.status === 'published') {
      return res.status(409).json({ success: false, message: 'Result is already published.' });
    }

    const { rows: [updated] } = await db.query(
      `UPDATE results SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`, [resultId]
    );

    await db.query(
      `INSERT INTO audit_logs (action,entity_type,entity_id,performed_by,role,ip_address)
       VALUES ('MARKS_PUBLISH','result',$1,$2,'faculty',$3)`,
      [resultId, facultyId, req.ip]
    );

    return res.json({ success: true, message: 'Result published successfully.', data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faculty/results
 * Results entered by this faculty.
 */
exports.getResults = async (req, res, next) => {
  try {
    const { status, search, subjectId } = req.query;
    const params = [req.user.id];
    let where = 'WHERE r.entered_by = $1';

    if (status)    { params.push(status);    where += ` AND r.status = $${params.length}`; }
    if (subjectId) { params.push(subjectId); where += ` AND r.subject_id = $${params.length}`; }
    if (search) {
      params.push(`%${search.toUpperCase()}%`);
      where += ` AND st.registration_no ILIKE $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT r.*, st.full_name AS student_name, st.registration_no,
              s.subject_name, s.subject_code, s.max_internal_marks, s.max_external_marks,
              s.credits, ay.year_label AS academic_year
       FROM results r
       JOIN students       st ON st.id = r.student_id
       JOIN subjects       s  ON s.id  = r.subject_id
       JOIN academic_years ay ON ay.id = r.academic_year_id
       ${where}
       ORDER BY r.updated_at DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
