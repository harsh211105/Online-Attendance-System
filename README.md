# Smart Attendance System

A complete face recognition-based attendance management system with real-time attendance windows for teachers and face verification for students.

## Quick Start

### Installation
```bash
npm install
npm start
```
Server runs on `https://localhost:5000`

### First Time Setup
1. **Teacher Login**: `http://localhost:5000` (username: teacher, password: teacher)
2. **Student Registration**: `http://localhost:5000/register.html`
3. **Student Face Login**: `http://localhost:5000/face-login.html`

---

## System Architecture

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Backend Server | `server.js` | API endpoints, session management |
| Database Layer | `db.js` | SQLite database operations |
| Teacher Dashboard | `attendance-control.html` | Start/manage attendance windows |
| Student Login | `face-login.html` | Face verification & attendance marking |
| Registration | `register.html` | Capture face descriptor & register |
| Student Dashboard | `student-dashboard.html` | View attendance records |

### Architecture Flow
```
User Browser (HTML/JavaScript)
    ↓
Express Server (Node.js)
    ↓
SQLite Database
```

---

## How It Works

### 1. Student Registration

**Flow:**
1. User fills form (Name, Roll Number, Password)
2. Camera captures a photo
3. Face-API extracts face descriptor (128-dimensional array)
4. Data stored in database: name, roll_number, password, face_descriptor, photo

**Key Technical Detail:**
- Uses canvas directly (no JPEG compression) to preserve face detection accuracy
- Face descriptor is a 128-length array unique to each face

### 2. Teacher Attendance Window

**Flow:**
1. Teacher opens `/attendance-control.html`
2. Selects class period (1-7) and clicks "Start Attendance Window"
3. Window stays open for 5 minutes
4. Teacher can view real-time logs of students marking attendance
5. Window auto-closes or can be manually closed (cannot reopen same period)

**Key Rules:**
- Only 1 window per period per day
- Once closed, cannot be reopened
- Students must login DURING window to be marked present

### 3. Student Face Verification Login

**Flow:**
1. Student logs in with Roll Number + Password
2. Redirected to face verification page
3. Camera captures live frame
4. Face-API calculates Euclidean distance between stored & live descriptors
5. If distance < 0.4 → Match (attendance marked if window open) ✓
6. If distance ≥ 0.4 → No match, student gets 3 retries ✗

**Distance Calculation:**
```
distance = √(Σ(stored[i] - live[i])²)  where i = 0 to 127
```

**Threshold:** 0.4 (configurable in `face-login.html`)

### 4. Attendance Records

**Student can view:**
- Attendance marked in open windows
- Attendance history
- Present/Absent status per period

---

## API Endpoints

### Attendance Window Management
```
POST /api/attendance-window/start
  Body: { period_number: 2, teacher_id: "teacher_1" }
  Returns: { window_id, status, window_end_time }

GET /api/attendance-window/active/:period
  Returns: { window_active: true/false, remaining_seconds }

POST /api/attendance-window/close/:window_id
  Returns: { success: true/false }

GET /api/attendance-window/:window_id/logs
  Returns: [ { student_roll, name, logged_in_at } ]
```

### Student Authentication
```
POST /api/register
  Body: { name, roll_number, password, face_descriptor, image }
  Returns: { success, message }

GET /api/student/:roll/face
  Returns: { face_descriptor }

POST /api/face-verify
  Body: { roll_number, distance }
  Returns: { match, attendance_marked }
```

---

## Database Schema

### Students Table
```
id, name, roll_number, password, image (base64), 
face_descriptor (JSON array), approval_status, created_at
```

### Attendance Window Table
```
window_id, period_number, teacher_id, start_time, 
end_time, status (open/closed), created_at
```

### Attendance Logs Table
```
log_id, window_id, student_roll, student_name, 
logged_in_at, distance_score
```

---

## Configuration

### Class Periods (in `server.js`)
- Period 1: 9:30-10:20
- Period 2: 10:20-11:10
- Period 3: 11:10-12:00
- Period 4: 12:00-12:50
- Period 5: 12:50-1:40
- Period 6: 1:40-2:30
- Period 7: 2:30-3:20

### Face Recognition Thresholds (in `face-login.html`)
- `FACE_THRESHOLD: 0.4` - Distance threshold for face match
- `MAX_RETRIES: 3` - Number of verification attempts allowed
- `WINDOW_DURATION: 300000` - Attendance window duration (5 minutes)

---

## Key Features

✅ **Face Recognition** - Uses face-api.js for accurate face matching
✅ **Attendance Windows** - Teacher-controlled time windows for marking attendance
✅ **Real-time Logs** - View who marked attendance in real-time
✅ **Student Dashboard** - View attendance records
✅ **Security** - Password + face verification for authentication
✅ **Offline Support** - Works without internet in offline mode

---

## Troubleshooting

### Face Not Detected
- Ensure good lighting and clear camera
- Keep face centered in camera frame
- Remove glasses or face coverings

### Face Verification Failed
- Check if stored descriptor is valid
- Ensure same lighting conditions during registration and login
- Try with different angles (slight head movements)

### Attendance Not Marked
- Ensure attendance window is still OPEN
- Check if face verified successfully
- Verify database connectivity

### Server Issues
- Delete `attendance.db` and restart to reset database
- Ensure Node.js and npm are installed
- Check port 5000 is not in use

---

## Security Notes

1. **Face Descriptor Storage**: 128-dimensional arrays are not reversible to images
2. **Password Storage**: Stored with basic security (can be enhanced with bcrypt)
3. **Session Management**: Server-side session tracking
4. **HTTPS**: All connections use SSL/TLS in production

---

## Development

### Start Server
```bash
npm start
```

### Access Points
- **Admin/Teacher**: `http://localhost:5000`
- **Student Registration**: `http://localhost:5000/register.html`
- **Face Login**: `http://localhost:5000/face-login.html`
- **Dashboard**: `http://localhost:5000/student-dashboard.html`

### Main Dependencies
- Express.js - Web framework
- SQLite3 - Database
- face-api.js - Face detection & recognition
- TensorFlow.js - ML backend

---

## Project Structure
```
├── server.js                    # Main server & API endpoints
├── db.js                        # Database initialization & queries
├── app.js                       # Face detection logic
├── styles.css                   # Global styles
├── index.html                   # Dashboard
├── register.html                # Student registration
├── face-login.html              # Face verification login
├── attendance-control.html      # Teacher attendance window control
├── student-dashboard.html       # Student records view
├── attendance.db                # SQLite database
└── assets/                      # Models & static files
```

---

**System Status**: ✅ Fully Functional  
**Last Updated**: February 2, 2026
