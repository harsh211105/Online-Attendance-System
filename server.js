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
    // Drop old table if exists (for migration to new schema)
    await new Promise((resolve) => {
      db.run(`DROP TABLE IF EXISTS students`, (err) => {
        if (err) console.log('No old table to drop');
        resolve();
      });
    });

    // Create students table with approval status
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
      
      // Insert new student with face descriptor (approval_status: 1 = approved)
      await db.runAsync(
        'INSERT INTO students (name, roll_number, password, image, face_descriptor, approval_status) VALUES (?, ?, ?, ?, ?, 1)',
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
        console.log('Approving rejection - status is 0 (pending)');
        return res.status(403).json({ 
          success: false, 
          message: 'Waiting for admin approval',
          approvalStatus: 'pending'
        });
      } else if (student.approval_status === -1) {
        // Rejected
        console.log('Student rejected - status is -1');
        return res.status(403).json({ 
          success: false, 
          message: 'Your registration was rejected. Please register again.',
          approvalStatus: 'rejected'
        });
      }
      
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

// 3. Get All Students (for viewing registered students)
app.get('/api/students', async (req, res) => {
  try {
    console.log('Fetching all students...');
    const students = await db.allAsync(
      'SELECT id, name, roll_number, registered_at FROM students ORDER BY registered_at DESC'
    );
    
    console.log('Students found:', students.length);
    
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
      'SELECT id, name, roll_number, registered_at, approval_status FROM students WHERE approval_status != 1 ORDER BY registered_at DESC'
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

// 8. Reject student registration
app.post('/api/student/:roll/reject', async (req, res) => {
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
      'UPDATE students SET approval_status = -1 WHERE roll_number = ?',
      [roll]
    );
    
    res.json({ 
      success: true, 
      message: `Student ${roll} rejected successfully!` 
    });
  } catch (error) {
    console.error('Error rejecting student:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject student: ' + error.message 
    });
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

