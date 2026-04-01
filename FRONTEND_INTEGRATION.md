# Frontend Integration Guide

This guide explains how to update the HTML/JS frontend to support the new teacher hotspot-based attendance system.

## Overview

The frontend needs to:
1. Add a **Teacher Login** form
2. Add **Attendance submission** with teacher_id
3. Add **IP display** for debugging
4. Add **Teacher Dashboard** for hotspot management

---

## 1. Teacher Login Form

Add this to your HTML (e.g., in `teacher-login.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <title>Teacher Login - Attendance System</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .login-container {
            max-width: 400px;
            margin: 50px auto;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="email"],
        input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
        .success {
            color: green;
            margin-top: 10px;
        }
        .ip-info {
            background: #e7f3ff;
            padding: 10px;
            border-radius: 4px;
            margin-top: 15px;
            font-size: 12px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>Teacher Login</h2>
        <form id="teacher-login-form">
            <div class="form-group">
                <label for="email">Email:</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required
                    placeholder="your.email@school.com"
                >
            </div>

            <div class="form-group">
                <label for="password">Password:</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required
                    placeholder="Enter password"
                >
            </div>

            <button type="submit">Login</button>
        </form>

        <div id="message"></div>
        <div id="ip-info" class="ip-info">
            <p><strong>Your IP:</strong> <span id="current-ip">Loading...</span></p>
            <p><strong>Status:</strong> <span id="ip-status">Logged in</span></p>
        </div>
    </div>

    <script>
        // Get student's current IP and display it
        async function displayIP() {
            const ipTracker = localStorage.getItem('teacher_ip');
            if (ipTracker) {
                document.getElementById('current-ip').textContent = ipTracker;
                document.getElementById('ip-info').style.display = 'block';
            }
        }

        // Handle teacher login
        document.getElementById('teacher-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');

            try {
                const response = await fetch('/api/teacher-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store teacher info
                    localStorage.setItem('teacher_id', data.teacher.id);
                    localStorage.setItem('teacher_name', data.teacher.name);
                    localStorage.setItem('teacher_ip', data.clientIP);
                    
                    messageDiv.innerHTML = `
                        <p class="success">✅ Login successful!</p>
                        <p>Welcome, ${data.teacher.name}!</p>
                        <p style="color: #666; font-size: 12px;">
                            Your IP has been captured: ${data.clientIP}<br>
                            Students connecting to your hotspot can now mark attendance.
                        </p>
                    `;
                    
                    // Show IP info
                    document.getElementById('current-ip').textContent = data.clientIP;
                    document.getElementById('ip-info').style.display = 'block';
                    
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/teacher-dashboard.html';
                    }, 2000);
                } else {
                    messageDiv.innerHTML = `<p class="error">❌ ${data.message}</p>`;
                }
            } catch (error) {
                messageDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
            }
        });

        // Display IP on page load
        window.addEventListener('load', displayIP);
    </script>
</body>
</html>
```

---

## 2. Update Attendance Submission Form

When students submit attendance, include the `teacher_id`:

```javascript
// In your attendance submission JS (attendance.html or dashboard.html)

async function submitAttendance(studentRoll) {
    const teacherId = localStorage.getItem('teacher_id');
    
    if (!teacherId) {
        alert('❌ Error: No teacher is currently logged in.');
        return;
    }

    try {
        const response = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_roll: studentRoll,
                attendance_date: new Date().toISOString().split('T')[0],
                period_number: getCurrentPeriod(), // Your function
                status: 'P',  // Present
                teacher_id: parseInt(teacherId)  // NEW: Add teacher_id
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('✅ Attendance marked successfully!', 'success');
        } else if (response.status === 403) {
            // IP mismatch
            showNotification(
                `❌ ${data.error}\n\nYour IP: ${data.studentIP}\nExpected: ${data.expectedIP}`,
                'error'
            );
        } else {
            showNotification(`❌ ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

function showNotification(message, type) {
    // Implement based on your UI library
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Or use alert, toast, snackbar, etc.
}

function getCurrentPeriod() {
    // Return current class period (1-6)
    // Based on time or select input
    const now = new Date().getHours();
    if (now >= 9 && now < 11) return 1;
    if (now >= 11 && now < 13) return 2;
    // ... etc
    return 1;
}
```

---

## 3. Teacher Dashboard

Create `teacher-dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Teacher Dashboard - Attendance System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .dashboard {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #007bff;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .status-box {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #007bff;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row label {
            font-weight: bold;
            color: #333;
        }
        .info-row span {
            color: #666;
        }
        .ip-warning {
            background: #fff3cd;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 12px;
            color: #856404;
        }
        .actions {
            margin-top: 30px;
            display: flex;
            gap: 10px;
        }
        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        .btn-primary {
            background: #28a745;
            color: white;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-primary:hover {
            background: #218838;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .period-selector {
            margin: 20px 0;
        }
        .period-selector select {
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .students-list {
            margin-top: 20px;
        }
        .student-item {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .student-item.present {
            background: #d4edda;
            border-left: 4px solid #28a745;
        }
        .student-item.absent {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        .btn-mark {
            padding: 8px 15px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-mark:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📊 Teacher Dashboard</h1>
        </div>

        <div class="status-box">
            <div class="info-row">
                <label>Teacher:</label>
                <span id="teacher-name">Loading...</span>
            </div>
            <div class="info-row">
                <label>Your IP (Hotspot):</label>
                <span id="your-ip">Loading...</span>
            </div>
            <div class="info-row">
                <label>Session Status:</label>
                <span id="session-status">
                    <span style="color: #28a745; font-weight: bold;">🟢 ACTIVE</span>
                </span>
            </div>
            <div class="ip-warning">
                ⚠️ Students must be connected to your hotspot to mark attendance.<br>
                Only students with this IP range can submit attendance.
            </div>
        </div>

        <div class="period-selector">
            <label>Current Period:</label>
            <select id="period-select">
                <option value="1">Period 1 (9:00 - 10:30)</option>
                <option value="2" selected>Period 2 (10:30 - 12:00)</option>
                <option value="3">Period 3 (12:00 - 1:30)</option>
                <option value="4">Period 4 (1:30 - 3:00)</option>
                <option value="5">Period 5 (3:00 - 4:30)</option>
                <option value="6">Period 6 (4:30 - 6:00)</option>
            </select>
        </div>

        <div class="students-list">
            <h3>📋 Students in Period <span id="current-period">2</span></h3>
            <div id="students-table">Loading students...</div>
        </div>

        <div class="actions">
            <button class="btn-primary" onclick="startAttendance()">
                ✓ Start Attendance Window
            </button>
            <button class="btn-danger" onclick="logout()">
                🚪 Logout
            </button>
        </div>
    </div>

    <script>
        // Load teacher info on page load
        window.addEventListener('load', () => {
            const teacherName = localStorage.getItem('teacher_name');
            const teacherIP = localStorage.getItem('teacher_ip');
            
            if (!teacherName) {
                alert('Please login first');
                window.location.href = '/teacher-login.html';
                return;
            }

            document.getElementById('teacher-name').textContent = teacherName;
            document.getElementById('your-ip').textContent = teacherIP;
            
            // Load students
            loadStudents();
            
            // Update period when selection changes
            document.getElementById('period-select').addEventListener('change', (e) => {
                document.getElementById('current-period').textContent = e.target.value;
                loadStudents();
            });
        });

        async function loadStudents() {
            try {
                const response = await fetch('/api/attendance/students');
                const students = await response.json();
                
                const studentsList = students.map(student => `
                    <div class="student-item">
                        <div>
                            <strong>${student.name}</strong> (${student.roll_number})
                        </div>
                        <button class="btn-mark" onclick="markPresent('${student.roll_number}')">
                            ✓ Present
                        </button>
                    </div>
                `).join('');
                
                document.getElementById('students-table').innerHTML = studentsList || 
                    '<p>No students available</p>';
            } catch (error) {
                document.getElementById('students-table').innerHTML = 
                    `<p style="color: red;">Error loading students: ${error.message}</p>`;
            }
        }

        async function markPresent(rollNumber) {
            const teacherId = localStorage.getItem('teacher_id');
            const period = document.getElementById('period-select').value;

            try {
                const response = await fetch('/api/attendance/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_roll: rollNumber,
                        attendance_date: new Date().toISOString().split('T')[0],
                        period_number: parseInt(period),
                        status: 'P',
                        teacher_id: parseInt(teacherId)
                    })
                });

                const data = await response.json();
                if (data.success) {
                    alert(`✅ ${rollNumber} marked as present`);
                    loadStudents();  // Refresh list
                } else {
                    alert(`❌ Error: ${data.error || data.message}`);
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        }

        async function startAttendance() {
            const period = document.getElementById('period-select').value;
            const teacherId = localStorage.getItem('teacher_id');

            // Optional: Call /api/attendance-window/start
            alert(`📢 Attendance window started for Period ${period}`);
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('teacher_id');
                localStorage.removeItem('teacher_name');
                localStorage.removeItem('teacher_ip');
                window.location.href = '/teacher-login.html';
            }
        }
    </script>
</body>
</html>
```

---

## 4. Update Student Attendance Form

Modify your `attendance.html` or `student-dashboard.html`:

```javascript
// Add teacher_id to attendance submission

async function submitStudentAttendance() {
    const studentRoll = localStorage.getItem('student_roll');
    const teacherId = localStorage.getItem('teacher_id');  // NEW
    
    // Get current period
    const period = getCurrentPeriod();
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_roll: studentRoll,
                attendance_date: today,
                period_number: period,
                status: 'P',
                teacher_id: teacherId ? parseInt(teacherId) : null  // NEW
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('✅ Attendance marked!');
        } else if (response.status === 403) {
            // IP verification failed
            showError(
                `❌ ${data.error}\n\n` +
                `You: ${data.studentIP}\n` +
                `Required: ${data.expectedIP}`
            );
        } else {
            showError(`❌ ${data.error}`);
        }
    } catch (error) {
        showError(`❌ Error: ${error.message}`);
    }
}

function getCurrentPeriod() {
    // Implement logic to get current period
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 11) return 1;
    if (hour >= 11 && hour < 13) return 2;
    if (hour >= 13 && hour < 14) return 3;
    if (hour >= 14 && hour < 15) return 4;
    if (hour >= 15 && hour < 16) return 5;
    if (hour >= 16 && hour < 18) return 6;
    return 1;
}

function showSuccess(msg) {
    // Your notification method
    console.log(msg);
}

function showError(msg) {
    // Your error notification method
    console.error(msg);
}
```

---

## 5. Navigation

Update your main navigation to include teacher login:

```html
<nav>
    <a href="/">Home</a>
    <a href="/student.html">Student</a>
    <a href="/teacher-login.html">Teacher Login</a>
    <a href="/login.html">Admin</a>
</nav>
```

---

## Testing Checklist

- [ ] Teacher can login via `/api/teacher-login`
- [ ] Teacher's IP is captured and displayed
- [ ] Student sees error if not on teacher's hotspot
- [ ] Student can mark attendance if on correct hotspot
- [ ] Teacher dashboard shows student list
- [ ] Face recognition still works
- [ ] Logout clears teacher session

---

## Debugging Tips

**Check if teacher IP is stored:**
```javascript
// In browser console
localStorage.getItem('teacher_ip')
```

**Check student's current IP:**
```javascript
fetch('/api/teacher-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@school.com', password: 'pass' })
})
.then(r => r.json())
.then(d => console.log('Your IP:', d.clientIP))
```

**Check database IP:**
```sql
SELECT id, name, email, current_ip, last_login FROM teachers;
```

---

**All frontend components are now ready for hotspot-based attendance! 🎉**
