// backend/controllers/authController.js
// Authentication: login, logout, current-user

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   false,
     sameSite: 'lax',
  maxAge:   8 * 60 * 60 * 1000, // 8 hours
};

/**
 * POST /api/auth/login
 * Body: { role: 'admin'|'faculty'|'student', identifier, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { role, identifier, password } = req.body;

    if (!role || !identifier || !password) {
      return res.status(400).json({ success: false, message: 'Role, identifier and password are required.' });
    }

    let user = null;
    let passwordHash = null;

    if (role === 'admin') {
      const { rows } = await db.query(
        'SELECT * FROM admins WHERE username = $1 AND is_active = TRUE',
        [identifier.trim()]
      );
      if (rows.length) {
        user = { id: rows[0].id, role: 'admin', name: rows[0].full_name, identifier: rows[0].username };
        passwordHash = rows[0].password_hash;
      }
    } else if (role === 'faculty') {
      const { rows } = await db.query(
        'SELECT f.*, d.name AS dept_name FROM faculty f LEFT JOIN departments d ON d.id = f.department_id WHERE f.faculty_id = $1 AND f.is_active = TRUE',
        [identifier.trim().toUpperCase()]
      );
      if (rows.length) {
        user = {
          id:         rows[0].id,
          role:       'faculty',
          name:       rows[0].full_name,
          identifier: rows[0].faculty_id,
          dept:       rows[0].dept_name,
          mustChange: rows[0].must_change_password,
        };
        passwordHash = rows[0].password_hash;
      }
    } else if (role === 'student') {
      const { rows } = await db.query(
        `SELECT s.*, d.name AS dept_name
         FROM students s
         LEFT JOIN departments d ON d.id = s.department_id
         WHERE s.registration_no = $1 AND s.is_active = TRUE`,
        [identifier.trim().toUpperCase()]
      );
      if (rows.length) {
        user = {
          id:             rows[0].id,
          role:           'student',
          name:           rows[0].full_name,
          identifier:     rows[0].registration_no,
          dept:           rows[0].dept_name,
          programme:      rows[0].programme,
          currentSemester: rows[0].current_semester,
          mustChange:     rows[0].must_change_password,
        };
        passwordHash = rows[0].password_hash;
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    if (!user || !passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your ID and password.' });
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your ID and password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, identifier: user.identifier },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id:          user.id,
        role:        user.role,
        name:        user.name,
        identifier:  user.identifier,
        dept:        user.dept,
        programme:   user.programme,
        mustChange:  user.mustChange,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

/**
 * GET /api/auth/me
 * Returns current user from JWT (no extra DB call needed for basic info).
 */
exports.me = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let user = null;

    if (role === 'admin') {
      const { rows } = await db.query('SELECT id, username, full_name, email FROM admins WHERE id=$1', [id]);
      if (rows.length) user = { ...rows[0], role };
    } else if (role === 'faculty') {
      const { rows } = await db.query(
        `SELECT f.id, f.faculty_id AS identifier, f.full_name, f.email, f.department_id,
                d.name AS dept_name, f.must_change_password
         FROM faculty f LEFT JOIN departments d ON d.id = f.department_id
         WHERE f.id = $1`, [id]);
      if (rows.length) user = { ...rows[0], role };
    } else if (role === 'student') {
      const { rows } = await db.query(
        `SELECT s.id, s.registration_no AS identifier, s.full_name, s.email,
                s.department_id, d.name AS dept_name, s.programme,
                s.admission_year, s.current_semester, s.must_change_password
         FROM students s LEFT JOIN departments d ON d.id = s.department_id
         WHERE s.id = $1`, [id]);
      if (rows.length) user = { ...rows[0], role };
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/change-password
 * Allows any logged-in user to change their own password.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    let table = role === 'admin' ? 'admins' : role === 'faculty' ? 'faculty' : 'students';
    const { rows } = await db.query(`SELECT password_hash FROM ${table} WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE ${table} SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2`,
      [newHash, id]
    );

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};
