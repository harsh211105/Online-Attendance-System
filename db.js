// Database configuration with SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the project directory
const dbPath = path.join(__dirname, 'attendance.db');
const sqlite = new sqlite3.Database(dbPath);

// Enable foreign keys
sqlite.run('PRAGMA foreign_keys = ON');

// Helper functions
const db = {
  runAsync: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  getAsync: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  allAsync: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Legacy callback-style run method for database initialization
  run: function(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    sqlite.run(sql, params, callback);
  }
};

// Mock pool for compatibility (not used)
const pool = null;

module.exports = { db, pool };

