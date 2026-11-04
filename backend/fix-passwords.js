// fix-passwords.js
// Generates correct bcrypt hashes and updates all demo accounts in the DB

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./config/db');

async function fixPasswords() {
  console.log('🔐 Generating correct bcrypt hashes...\n');

  const adminHash   = await bcrypt.hash('Admin@123',    12);
  const studentHash = await bcrypt.hash('Student@123',  12);
  const facultyHash = await bcrypt.hash('Faculty@123',  12);

  console.log('Updating admin password   → Admin@123');
  await pool.query(`UPDATE admins   SET password_hash = $1`, [adminHash]);

  console.log('Updating student passwords → Student@123');
  await pool.query(`UPDATE students SET password_hash = $1`, [studentHash]);

  console.log('Updating faculty passwords → Faculty@123');
  await pool.query(`UPDATE faculty  SET password_hash = $1`, [facultyHash]);

  console.log('\n✅ All passwords updated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin   : admin       / Admin@123');
  console.log('  Student : STU2024001  / Student@123');
  console.log('  Faculty : FAC001      / Faculty@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await pool.end();
  process.exit(0);
}

fixPasswords().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
