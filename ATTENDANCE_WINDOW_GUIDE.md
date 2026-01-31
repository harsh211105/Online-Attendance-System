# Attendance Window Feature - Complete Guide

## Overview
The Attendance Window feature ensures attendance integrity by restricting attendance marking to a specific 5-minute window initiated by the teacher during class. This prevents students from logging in before class starts or after leaving.

## How It Works

### 1. Teacher's Workflow
1. Teacher logs into the system during class
2. Opens the **Attendance Control Panel** (`attendance-control.html`)
3. Selects the current class period
4. Clicks **"Start Attendance Window"** button
5. A 5-minute timer begins automatically
6. A real-time dashboard shows:
   - Countdown timer
   - Number of students logged in
   - List of students who logged in

### 2. Student's Workflow
1. Student opens the login page and initiates face verification
2. After successful face verification, system attempts to mark attendance
3. System checks if an **active attendance window exists** for the current period
4. **If window is open**: Attendance is marked successfully ✓
5. **If window is closed**: Attendance marking fails with message: "Attendance window is closed for this period"

### 3. Automatic Window Closure
- Window automatically closes after 5 minutes
- Can be manually closed early by teacher
- Once closed, **cannot be reopened** for that period (teacher must try next class)

---

## Database Schema

### attendance_windows table
```sql
CREATE TABLE attendance_windows (
  id INTEGER PRIMARY KEY,
  class_period INTEGER,           -- Period number (1-7)
  attendance_date DATE,           -- Today's date
  window_start_time DATETIME,     -- When teacher started it
  window_end_time DATETIME,       -- Start time + 5 minutes
  status TEXT,                    -- 'open' or 'closed'
  created_by TEXT,                -- Teacher ID
  created_at DATETIME
);
```

### attendance_log table (Audit Trail)
```sql
CREATE TABLE attendance_log (
  id INTEGER PRIMARY KEY,
  student_roll TEXT,              -- Student who logged in
  window_id INTEGER,              -- Which window they logged in during
  attendance_date DATE,
  period_number INTEGER,
  logged_in_at DATETIME           -- Exact time they logged in
);
```

---

## API Endpoints

### 1. Start Attendance Window
**POST** `/api/attendance-window/start`

Request:
```json
{
  "period_number": 2,
  "teacher_id": "teacher_1"
}
```

Response (Success):
```json
{
  "success": true,
  "message": "Attendance window opened for Period 2. Students have 5 minutes to log in.",
  "window_id": 123,
  "period_number": 2,
  "window_start_time": "2024-01-31T10:30:00.000Z",
  "window_end_time": "2024-01-31T10:35:00.000Z",
  "duration_minutes": 5
}
```

Response (Error - Already Open):
```json
{
  "success": false,
  "error": "Attendance window is already open for this period",
  "window_id": 123
}
```

### 2. Check Active Window
**GET** `/api/attendance-window/active/:period_number`

Response (Window Active):
```json
{
  "success": true,
  "window_active": true,
  "window_id": 123,
  "period_number": 2,
  "window_end_time": "2024-01-31T10:35:00.000Z",
  "remaining_seconds": 240
}
```

Response (Window Closed):
```json
{
  "success": false,
  "window_active": false,
  "error": "No active attendance window for this period"
}
```

### 3. Close Window Early
**POST** `/api/attendance-window/close/:window_id`

Response:
```json
{
  "success": true,
  "message": "Attendance window closed for Period 2"
}
```

### 4. Get Attendance Logs
**GET** `/api/attendance-window/:window_id/logs`

Response:
```json
{
  "success": true,
  "data": [
    {
      "student_roll": "STU001",
      "name": "John Doe",
      "logged_in_at": "2024-01-31T10:31:15.000Z"
    },
    {
      "student_roll": "STU002",
      "name": "Jane Smith",
      "logged_in_at": "2024-01-31T10:32:45.000Z"
    }
  ]
}
```

### 5. Auto-Mark Attendance (Modified)
**POST** `/api/attendance/auto-mark`

Request:
```json
{
  "student_roll": "STU001"
}
```

Response (Success - Window Open):
```json
{
  "success": true,
  "message": "Attendance marked successfully for Period 2",
  "period": 2,
  "date": "2024-01-31"
}
```

Response (Failure - Window Closed):
```json
{
  "success": false,
  "error": "Attendance window is closed for this period",
  "window_closed": true,
  "outside_hours": false
}
```

---

## Features in Detail

### Real-Time Dashboard (attendance-control.html)
- **Period Selector**: Choose which class period to manage
- **Live Timer**: 5-minute countdown in MM:SS format
- **Present Count**: Real-time count of students who logged in
- **Attendance Log**: Scrollable list of students with exact login times
- **Auto-Refresh**: Log refreshes every 3 seconds
- **Close Early**: Manual button to close window before 5 minutes

### Student Experience (face-login.html)
- Face verification → Automatic attendance marking attempt
- If window closed: Shows error message before redirecting
- If successful: Shows success message and redirects to dashboard
- Audit trail maintained in database

---

## Error Handling

| Scenario | Response | Behavior |
|----------|----------|----------|
| Student logs in during active window | ✓ Marked Present | Redirects to dashboard |
| Student logs in after window closed | ✗ Window Closed | Shows error, redirects to dashboard |
| Student tries to log in twice in same period | ✗ Already Marked | Shows info message, redirects |
| Outside class hours | ✗ Outside Hours | Shows error, student cannot mark |
| No active window for period | ✗ Window Closed | Shows error, redirects to dashboard |

---

## Security Features

1. **Window-Based Limiting**: Only students logging in during the 5-minute window are marked
2. **Audit Trail**: Complete log of who logged in and when
3. **No Reopening**: Window cannot be reopened for same period/date
4. **Time Verification**: Server-side timestamp verification prevents client-side manipulation
5. **Face Verification First**: Attendance only checked AFTER face is verified

---

## Testing

Use `attendance-window-test.html` to test all endpoints:

```
Test 1: Start Window for Period 2
Test 2: Check if window is active
Test 3: Mark attendance during window (should succeed)
Test 4: Get attendance logs
Test 5: Close window early
Test 6: Mark attendance after closing (should fail with window_closed error)
```

---

## Configuration

### Class Periods (Edit in server.js)
```javascript
const periods = [
  { num: 1, start: 9 * 60 + 30, end: 10 * 60 + 20 },   // 9:30-10:20
  { num: 2, start: 10 * 60 + 20, end: 11 * 60 + 10 },  // 10:20-11:10
  { num: 3, start: 11 * 60 + 10, end: 12 * 60 },       // 11:10-12:00
  // ... more periods
];
```

### Window Duration (Edit in server.js)
```javascript
const windowDuration = 5 * 60000; // 5 minutes (in milliseconds)
// Change the 5 to 10 for 10-minute windows, etc.
```

---

## Files Modified/Created

### New Files
- `attendance-control.html` - Teacher attendance control panel
- `attendance-window-test.html` - API testing interface

### Modified Files
- `server.js` - Added 5 new API endpoints, modified auto-mark endpoint
- `db.js` - Automatic (table creation handled in server.js)
- `face-login.html` - Added window_closed error handling

### Database Changes
- 2 new tables: `attendance_windows`, `attendance_log`
- Existing tables unchanged

---

## Future Enhancements

1. **Multiple Attendants**: Allow teacher to extend window or start new one
2. **SMS/Email Alerts**: Notify students when window opens/closes
3. **Analytics**: Reports on attendance patterns, missed windows
4. **QR Code**: Alternative to face verification during window
5. **Late Attendance**: Track students who log in after window closes
6. **Admin Reports**: Dashboard showing window compliance per teacher

---

## Troubleshooting

### Window won't start
- Check if another window is already open for that period
- Verify teacher_id is being sent correctly
- Check server logs for database errors

### Students can't log in during window
- Verify face verification is working first
- Check if window_end_time has passed
- Confirm student account is approved

### Logs not showing
- Ensure attendance was marked (check attendance table)
- Verify window_id in logs table
- Try manual refresh in browser

---

## Support

For issues or questions, contact your system administrator or check the DEBUG_INFO.md file.
