# Quick Reference Guide - When Things Break

## 🔍 Diagnosis Flow

### Problem: System not working
```
1. Check if server is running
   → npm start (in terminal)
   
2. Open browser console (F12)
   → Look for errors
   
3. Check what step fails:
   ├─ Registration → Face not detected?
   ├─ Login → Credentials rejected?
   ├─ Face verification → Wrong face accepted?
   └─ Database → No data stored?
```

---

## 🚨 Critical Issues & Quick Fixes

### Issue: Anyone can login with any face
**Fix:** Check `FACE_THRESHOLD` in `face-login.html` line 284
```javascript
const FACE_THRESHOLD = 0.4;  // Must be THIS value (strict)
// DO NOT change to 0.6+ (too loose)
```

### Issue: Face not being captured during registration
**Fix:** Verify canvas reference is stored correctly
- In `register.html` line 178-180:
```javascript
window.capturedCanvas = canvas.cloneNode(true);  // Must be THIS
```
- NOT: `const img = new Image(); img.src = base64;` (doesn't work)

### Issue: "No face detected" during registration
**Fix:** User needs to:
1. Have better lighting
2. Position face centered in guide rectangle
3. Click "Retake Photo" button
4. Try again

### Issue: Login says "Face doesn't match" but it's you
**Debug:**
1. Open console (F12)
2. Look for: `Face distance: X.XX`
3. If distance > 0.4, the face doesn't match stored descriptor
4. Options:
   - Register again with clearer photo
   - Check console to verify descriptor was saved

---

## 📊 Console Output Expected Values

### Successful Registration
```
Face descriptor extraction result: [array of 128]
Sending registration request...
Registration result: {success: true, message: "..."}
✓ Face descriptor obtained, length: 128
```

### Successful Face Verification (YOUR FACE)
```
===== FACE VERIFICATION STARTED =====
Stored descriptor length: 128
Live descriptor length: 128
Face distance: 0.12, threshold: 0.4
Face match result: true
✓ FACE VERIFIED - Marking as match
```

### Failed Face Verification (WRONG FACE)
```
===== FACE VERIFICATION STARTED =====
Stored descriptor length: 128
Live descriptor length: 128
Face distance: 0.87, threshold: 0.4
Face match result: false
❌ FACE DID NOT MATCH
```

---

## 🔧 One-Minute Fixes

| Problem | Fix | Time |
|---------|-----|------|
| Camera not showing | Allow camera permission in browser settings | 30 sec |
| Face not detected | Better lighting + closer to camera + click "Retake Photo" | 1 min |
| Wrong face accepted | Check `FACE_THRESHOLD = 0.4` (line 284 face-login.html) | 30 sec |
| Descriptor not saved | Check registration logs show "array of 128" | 1 min |
| Can't login to account | Check database: `SELECT face_descriptor FROM students` | 1 min |

---

## 🗄️ Database Checks

### Check if descriptor saved
```sql
SELECT roll_number, LENGTH(face_descriptor) as descriptor_length 
FROM students 
WHERE roll_number = 'YOUR_ROLL';
```
**Result should show:** `descriptor_length = 500+` (JSON is large)

### Check if student approved
```sql
SELECT roll_number, approval_status 
FROM students 
WHERE roll_number = 'YOUR_ROLL';
```
**Result should show:** `approval_status = 1`

### Reset a student
```sql
UPDATE students 
SET face_descriptor = NULL 
WHERE roll_number = 'YOUR_ROLL';
```
(User needs to register again)

---

## 🎯 Testing Scenarios

### Test 1: Own Face Login ✓
1. Register with YOUR face
2. Login with YOUR roll + password
3. Verify with YOUR face
4. **Expected:** Console shows `Face distance: 0.1-0.3` → MATCH

### Test 2: Wrong Face Rejection ✓
1. Login with YOUR credentials
2. Have someone ELSE verify their face
3. **Expected:** Console shows `Face distance: 0.7-1.0` → NO MATCH

### Test 3: Credential Rejection ✓
1. Try login with WRONG password
2. **Expected:** "Invalid roll number or password" error (before face verification page)

### Test 4: No Descriptor Handling ✓
1. Register without clear face photo
2. Login with those credentials
3. Face verification page shows retry option
4. **Expected:** Options to "Continue Without Face" or "Register Again"

---

## 📱 Console Debugging Checklist

When something breaks, open F12 and check:

- [ ] Face descriptor loaded? `Descriptor value: Array(128)` or `undefined`?
- [ ] Face distance calculated? `Face distance: X.XX` appears?
- [ ] Threshold check? `threshold: 0.4` shown?
- [ ] Face models loaded? `✓ Face-api models loaded successfully`?
- [ ] Session stored? `Current user from session: {...}` shows?

---

## 🔐 Security Checklist

- [ ] Threshold is 0.4 (strict) NOT 0.6 (loose)
- [ ] No direct access without face verification
- [ ] 3-strike limit enforced
- [ ] Retry counter decrements
- [ ] No bypass button visible
- [ ] Different faces show distance > 0.4

---

## 📞 If Still Broken

1. **Check files haven't been modified:**
   - `register.html` line 284: Must use `window.capturedCanvas`
   - `face-login.html` line 284: Must be `FACE_THRESHOLD = 0.4`
   - `server.js` line 82: Must be `approval_status = 1`

2. **Reset and try again:**
   ```bash
   npm start
   # Delete database or drop students table
   # Register new student
   # Test login
   ```

3. **Check network:**
   - Face-api CDN loading? (Check network tab in DevTools)
   - API endpoints responding? (Use http://localhost:5000/api-test.html)

4. **Review logs:**
   - Browser console (F12)
   - Server terminal output
   - Database query results

---

**Remember:** The face descriptor is a 128-dimensional array. It must be:
- ✅ Extracted during registration (from canvas)
- ✅ Stored in database (as JSON string)
- ✅ Retrieved during login (from database)
- ✅ Compared with live descriptor (Euclidean distance)

If any step fails, the whole system breaks!
