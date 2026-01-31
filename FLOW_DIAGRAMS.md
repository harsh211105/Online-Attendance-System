# Attendance Window System - Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTENDANCE SYSTEM FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐                    ┌──────────────────┐
│   TEACHER SIDE   │                    │   STUDENT SIDE   │
│                  │                    │                  │
│ 1. Go to         │                    │ 1. Face Login    │
│    attendance-   │                    │    Page          │
│    control.html  │                    │                  │
│                  │                    │ 2. Face          │
│ 2. Select       │                    │    Verification  │
│    Period        │                    │                  │
│                  │                    │ 3. Auto-Mark     │
│ 3. Click         │                    │    Attendance    │
│    "Start        │                    │                  │
│    Attendance    │                    │                  │
│    Window"       │                    │                  │
└──────────────────┘                    └──────────────────┘
        │                                       │
        │ POST /api/                            │
        │ attendance-window/start               │
        │                                       │
        └──────────────────┬────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   SERVER    │
                    │  (Node.js)  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Create Entry │  │   Check for  │  │   Create    │
    │ in           │  │   Existing   │  │   Log Entry │
    │ attendance_  │  │   Window     │  │   in        │
    │ windows      │  │              │  │   attendance│
    │ (open)       │  │              │  │   _log      │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                │                   │
            │                │ Window Open?      │
            │                │ YES        NO     │
            │                │ │         │       │
            │                ▼ ▼         ▼       │
            │        ALLOW MARKING  DENY MARKING │
            │                                    │
            └────────────────┬───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   SQLITE DB     │
                    │                 │
                    │ attendance_     │
                    │ windows table   │
                    │ attendance_log  │
                    │ attendance      │
                    │ students        │
                    └─────────────────┘
```

---

## Student Login Flow (With Attendance Window Check)

```
START: Student Opens face-login.html
│
├─ Load Face Detection Models
│  └─ Wait for models to initialize
│
├─ Click "Start Camera"
│  └─ Get webcam access
│
├─ Click "Verify Face"
│  │
│  ├─ Capture video frame
│  │
│  ├─ Detect face in frame
│  │  ├─ No face detected → Show error → RETRY
│  │  └─ Face detected ✓
│  │
│  ├─ Compare with stored descriptor
│  │  ├─ Face matches → Continue ✓
│  │  └─ Face doesn't match → Retry (max 3 times)
│  │
│  └─ Face Verified Successfully ✓
│
├─ Call /api/attendance/auto-mark
│  │
│  ├─ Check if student exists & approved
│  │  └─ Not found → ERROR, REDIRECT
│  │
│  ├─ Detect current class period
│  │  ├─ Outside hours → ERROR, REDIRECT
│  │  └─ During class ✓
│  │
│  ├─ 🆕 CHECK ATTENDANCE WINDOW 🆕
│  │  │
│  │  ├─ Is there an active window for this period?
│  │  │  │
│  │  │  ├─ YES: Window exists & time valid ✓
│  │  │  │  └─ MARK ATTENDANCE
│  │  │  │     └─ Add to attendance_log
│  │  │  │        └─ Return: { success: true }
│  │  │  │
│  │  │  └─ NO: No window or expired
│  │  │     └─ Check if already marked
│  │  │        ├─ Already marked → INFO message
│  │  │        └─ Not marked (window closed) → ERROR
│  │  │           └─ Return: { 
│  │  │              window_closed: true,
│  │  │              error: "Attendance window is closed"
│  │  │            }
│  │
│  ├─ (Receive response)
│  │
│  ├─ IF SUCCESS:
│  │  └─ Show: "✓ Attendance marked for Period X"
│  │     └─ Redirect to student-dashboard.html
│  │
│  └─ IF FAILURE (window closed):
│     └─ Show: "❌ Attendance window is closed for this period"
│        └─ Redirect to student-dashboard.html
│
END
```

---

## Teacher Attendance Window Control Flow

```
START: Teacher Opens attendance-control.html
│
├─ Display 7 Period Buttons (Periods 1-7)
│  └─ Teacher clicks Period 2
│
├─ Check if window already exists for Period 2
│  │
│  ├─ Window exists & open
│  │  └─ Show active timer and logs
│  │
│  └─ No window exists
│     └─ Show "Start Attendance Window" button
│
├─ Teacher clicks "Start Attendance Window"
│  │
│  ├─ POST /api/attendance-window/start
│  │  ├─ period_number: 2
│  │  └─ teacher_id: "teacher_1"
│  │
│  ├─ Server creates record:
│  │  ├─ attendance_windows table
│  │  ├─ status: "open"
│  │  ├─ window_start_time: NOW
│  │  ├─ window_end_time: NOW + 5 minutes
│  │  └─ period: 2
│  │
│  └─ Return window_id & duration
│
├─ Show ACTIVE WINDOW UI
│  ├─ ✓ Timer showing 05:00 → 00:00 (counting down)
│  ├─ ✓ "Students Present: 0"
│  ├─ ✓ Empty attendance log (refreshing every 3 sec)
│  └─ ✓ "Close Window Early" button (optional)
│
├─ WINDOW OPEN: Students can now log in
│  │
│  └─ Every 3 seconds:
│     ├─ GET /api/attendance-window/{window_id}/logs
│     ├─ Update student count
│     └─ Update attendance list
│        Example:
│        ├─ STU001 - John Doe - 10:31:15
│        └─ STU002 - Jane Smith - 10:32:45
│
├─ WINDOW COUNTDOWN
│  │
│  ├─ After 300 seconds (5 minutes):
│  │  ├─ Timer reaches 00:00
│  │  ├─ Auto-call /api/attendance-window/close/{window_id}
│  │  ├─ status: "closed"
│  │  └─ Show: "Attendance window has closed"
│  │
│  └─ OR Teacher clicks "Close Window Early"
│     ├─ POST /api/attendance-window/close/{window_id}
│     ├─ Window closes immediately
│     └─ Show: "Window closed successfully"
│
├─ AFTER WINDOW CLOSES
│  ├─ Cannot reopen for same period
│  ├─ Cannot restart window
│  ├─ For next class: Use same attendance-control.html
│  └─ Teacher starts new window for different period
│
└─ Teacher logs out
   └─ Clear session
```

---

## Database Record Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE RECORD CREATION SEQUENCE                   │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Teacher Starts Window
───────────────────────────────
Teacher clicks "Start Attendance Window" for Period 2

    CREATE: attendance_windows record
    ┌─────────────────────────────────────────┐
    │ ID:               123                    │
    │ class_period:     2                      │
    │ attendance_date:  2024-01-31             │
    │ window_start:     10:30:00               │
    │ window_end:       10:35:00 (+5 min)      │
    │ status:           'open'                 │
    │ created_by:       'teacher_1'            │
    └─────────────────────────────────────────┘


STEP 2: Student Logs In During Window (10:31)
──────────────────────────────────────────────
Face verified → Attendance check runs

    ✓ WINDOW IS OPEN (still 4 minutes left)
    │
    ├─ INSERT: attendance record
    │  ┌─────────────────────────────────────────┐
    │  │ student_roll:   STU001                  │
    │  │ attendance_date: 2024-01-31             │
    │  │ period_number:  2                       │
    │  │ status:        'P' (Present)            │
    │  │ marked_at:     10:31:15                 │
    │  └─────────────────────────────────────────┘
    │
    └─ INSERT: attendance_log record (AUDIT TRAIL)
       ┌─────────────────────────────────────────┐
       │ student_roll:   STU001                  │
       │ window_id:      123                     │
       │ logged_in_at:   10:31:15                │
       │ period_number:  2                       │
       │ attendance_date: 2024-01-31             │
       └─────────────────────────────────────────┘


STEP 3: Another Student Logs In (10:32)
────────────────────────────────────────
Different student, still during window

    ✓ WINDOW IS OPEN (still 3 minutes left)
    │
    ├─ INSERT: attendance record
    │  ┌─────────────────────────────────────────┐
    │  │ student_roll:   STU002                  │
    │  │ attendance_date: 2024-01-31             │
    │  │ period_number:  2                       │
    │  │ status:        'P' (Present)            │
    │  │ marked_at:     10:32:45                 │
    │  └─────────────────────────────────────────┘
    │
    └─ INSERT: attendance_log record
       ┌─────────────────────────────────────────┐
       │ student_roll:   STU002                  │
       │ window_id:      123                     │
       │ logged_in_at:   10:32:45                │
       │ period_number:  2                       │
       │ attendance_date: 2024-01-31             │
       └─────────────────────────────────────────┘


STEP 4: Student Tries to Log In After Window (10:36)
─────────────────────────────────────────────────────
Face verified → Attendance check runs

    ✗ WINDOW IS CLOSED (expired 1 minute ago)
    │
    ├─ NO ATTENDANCE RECORD CREATED
    │
    ├─ NO LOG ENTRY CREATED
    │
    └─ Return Error:
       {
         success: false,
         error: "Attendance window is closed",
         window_closed: true
       }


STEP 5: Window Closes
─────────────────────
After 5 minutes OR when teacher clicks close

    UPDATE: attendance_windows record
    ┌─────────────────────────────────────────┐
    │ ID:               123                    │
    │ status:           'closed' (WAS: 'open') │
    │ closed_at:        10:35:00               │
    └─────────────────────────────────────────┘


FINAL STATE: Database Summary
──────────────────────────────
attendance_windows
├─ 1 record: Period 2, closed, 2 students attended

attendance_log (Audit Trail)
├─ Record 1: STU001, logged in at 10:31:15
└─ Record 2: STU002, logged in at 10:32:45

attendance (Main table)
├─ Record 1: STU001 - Period 2 - Present
└─ Record 2: STU002 - Period 2 - Present
```

---

## Error Scenario: Window Closed

```
Timeline:
─────────
10:30:00 - Teacher starts window (5 minutes)
10:30:00-10:35:00 - WINDOW OPEN (students can log in)
10:35:00+ - WINDOW CLOSED (auto-closes)

Scenario A: Student logs in at 10:34 (WITHIN WINDOW)
─────────────────────────────────────────────────────
1. Face verified ✓
2. Check window for Period 2
3. Found: window open, 1 minute remaining ✓
4. Mark attendance ✓
5. Add to logs ✓
6. Show success message ✓

Scenario B: Student logs in at 10:36 (AFTER WINDOW)
─────────────────────────────────────────────────────
1. Face verified ✓
2. Check window for Period 2
3. Found: window expired/closed ✗
4. Skip attendance marking
5. Skip log entry
6. Return { window_closed: true }
7. Show error message:
   "Attendance window is closed for this period"
8. Redirect to dashboard anyway

Key Point: Attendance marking is SKIPPED, not just recorded as absent.
This creates an audit trail showing when the student tried to log in.
```

---

## Timer Visualization

```
Teacher clicks "Start Attendance Window"
        │
        ▼
┌────────────────────────────────────────┐
│  ATTENDANCE WINDOW TIMER                │
├────────────────────────────────────────┤
│                                        │
│              05:00 ⏱️                   │
│         (5 minutes remaining)          │
│                                        │
│    Students Present: 0                 │
│    Time Remaining:   05:00             │
│                                        │
│    [📋 Attendance Log] (refreshing...) │
│    (none yet)                          │
│                                        │
│    [Close Window Early] (optional)     │
└────────────────────────────────────────┘
        │ tick │ tick │ tick...
        ▼      ▼      ▼
┌─────────────────┐
│     04:59       │
│                 │
│ Student STU001  │
│ logged in! ✓    │
│ Count: 1        │
└─────────────────┘
        │
        ▼
      04:45
        ▼
      04:30
        ▼
      04:15
        ▼
      04:00
        ▼ (Another student logs in)
      03:45
│ Student STU002  │
│ logged in! ✓    │
│ Count: 2        │
        ▼
    ... counting down ...
        ▼
      00:01
        ▼
      00:00 ⏸️ STOP
        ▼
┌────────────────────────────────────────┐
│ Window Status: CLOSED                  │
│                                        │
│ Total Students: 2                      │
│ Final Attendance Log:                  │
│ • STU001 - 10:31:15                    │
│ • STU002 - 10:32:45                    │
│                                        │
│ [Start New Window for Different Period]│
└────────────────────────────────────────┘
```

---

## API Call Sequence Diagram

```
Client              Server              Database
  │                   │                     │
  │ 1. POST /api/     │                     │
  │    attendance-    │                     │
  │    window/start   │                     │
  ├──────────────────►│                     │
  │                   │ 2. Create           │
  │                   │    window record    │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │ window_id: 123      │
  │◄──────────────────┤                     │
  │ (show timer)      │                     │
  │                   │                     │
  │ 3. GET /api/      │                     │
  │    attendance-    │                     │
  │    window/        │                     │
  │    active/2       │                     │
  ├──────────────────►│                     │
  │                   │ 4. Query active     │
  │                   │    window           │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │ window found, open  │
  │◄──────────────────┤                     │
  │ (display status)  │                     │
  │                   │                     │
  │ [Student logs in on different tab]    │
  │                   │                     │
  │                   │ Student calls:      │
  │                   │ POST /api/          │
  │                   │ attendance/         │
  │                   │ auto-mark           │
  │                   │◄───────────────────Student
  │                   │                     │
  │                   │ 5. Check for active │
  │                   │    window           │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │ window found!       │
  │                   │                     │
  │                   │ 6. Mark attendance  │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │ success             │
  │                   │                     │
  │ 7. GET /api/      │ 8. Add to           │
  │    attendance-    │    attendance_log   │
  │    window/{id}/   │ ├──────────────────►│
  │    logs           │ │(audit entry)      │
  ├──────────────────►│                     │
  │                   │ 9. Query logs       │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │ [STU001 at 10:31]   │
  │◄──────────────────┤                     │
  │(update log view)  │                     │
  │                   │                     │
  │    [After 5 min] │                     │
  │                   │ 10. Auto-close or   │
  │                   │     manual close    │
  │ POST /api/        │                     │
  │ attendance-       │ 11. Update status   │
  │ window/close      │     to 'closed'     │
  ├──────────────────►├────────────────────►│
  │                   │◄────────────────────┤
  │◄──────────────────┤                     │
  │ (close timer)     │                     │
```

---

## Summary

This diagram shows how the attendance window system prevents:
- ✓ Early login (before window opens)
- ✓ Late login (after window closes)
- ✓ Duplicate marking (already marked check)
- ✓ Out-of-hours marking (period check)
- ✓ Unauthorized marking (face verification first)

The complete audit trail in `attendance_log` table ensures transparency and security!
