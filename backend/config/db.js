// backend/config/db.js
// PostgreSQL connection pool.
// All credentials come from environment variables so the same code
// works locally and on Azure Database for PostgreSQL.

const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const useSSL      = process.env.DB_SSL === 'true';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'student_result_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // SSL is required by Azure Database for PostgreSQL
  ssl: useSSL ? { rejectUnauthorized: false } : (isProduction ? { rejectUnauthorized: false } : false),  // Connection pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection on startup
pool.on('connect', () => {
  if (!isProduction) console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
  process.exit(-1);
});

/**
 * Execute a parameterised query.
 * @param {string} text  - SQL statement with $1, $2 … placeholders
 * @param {Array}  params - Parameter values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for use inside a transaction.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
