const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static('./'));

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create students table with approval status (only if it doesn't exist)
    // NOTE: Table is NOT dropped on restart to preserve student data
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          roll_number TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          image BLOB,
          face_descriptor TEXT,
          approval_status INTEGER DEFAULT 0,
          registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create attendance table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_roll TEXT NOT NULL,
          attendance_date DATE NOT NULL,
          period_number INTEGER NOT NULL,
          status TEXT DEFAULT 'A',
          marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_roll) REFERENCES students(roll_number),
          UNIQUE(student_roll, attendance_date, period_number)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create attendance_windows table for teacher-controlled attendance windows
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_windows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          class_period INTEGER NOT NULL,
          attendance_date DATE NOT NULL,
          window_start_time DATETIME NOT NULL,
          window_end_time DATETIME NOT NULL,
          status TEXT DEFAULT 'open',
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(class_period, attendance_date)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create attendance_log table for audit trail
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_roll TEXT NOT NULL,
          window_id INTEGER NOT NULL,
          attendance_date DATE NOT NULL,
          period_number INTEGER NOT NULL,
          logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_roll) REFERENCES students(roll_number),
          FOREIGN KEY (window_id) REFERENCES attendance_windows(id),
          UNIQUE(student_roll, window_id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Routes

// 1. Register Student
app.post('/api/register', async (req, res) => {
  try {
    const { name, roll, password, image, faceDescriptor } = req.body;
    
    // Validate inputs
    if (!name || !roll || !password || !image) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required!' 
      });
    }

    try {
      // Check if roll number already exists
      const existing = await db.getAsync(
        'SELECT * FROM students WHERE roll_number = ?',
        [roll]
      );
      
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'Roll number already registered!' 
        });
      }
      
      // Insert new student with face descriptor (approval_status: 0 = pending approval)
      await db.runAsync(
        'INSERT INTO students (name, roll_number, password, image, face_descriptor, approval_status) VALUES (?, ?, ?, ?, ?, 0)',
        [name, roll, password, image, faceDescriptor || null]
      );
      
      res.json({ 
        success: true, 
        message: `Student ${name} registered successfully! Waiting for admin approval.` 
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      res.status(500).json({ 
        success: false, 
        message: 'Database error: ' + dbError.message 
      });
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed: ' + error.message 
    });
  }
});

// 2. Login Student
app.post('/api/login', async (req, res) => {
  try {
    const { roll, password } = req.body;
    
    // Validate inputs
    if (!roll || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number and password are required!' 
      });
    }

    try {
      // Find student
      const student = await db.getAsync(
        'SELECT id, name, roll_number, approval_status FROM students WHERE roll_number = ? AND password = ?',
        [roll, password]
      );
      
      if (!student) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid roll number or password!' 
        });
      }
      
      // Check approval status
      console.log('Student found. Approval status:', student.approval_status);
      
      if (student.approval_status === 0) {
        // Pending approval
        console.log('Waiting for admin approval - status is 0 (pending)');
        return res.status(403).json({ 
          success: false, 
          message: 'Waiting for admin approval',
          approvalStatus: 'pending'
        });
      }
      
      // If approval_status = 1, student is approved and can proceed
      res.json({ 
        success: true, 
        message: `Welcome ${student.name}!`,
        student: {
          id: student.id,
          name: student.name,
          roll: student.roll_number
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed: ' + dbError.message 
      });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed: ' + error.message 
    });
  }
});

// 3. Get All Approved Students (for viewing registered students)
app.get('/api/students', async (req, res) => {
  try {
    console.log('Fetching all approved students...');
    const students = await db.allAsync(
      'SELECT id, name, roll_number, registered_at FROM students WHERE approval_status = 1 ORDER BY registered_at DESC'
    );
    
    console.log('Approved students found:', students.length);
    
    res.json({ 
      success: true, 
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students: ' + error.message 
    });
  }
});

// 4. Get Student by Roll Number (with image)
app.get('/api/student/:roll', async (req, res) => {
  try {
    const { roll } = req.params;
    
    const student = await db.getAsync(
      'SELECT id, name, roll_number, image, registered_at FROM students WHERE roll_number = ?',
      [roll]
    );
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found.' 
      });
    }
    
    // Return image as-is (already base64 from registration)
    let imageBase64 = '';
    if (student.image) {
      // Check if it's already base64 string or needs conversion
      if (typeof student.image === 'string') {
        imageBase64 = student.image;
      } else {
        const buffer = Buffer.isBuffer(student.image) ? student.image : Buffer.from(student.image, 'binary');
        imageBase64 = buffer.toString('base64');
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        id: student.id,
        name: student.name,
        roll: student.roll_number,
        image: imageBase64,
        registeredAt: student.registered_at
      }
    });
  } catch (error) {
    console.error('Error fetching student:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch student: ' + error.message 
    });
  }
});

// 5. Get Student Face Descriptor (for login verification)
app.get('/api/student/:roll/face', async (req, res) => {
  try {
    const { roll } = req.params;
    
    const student = await db.getAsync(
      'SELECT face_descriptor FROM students WHERE roll_number = ?',
      [roll]
    );
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found.' 
      });
    }
    
    // Parse face descriptor if it exists
    let descriptor = null;
    if (student.face_descriptor) {
      try {
        descriptor = JSON.parse(student.face_descriptor);
      } catch (e) {
        console.error('Error parsing face descriptor:', e);
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        hasFaceDescriptor: !!descriptor,
        descriptor: descriptor
      }
    });
  } catch (error) {
    console.error('Error fetching face descriptor:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch face descriptor: ' + error.message 
    });
  }
});

// 6. Get pending students (for admin approval)
app.get('/api/students/pending/list', async (req, res) => {
  try {
    const students = await db.allAsync(
      'SELECT id, name, roll_number, registered_at, approval_status FROM students WHERE approval_status = 0 ORDER BY registered_at DESC'
    );
    
    res.json({ 
      success: true, 
      data: students
    });
  } catch (error) {
    console.error('Error fetching pending students:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending students: ' + error.message 
    });
  }
});

// 7. Approve student registration
app.post('/api/student/:roll/approve', async (req, res) => {
  try {
    const { roll } = req.params;
    
    const student = await db.getAsync(
      'SELECT id FROM students WHERE roll_number = ?',
      [roll]
    );
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    await db.runAsync(
      'UPDATE students SET approval_status = 1 WHERE roll_number = ?',
      [roll]
    );
    
    res.json({ 
      success: true, 
      message: `Student ${roll} approved successfully!` 
    });
  } catch (error) {
    console.error('Error approving student:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve student: ' + error.message 
    });
  }
});

// 8. Reject student registration (DELETE from database)
app.post('/api/student/:roll/reject', async (req, res) => {
  try {
    const { roll } = req.params;
    
    console.log('===== REJECT ENDPOINT CALLED =====');
    console.log('Roll number to reject:', roll);
    
    const student = await db.getAsync(
      'SELECT id FROM students WHERE roll_number = ?',
      [roll]
    );
    
    console.log('Student found:', student);
    
    if (!student) {
      console.error('❌ Student not found:', roll);
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    console.log('About to DELETE student record...');
    
    // Delete the student record completely
    const deleteResult = await db.runAsync(
      'DELETE FROM students WHERE roll_number = ?',
      [roll]
    );
    
    console.log('✓ Delete result:', deleteResult);
    console.log(`✓ Student ${roll} rejected and deleted from database`);
    
    res.json({ 
      success: true, 
      message: `Student ${roll} rejected and removed from database. They must register again.` 
    });
  } catch (error) {
    console.error('❌ Error rejecting student:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject student: ' + error.message 
    });
  }
});

// ===== ATTENDANCE ENDPOINTS =====

// 13. Get all approved students
app.get('/api/attendance/students', async (req, res) => {
  try {
    const students = await db.allAsync(
      'SELECT roll_number, name, image FROM students WHERE approval_status = 1 ORDER BY roll_number'
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Get attendance for a specific day (only returns marked records, missing = absent)
app.get('/api/attendance/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    // Only fetch records that have been marked
    const attendance = await db.allAsync(`
      SELECT student_roll, attendance_date, period_number, status 
      FROM attendance 
      WHERE attendance_date = ?
      ORDER BY period_number, student_roll
    `, [date]);
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Mark/Update attendance for a student (only creates records when marked as Present)
app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { student_roll, attendance_date, period_number, status } = req.body;
    
    if (!student_roll || !attendance_date || !period_number || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if student exists and is approved
    const student = await db.getAsync(
      'SELECT roll_number FROM students WHERE roll_number = ? AND approval_status = 1',
      [student_roll]
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found or not approved' });
    }

    // Only store records when status is 'P' (Present)
    // Delete records when status is 'A' (Absent) - missing records default to absent
    if (status === 'P') {
      // Insert or update attendance record for Present
      await db.runAsync(`
        INSERT INTO attendance (student_roll, attendance_date, period_number, status)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_roll, attendance_date, period_number) 
        DO UPDATE SET status = 'P', marked_at = CURRENT_TIMESTAMP
      `, [student_roll, attendance_date, period_number, status]);
    } else if (status === 'A') {
      // Delete attendance record for Absent (no need to store absent records)
      await db.runAsync(
        'DELETE FROM attendance WHERE student_roll = ? AND attendance_date = ? AND period_number = ?',
        [student_roll, attendance_date, period_number]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ATTENDANCE WINDOW ENDPOINTS (Teacher-controlled) =====

// 15a. Start attendance window (Teacher clicks "Start Attendance")
app.post('/api/attendance-window/start', async (req, res) => {
  try {
    const { period_number, teacher_id } = req.body;

    if (!period_number || !teacher_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'period_number and teacher_id are required' 
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // Convert to minutes

    // Define period timings
    const periods = [
      { num: 1, start: 9 * 60 + 30, end: 10 * 60 + 20 },
      { num: 2, start: 10 * 60 + 20, end: 11 * 60 + 10 },
      { num: 3, start: 11 * 60 + 10, end: 12 * 60 },
      { num: 4, start: 12 * 60, end: 12 * 60 + 50 },
      { num: 5, start: 13 * 60 + 40, end: 14 * 60 + 30 },
      { num: 6, start: 14 * 60 + 30, end: 15 * 60 + 20 },
      { num: 7, start: 15 * 60 + 20, end: 16 * 60 + 10 }
    ];

    // Check if current time is within a class period
    let currentPeriod = null;
    for (const period of periods) {
      if (currentTime >= period.start && currentTime < period.end) {
        currentPeriod = period.num;
        break;
      }
    }

    // NEW VALIDATION: Only allow starting window for current period
    if (!currentPeriod) {
      return res.status(400).json({
        success: false,
        error: 'No class period is running now. Cannot start attendance window outside class hours.'
      });
    }

    if (period_number !== currentPeriod) {
      return res.status(400).json({
        success: false,
        error: `You can only start attendance for Period ${currentPeriod}. The requested period ${period_number} is not running now.`
      });
    }

    const windowEndTime = new Date(now.getTime() + 5 * 60000); // 5 minutes from now

    // Check if window already exists for this period today
    const existing = await db.getAsync(
      'SELECT id, status FROM attendance_windows WHERE class_period = ? AND attendance_date = ?',
      [period_number, today]
    );

    if (existing) {
      if (existing.status === 'open') {
        return res.status(400).json({
          success: false,
          error: 'Attendance window is already open for this period',
          window_id: existing.id
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Attendance window is already closed for this period. Cannot reopen.'
        });
      }
    }

    // Create new attendance window
    const result = await db.runAsync(
      `INSERT INTO attendance_windows 
       (class_period, attendance_date, window_start_time, window_end_time, status, created_by) 
       VALUES (?, ?, ?, ?, 'open', ?)`,
      [period_number, today, now.toISOString(), windowEndTime.toISOString(), teacher_id]
    );

    res.json({
      success: true,
      message: `Attendance window opened for Period ${period_number}. Students have 5 minutes to log in.`,
      window_id: result.lastID,
      period_number: period_number,
      window_start_time: now.toISOString(),
      window_end_time: windowEndTime.toISOString(),
      duration_minutes: 5
    });
  } catch (error) {
    console.error('Error starting attendance window:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start attendance window: ' + error.message 
    });
  }
});

// 15b. Get active attendance window for current period
app.get('/api/attendance-window/active/:period_number', async (req, res) => {
  try {
    const { period_number } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const window = await db.getAsync(
      `SELECT id, class_period, window_start_time, window_end_time, status 
       FROM attendance_windows 
       WHERE class_period = ? AND attendance_date = ? AND status = 'open'`,
      [period_number, today]
    );

    if (!window) {
      return res.json({
        success: false,
        error: 'No active attendance window for this period',
        window_active: false
      });
    }

    const now = new Date();
    const endTime = new Date(window.window_end_time);
    const isActive = now < endTime;

    if (!isActive) {
      // Auto-close window if time has passed
      await db.runAsync(
        'UPDATE attendance_windows SET status = ? WHERE id = ?',
        ['closed', window.id]
      );

      return res.json({
        success: false,
        error: 'Attendance window has closed for this period',
        window_active: false
      });
    }

    const remainingTime = Math.round((endTime - now) / 1000); // seconds

    res.json({
      success: true,
      window_active: true,
      window_id: window.id,
      period_number: window.class_period,
      window_end_time: window.window_end_time,
      remaining_seconds: remainingTime
    });
  } catch (error) {
    console.error('Error fetching active window:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch window status: ' + error.message 
    });
  }
});

// 15c. Close attendance window (if teacher wants to close it early)
app.post('/api/attendance-window/close/:window_id', async (req, res) => {
  try {
    const { window_id } = req.params;

    const window = await db.getAsync(
      'SELECT id, class_period FROM attendance_windows WHERE id = ?',
      [window_id]
    );

    if (!window) {
      return res.status(404).json({ 
        success: false, 
        error: 'Window not found' 
      });
    }

    await db.runAsync(
      'UPDATE attendance_windows SET status = ? WHERE id = ?',
      ['closed', window_id]
    );

    res.json({
      success: true,
      message: `Attendance window closed for Period ${window.class_period}`
    });
  } catch (error) {
    console.error('Error closing window:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to close window: ' + error.message 
    });
  }
});

// 15d. Get attendance logs for a window
app.get('/api/attendance-window/:window_id/logs', async (req, res) => {
  try {
    const { window_id } = req.params;

    const logs = await db.allAsync(
      `SELECT al.student_roll, al.logged_in_at, s.name 
       FROM attendance_log al
       JOIN students s ON al.student_roll = s.roll_number
       WHERE al.window_id = ?
       ORDER BY al.logged_in_at ASC`,
      [window_id]
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching attendance logs:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch logs: ' + error.message 
    });
  }
});

// 16. Auto-mark attendance on student login (detects current period & checks attendance window)
app.post('/api/attendance/auto-mark', async (req, res) => {
  try {
    const { student_roll } = req.body;

    if (!student_roll) {
      return res.status(400).json({ error: 'student_roll is required' });
    }

    // Check if student exists and is approved
    const student = await db.getAsync(
      'SELECT roll_number FROM students WHERE roll_number = ? AND approval_status = 1',
      [student_roll]
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found or not approved' });
    }

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // Convert to minutes for easier comparison

    // Define period timings (in minutes from midnight)
    const periods = [
      { num: 1, start: 9 * 60 + 30, end: 10 * 60 + 20 },  // 9:30-10:20
      { num: 2, start: 10 * 60 + 20, end: 11 * 60 + 10 }, // 10:20-11:10
      { num: 3, start: 11 * 60 + 10, end: 12 * 60 },      // 11:10-12:00
      { num: 4, start: 12 * 60, end: 12 * 60 + 50 },      // 12:00-12:50
      { num: 5, start: 13 * 60 + 40, end: 14 * 60 + 30 }, // 1:40-2:30 (13:40-14:30)
      { num: 6, start: 14 * 60 + 30, end: 15 * 60 + 20 }, // 2:30-3:20 (14:30-15:20)
      { num: 7, start: 15 * 60 + 20, end: 16 * 60 + 10 }  // 3:20-4:10 (15:20-16:10)
    ];

    // Find current period
    let currentPeriod = null;
    for (const period of periods) {
      if (currentTime >= period.start && currentTime < period.end) {
        currentPeriod = period.num;
        break;
      }
    }

    // If no period is active (outside class hours)
    if (currentPeriod === null) {
      return res.status(400).json({ 
        error: 'Attendance can only be marked during class periods',
        outside_hours: true
      });
    }

    // ===== NEW: CHECK FOR ACTIVE ATTENDANCE WINDOW =====
    const activeWindow = await db.getAsync(
      `SELECT id, window_end_time FROM attendance_windows 
       WHERE class_period = ? AND attendance_date = ? AND status = 'open'`,
      [currentPeriod, today]
    );

    if (!activeWindow) {
      return res.status(400).json({
        success: false,
        error: 'Attendance window is closed for this period',
        window_closed: true,
        outside_hours: false
      });
    }

    // Check if window has expired
    const endTime = new Date(activeWindow.window_end_time);
    if (now > endTime) {
      // Auto-close the window
      await db.runAsync(
        'UPDATE attendance_windows SET status = ? WHERE id = ?',
        ['closed', activeWindow.id]
      );

      return res.status(400).json({
        success: false,
        error: 'Attendance window has closed for this period',
        window_closed: true,
        outside_hours: false
      });
    }

    // Check if already marked present for this period today
    const existing = await db.getAsync(
      'SELECT id FROM attendance WHERE student_roll = ? AND attendance_date = ? AND period_number = ?',
      [student_roll, today, currentPeriod]
    );

    if (existing) {
      return res.status(400).json({ 
        error: 'You have already been marked present for this period',
        already_marked: true
      });
    }

    // Mark attendance
    await db.runAsync(
      'INSERT INTO attendance (student_roll, attendance_date, period_number, status) VALUES (?, ?, ?, ?)',
      [student_roll, today, currentPeriod, 'P']
    );

    // Log student login in attendance_log for audit trail
    await db.runAsync(
      'INSERT INTO attendance_log (student_roll, window_id, attendance_date, period_number) VALUES (?, ?, ?, ?)',
      [student_roll, activeWindow.id, today, currentPeriod]
    );

    res.json({ 
      success: true, 
      message: `Attendance marked successfully for Period ${currentPeriod}`,
      period: currentPeriod,
      date: today
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initializeDatabase();
});

// Debug endpoint - check what's in database
app.get('/api/debug/student/:roll', async (req, res) => {
  try {
    const { roll } = req.params;
    const student = await db.getAsync(
      'SELECT image FROM students WHERE roll_number = ?',
      [roll]
    );
    
    if (student && student.image) {
      const imageType = typeof student.image;
      const imageLength = student.image.length;
      const first100 = student.image.toString().substring(0, 100);
      
      res.json({ 
        type: imageType,
        length: imageLength,
        first100: first100,
        startsWithBase64: first100.includes('/9j') || first100.includes('iVBO')
      });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

