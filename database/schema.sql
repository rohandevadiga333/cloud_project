-- =============================================================
-- Student Result Management System – Database Schema
-- PostgreSQL | student_result_db
-- =============================================================

-- Drop tables in reverse dependency order for clean re-runs
DROP TABLE IF EXISTS audit_logs       CASCADE;
DROP TABLE IF EXISTS results          CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;
DROP TABLE IF EXISTS grading_scales   CASCADE;
DROP TABLE IF EXISTS semesters        CASCADE;
DROP TABLE IF EXISTS academic_years   CASCADE;
DROP TABLE IF EXISTS subjects         CASCADE;
DROP TABLE IF EXISTS departments      CASCADE;
DROP TABLE IF EXISTS students         CASCADE;
DROP TABLE IF EXISTS faculty          CASCADE;
DROP TABLE IF EXISTS admins           CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. admins
-- ─────────────────────────────────────────────────────────────
CREATE TABLE admins (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE,
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. departments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE departments (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  UNIQUE NOT NULL,
  name        VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. faculty
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty (
  id            SERIAL PRIMARY KEY,
  faculty_id    VARCHAR(20)  UNIQUE NOT NULL,   -- e.g. FAC001
  password_hash  VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE,
  phone         VARCHAR(20),
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  is_active     BOOLEAN      DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 4. students
-- ─────────────────────────────────────────────────────────────
CREATE TABLE students (
  id               SERIAL PRIMARY KEY,
  registration_no  VARCHAR(20)  UNIQUE NOT NULL,  -- e.g. STU2024001
  password_hash     VARCHAR(255) NOT NULL,
  full_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(150) UNIQUE,
  phone            VARCHAR(20),
  department_id    INT REFERENCES departments(id) ON DELETE SET NULL,
  programme        VARCHAR(100),                  -- e.g. B.Tech
  admission_year   INT,
  current_semester INT          DEFAULT 1,
  is_active        BOOLEAN      DEFAULT TRUE,
  must_change_password BOOLEAN  DEFAULT TRUE,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_students_reg_no ON students(registration_no);

-- ─────────────────────────────────────────────────────────────
-- 5. academic_years
-- ─────────────────────────────────────────────────────────────
CREATE TABLE academic_years (
  id         SERIAL PRIMARY KEY,
  year_label VARCHAR(20) UNIQUE NOT NULL,   -- e.g. 2024-25
  is_current BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 6. semesters
-- ─────────────────────────────────────────────────────────────
CREATE TABLE semesters (
  id               SERIAL PRIMARY KEY,
  semester_no      INT         NOT NULL,     -- 1–8
  semester_label   VARCHAR(20) NOT NULL,     -- e.g. Semester 1
  academic_year_id INT REFERENCES academic_years(id) ON DELETE CASCADE,
  is_active        BOOLEAN     DEFAULT TRUE,
  result_published BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semester_no, academic_year_id)
);

-- ─────────────────────────────────────────────────────────────
-- 7. subjects
-- ─────────────────────────────────────────────────────────────
CREATE TABLE subjects (
  id                 SERIAL PRIMARY KEY,
  subject_code       VARCHAR(20)  UNIQUE NOT NULL,
  subject_name       VARCHAR(150) NOT NULL,
  credits            INT          NOT NULL DEFAULT 3,
  semester_no        INT          NOT NULL,
  department_id      INT REFERENCES departments(id) ON DELETE SET NULL,
  max_internal_marks INT          NOT NULL DEFAULT 50,
  max_external_marks INT          NOT NULL DEFAULT 100,
  is_active          BOOLEAN      DEFAULT TRUE,
  created_at         TIMESTAMPTZ  DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_subjects_code ON subjects(subject_code);

-- ─────────────────────────────────────────────────────────────
-- 8. faculty_subjects  (Faculty ↔ Subject assignments)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty_subjects (
  id               SERIAL PRIMARY KEY,
  faculty_id       INT REFERENCES faculty(id)   ON DELETE CASCADE,
  subject_id       INT REFERENCES subjects(id)  ON DELETE CASCADE,
  academic_year_id INT REFERENCES academic_years(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, subject_id, academic_year_id)
);

-- ─────────────────────────────────────────────────────────────
-- 9. grading_scales
-- ─────────────────────────────────────────────────────────────
CREATE TABLE grading_scales (
  id           SERIAL PRIMARY KEY,
  grade        VARCHAR(5)    NOT NULL,   -- e.g. O, A+, A, B+, B, C, F
  grade_points NUMERIC(4,2)  NOT NULL,
  min_percent  NUMERIC(5,2)  NOT NULL,
  max_percent  NUMERIC(5,2)  NOT NULL,
  is_pass      BOOLEAN       DEFAULT TRUE,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 10. results
-- ─────────────────────────────────────────────────────────────
CREATE TABLE results (
  id               SERIAL PRIMARY KEY,
  student_id       INT REFERENCES students(id)      ON DELETE CASCADE,
  subject_id       INT REFERENCES subjects(id)      ON DELETE RESTRICT,
  academic_year_id INT REFERENCES academic_years(id) ON DELETE RESTRICT,
  semester_no      INT          NOT NULL,
  internal_marks   NUMERIC(6,2) NOT NULL DEFAULT 0,
  external_marks   NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_marks      NUMERIC(6,2) GENERATED ALWAYS AS (internal_marks + external_marks) STORED,
  grade            VARCHAR(5),
  grade_points     NUMERIC(4,2),
  is_pass          BOOLEAN      DEFAULT FALSE,
  status           VARCHAR(20)  DEFAULT 'draft',    -- draft | published
  entered_by       INT REFERENCES faculty(id)       ON DELETE SET NULL,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),
  -- Prevent duplicate results for the same student/subject/sem/year
  UNIQUE(student_id, subject_id, academic_year_id)
);

CREATE INDEX idx_results_student  ON results(student_id);
CREATE INDEX idx_results_subject  ON results(subject_id);
CREATE INDEX idx_results_status   ON results(status);

-- ─────────────────────────────────────────────────────────────
-- 11. audit_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id           SERIAL PRIMARY KEY,
  action       VARCHAR(50)  NOT NULL,   -- e.g. MARKS_UPDATE, MARKS_PUBLISH
  entity_type  VARCHAR(50),            -- e.g. result
  entity_id    INT,
  performed_by INT,
  role         VARCHAR(20),            -- admin | faculty
  old_data     JSONB,
  new_data     JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-update updated_at columns
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated_at    BEFORE UPDATE ON admins    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_faculty_updated_at   BEFORE UPDATE ON faculty   FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_students_updated_at  BEFORE UPDATE ON students  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_subjects_updated_at  BEFORE UPDATE ON subjects  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_results_updated_at   BEFORE UPDATE ON results   FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_dept_updated_at      BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
