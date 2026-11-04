// backend/controllers/adminController.js
// Admin management API endpoints

const bcrypt = require('bcrypt');
const db     = require('../config/db');
const { calculateCGPA } = require('../services/calculationService');

// ─── Dashboard ────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM students  WHERE is_active=TRUE) AS total_students,
        (SELECT COUNT(*) FROM faculty   WHERE is_active=TRUE) AS total_faculty,
        (SELECT COUNT(*) FROM departments WHERE is_active=TRUE) AS total_departments,
        (SELECT COUNT(*) FROM subjects  WHERE is_active=TRUE) AS total_subjects,
        (SELECT COUNT(*) FROM results)                        AS total_results,
        (SELECT COUNT(*) FROM results WHERE status='published') AS published_results,
        (SELECT COUNT(*) FROM results WHERE status='draft')     AS pending_results
    `);

    // Department-wise student count
    const { rows: deptStats } = await db.query(`
      SELECT d.name, d.code, COUNT(s.id) AS student_count
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id AND s.is_active=TRUE
      GROUP BY d.id, d.name, d.code ORDER BY student_count DESC
    `);

    // Recent audit logs
    const { rows: auditLogs } = await db.query(`
      SELECT al.*, 
             CASE al.role
               WHEN 'admin'   THEN (SELECT username  FROM admins  WHERE id=al.performed_by)
               WHEN 'faculty' THEN (SELECT faculty_id FROM faculty WHERE id=al.performed_by)
             END AS performer_name
      FROM audit_logs al
      ORDER BY al.created_at DESC LIMIT 10
    `);

    return res.json({
      success: true,
      data: {
        stats: {
          totalStudents:     parseInt(stats.total_students),
          totalFaculty:      parseInt(stats.total_faculty),
          totalDepartments:  parseInt(stats.total_departments),
          totalSubjects:     parseInt(stats.total_subjects),
          totalResults:      parseInt(stats.total_results),
          publishedResults:  parseInt(stats.published_results),
          pendingResults:    parseInt(stats.pending_results),
        },
        deptStats,
        auditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Students ─────────────────────────────────────────────────────────────────
exports.getStudents = async (req, res, next) => {
  try {
    const { search, department, semester, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (s.full_name ILIKE $${params.length} OR s.registration_no ILIKE $${params.length} OR s.email ILIKE $${params.length})`;
    }
    if (department) { params.push(department); where += ` AND d.code = $${params.length}`; }
    if (semester)   { params.push(semester);   where += ` AND s.current_semester = $${params.length}`; }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM students s LEFT JOIN departments d ON d.id=s.department_id ${where}`, params
    );
    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT s.*, d.name AS dept_name, d.code AS dept_code
       FROM students s LEFT JOIN departments d ON d.id = s.department_id
       ${where}
       ORDER BY s.registration_no
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

exports.getStudent = async (req, res, next) => {
  try {
    const { rows: [student] } = await db.query(
      `SELECT s.*, d.name AS dept_name, d.code AS dept_code
       FROM students s LEFT JOIN departments d ON d.id=s.department_id WHERE s.id=$1`, [req.params.id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const { cgpa } = await calculateCGPA(student.id);
    return res.json({ success: true, data: { ...student, cgpa } });
  } catch (err) { next(err); }
};

exports.createStudent = async (req, res, next) => {
  try {
    const { fullName, registrationNo, email, phone, departmentId, programme, admissionYear, currentSemester, password } = req.body;
    if (!fullName || !registrationNo || !password) {
      return res.status(400).json({ success: false, message: 'Name, registration number and password are required.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows: [student] } = await db.query(
      `INSERT INTO students (full_name, registration_no, password_hash, email, phone, department_id, programme, admission_year, current_semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, registration_no, full_name, email, created_at`,
      [fullName.trim(), registrationNo.trim().toUpperCase(), hash, email || null, phone || null,
       departmentId || null, programme || null, admissionYear || null, currentSemester || 1]
    );
    return res.status(201).json({ success: true, message: 'Student created successfully.', data: student });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Registration number or email already exists.' });
    next(err);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { fullName, email, phone, departmentId, programme, admissionYear, currentSemester, isActive } = req.body;
    const { rows: [student] } = await db.query(
      `UPDATE students
       SET full_name=$1, email=$2, phone=$3, department_id=$4, programme=$5,
           admission_year=$6, current_semester=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [fullName, email, phone, departmentId, programme, admissionYear, currentSemester, isActive !== false, req.params.id]
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, message: 'Student updated.', data: student });
  } catch (err) { next(err); }
};

exports.resetStudentPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    const { rows } = await db.query(
      `UPDATE students SET password_hash=$1, must_change_password=TRUE, updated_at=NOW() WHERE id=$2 RETURNING id`,
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

// ─── Faculty ──────────────────────────────────────────────────────────────────
exports.getFaculty = async (req, res, next) => {
  try {
    const { search, department } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (f.full_name ILIKE $${params.length} OR f.faculty_id ILIKE $${params.length})`;
    }
    if (department) { params.push(department); where += ` AND d.code=$${params.length}`; }

    const { rows } = await db.query(
      `SELECT f.*, d.name AS dept_name, d.code AS dept_code,
              (SELECT COUNT(*) FROM faculty_subjects fs WHERE fs.faculty_id=f.id) AS subject_count
       FROM faculty f LEFT JOIN departments d ON d.id=f.department_id
       ${where} ORDER BY f.faculty_id`, params
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createFaculty = async (req, res, next) => {
  try {
    const { facultyId, fullName, email, phone, departmentId, password } = req.body;
    if (!facultyId || !fullName || !password) {
      return res.status(400).json({ success: false, message: 'Faculty ID, name and password are required.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows: [faculty] } = await db.query(
      `INSERT INTO faculty (faculty_id, password_hash, full_name, email, phone, department_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, faculty_id, full_name, email, created_at`,
      [facultyId.trim().toUpperCase(), hash, fullName.trim(), email || null, phone || null, departmentId || null]
    );
    return res.status(201).json({ success: true, message: 'Faculty created successfully.', data: faculty });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Faculty ID or email already exists.' });
    next(err);
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const { fullName, email, phone, departmentId, isActive } = req.body;
    const { rows: [faculty] } = await db.query(
      `UPDATE faculty SET full_name=$1, email=$2, phone=$3, department_id=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [fullName, email, phone, departmentId, isActive !== false, req.params.id]
    );
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });
    return res.json({ success: true, message: 'Faculty updated.', data: faculty });
  } catch (err) { next(err); }
};

exports.resetFacultyPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    const { rows } = await db.query(
      `UPDATE faculty SET password_hash=$1, must_change_password=TRUE, updated_at=NOW() WHERE id=$2 RETURNING id`,
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Faculty not found.' });
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { next(err); }
};

// ─── Departments ──────────────────────────────────────────────────────────────
exports.getDepartments = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*,
         (SELECT COUNT(*) FROM students s WHERE s.department_id=d.id AND s.is_active=TRUE) AS student_count,
         (SELECT COUNT(*) FROM faculty  f WHERE f.department_id=d.id AND f.is_active=TRUE) AS faculty_count
       FROM departments d ORDER BY d.name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: 'Code and name are required.' });
    const { rows: [dept] } = await db.query(
      'INSERT INTO departments (code, name, description) VALUES ($1,$2,$3) RETURNING *',
      [code.trim().toUpperCase(), name.trim(), description || null]
    );
    return res.status(201).json({ success: true, message: 'Department created.', data: dept });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Department code or name already exists.' });
    next(err);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const { rows: [dept] } = await db.query(
      'UPDATE departments SET name=$1, description=$2, is_active=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, description, isActive !== false, req.params.id]
    );
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
    return res.json({ success: true, message: 'Department updated.', data: dept });
  } catch (err) { next(err); }
};

// ─── Subjects ─────────────────────────────────────────────────────────────────
exports.getSubjects = async (req, res, next) => {
  try {
    const { semester, department } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (semester)   { params.push(semester);   where += ` AND s.semester_no=$${params.length}`; }
    if (department) { params.push(department); where += ` AND d.code=$${params.length}`; }

    const { rows } = await db.query(
      `SELECT s.*, d.name AS dept_name, d.code AS dept_code
       FROM subjects s LEFT JOIN departments d ON d.id=s.department_id
       ${where} ORDER BY s.semester_no, s.subject_code`, params
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { subjectCode, subjectName, credits, semesterNo, departmentId, maxInternalMarks, maxExternalMarks } = req.body;
    if (!subjectCode || !subjectName || !semesterNo) {
      return res.status(400).json({ success: false, message: 'Subject code, name and semester are required.' });
    }
    const { rows: [subject] } = await db.query(
      `INSERT INTO subjects (subject_code, subject_name, credits, semester_no, department_id, max_internal_marks, max_external_marks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [subjectCode.trim().toUpperCase(), subjectName.trim(), credits || 3, semesterNo,
       departmentId || null, maxInternalMarks || 50, maxExternalMarks || 100]
    );
    return res.status(201).json({ success: true, message: 'Subject created.', data: subject });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Subject code already exists.' });
    next(err);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { subjectName, credits, semesterNo, departmentId, maxInternalMarks, maxExternalMarks, isActive } = req.body;
    const { rows: [subject] } = await db.query(
      `UPDATE subjects SET subject_name=$1, credits=$2, semester_no=$3, department_id=$4,
              max_internal_marks=$5, max_external_marks=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [subjectName, credits, semesterNo, departmentId, maxInternalMarks, maxExternalMarks, isActive !== false, req.params.id]
    );
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    return res.json({ success: true, message: 'Subject updated.', data: subject });
  } catch (err) { next(err); }
};

// ─── Faculty-Subject Assignment ───────────────────────────────────────────────
exports.assignFaculty = async (req, res, next) => {
  try {
    const { facultyId, subjectId, academicYearId } = req.body;
    if (!facultyId || !subjectId || !academicYearId) {
      return res.status(400).json({ success: false, message: 'Faculty, subject and academic year are required.' });
    }
    const { rows: [assignment] } = await db.query(
      `INSERT INTO faculty_subjects (faculty_id, subject_id, academic_year_id)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,
      [facultyId, subjectId, academicYearId]
    );
    return res.status(201).json({ success: true, message: 'Subject assigned to faculty.', data: assignment });
  } catch (err) { next(err); }
};

exports.getFacultySubjects = async (req, res, next) => {
  try {
    const { facultyId, academicYearId, semester, department } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (facultyId)      { params.push(facultyId);      where += ` AND fs.faculty_id=$${params.length}`; }
    if (academicYearId) { params.push(academicYearId); where += ` AND fs.academic_year_id=$${params.length}`; }
    if (semester)       { params.push(semester);       where += ` AND s.semester_no=$${params.length}`; }
    if (department)     { params.push(department);     where += ` AND d.code=$${params.length}`; }

    const { rows } = await db.query(
      `SELECT fs.*, f.faculty_id AS faculty_code, f.full_name AS faculty_name,
              s.subject_code, s.subject_name, s.semester_no, s.credits,
              d.name AS dept_name, d.code AS dept_code, ay.year_label AS academic_year
       FROM faculty_subjects fs
       JOIN faculty       f  ON f.id  = fs.faculty_id
       JOIN subjects      s  ON s.id  = fs.subject_id
       JOIN academic_years ay ON ay.id = fs.academic_year_id
       LEFT JOIN departments d ON d.id = s.department_id
       ${where} ORDER BY ay.year_label DESC, s.semester_no, s.subject_code`, params
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.removeFacultyAssignment = async (req, res, next) => {
  try {
    await db.query('DELETE FROM faculty_subjects WHERE id=$1', [req.params.id]);
    return res.json({ success: true, message: 'Assignment removed.' });
  } catch (err) { next(err); }
};

// ─── Academic Years & Semesters ───────────────────────────────────────────────
exports.getAcademicYears = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM academic_years ORDER BY year_label DESC');
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createAcademicYear = async (req, res, next) => {
  try {
    const { yearLabel, isCurrent } = req.body;
    if (!yearLabel) return res.status(400).json({ success: false, message: 'Year label is required.' });
    if (isCurrent) await db.query('UPDATE academic_years SET is_current=FALSE');
    const { rows: [ay] } = await db.query(
      'INSERT INTO academic_years (year_label, is_current) VALUES ($1,$2) RETURNING *',
      [yearLabel.trim(), isCurrent || false]
    );
    return res.status(201).json({ success: true, message: 'Academic year created.', data: ay });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Academic year already exists.' });
    next(err);
  }
};

exports.getSemesters = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT se.*, ay.year_label FROM semesters se
       JOIN academic_years ay ON ay.id=se.academic_year_id
       ORDER BY ay.year_label DESC, se.semester_no`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── Grading Scale ────────────────────────────────────────────────────────────
exports.getGradingScale = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM grading_scales ORDER BY min_percent DESC');
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.updateGradingScale = async (req, res, next) => {
  try {
    const { grade, gradePoints, minPercent, maxPercent, isPass } = req.body;
    const { rows: [scale] } = await db.query(
      `UPDATE grading_scales SET grade_points=$1, min_percent=$2, max_percent=$3, is_pass=$4
       WHERE id=$5 RETURNING *`,
      [gradePoints, minPercent, maxPercent, isPass, req.params.id]
    );
    if (!scale) return res.status(404).json({ success: false, message: 'Grade not found.' });
    return res.json({ success: true, message: 'Grading scale updated.', data: scale });
  } catch (err) { next(err); }
};

// ─── Results (admin view) ─────────────────────────────────────────────────────
exports.getAllResults = async (req, res, next) => {
  try {
    const { search, department, semester, academicYear, status, page = 1, limit = 30 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (st.registration_no ILIKE $${params.length} OR st.full_name ILIKE $${params.length})`;
    }
    if (department)    { params.push(department);    where += ` AND d.code=$${params.length}`; }
    if (semester)      { params.push(semester);      where += ` AND r.semester_no=$${params.length}`; }
    if (academicYear)  { params.push(academicYear);  where += ` AND ay.year_label=$${params.length}`; }
    if (status)        { params.push(status);        where += ` AND r.status=$${params.length}`; }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT r.*, st.full_name AS student_name, st.registration_no,
              s.subject_name, s.subject_code, s.max_internal_marks, s.max_external_marks,
              ay.year_label AS academic_year, d.name AS dept_name,
              f.faculty_id AS entered_by_id, f.full_name AS entered_by_name
       FROM results r
       JOIN students       st ON st.id = r.student_id
       JOIN subjects       s  ON s.id  = r.subject_id
       JOIN academic_years ay ON ay.id = r.academic_year_id
       LEFT JOIN departments d ON d.id = st.department_id
       LEFT JOIN faculty f ON f.id = r.entered_by
       ${where}
       ORDER BY r.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.adminPublishResult = async (req, res, next) => {
  try {
    const { rows: [result] } = await db.query(
      `UPDATE results SET status='published', published_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id]
    );
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

    await db.query(
      `INSERT INTO audit_logs (action,entity_type,entity_id,performed_by,role,ip_address)
       VALUES ('ADMIN_PUBLISH','result',$1,$2,'admin',$3)`,
      [result.id, req.user.id, req.ip]
    );

    return res.json({ success: true, message: 'Result published.', data: result });
  } catch (err) { next(err); }
};

exports.adminCorrectResult = async (req, res, next) => {
  try {
    const { internalMarks, externalMarks, reason } = req.body;
    const { rows: [old] } = await db.query('SELECT * FROM results WHERE id=$1', [req.params.id]);
    if (!old) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { rows: [sub] } = await db.query('SELECT * FROM subjects WHERE id=$1', [old.subject_id]);
    const { calculateGrade } = require('../services/calculationService');
    const total = parseFloat(internalMarks) + parseFloat(externalMarks);
    const { grade, gradePoints, isPass } = await calculateGrade(total, sub.max_internal_marks, sub.max_external_marks);

    const { rows: [updated] } = await db.query(
      `UPDATE results SET internal_marks=$1, external_marks=$2, grade=$3, grade_points=$4, is_pass=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [internalMarks, externalMarks, grade, gradePoints, isPass, req.params.id]
    );

    await db.query(
      `INSERT INTO audit_logs (action,entity_type,entity_id,performed_by,role,old_data,new_data,ip_address)
       VALUES ('ADMIN_CORRECTION','result',$1,$2,'admin',$3,$4,$5)`,
      [req.params.id, req.user.id, JSON.stringify({ ...old, reason }), JSON.stringify(updated), req.ip]
    );

    return res.json({ success: true, message: 'Result corrected and audit log created.', data: updated });
  } catch (err) { next(err); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────
exports.getResultReport = async (req, res, next) => {
  try {
    const { academicYear, semester } = req.query;
    const { rows } = await db.query(
      `SELECT d.name AS department, d.code AS dept_code, r.semester_no,
              COUNT(r.id)                                              AS total,
              COUNT(r.id) FILTER (WHERE r.is_pass=TRUE  AND r.status='published') AS passed,
              COUNT(r.id) FILTER (WHERE r.is_pass=FALSE AND r.status='published') AS failed,
              COUNT(r.id) FILTER (WHERE r.status='draft')             AS pending,
              ROUND(AVG(r.total_marks) FILTER (WHERE r.status='published'), 2) AS avg_marks
       FROM results r
       JOIN students       st ON st.id  = r.student_id
       JOIN academic_years ay ON ay.id  = r.academic_year_id
       LEFT JOIN departments d ON d.id  = st.department_id
       WHERE ($1::text IS NULL OR ay.year_label=$1)
         AND ($2::int  IS NULL OR r.semester_no =$2)
       GROUP BY d.id, d.name, d.code, r.semester_no
       ORDER BY d.name, r.semester_no`,
      [academicYear || null, semester ? parseInt(semester) : null]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getDeptReport = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT d.name, d.code,
         COUNT(DISTINCT s.id) AS student_count,
         COUNT(DISTINCT f.id) AS faculty_count,
         COUNT(DISTINCT sub.id) AS subject_count
       FROM departments d
       LEFT JOIN students s   ON s.department_id=d.id   AND s.is_active=TRUE
       LEFT JOIN faculty  f   ON f.department_id=d.id   AND f.is_active=TRUE
       LEFT JOIN subjects sub ON sub.department_id=d.id AND sub.is_active=TRUE
       GROUP BY d.id, d.name, d.code ORDER BY d.name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
