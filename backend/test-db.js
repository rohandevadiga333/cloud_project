// Create a file called test-db.js inside your backend folder
const { Pool } = require('pg');

const pool = new Pool({
  host: 'srms-database.c5kyemokujui.ap-southeast-2.rds.amazonaws.com',
  user: 'postgres',
  password: 'admin1234', 
  database: 'student_result_db',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Database connected successfully!', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });