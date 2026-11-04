-- =============================================================
-- Student Result Management System – Seed Data
-- PostgreSQL | student_result_db
-- =============================================================
-- Run AFTER schema.sql.
-- ALL passwords are bcrypt hashes. Plaintext credentials are:
--
--   Admin    : username=admin           password=Admin@123
--   Faculty  : FAC001/FAC002/FAC003     password=Faculty@123
--   Students : STU2024001–STU2024005    password=Student@123
--
-- IMPORTANT: This is DEMO data. Change passwords before any
-- real deployment.
-- =============================================================

-- ─── Grading Scale (configurable by admin) ───────────────────
INSERT INTO grading_scales (grade, grade_points, min_percent, max_percent, is_pass) VALUES
  ('O',  10.00, 90.00, 100.00, TRUE),
  ('A+',  9.00, 80.00,  89.99, TRUE),
  ('A',   8.00, 70.00,  79.99, TRUE),
  ('B+',  7.00, 60.00,  69.99, TRUE),
  ('B',   6.00, 50.00,  59.99, TRUE),
  ('C',   5.00, 45.00,  49.99, TRUE),
  ('F',   0.00,  0.00,  44.99, FALSE);

-- ─── Admin ───────────────────────────────────────────────────
-- Password: Admin@123
INSERT INTO admins (username, password_hash, full_name, email) VALUES
  ('admin',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBVJbZbFGFAKBG',
   'System Administrator',
   'admin@srms.edu');

-- ─── Departments ─────────────────────────────────────────────
INSERT INTO departments (code, name, description) VALUES
  ('CSE', 'Computer Science & Engineering',       'Covers software, algorithms, AI/ML'),
  ('ECE', 'Electronics & Communication Engineering', 'Covers circuits, signals, communication'),
  ('ME',  'Mechanical Engineering',               'Covers thermodynamics, manufacturing'),
  ('CIVIL','Civil Engineering',                   'Covers structures, surveying');

-- ─── Faculty ─────────────────────────────────────────────────
-- Password: Faculty@123
INSERT INTO faculty (faculty_id, password_hash, full_name, email, phone, department_id, must_change_password) VALUES
  ('FAC001',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Dr. Arjun Sharma',
   'arjun.sharma@srms.edu',
   '9876543210',
   (SELECT id FROM departments WHERE code='CSE'),
   FALSE),
  ('FAC002',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Prof. Priya Nair',
   'priya.nair@srms.edu',
   '9876543211',
   (SELECT id FROM departments WHERE code='CSE'),
   FALSE),
  ('FAC003',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Dr. Ramesh Kumar',
   'ramesh.kumar@srms.edu',
   '9876543212',
   (SELECT id FROM departments WHERE code='ECE'),
   FALSE);

-- ─── Students ────────────────────────────────────────────────
-- Password: Student@123
INSERT INTO students (registration_no, password_hash, full_name, email, phone, department_id, programme, admission_year, current_semester, must_change_password) VALUES
  ('STU2024001',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Rahul Verma',         'rahul.verma@student.srms.edu',   '9123456781',
   (SELECT id FROM departments WHERE code='CSE'), 'B.Tech', 2024, 3, FALSE),
  ('STU2024002',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Anjali Singh',        'anjali.singh@student.srms.edu',  '9123456782',
   (SELECT id FROM departments WHERE code='CSE'), 'B.Tech', 2024, 3, FALSE),
  ('STU2024003',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Mohammed Zain',       'zain@student.srms.edu',          '9123456783',
   (SELECT id FROM departments WHERE code='ECE'), 'B.Tech', 2024, 3, FALSE),
  ('STU2024004',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Divya Menon',         'divya.menon@student.srms.edu',   '9123456784',
   (SELECT id FROM departments WHERE code='CSE'), 'B.Tech', 2024, 1, FALSE),
  ('STU2024005',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEwC9G',
   'Karthik Reddy',       'karthik.reddy@student.srms.edu', '9123456785',
   (SELECT id FROM departments WHERE code='ECE'), 'B.Tech', 2024, 1, FALSE);

-- ─── Academic Years ──────────────────────────────────────────
INSERT INTO academic_years (year_label, is_current) VALUES
  ('2024-25', TRUE),
  ('2023-24', FALSE);

-- ─── Semesters ───────────────────────────────────────────────
INSERT INTO semesters (semester_no, semester_label, academic_year_id, is_active, result_published) VALUES
  (1, 'Semester 1', (SELECT id FROM academic_years WHERE year_label='2024-25'), TRUE, TRUE),
  (2, 'Semester 2', (SELECT id FROM academic_years WHERE year_label='2024-25'), TRUE, TRUE),
  (3, 'Semester 3', (SELECT id FROM academic_years WHERE year_label='2024-25'), TRUE, FALSE),
  (1, 'Semester 1', (SELECT id FROM academic_years WHERE year_label='2023-24'), FALSE, TRUE),
  (2, 'Semester 2', (SELECT id FROM academic_years WHERE year_label='2023-24'), FALSE, TRUE);

-- ─── Subjects ────────────────────────────────────────────────
INSERT INTO subjects (subject_code, subject_name, credits, semester_no, department_id, max_internal_marks, max_external_marks) VALUES
  -- Semester 1 – CSE
  ('CS101', 'Engineering Mathematics I',       4, 1, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS102', 'Programming in C',                4, 1, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS103', 'Digital Logic Design',            3, 1, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS104', 'Engineering Physics',             3, 1, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  -- Semester 2 – CSE
  ('CS201', 'Data Structures',                 4, 2, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS202', 'Object Oriented Programming',     4, 2, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS203', 'Discrete Mathematics',            3, 2, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS204', 'Computer Organization',           3, 2, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  -- Semester 3 – CSE
  ('CS301', 'Algorithms & Complexity',         4, 3, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS302', 'Database Management Systems',     4, 3, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS303', 'Operating Systems',               4, 3, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  ('CS304', 'Computer Networks',               3, 3, (SELECT id FROM departments WHERE code='CSE'), 50, 100),
  -- Semester 1 – ECE
  ('EC101', 'Engineering Mathematics I',       4, 1, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  ('EC102', 'Basic Electronics',               4, 1, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  ('EC103', 'Circuit Theory',                  3, 1, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  -- Semester 2 – ECE
  ('EC201', 'Signals & Systems',               4, 2, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  ('EC202', 'Analog Electronics',              4, 2, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  ('EC203', 'Digital Electronics',             3, 2, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  -- Semester 3 – ECE
  ('EC301', 'Communication Systems',           4, 3, (SELECT id FROM departments WHERE code='ECE'), 50, 100),
  ('EC302', 'Microprocessors',                 4, 3, (SELECT id FROM departments WHERE code='ECE'), 50, 100);

-- ─── Faculty-Subject Assignments ─────────────────────────────
INSERT INTO faculty_subjects (faculty_id, subject_id, academic_year_id)
SELECT
  (SELECT id FROM faculty WHERE faculty_id='FAC001'),
  s.id,
  (SELECT id FROM academic_years WHERE year_label='2024-25')
FROM subjects s WHERE s.subject_code IN ('CS101','CS102','CS201','CS202','CS301','CS302');

INSERT INTO faculty_subjects (faculty_id, subject_id, academic_year_id)
SELECT
  (SELECT id FROM faculty WHERE faculty_id='FAC002'),
  s.id,
  (SELECT id FROM academic_years WHERE year_label='2024-25')
FROM subjects s WHERE s.subject_code IN ('CS103','CS104','CS203','CS204','CS303','CS304');

INSERT INTO faculty_subjects (faculty_id, subject_id, academic_year_id)
SELECT
  (SELECT id FROM faculty WHERE faculty_id='FAC003'),
  s.id,
  (SELECT id FROM academic_years WHERE year_label='2024-25')
FROM subjects s WHERE s.subject_code IN ('EC101','EC102','EC103','EC201','EC202','EC203','EC301','EC302');

-- ─── Semester 1 Results – CSE Students (Published) ───────────
INSERT INTO results (student_id, subject_id, academic_year_id, semester_no, internal_marks, external_marks, grade, grade_points, is_pass, status, entered_by, published_at)
VALUES
  -- Rahul Verma – Sem 1
  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS101'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 42, 78, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS102'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 45, 85, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS103'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 38, 72, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS104'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 40, 68, 'A', 8.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '60 days'),

  -- Anjali Singh – Sem 1
  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS101'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 48, 92, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS102'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 46, 88, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS103'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 44, 82, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS104'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 43, 75, 'A', 8.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '60 days'),

-- ─── Semester 2 Results – CSE Students (Published) ───────────
  -- Rahul Verma – Sem 2
  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS201'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 40, 74, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS202'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 43, 80, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS203'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 35, 65, 'B+', 7.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS204'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 38, 60, 'B+', 7.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '30 days'),

  -- Anjali Singh – Sem 2
  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS201'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 47, 91, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS202'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 45, 86, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS203'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 44, 78, 'A+', 9.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024002'),
   (SELECT id FROM subjects  WHERE subject_code='CS204'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 42, 72, 'A', 8.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC002'), NOW() - INTERVAL '30 days'),

-- ─── Semester 3 Results – CSE Students (DRAFT – not visible to students) ─
  -- Rahul Verma – Sem 3 (draft)
  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS301'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   3, 44, 82, 'A+', 9.00, TRUE, 'draft',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NULL),

  ((SELECT id FROM students WHERE registration_no='STU2024001'),
   (SELECT id FROM subjects  WHERE subject_code='CS302'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   3, 46, 88, 'O', 10.00, TRUE, 'draft',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NULL),

-- ─── ECE Students Results ─────────────────────────────────────
  -- Mohammed Zain – Sem 1
  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC101'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 36, 66, 'B+', 7.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC102'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 33, 58, 'B', 6.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC103'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 30, 50, 'B', 6.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '60 days'),

  -- Mohammed Zain – Sem 2
  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC201'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 38, 70, 'A', 8.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC202'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 35, 62, 'B+', 7.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '30 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024003'),
   (SELECT id FROM subjects  WHERE subject_code='EC203'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   2, 32, 55, 'B', 6.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '30 days'),

  -- Divya Menon – Sem 1
  ((SELECT id FROM students WHERE registration_no='STU2024004'),
   (SELECT id FROM subjects  WHERE subject_code='CS101'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 49, 95, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024004'),
   (SELECT id FROM subjects  WHERE subject_code='CS102'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 47, 90, 'O', 10.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC001'), NOW() - INTERVAL '60 days'),

  -- Karthik Reddy – Sem 1
  ((SELECT id FROM students WHERE registration_no='STU2024005'),
   (SELECT id FROM subjects  WHERE subject_code='EC101'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 28, 40, 'F', 0.00, FALSE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '60 days'),

  ((SELECT id FROM students WHERE registration_no='STU2024005'),
   (SELECT id FROM subjects  WHERE subject_code='EC102'),
   (SELECT id FROM academic_years WHERE year_label='2024-25'),
   1, 32, 62, 'B+', 7.00, TRUE, 'published',
   (SELECT id FROM faculty WHERE faculty_id='FAC003'), NOW() - INTERVAL '60 days');
