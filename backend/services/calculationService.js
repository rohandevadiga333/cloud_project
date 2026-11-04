// backend/services/calculationService.js
// SGPA and CGPA calculation logic (credit-weighted)

const db = require('../config/db');

/**
 * Calculate grade from total marks using the configured grading scale.
 * @param {number} totalMarks  - marks obtained
 * @param {number} maxInternal - max internal marks
 * @param {number} maxExternal - max external marks
 * @returns {{ grade, gradePoints, isPass }} 
 */
async function calculateGrade(totalMarks, maxInternal, maxExternal) {
  const maxTotal = maxInternal + maxExternal;
  const percent  = (totalMarks / maxTotal) * 100;

  const { rows } = await db.query(
    `SELECT grade, grade_points, is_pass
     FROM grading_scales
     WHERE $1 >= min_percent AND $1 <= max_percent
     LIMIT 1`,
    [percent.toFixed(2)]
  );

  if (rows.length === 0) {
    return { grade: 'F', gradePoints: 0, isPass: false };
  }
  return {
    grade:       rows[0].grade,
    gradePoints: parseFloat(rows[0].grade_points),
    isPass:      rows[0].is_pass,
  };
}

/**
 * Calculate SGPA for one student in one semester.
 * Only published results are used.
 * SGPA = Σ(credits × gradePoints) / Σcredits
 *
 * @param {number} studentId
 * @param {number} semesterNo
 * @param {number} academicYearId
 * @returns {{ sgpa: number, totalCredits: number, creditPoints: number }}
 */
async function calculateSGPA(studentId, semesterNo, academicYearId) {
  const { rows } = await db.query(
    `SELECT r.grade_points, s.credits
     FROM results r
     JOIN subjects s ON s.id = r.subject_id
     WHERE r.student_id       = $1
       AND r.semester_no      = $2
       AND r.academic_year_id = $3
       AND r.status           = 'published'`,
    [studentId, semesterNo, academicYearId]
  );

  if (rows.length === 0) return { sgpa: 0, totalCredits: 0, creditPoints: 0 };

  let totalCredits = 0;
  let creditPoints = 0;
  for (const row of rows) {
    const credits     = parseFloat(row.credits);
    const gradePoints = parseFloat(row.grade_points);
    totalCredits += credits;
    creditPoints += credits * gradePoints;
  }

  const sgpa = totalCredits > 0 ? creditPoints / totalCredits : 0;
  return { sgpa: parseFloat(sgpa.toFixed(2)), totalCredits, creditPoints };
}

/**
 * Calculate CGPA for one student across all published semesters.
 * CGPA = Σ(semesterCredits × semesterSGPA) / ΣsemesterCredits
 *        = Σ(creditPoints across all semesters) / Σ(credits across all semesters)
 *
 * @param {number} studentId
 * @returns {{ cgpa: number, totalCredits: number }}
 */
async function calculateCGPA(studentId) {
  const { rows } = await db.query(
    `SELECT r.grade_points, s.credits
     FROM results r
     JOIN subjects s ON s.id = r.subject_id
     WHERE r.student_id = $1
       AND r.status     = 'published'`,
    [studentId]
  );

  if (rows.length === 0) return { cgpa: 0, totalCredits: 0 };

  let totalCredits = 0;
  let creditPoints = 0;
  for (const row of rows) {
    const credits     = parseFloat(row.credits);
    const gradePoints = parseFloat(row.grade_points);
    totalCredits += credits;
    creditPoints += credits * gradePoints;
  }

  const cgpa = totalCredits > 0 ? creditPoints / totalCredits : 0;
  return { cgpa: parseFloat(cgpa.toFixed(2)), totalCredits };
}

/**
 * Get SGPA for each published semester for a student.
 * @param {number} studentId
 * @returns {Array<{ semesterNo, academicYear, sgpa, totalCredits }>}
 */
async function getSemesterWiseSGPA(studentId) {
  const { rows } = await db.query(
    `SELECT r.semester_no, r.academic_year_id, ay.year_label,
            SUM(s.credits * r.grade_points) AS credit_points,
            SUM(s.credits)                  AS total_credits
     FROM results r
     JOIN subjects      s  ON s.id  = r.subject_id
     JOIN academic_years ay ON ay.id = r.academic_year_id
     WHERE r.student_id = $1
       AND r.status     = 'published'
     GROUP BY r.semester_no, r.academic_year_id, ay.year_label
     ORDER BY ay.year_label, r.semester_no`,
    [studentId]
  );

  return rows.map(row => ({
    semesterNo:      row.semester_no,
    academicYearId:  row.academic_year_id,
    academicYear:    row.year_label,
    sgpa:            row.total_credits > 0
                       ? parseFloat((row.credit_points / row.total_credits).toFixed(2))
                       : 0,
    totalCredits:    parseFloat(row.total_credits),
  }));
}

module.exports = { calculateGrade, calculateSGPA, calculateCGPA, getSemesterWiseSGPA };
