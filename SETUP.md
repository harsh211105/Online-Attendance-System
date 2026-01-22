# Smart Attendance System - Setup Guide

## Prerequisites

1. **Node.js** - Download from https://nodejs.org/
2. **MySQL** - Download from https://dev.mysql.com/downloads/mysql/
3. **MySQL Workbench** (Optional) - For database management

---

## 🔧 Setup Instructions

### Step 1: Install Node.js Dependencies

Open PowerShell/Command Prompt in the project folder and run:

```bash
npm install
```

This will install:
- express (web framework)
- mysql2 (database driver)
- cors (cross-origin requests)
- body-parser (request parsing)

### Step 2: Create MySQL Database

1. Open MySQL Command Line Client or MySQL Workbench
2. Create the database:

```sql
CREATE DATABASE attendance_system;
USE attendance_system;
```

3. The tables will be created automatically when the server starts

### Step 3: Configure Database Connection

Edit `db.js` if you have a MySQL password:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'YOUR_PASSWORD_HERE', // Change this
  database: 'attendance_system',
  // ... rest of config
});
```

### Step 4: Start the Server

Run this command in the project folder:

```bash
npm start
```

Or for development mode with auto-reload:

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:5000
Database initialized successfully!
```

### Step 5: Open Application

1. Open your browser
2. Go to: `http://localhost:5000`
3. Start registering and logging in!

---

## 📂 Project Structure

```
Attendence_System/
├── server.js           # Express server & API endpoints
├── db.js               # MySQL connection
├── package.json        # Node dependencies
├── index.html          # Home page
├── register.html       # Registration page
├── login.html          # Login page
├── dashboard.html      # Student list & dashboard
├── app.js              # Frontend API manager
└── styles.css          # All CSS styling
```

---

## 🔌 API Endpoints

### Register Student
```
POST /api/register
Body: {
  name: "John Doe",
  roll: "23",
  password: "1234",
  image: "base64-string"
}
```

### Login Student
```
POST /api/login
Body: {
  roll: "23",
  password: "1234"
}
```

### Get All Students
```
GET /api/students
```

### Get Student by Roll
```
GET /api/student/:roll
```

---

## 📊 Database Schema

### students table

| Field | Type | Notes |
|-------|------|-------|
| id | INT (AUTO_INCREMENT, PRIMARY KEY) | |
| name | VARCHAR(255) | Student name |
| roll_number | VARCHAR(50) UNIQUE | Roll number (must be unique) |
| password | VARCHAR(255) | Login password |
| image | LONGBLOB | Student photo (base64 encoded) |
| registered_at | TIMESTAMP | Registration timestamp |

---

## ✨ Features Implemented

✅ Student registration with photo capture
✅ Student login
✅ MySQL database storage
✅ Dashboard to view all students
✅ Student details with photo modal
✅ Session management
✅ API-based architecture

---

## 🐛 Troubleshooting

### "Cannot GET /"
- Make sure you're accessing `http://localhost:5000`
- Check if server is running

### "Connection error to MySQL"
- Ensure MySQL is running
- Check database credentials in `db.js`
- Database `attendance_system` should exist

### Camera permission not working
- Check browser privacy settings
- Try using https or localhost

### Large image upload slow
- Browser webcam images are typically small
- If issues persist, compress base64 images before sending

---

## 🚀 Next Steps

After this is working, Phase 2 will include:
- Attendance timer
- Face recognition
- ESP32 integration
- Attendance records
- Reports & analytics

