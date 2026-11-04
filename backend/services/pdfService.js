// backend/services/pdfService.js
// Professional marks card PDF generation using PDFKit

const PDFDocument = require('pdfkit');
const { calculateSGPA, calculateCGPA } = require('./calculationService');
const db = require('../config/db');

/**
 * Generate a professional semester marks card PDF.
 *
 * @param {Object} student        - Student record from DB
 * @param {number} semesterNo     - Semester number
 * @param {string} academicYear   - e.g. "2024-25"
 * @param {number} academicYearId
 * @param {Array}  results        - Array of result rows
 * @param {Object} res            - Express response object (stream target)
 */
async function generateMarksheetPDF(student, semesterNo, academicYear, academicYearId, results, res) {
  const collegeName    = process.env.COLLEGE_NAME || 'Academic Institution';
  const { sgpa, totalCredits } = await calculateSGPA(student.id, semesterNo, academicYearId);
  const { cgpa }               = await calculateCGPA(student.id);

  // ── department name ──────────────────────────────────────────
  let deptName = 'N/A';
  if (student.department_id) {
    const deptRes = await db.query('SELECT name FROM departments WHERE id=$1', [student.department_id]);
    if (deptRes.rows.length) deptName = deptRes.rows[0].name;
  }

  // ── totals ───────────────────────────────────────────────────
  const totalMaxInternal = results.reduce((s, r) => s + parseFloat(r.max_internal_marks || 50), 0);
  const totalMaxExternal = results.reduce((s, r) => s + parseFloat(r.max_external_marks || 100), 0);
  const totalMaxMarks    = totalMaxInternal + totalMaxExternal;
  const totalObtained    = results.reduce((s, r) => s + parseFloat(r.total_marks || 0), 0);
  const passCount        = results.filter(r => r.is_pass).length;
  const overallStatus    = passCount === results.length ? 'PASS' : 'FAIL';
  const verificationId   = `SRMS-${student.registration_no}-SEM${semesterNo}-${Date.now()}`;

  // ── Document ─────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title:    `Marks Card – ${student.full_name} – Semester ${semesterNo}`,
      Author:   collegeName,
      Creator:  'Student Result Management System',
    },
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="marksheet_${student.registration_no}_sem${semesterNo}.pdf"`);
  doc.pipe(res);

  // ── Color palette ─────────────────────────────────────────────
  const NAVY   = '#1a3a5c';
  const BLUE   = '#2563eb';
  const LIGHT  = '#e8f0fe';
  const GREY   = '#64748b';
  const WHITE  = '#ffffff';
  const RED    = '#dc2626';
  const GREEN  = '#16a34a';
  const GOLD   = '#d97706';

  const pageW = doc.page.width  - 80; // usable width
  const startX = 40;

  // ── DEMO watermark ────────────────────────────────────────────
  doc.save()
     .rotate(-45, { origin: [300, 420] })
     .fontSize(60)
     .fillColor('#e2e8f0')
     .text('DEMO ONLY', 80, 300, { width: 500, align: 'center' })
     .restore();

  // ── Header ───────────────────────────────────────────────────
  // Logo circle placeholder
  doc.save()
     .circle(65, 75, 30)
     .fillColor(NAVY)
     .fill()
     .restore();

  doc.save()
     .fontSize(14)
     .fillColor(WHITE)
     .font('Helvetica-Bold')
     .text('SRMS', 42, 64)
     .restore();

  // College name and subtitle
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor(NAVY)
     .text(collegeName.toUpperCase(), 105, 50, { width: pageW - 65 });

  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(GREY)
     .text('Examination & Academic Records Division', 105, 72, { width: pageW - 65 });

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(BLUE)
     .text('STATEMENT OF MARKS – SEMESTER EXAMINATION', 105, 88, { width: pageW - 65 });

  // Header divider
  doc.moveTo(startX, 115)
     .lineTo(startX + pageW, 115)
     .lineWidth(2)
     .strokeColor(NAVY)
     .stroke();

  doc.moveTo(startX, 118)
     .lineTo(startX + pageW, 118)
     .lineWidth(0.5)
     .strokeColor(BLUE)
     .stroke();

  // ── Academic info bar ─────────────────────────────────────────
  doc.rect(startX, 124, pageW, 22)
     .fillColor(NAVY)
     .fill();

  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor(WHITE)
     .text(`Academic Year: ${academicYear}`, startX + 8, 130, { continued: true })
     .text(`   Semester: ${semesterNo}`, { continued: true })
     .text(`   Programme: ${student.programme || 'B.Tech'}`, { continued: true })
     .text(`   Department: ${deptName}`);

  // ── Student Details ───────────────────────────────────────────
  let y = 158;

  const detailBox = (label, value, x, boxY, w) => {
    doc.fontSize(7.5).font('Helvetica').fillColor(GREY).text(label, x, boxY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(NAVY).text(value || 'N/A', x, boxY + 11, { width: w - 10 });
  };

  const half = pageW / 2;
  detailBox('Student Name',        student.full_name,        startX,          y, half);
  detailBox('Registration Number', student.registration_no,  startX + half,   y, half);
  y += 40;
  detailBox('Department',          deptName,                 startX,          y, half);
  detailBox('Programme',           student.programme,        startX + half,   y, half);
  y += 40;
  detailBox('Admission Year',      student.admission_year?.toString(), startX, y, half);
  detailBox('Date of Issue',       new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }), startX + half, y, half);

  y += 36;

  // Divider
  doc.moveTo(startX, y).lineTo(startX + pageW, y).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
  y += 10;

  // ── Marks Table ───────────────────────────────────────────────
  const cols = {
    code:     { x: startX,       w: 65,  label: 'Sub Code',     align: 'left' },
    name:     { x: startX + 65,  w: 145, label: 'Subject Name', align: 'left' },
    credits:  { x: startX + 210, w: 45,  label: 'Credits',      align: 'center' },
    internal: { x: startX + 255, w: 55,  label: 'Internal',     align: 'center' },
    external: { x: startX + 310, w: 55,  label: 'External',     align: 'center' },
    total:    { x: startX + 365, w: 55,  label: 'Total',        align: 'center' },
    grade:    { x: startX + 420, w: 40,  label: 'Grade',        align: 'center' },
    gp:       { x: startX + 460, w: 55,  label: 'Gr.Points',    align: 'center' },
  };
  const ROW_H = 22;
  const HEAD_H = 26;

  // Table header
  doc.rect(startX, y, pageW, HEAD_H).fillColor(NAVY).fill();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE);
  Object.values(cols).forEach(col => {
    doc.text(col.label, col.x + 2, y + 9, { width: col.w - 4, align: col.align });
  });
  y += HEAD_H;

  // Table rows
  results.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    doc.rect(startX, y, pageW, ROW_H).fillColor(bg).fill();

    // Row border
    doc.rect(startX, y, pageW, ROW_H).strokeColor('#e2e8f0').lineWidth(0.3).stroke();

    doc.fontSize(8).font('Helvetica').fillColor('#1e293b');

    const passColor = row.is_pass ? '#1e293b' : RED;
    const gradeColor = row.is_pass ? NAVY : RED;

    doc.text(row.subject_code,            cols.code.x + 2,     y + 7, { width: cols.code.w - 4 });
    doc.text(row.subject_name,            cols.name.x + 2,     y + 7, { width: cols.name.w - 4 });
    doc.text(String(row.credits),         cols.credits.x + 2,  y + 7, { width: cols.credits.w - 4,  align: 'center' });
    doc.text(`${row.internal_marks}/${row.max_internal_marks}`, cols.internal.x + 2, y + 7, { width: cols.internal.w - 4, align: 'center' });
    doc.text(`${row.external_marks}/${row.max_external_marks}`, cols.external.x + 2, y + 7, { width: cols.external.w - 4, align: 'center' });
    doc.fillColor(passColor).text(String(row.total_marks),     cols.total.x + 2,    y + 7, { width: cols.total.w - 4,    align: 'center' });
    doc.fillColor(gradeColor).font('Helvetica-Bold')
       .text(row.grade || '-',            cols.grade.x + 2,    y + 7, { width: cols.grade.w - 4,    align: 'center' });
    doc.fillColor('#1e293b').font('Helvetica')
       .text(row.grade_points != null ? parseFloat(row.grade_points).toFixed(2) : '-',
                                          cols.gp.x + 2,       y + 7, { width: cols.gp.w - 4,       align: 'center' });
    y += ROW_H;
  });

  // Table border
  doc.rect(startX, y - results.length * ROW_H - HEAD_H, pageW, results.length * ROW_H + HEAD_H)
     .strokeColor(NAVY).lineWidth(1).stroke();

  y += 16;

  // ── Result Summary ────────────────────────────────────────────
  doc.rect(startX, y, pageW, 90).fillColor(LIGHT).fill();
  doc.rect(startX, y, pageW, 90).strokeColor(NAVY).lineWidth(0.8).stroke();

  doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY)
     .text('RESULT SUMMARY', startX + 8, y + 8);

  const sum = [
    ['Total Subjects',    results.length],
    ['Marks Obtained',    `${totalObtained.toFixed(0)} / ${totalMaxMarks}`],
    ['Total Credits',     totalCredits],
    ['Subjects Passed',   passCount],
    ['SGPA',              sgpa.toFixed(2)],
    ['CGPA (Overall)',    cgpa.toFixed(2)],
    ['Result Status',     overallStatus],
  ];

  const colW = pageW / 4;
  sum.forEach((item, i) => {
    const col = i % 4;
    const row2 = Math.floor(i / 4);
    const bx = startX + 8 + col * colW;
    const by = y + 22 + row2 * 30;

    doc.fontSize(7).font('Helvetica').fillColor(GREY).text(item[0], bx, by);
    const valColor = item[0] === 'Result Status'
      ? (item[1] === 'PASS' ? GREEN : RED)
      : NAVY;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(valColor)
       .text(String(item[1]), bx, by + 11, { width: colW - 10 });
  });

  y += 100;

  // ── DEMO notice ───────────────────────────────────────────────
  doc.rect(startX, y, pageW, 22)
     .fillColor('#fef3c7').fill();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(GOLD)
     .text('⚠  DEMO – NOT AN OFFICIAL ACADEMIC RECORD. For verification contact the Examination Branch.', startX + 8, y + 7);

  y += 32;

  // ── Footer ────────────────────────────────────────────────────
  doc.fontSize(7.5).font('Helvetica').fillColor(GREY)
     .text(`Verification ID: ${verificationId}`, startX, y)
     .text(`Generated: ${new Date().toLocaleString('en-IN')}`, startX, y + 12)
     .text('Authorized Signatory: ___________________', startX + pageW - 200, y, { align: 'right' })
     .text('Controller of Examinations', startX + pageW - 200, y + 12, { align: 'right' });

  // Bottom rule
  doc.moveTo(startX, y + 26)
     .lineTo(startX + pageW, y + 26)
     .lineWidth(1.5)
     .strokeColor(NAVY)
     .stroke();

  doc.end();
}

module.exports = { generateMarksheetPDF };
