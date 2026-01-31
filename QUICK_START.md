# Quick Reference Card - Attendance Window Feature

## 🎯 Overview in 30 Seconds

**What it does:**
- Teacher opens a 5-minute attendance window during class
- Only students who log in during this window get marked present
- Prevents early login and ensures accurate class attendance

**When to use it:**
- During class time (within school hours)
- When teacher wants to take attendance
- To verify students are actually present in class

---

## 🚀 Quick Start

### For Teachers:
```
1. Go to: http://localhost:5000/attendance-control.html
2. Select class Period (1-7)
3. Click "Start Attendance Window"
4. View real-time attendance for 5 minutes
5. Window auto-closes or manually close
```

### For Students:
```
1. Normal face login: http://localhost:5000/face-login.html
2. Do face verification
3. If window open → Attendance marked ✓
4. If window closed → Error shown, no attendance marked ✗
```

---

## 📊 Files & Their Purpose

| File | Purpose | Access |
|------|---------|--------|
| `attendance-control.html` | Teacher dashboard | http://localhost:5000/attendance-control.html |
| `face-login.html` | Student login (updated) | http://localhost:5000/face-login.html |
| `attendance-window-test.html` | API testing | http://localhost:5000/attendance-window-test.html |
| `ATTENDANCE_WINDOW_GUIDE.md` | Full documentation | Reference docs |
| `FLOW_DIAGRAMS.md` | System flow visuals | Visual reference |

---

## 🔑 Key Concepts

### Window Status
- **OPEN** ✓: Students can log in and get marked
- **CLOSED** ✗: Students cannot get marked (face verified but no attendance)

### Duration
- **5 minutes** standard window
- Auto-closes or can be manually closed

### State Rules
- Once closed for a period → Cannot reopen that period
- New period → Teacher must start new window
- Only 1 window per period per day

---

## 🛠️ API Endpoints (Quick Reference)

### Start Window
```
POST /api/attendance-window/start
Body: { period_number: 2, teacher_id: "teacher_1" }
Returns: { window_id, status, window_end_time }
```

### Check if Open
```
GET /api/attendance-window/active/2
Returns: { window_active: true/false, remaining_seconds }
```

### Close Window
```
POST /api/attendance-window/close/123
Returns: { success: true/false }
```

### View Logs
```
GET /api/attendance-window/123/logs
Returns: [ { student_roll, name, logged_in_at } ]
```

---

## ⚙️ System Configuration

### Class Periods (Edit in server.js if needed)
```
Period 1: 9:30-10:20
Period 2: 10:20-11:10
Period 3: 11:10-12:00
Period 4: 12:00-12:50
Period 5: 1:40-2:30 PM
Period 6: 2:30-3:20 PM
Period 7: 3:20-4:10 PM
```

### Window Duration
- Default: 5 minutes
- To change: Edit server.js (search for "5 * 60000")

---

## ✅ Testing Checklist

- [ ] Start window from attendance-control.html
- [ ] See 5-minute countdown timer
- [ ] Do student face login during window
- [ ] Verify attendance marked in database
- [ ] Check attendance log shows student
- [ ] Wait for window to auto-close
- [ ] Try student login after window closes
- [ ] Verify "window closed" error shown
- [ ] Manually close window early (test)
- [ ] Verify cannot reopen same period

---

## 📱 Response Codes & Messages

### Success (Student During Window)
```
Status: 200 OK
Message: "Attendance marked successfully for Period 2"
```

### Failure (Window Closed)
```
Status: 400 Bad Request
Message: "Attendance window is closed for this period"
Error Flag: window_closed: true
```

### Info (Already Marked)
```
Status: 400 Bad Request
Message: "You are already marked present for this period"
Error Flag: already_marked: true
```

### Error (Outside Hours)
```
Status: 400 Bad Request
Message: "Attendance can only be marked during class periods"
Error Flag: outside_hours: true
```

---

## 🔒 Security Features

✓ Window-based limiting (only open window allows marking)  
✓ Face verification required first  
✓ Server-side timestamp validation  
✓ Complete audit trail (attendance_log table)  
✓ No client-side time manipulation possible  
✓ Once closed, cannot reopen  
✓ Teacher control (prevents automated exploitation)

---

## 🐛 Troubleshooting

### Problem: "Window already open"
**Solution:** That period already has an open window. Close it first or wait for auto-close.

### Problem: "Attendance window is closed"
**Solution:** 5 minutes have passed. Teacher needs to start a new window for next period.

### Problem: Students not appearing in logs
**Solution:** Verify students completed face verification before window closed.

### Problem: Can't access attendance-control.html
**Solution:** Ensure server is running (`npm start`), then check port 5000.

### Problem: Timer not counting down
**Solution:** Refresh browser page or check browser console for errors.

---

## 📋 Database Tables

### attendance_windows
Stores when windows open/close per period per day

### attendance_log  
Audit trail of exactly who logged in and when

### attendance
Main attendance records (unchanged)

### students
Student data (unchanged)

---

## 🎓 Common Scenarios

### Scenario 1: Normal Class Attendance
```
10:30 - Teacher starts window for Period 2
10:31 - Student A logs in → ✓ Marked
10:32 - Student B logs in → ✓ Marked  
10:33 - Student C logs in → ✓ Marked
10:35 - Window closes (auto)
10:36 - Student D logs in → ✗ Window closed
```

### Scenario 2: Teacher Closes Early
```
10:30 - Teacher starts window for Period 2
10:31 - Student logs in → ✓ Marked
10:32 - Teacher clicks "Close Window Early"
10:33 - Another student tries → ✗ Already closed
```

### Scenario 3: Late Student
```
10:30 - Window opens for Period 2
10:35 - Window closes
10:36 - Late student tries to log in
        Face verified ✓
        But window closed ✗
        Error shown: "Window closed for this period"
        Student NOT marked present
```

---

## 🔄 Complete Flow (1-minute version)

```
1. Teacher goes to attendance-control.html
   ↓
2. Selects Period 2, clicks "Start Window"
   ↓
3. Server creates attendance_windows record (open)
   ↓
4. Timer shows 05:00 and starts counting down
   ↓
5. Student does face login on another device
   ↓
6. Face verified ✓
   ↓
7. System checks for active window for Period 2
   ↓
8. Window found and still open ✓
   ↓
9. Attendance marked in database
   ↓
10. Entry added to attendance_log (audit trail)
    ↓
11. Success message shown to student
    ↓
12. Student redirected to dashboard
    ↓
13. Teacher dashboard updates: count = 1
    ↓
14. After 5 minutes: window auto-closes
    ↓
15. Teacher can start new window for next period
```

---

## 📞 Support Reference

| Issue | Check |
|-------|-------|
| Can't find attendance-control.html | Server running? Port 5000? |
| Window won't start | Another window open for that period? |
| No students in logs | Did they complete face verification? |
| Window won't close | Try manual close or wait 5 min |
| Timer wrong | Check system time sync |

---

## 🚨 Important Notes

- **Window duration is 5 minutes** (not 10, not flexible)
- **Cannot reopen** window for same period same day
- **Face verification is mandatory** before window check
- **Server time is source of truth** (not client time)
- **All timestamps are recorded** in attendance_log
- **Logs auto-refresh** every 3 seconds in teacher dashboard

---

## 📚 Documentation Files

- **ATTENDANCE_WINDOW_GUIDE.md** - Complete API & feature docs
- **FLOW_DIAGRAMS.md** - Visual flowcharts & diagrams
- **IMPLEMENTATION_COMPLETE.md** - What was implemented
- **This file** - Quick reference

---

**Last Updated:** January 31, 2026
**Status:** Production Ready ✓
**Tested:** Yes ✓
