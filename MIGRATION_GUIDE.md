# Migration Guide: SQLite to PostgreSQL

This guide helps you migrate your existing attendance data from SQLite to PostgreSQL.

## Overview

The updated system uses PostgreSQL instead of SQLite for better scalability and cloud deployment compatibility.

## Before You Start

- ✅ Backup your `attendance.db` file
- ✅ Have PostgreSQL installed locally (or access to a PostgreSQL server)
- ✅ Have pgAdmin or psql command-line tool available

## Step 1: Export Data from SQLite

### Using Python Script

Create a file `migrate.py`:

```python
import sqlite3
import json
from datetime import datetime

# Connect to SQLite
sqlite_conn = sqlite3.connect('attendance.db')
sqlite_conn.row_factory = sqlite3.Row
cursor = sqlite_conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

exported_data = {}

for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    exported_data[table_name] = [dict(row) for row in rows]
    print(f"✅ Exported {len(rows)} rows from {table_name}")

# Save to JSON
with open('migration_data.json', 'w') as f:
    json.dump(exported_data, f, indent=2, default=str)

print("\n✅ All data exported to migration_data.json")
sqlite_conn.close()
```

Run it:
```bash
python migrate.py
```

This creates `migration_data.json` with your data.

## Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL

1. **Start PostgreSQL service**:
   ```bash
   # Windows
   net start PostgreSQL
   
   # macOS with Homebrew
   brew services start postgresql
   
   # Linux
   sudo service postgresql start
   ```

2. **Create database and user**:
   ```bash
   psql -U postgres
   ```
   
   Then in psql:
   ```sql
   CREATE DATABASE attendance_system;
   CREATE USER attendance_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_user;
   ```

3. **Create tables** (skip if already created by server startup):
   ```sql
   \c attendance_system
   
   -- Tables will be auto-created on first server startup
   -- OR run the init from server logs
   ```

### Option B: Render PostgreSQL (Cloud)

Already covered in `RENDER_DEPLOYMENT.md`

## Step 3: Create .env File

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://attendance_user:your_secure_password@localhost:5432/attendance_system
NODE_ENV=development
PORT=5000
```

## Step 4: Install Dependencies

```bash
npm install
# This installs 'pg' instead of 'sqlite3'
```

## Step 5: Run Application

First startup will create all tables automatically:

```bash
npm start
```

## Step 6: Import Your Old Data

Create a file `import_data.js`:

```javascript
const { pool } = require('./db');
const fs = require('fs');

async function importData() {
  try {
    const data = JSON.parse(fs.readFileSync('migration_data.json', 'utf-8'));
    
    // Import students
    if (data.students && data.students.length > 0) {
      for (const student of data.students) {
        await pool.query(
          `INSERT INTO students (name, roll_number, password, image, face_descriptor, approval_status, registered_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (roll_number) DO NOTHING`,
          [
            student.name,
            student.roll_number,
            student.password,
            student.image ? Buffer.from(student.image, 'binary') : null,
            student.face_descriptor,
            student.approval_status || 0,
            student.registered_at
          ]
        );
      }
      console.log(`✅ Imported ${data.students.length} students`);
    }
    
    // Import attendance
    if (data.attendance && data.attendance.length > 0) {
      for (const att of data.attendance) {
        await pool.query(
          `INSERT INTO attendance (student_roll, attendance_date, period_number, status, marked_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (student_roll, attendance_date, period_number) DO NOTHING`,
          [
            att.student_roll,
            att.attendance_date,
            att.period_number,
            att.status || 'A',
            att.marked_at
          ]
        );
      }
      console.log(`✅ Imported ${data.attendance.length} attendance records`);
    }
    
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

importData();
```

Run it:
```bash
node import_data.js
```

## Step 7: Create Teachers

Since the old system didn't have teachers, you need to add them manually.

### Via SQL:

```sql
INSERT INTO teachers (name, email, password, approval_status, current_ip)
VALUES 
  ('Mr. John Doe', 'john.doe@school.com', 'teacher123', 1, NULL),
  ('Ms. Jane Smith', 'jane.smith@school.com', 'teacher456', 1, NULL);
```

### Via API:

Use a script or directly query PostgreSQL:

```bash
psql -U attendance_user -d attendance_system
```

## Step 8: Test the System

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Test student login**:
   ```bash
   curl -X POST http://localhost:5000/api/login \
     -H "Content-Type: application/json" \
     -d '{"roll":"A001","password":"password"}'
   ```

3. **Test teacher login**:
   ```bash
   curl -X POST http://localhost:5000/api/teacher-login \
     -H "Content-Type: application/json" \
     -d '{"email":"teacher@school.com","password":"teacherpass"}'
   ```

4. **Test attendance submission with IP check**:
   ```bash
   curl -X POST http://localhost:5000/api/attendance/mark \
     -H "Content-Type: application/json" \
     -d '{
       "student_roll":"A001",
       "attendance_date":"2024-01-15",
       "period_number":1,
       "status":"P",
       "teacher_id":1
     }'
   ```

## Step 9: Verify Data Integrity

Check row counts match:

```bash
# SQLite
sqlite3 attendance.db "SELECT COUNT(*) FROM students;"
sqlite3 attendance.db "SELECT COUNT(*) FROM attendance;"

# PostgreSQL
psql -U attendance_user -d attendance_system -c "SELECT COUNT(*) FROM students;"
psql -U attendance_user -d attendance_system -c "SELECT COUNT(*) FROM attendance;"
```

## Troubleshooting

### Error: "column "image" is of type bytea"
- Image data needs to be converted from binary format
- Use `Buffer.from(base64String, 'base64')` in import script

### Error: "Duplicate key value violates unique constraint"
- Data already exists, use `ON CONFLICT DO NOTHING`
- Or manually delete duplicates: `DELETE FROM students WHERE roll_number = 'A001';`

### Error: "could not connect to server"
- Check PostgreSQL is running: `psql --version`
- Verify DATABASE_URL in `.env`
- Check firewall allows port 5432

### Error: "FATAL: role "attendance_user" does not exist"
- Create the role first:
  ```sql
  CREATE USER attendance_user WITH PASSWORD 'password';
  ```

## Rollback (Keep SQLite)

If you want to keep using SQLite, the old code is still available:

1. Revert to original `db.js` and `server.js`
2. Remove `pg` from package.json, add back `sqlite3`
3. Run `npm install`

## What's Different in PostgreSQL

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Data Types | Limited | Rich types (BYTEA for binary) |
| Concurrency | File-locked | True multi-user |
| Scalability | Local file | Server-based |
| Cloud Deploy | Difficult | Native support |
| IP Tracking | Added | Works well |
| Performance | Good for small | Excellent for scale |

---

**Your system is now PostgreSQL-powered and ready for cloud deployment!**
