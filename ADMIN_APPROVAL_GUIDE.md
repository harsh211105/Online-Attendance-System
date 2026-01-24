# Admin Approval System - How It Works

## Overview

The attendance system now has a **two-stage approval process** for security:

1. **Student Registration** - Student fills form and registers (auto-saved as PENDING)
2. **Admin Approval** - Admin reviews and approves/rejects in dashboard
3. **Student Login** - Only after admin approval can student login

---

## Status Values

```
approval_status = 0  → Pending (waiting for admin review)
approval_status = 1  → Approved (can login)
```

**Note:** Rejected students are completely DELETED from the database and must register again.

---

## Student Registration Flow

```
1. Student fills registration form
   ├─ Name, Roll, Password, Face Photo
   └─ Clicks "Register"

2. Backend saves student
   ├─ Sets approval_status = 0 (PENDING)
   ├─ Stores face descriptor
   └─ Returns: "Waiting for admin approval"

3. Student sees message
   ├─ Message: "Student registered successfully! Waiting for admin approval."
   ├─ Redirects to login page
   └─ CANNOT LOGIN YET (needs admin approval)

4. Student tries to login
   ├─ Enters credentials
   ├─ Backend checks approval_status = 0
   ├─ Returns: "Waiting for admin approval"
   └─ Shows alert: "Your registration is pending admin approval"
```

---

## Admin Dashboard - Pending Approvals

### Location
- URL: `http://localhost:5000/dashboard.html`
- Admin Login: ID `0`, Password `1234`

### What Admin Sees

**Pending Approvals Section:**
- Shows all students with `approval_status = 0` or `-1`
- Each student has:
  - Name
  - Roll Number
  - Registration Date
  - Status (Pending / Rejected)
  - **Approve Button** (green) - Changes status to 1
  - **Reject Button** (red) - Changes status to -1

**Approved Students Section:**
- Shows all students with `approval_status = 1`
- These students can login

### Admin Actions

#### Approve Student
```
1. Admin clicks "Approve" button next to student
2. Backend updates: approval_status = 1
3. Student can now login
4. List refreshes automatically
```

#### Reject Student
```
1. Admin clicks "Reject" button next to student
2. Backend DELETES student record from database completely
3. Student record no longer exists
4. When student tries to login: "Invalid roll number or password"
5. Student must register again from scratch
```

---

## Approval Endpoints (Backend)

### Get Pending Students
```
GET /api/students/pending/list

Returns students WHERE approval_status != 1
(Both pending and rejected)

Response:
{
  success: true,
  data: [
    {
      id: 1,
      name: "John",
      roll_number: "101",
      registered_at: "2026-01-23T10:30:00",
      approval_status: 0
    }
  ]
}
```

### Approve Student
```
POST /api/student/{roll}/approve

Changes approval_status 0 → 1

Example: POST /api/student/101/approve
```

### Reject Student
```
POST /api/student/{roll}/reject

Completely DELETES the student record from database

Example: POST /api/student/101/reject

Response: {
  success: true,
  message: "Student 101 rejected and removed from database. They must register again."
}
```

---

## Testing the Approval System

### Test 1: Register → Pending Approval
```
1. Go to http://localhost:5000/register.html
2. Fill form with:
   - Name: "Test Student"
   - Roll: "999"
   - Password: "test123"
   - Photo: Take clear face photo
3. Click Register
4. Message: "Waiting for admin approval"
5. DO NOT redirect to success page
```

**Expected Console Log:**
```
Registration result: {
  success: true,
  message: "Student 999 registered successfully! Waiting for admin approval."
}
```

### Test 2: Try Login (Should Fail)
```
1. Go to http://localhost:5000/login.html
2. Enter:
   - Roll: "999"
   - Password: "test123"
3. Click Login
4. Message: "⏳ Waiting for admin approval"
5. Alert: "Your registration is pending admin approval"
```

**Expected Console Log:**
```
Login result: {
  success: false,
  message: "Waiting for admin approval",
  approvalStatus: "pending"
}
```

### Test 3: Admin Approves Student
```
1. Go to http://localhost:5000/dashboard.html
2. Admin Login: ID=0, Password=1234
3. Find "Test Student" in "Pending Approvals" section
4. Click "Approve" button
5. List refreshes, student moves to "Approved Students"
```

### Test 4: Now Student Can Login
```
1. Go to http://localhost:5000/login.html
2. Enter:
   - Roll: "999"
   - Password: "test123"
3. Click Login
4. Message: "Welcome Test Student!"
5. Redirects to face-login.html
6. Can now proceed with face verification
```

---

## Database Queries

### Check pending students
```sql
SELECT name, roll_number, approval_status, registered_at
FROM students
WHERE approval_status = 0
ORDER BY registered_at DESC;
```

### Check approved students
```sql
SELECT name, roll_number, approval_status
FROM students
WHERE approval_status = 1;
```

### Check rejected students
```sql
SELECT name, roll_number, approval_status
FROM students
WHERE approval_status = -1;
```

### Manually approve a student (emergency)
```sql
UPDATE students
SET approval_status = 1
WHERE roll_number = '999';
```

---

## Code Changes Made

### server.js - Line 82
**Before (auto-approved):**
```javascript
approval_status = 1  // Wrong! Student could login immediately
```

**After (requires approval):**
```javascript
approval_status = 0  // Correct! Student must wait for admin approval
```

---

## Common Issues & Fixes

### Issue: New students can login without approval
**Check:** Database - `SELECT approval_status FROM students WHERE roll_number = 'ROLL';`
- If showing `1` → Student was auto-approved (bug)
- If showing `0` → Correct, student is pending

**Fix:** Update server.js line 82 to use `approval_status = 0`

### Issue: Pending approvals not showing in admin dashboard
**Check:**
1. Login as admin (ID: 0, Password: 1234)
2. Open browser console (F12)
3. Look for: `Students data: {...}`
4. Verify API endpoint returns pending students

**Debug:**
```javascript
// In browser console
AuthManager.getPendingStudents().then(s => console.log(s));
```

### Issue: Approve/Reject buttons not working
**Check:**
1. Click button, watch browser console
2. Look for network errors (F12 → Network tab)
3. Verify API endpoint:
   - `POST /api/student/{roll}/approve`
   - `POST /api/student/{roll}/reject`

---

## Security Benefits

✅ **Prevents spam registrations** - Admin reviews before access  
✅ **Allows identity verification** - Admin can check submitted photos  
✅ **Credential theft protection** - Even with password, needs admin approval  
✅ **Audit trail** - Can see who registered when  
✅ **Rejection capability** - Invalid registrations can be blocked  

---

## Configuration

### Change Auto-Approval (NOT RECOMMENDED)
To auto-approve all students (skip admin review):

**File:** `server.js` line 82
**Change:** `approval_status = 0` → `approval_status = 1`

**⚠️ WARNING:** This removes the approval security layer!

---

**Last Updated:** January 23, 2026
**Status:** ✅ Approval system is now active
