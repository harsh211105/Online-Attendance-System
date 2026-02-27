// Database configuration with PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Build connection string from environment variables
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const database = process.env.DB_NAME || 'attendance_system';

// build config object instead of string to avoid issues with special characters
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;

console.log('DB Connection Info:', { user, password, host, port, database });
console.log('Using connectionString:', JSON.stringify(connectionString));

// Create connection pool using object to bypass parsing corner cases
const pool = new Pool({
  user,
  password,
  host,
  port,
  database,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

// Helper functions for consistency with old SQLite code
const db = {};

db.runAsync = async function(sql, params = []) {
  try {
    // Convert SQLite syntax (?) to PostgreSQL syntax ($1, $2, etc)
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgSql, params);
    return { 
      lastID: result.rows[0]?.id, 
      changes: result.rowCount 
    };
  } catch (error) {
    throw error;
  }
};

db.getAsync = async function(sql, params = []) {
  try {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgSql, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

db.allAsync = async function(sql, params = []) {
  try {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgSql, params);
    return result.rows || [];
  } catch (error) {
    throw error;
  }
};

// Legacy callback-style run method for database initialization
db.run = function(sql, params = [], callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  let paramIndex = 1;
  const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

  pool.query(pgSql, params)
    .then((result) => {
      if (callback) callback(null, result);
    })
    .catch((error) => {
      if (callback) callback(error);
    });
};

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

pool.on('connect', () => {
  console.log('PostgreSQL database connected successfully!');
});

module.exports = { db, pool };

