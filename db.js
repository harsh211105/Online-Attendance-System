// Database configuration with PostgreSQL or Mock in-memory store
const { Pool } = require('pg');
require('dotenv').config();

// Check if we should use mock database (for development without PostgreSQL)
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'mock';
console.log('USE_MOCK_DB in db.js:', USE_MOCK_DB, 'env value:', process.env.USE_MOCK_DB);

let db;

if (USE_MOCK_DB) {
  console.log('Using MOCK database (in-memory)');

  // In-memory data stores
  const mockData = {
    teachers: [],
    students: [],
    attendance: [],
    attendance_windows: [],
    attendance_log: []
  };

  // Auto-increment IDs
  const sequences = {
    teachers: 0,
    students: 0,
    attendance: 0,
    attendance_windows: 0,
    attendance_log: 0
  };

  // Mock database implementation
  db = {
    runAsync: async function(sql, params = []) {
      // Simulate INSERT operations
      if (sql.includes('INSERT INTO teachers')) {
        const teacher = {
          id: params[0] !== undefined ? params[0] : ++sequences.teachers,
          name: params[1],
          email: params[2],
          password: params[3],
          approval_status: params[4] || 0,
          current_ip: params[5] || null,
          last_login: params[6] || null,
          created_at: new Date().toISOString()
        };
        mockData.teachers.push(teacher);
        return { lastID: teacher.id, changes: 1 };
      }
      if (sql.includes('INSERT INTO students')) {
        const student = {
          id: ++sequences.students,
          name: params[0],
          roll_number: params[1],
          password: params[2],
          image: params[3],
          face_descriptor: params[4] || null,
          approval_status: params[5] || 0,
          registered_at: new Date().toISOString()
        };
        mockData.students.push(student);
        return { lastID: student.id, changes: 1 };
      }
      if (sql.includes('INSERT INTO attendance')) {
        const record = {
          id: ++sequences.attendance,
          student_roll: params[0],
          attendance_date: params[1],
          period_number: params[2],
          status: params[3] || 'A',
          marked_at: new Date().toISOString()
        };
        mockData.attendance.push(record);
        return { lastID: record.id, changes: 1 };
      }
      if (sql.includes('INSERT INTO attendance_windows')) {
        const window = {
          id: ++sequences.attendance_windows,
          teacher_id: params[0],
          class_period: params[1],
          attendance_date: params[2],
          window_start_time: params[3],
          window_end_time: params[4],
          status: params[5] || 'open',
          created_at: new Date().toISOString()
        };
        mockData.attendance_windows.push(window);
        return { lastID: window.id, changes: 1 };
      }
      if (sql.includes('INSERT INTO attendance_log')) {
        const log = {
          id: ++sequences.attendance_log,
          student_roll: params[0],
          window_id: params[1],
          teacher_ip: params[2],
          student_ip: params[3],
          attendance_date: params[4],
          period_number: params[5],
          logged_in_at: new Date().toISOString()
        };
        mockData.attendance_log.push(log);
        return { lastID: log.id, changes: 1 };
      }
      // UPDATE operations
      if (sql.includes('UPDATE teachers SET')) {
        const teacher = mockData.teachers.find(t => t.id == params[1]);
        if (teacher) {
          if (sql.includes('current_ip')) teacher.current_ip = params[0];
          if (sql.includes('last_login')) teacher.last_login = 'NOW()'; // Mock
          return { changes: 1 };
        }
      }
      return { changes: 0 };
    },

    getAsync: async function(sql, params = []) {
      // SELECT operations
      if (sql.includes('FROM teachers WHERE id =')) {
        return mockData.teachers.find(t => t.id == params[0]) || null;
      }
      if (sql.includes('FROM teachers WHERE email =') && sql.includes('password =')) {
        return mockData.teachers.find(t => t.email === params[0] && t.password === params[1]) || null;
      }
      if (sql.includes('FROM students WHERE roll_number =') && sql.includes('password =')) {
        return mockData.students.find(s => s.roll_number === params[0] && s.password === params[1]) || null;
      }
      if (sql.includes('FROM students WHERE roll_number =') && !sql.includes('password')) {
        return mockData.students.find(s => s.roll_number === params[0]) || null;
      }
      if (sql.includes('FROM students WHERE id =')) {
        return mockData.students.find(s => s.id == params[0]) || null;
      }
      if (sql.includes('FROM attendance WHERE student_roll =') && sql.includes('attendance_date =') && sql.includes('period_number =')) {
        return mockData.attendance.find(a => a.student_roll === params[0] && a.attendance_date === params[1] && a.period_number == params[2]) || null;
      }
      if (sql.includes('FROM attendance_windows WHERE teacher_id =') && sql.includes('class_period =') && sql.includes('attendance_date =')) {
        return mockData.attendance_windows.find(w => w.teacher_id == params[0] && w.class_period == params[1] && w.attendance_date === params[2]) || null;
      }
      if (sql.includes('FROM attendance_log WHERE student_roll =') && sql.includes('window_id =')) {
        return mockData.attendance_log.find(l => l.student_roll === params[0] && l.window_id == params[1]) || null;
      }
      return null;
    },

    allAsync: async function(sql, params = []) {
      // SELECT all operations
      if (sql.includes('FROM students WHERE approval_status = 1')) {
        return mockData.students.filter(s => s.approval_status === 1);
      }
      if (sql.includes('FROM attendance WHERE student_roll =')) {
        return mockData.attendance.filter(a => a.student_roll === params[0]);
      }
      if (sql.includes('FROM attendance_windows WHERE status =')) {
        return mockData.attendance_windows.filter(w => w.status === params[0]);
      }
      if (sql.includes('FROM attendance_log WHERE window_id =')) {
        return mockData.attendance_log.filter(l => l.window_id == params[0]);
      }
      return [];
    },

    // Legacy callback-style run method for database initialization
    run: function(sql, params = [], callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      // For initialization, just call callback with no error
      if (callback) callback(null);
    }
  };

  // Mock pool (not used but for compatibility)
  const pool = null;

  module.exports = { db, pool };

} else {
  // PostgreSQL implementation (existing code)
  // Build connection configuration using either DATABASE_URL (preferred) or individual vars
  let poolConfig;

  if (process.env.DATABASE_URL) {
    // Render (and many hosts) provide a full connection string
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    console.log('Using DATABASE_URL for connection');
  } else {
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

    poolConfig = {
      user,
      password,
      host,
      port,
      database,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL error:', err);
  });

  // Helper functions for consistency with old SQLite code
  db = {};

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
}

