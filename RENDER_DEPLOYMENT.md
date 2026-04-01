# Render Deployment Guide

This guide explains how to deploy the Attendance System on Render.com as a full-stack application.

## Architecture

- **Frontend**: HTML/CSS/JS (served by Node.js)
- **Backend**: Express.js API
- **Database**: PostgreSQL
- **Hosting**: Render.com (single platform)

## Prerequisites

1. A [Render.com](https://render.com) account (free tier available)
2. A GitHub repository with your code (Render integrates with GitHub)
3. PostgreSQL database (Render provides free PostgreSQL)

## Step-by-Step Deployment

### 1. Prepare Your Code

Make sure you have:
- ✅ Updated `db.js` to use PostgreSQL
- ✅ Updated `server.js` with IP verification logic
- ✅ Created `.env.example` file
- ✅ Updated `package.json` with `pg` and `dotenv` dependencies

### 2. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git push -u origin main
```

### 3. Set Up Render PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Fill in:
   - **Name**: `attendance-db`
   - **Database**: `attendance_system`
   - **User**: `attendance_user`
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: 15
4. Click **Create Database**
5. **Copy the Internal Database URL** (you'll need this)

### 4. Deploy Web Service

1. In Render Dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository
3. Fill in:
   - **Name**: `attendance-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free tier (fine for testing)

### 5. Configure Environment Variables

In the Web Service settings:

1. Click **Environment**
2. Add the following variables:

   ```
   NODE_ENV=production
   DATABASE_URL=<paste your PostgreSQL Internal URL>
   PORT=5000
   ```

   Example DATABASE_URL:
   ```
   postgresql://attendance_user:PASSWORD@dpg-xxxxx-axxxxx.oregon-postgres.render.com/attendance_system
   ```

3. Click **Save Changes**

### 6. Update server.js for Production

Make sure your server listens on the PORT environment variable:

```javascript
const PORT = process.env.PORT || 5000;

let server;
if (process.env.NODE_ENV === 'production') {
  // Use HTTP on Render (Render handles HTTPS)
  const http = require('http');
  server = http.createServer(app);
} else {
  // Use HTTPS locally
  const https = require('https');
  const fs = require('fs');
  ensureCertificate();
  server = https.createServer(
    {
      key: fs.readFileSync('./server.key'),
      cert: fs.readFileSync('./server.crt')
    },
    app
  );
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
```

### 7. Verify Database Connection

The `/api/pending-students` endpoint should connect to PostgreSQL automatically on first request.

## Usage After Deployment

### Teacher/Admin Login
- **Endpoint**: `POST /api/teacher-login`
- **Body**: 
  ```json
  {
    "email": "teacher@school.com",
    "password": "password123"
  }
  ```
- **Response**: Returns `teacher` object and captures teacher's IP

### Student Login
- **Endpoint**: `POST /api/login`
- **Body**:
  ```json
  {
    "roll": "A001",
    "password": "studentpass"
  }
  ```

### Submit Attendance
- **Endpoint**: `POST /api/attendance/mark`
- **Body**:
  ```json
  {
    "student_roll": "A001",
    "attendance_date": "2024-01-15",
    "period_number": 1,
    "status": "P",
    "teacher_id": 1
  }
  ```
- **Verification**: Student IP must match teacher's current IP (from hotspot)

## Database Seeding (First Time Setup)

To add initial teachers:

```sql
INSERT INTO teachers (name, email, password, approval_status)
VALUES ('John Doe', 'john.doe@school.com', 'password123', 1);
```

Use Render's PostgreSQL console to run these commands.

## Networking Logic

### How IP-Based Attendance Works:

1. **Teacher logs in** → IP address captured from request
   - Stored in `teachers.current_ip`
   
2. **Teacher enables hotspot** → Phone connects to create local network
   
3. **Students connect to hotspot** → They get IPs on same network
   
4. **Student submits attendance** → IP checked against teacher's IP
   - Match → Attendance accepted ✅
   - Mismatch → Attendance rejected ❌

### Example Scenario:
```
Teacher hotspot IP: 192.168.1.1
Teacher login IP: 192.168.1.100  → Stored as current_ip
Students on hotspot: 192.168.1.101, 192.168.1.102, 192.168.1.103

All students' IPs fall in 192.168.1.x range → All match teacher's network!
```

## Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` is correct
- Verify PostgreSQL service is running
- Check firewall rules allow connection

### IP Verification Failing
- Ensure both teacher and student are on same network
- Check IP extraction in `getClientIP()` function
- Verify teacher has logged in (and IP stored)

### Deployment Not Starting
- Check logs in Render dashboard
- Ensure `npm install` succeeds
- Verify `package.json` has all dependencies

## Local Development

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with local PostgreSQL URL

# Start server
npm start
```

## Security Notes

- 🔒 Teacher IPs are temporary (reset on each login)
- 🔒 Face verification still required for actual attendance
- 🔒 Always use HTTPS in production (Render provides this)
- 🔒 Passwords should be hashed (consider bcrypt for production)

---

**Your app is now live!** Share the Render URL with teachers and students.
