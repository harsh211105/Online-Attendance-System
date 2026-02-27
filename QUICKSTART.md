# Quick Start Guide

## Local Development Setup

### With PostgreSQL

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostgreSQL**:
   ```bash
   # Create local PostgreSQL database
   psql -U postgres
   CREATE DATABASE attendance_system;
   CREATE USER attendance_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE attendance_system TO attendance_user;
   ```

3. **Create .env file**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   DATABASE_URL=postgresql://attendance_user:password123@localhost:5432/attendance_system
   NODE_ENV=development
   PORT=5000
   ```

4. **Start server**:
   ```bash
   npm start
   ```

5. **Access the app**:
   - Local: `http://localhost:5000`
   - From phone on same network: `http://192.168.X.X:5000` (replace with your PC IP)

---

## Cloud Deployment (Render)

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

---

## Key Features

✅ **IP-Based Attendance Verification**
- Teacher hotspot IP captured on login
- Students must be on same network to submit attendance
- Prevents proxy/cheating

✅ **Face Recognition**
- Integrates with face-api.js
- Additional verification layer
- Prevents impersonation

✅ **Teacher Hotspot Control**
- Teacher enables attendance → hotspot active
- Only their students can mark attendance
- No global attendance window

✅ **Cloud Ready**
- PostgreSQL for scalability
- Environment-based config
- Easy Render deployment

---

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/register` | Student registration |
| POST | `/api/login` | Student login |
| POST | `/api/teacher-login` | Teacher login (captures IP) |

### Attendance

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/attendance/mark` | Submit attendance (IP verified) |
| GET | `/api/attendance/students` | Get student list |
| GET | `/api/attendance/day/:date` | Get day's attendance |
| POST | `/api/attendance-window/start` | Teacher starts window |

### Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pending-students` | List pending approvals |
| POST | `/api/approve/:roll` | Approve student |
| POST | `/api/reject/:roll` | Reject student |

---

## Database Schema

### teachers
```
id (SERIAL PRIMARY KEY)
name, email, password
approval_status (0=pending, 1=approved)
current_ip (VARCHAR 45) - Updated on each login
last_login (TIMESTAMP)
created_at (TIMESTAMP)
```

### students
```
id, roll_number (UNIQUE), password
name, image (BYTEA), face_descriptor
approval_status (0=pending, 1=approved)
registered_at (TIMESTAMP)
```

### attendance
```
id, student_roll, attendance_date, period_number
status ('P'=Present, 'A'=Absent)
marked_at (TIMESTAMP)
UNIQUE(student_roll, attendance_date, period_number)
```

### attendance_log
```
Tracks IP addresses for compliance/audit
Stores both student_ip and teacher_ip on submission
```

---

## Troubleshooting

**Server won't start:**
- Check `node server.js` for specific errors
- Ensure PostgreSQL is running
- Verify .env DATABASE_URL is correct

**Students can't mark attendance:**
- Verify they have same IP as teacher
- Check teacher is logged in (`current_ip` is set)
- Face verification must pass

**Database errors:**
- Check PostgreSQL connection
- Verify user privileges: `GRANT ALL ON attendance_system.* TO attendance_user;`
- Create missing tables by restarting server

---

## Next Steps

1. ✅ Set up local PostgreSQL
2. ✅ Install dependencies (`npm install`)
3. ✅ Configure `.env`
4. ✅ Start server (`npm start`)
5. 🔄 Test with student registration/login
6. 🔄 Test teacher login from phone hotspot
7. 📤 Deploy to Render (see RENDER_DEPLOYMENT.md)

**Questions?** Check RENDER_DEPLOYMENT.md or MIGRATION_GUIDE.md for detailed guides.
