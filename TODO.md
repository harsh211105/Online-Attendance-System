# Pure JS Server-side Face Recognition Migration - TODO

## Status: [5/14] ✅ Backend Complete

### Phase 1: Setup ✓ (2/2)
- [x] 1. package.json → npm install (jimp/sharp complete)
- [x] 2. face-backend.js (pure JS heuristic) ✓

### Phase 2: Backend ✓ (3/4)
- [x] 3. server.js endpoints (/api/register auto-extracts, /api/face/verify) ✓
- [ ] 4. db.js (no changes needed)
- [x] 5. Basic integration
- [ ] 6. Benchmark

Phase 3: Frontend (6/6) ✓
- [x] 7. face-login.html (server verify) ✓
- [x] 8. register.html (server extract) ✓
- [x] 9. app.js (remove utils) ✓
- [x] 10. Remove face-api CDN ✓
- [ ] 11. Test full flow
- [ ] 12. Mobile test

### Phase 4: Cleanup (0/2)
- [ ] 13. Remove client face-api code
- [ ] 14. Update docs

**Next: Update frontend files → test**




