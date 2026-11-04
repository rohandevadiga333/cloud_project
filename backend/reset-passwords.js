const bcrypt = require('bcrypt');
const db = require('./config/db'); // Uses your existing db connection

async function resetPasswords() {
  try {
    const password = 'Admin@123';
    // Generate a fresh hash
    const hash = await bcrypt.hash(password, 12);
    console.log('Generated Hash:', hash);

    // Update all users to this hash
    await db.query('UPDATE admins SET password_hash = $1', [hash]);
    await db.query('UPDATE faculty SET password_hash = $1', [hash]);
    await db.query('UPDATE students SET password_hash = $1', [hash]);

    console.log('✅ All passwords successfully reset to: Admin@123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting passwords:', err);
    process.exit(1);
  }
}

resetPasswords();