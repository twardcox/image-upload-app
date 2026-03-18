# Implementation Roadmap: Image Metadata & Face Detection

This document outlines the structured order for implementing the features. Follow this sequence to ensure dependencies are met.

---

## 🔴 CRITICAL PATH - Must Complete First (Sequential)

### Milestone 1: Database Foundation
**Complete these in order before anything else:**

1. ✅ **Issue #2: Extend Image model with EXIF metadata fields**
   - Dependencies: None
   - Blocks: All metadata features
   - Est: 15 min

2. ✅ **Issue #3: Create Face model**
   - Dependencies: None
   - Blocks: All face detection features
   - Est: 15 min

3. ✅ **Issue #4: Create ImageFace join table**
   - Dependencies: #3 (Face model must exist)
   - Blocks: All face detection features
   - Est: 10 min

4. ✅ **Issue #5: Generate and run Prisma migration**
   - Dependencies: #2, #3, #4 (all schema changes complete)
   - Blocks: Everything - nothing works without this
   - Est: 5 min
   - **CHECKPOINT:** Run `npm run build` to verify migration succeeded

**Total Time: ~45 minutes**

---

## 🟡 PARALLEL TRACKS - Can Work Simultaneously

After Milestone 1 completes, you can work on these two tracks in parallel:

### Track A: Metadata Extraction (Issues #6-#9)
### Track B: Face Detection Backend (Issues #10-#14, #19-#21)

---

## Track A: Metadata Extraction

### Milestone 2A: Backend Metadata
**Complete these in order:**

5. **Issue #6: Install exifr package**
   - Dependencies: #5 (migration complete)
   - Blocks: #7, #8
   - Est: 2 min

6. **Issue #7: Extract EXIF data in upload route**
   - Dependencies: #6 (exifr installed)
   - Blocks: #8
   - Est: 45 min
   - Code: Modify `src/app/api/images/upload/route.ts`

7. **Issue #8: Store EXIF metadata in Image model**
   - Dependencies: #7 (extraction logic exists)
   - Blocks: #9
   - Est: 15 min
   - **CHECKPOINT:** Upload test image, check database for EXIF data

8. **Issue #9: Add metadata to Image API responses**
   - Dependencies: #8 (data is being stored)
   - Blocks: #23-#27 (UI features)
   - Est: 20 min
   - Code: Modify `src/app/api/images/route.ts`, `src/app/api/images/[id]/route.ts`

**Total Time: ~1.5 hours**

---

## Track B: Face Detection Backend

### Milestone 2B: Face Detection Setup
**Complete these in order:**

9. **Issue #10: Install face-api.js and canvas packages**
   - Dependencies: #5 (migration complete)
   - Blocks: #11, #12
   - Est: 10 min (may take longer on Windows due to native deps)

10. **Issue #11: Download face-api.js models**
    - Dependencies: #10 (packages installed)
    - Blocks: #12, #19
    - Est: 10 min
    - Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

11. **Issue #19: Create face detection background service**
    - Dependencies: #10, #11 (packages + models ready)
    - Blocks: #12, #13, #20, #21
    - Est: 1.5 hours
    - Code: Create `src/lib/faceDetection.ts`
    - **CHECKPOINT:** Test face detection on sample image

12. **Issue #12: Create /api/faces/detect endpoint**
    - Dependencies: #19 (service exists)
    - Blocks: #13, #31 (manual trigger UI)
    - Est: 45 min
    - Code: Create `src/app/api/faces/detect/route.ts`

13. **Issue #13: Add async face detection to upload**
    - Dependencies: #19 (service exists)
    - Blocks: None (enables auto-detection)
    - Est: 30 min
    - Code: Modify `src/app/api/images/upload/route.ts`

14. **Issue #14: Implement face clustering algorithm**
    - Dependencies: #19 (service exists)
    - Blocks: #16, #17 (merge/split features)
    - Est: 2 hours
    - Code: Add to `src/lib/faceDetection.ts`
    - **CHECKPOINT:** Upload multiple photos of same person, verify clustering

### Milestone 2C: Face Thumbnail Service

15. **Issue #20: Implement face thumbnail extraction**
    - Dependencies: #19 (service exists)
    - Blocks: #15 (GET /api/faces needs thumbnails)
    - Est: 45 min
    - Code: Add to `src/lib/faceDetection.ts`

16. **Issue #21: Add auto re-clustering trigger**
    - Dependencies: #14, #20 (clustering + thumbnails work)
    - Blocks: None (optimization)
    - Est: 30 min

**Total Time: ~6 hours**

---

## 🟢 DEPENDENT FEATURES - Complete After Tracks A & B

### Milestone 3: Face Management APIs
**Dependencies: Milestone 2B complete (#10-#14, #19-#21)**

17. **Issue #15: Create GET /api/faces endpoint**
    - Dependencies: #20 (thumbnails exist), #14 (clustering works)
    - Blocks: #27, #28 (UI face filter)
    - Est: 30 min

18. **Issue #16: Create PUT /api/faces/[id] endpoint**
    - Dependencies: #15 (GET endpoint exists)
    - Blocks: #29 (Face management modal)
    - Est: 20 min

19. **Issue #17: Create POST /api/faces/merge endpoint**
    - Dependencies: #14 (clustering logic exists)
    - Blocks: #29 (Face management modal)
    - Est: 45 min

20. **Issue #18: Create POST /api/faces/split endpoint**
    - Dependencies: #14 (clustering logic exists)
    - Blocks: #29 (Face management modal)
    - Est: 45 min

21. **Issue #19: Add faceId filter to images API**
    - Dependencies: #15 (faces endpoint exists)
    - Blocks: #28 (face filtering UI)
    - Est: 20 min

**Total Time: ~2.5 hours**

---

## 🔵 FRONTEND IMPLEMENTATION

### Milestone 4A: Metadata UI
**Dependencies: Milestone 2A complete (#6-#9)**

22. **Issue #23: Add EXIF display to ImageCard**
    - Dependencies: #9 (API returns metadata)
    - Blocks: None
    - Est: 1 hour
    - Code: Modify `src/components/ImageCard.tsx`
    - **CHECKPOINT:** View image card, verify EXIF data displays

23. **Issue #24: Add date range picker filter**
    - Dependencies: #9 (API supports filtering)
    - Blocks: None
    - Est: 1.5 hours
    - Code: Modify `src/app/(authenticated)/gallery/page.tsx`

24. **Issue #25: Add location filter**
    - Dependencies: #9 (API supports filtering)
    - Blocks: None
    - Est: 2 hours (if adding map view)
    - Code: Create `src/components/MetadataFilters.tsx`

25. **Issue #26: Add camera/device filter**
    - Dependencies: #9 (API supports filtering)
    - Blocks: None
    - Est: 1 hour
    - Code: Modify gallery page

26. **Issue #27: Update sorting options**
    - Dependencies: #9 (API supports sorting)
    - Blocks: None
    - Est: 30 min
    - Code: Modify gallery page

**Total Time: ~6 hours**

---

### Milestone 4B: Face Detection UI
**Dependencies: Milestone 3 complete (#15-#19)**

27. **Issue #28: Create FaceFilterBar component**
    - Dependencies: #15 (GET /api/faces exists)
    - Blocks: #29, #30 (face filtering UI)
    - Est: 2 hours
    - Code: Create `src/components/FaceFilterBar.tsx`

28. **Issue #29: Implement face thumbnail filtering**
    - Dependencies: #28 (FaceFilterBar exists), #19 (API supports faceId filter)
    - Blocks: None
    - Est: 1 hour
    - Code: Modify gallery page

29. **Issue #30: Create FaceManagementModal**
    - Dependencies: #16, #17, #18 (all face management APIs exist)
    - Blocks: None
    - Est: 3 hours
    - Code: Create `src/components/FaceManagementModal.tsx`
    - **CHECKPOINT:** Test renaming, merging, splitting faces

30. **Issue #31: Add manual face detection trigger**
    - Dependencies: #12 (/api/faces/detect exists)
    - Blocks: None
    - Est: 45 min
    - Code: Modify gallery page

31. **Issue #32: Add face detection progress indicator**
    - Dependencies: #31 (trigger button exists)
    - Blocks: None
    - Est: 1 hour

**Total Time: ~7.5 hours**

---

## 🟣 TESTING & POLISH

### Milestone 5: Verification
**Dependencies: All features implemented**

32. **Issue #33: Test EXIF extraction cross-platform**
    - Dependencies: #6-#9, #23 (metadata features complete)
    - Est: 1 hour

33. **Issue #34: Test face detection accuracy**
    - Dependencies: #10-#14, #19-#21 (face detection complete)
    - Est: 1 hour

34. **Issue #35: Verify face clustering**
    - Dependencies: #14 (clustering complete)
    - Est: 1 hour

35. **Issue #36: Test GPS coordinate display**
    - Dependencies: #25 (location filter complete)
    - Est: 30 min

36. **Issue #37: Performance test batch uploads**
    - Dependencies: All backend features complete
    - Est: 1 hour

37. **Issue #38: Add loading skeletons for face thumbnails**
    - Dependencies: #28 (FaceFilterBar exists)
    - Est: 45 min

**Total Time: ~5 hours**

---

## 📊 TOTAL ESTIMATED TIME

- **Milestone 1 (Database):** 45 min ⚡ **START HERE**
- **Milestone 2A (Metadata Backend):** 1.5 hours
- **Milestone 2B (Face Detection Backend):** 6 hours
- **Milestone 3 (Face APIs):** 2.5 hours
- **Milestone 4A (Metadata UI):** 6 hours
- **Milestone 4B (Face Detection UI):** 7.5 hours
- **Milestone 5 (Testing):** 5 hours

**Grand Total: ~29 hours** (3-4 full work days)

---

## 🎯 RECOMMENDED WORK SESSIONS

### Session 1: Foundation (2-3 hours)
- Complete Milestone 1 (Database)
- Start Milestone 2A (Install exifr, basic extraction)
- Start Milestone 2B (Install face-api.js, download models)

### Session 2: Backend Heavy (4-5 hours)
- Complete Milestone 2A (Metadata extraction)
- Complete Milestone 2B steps #19, #12 (Face detection service + API)

### Session 3: Backend Completion (3-4 hours)
- Complete Milestone 2B (Clustering, thumbnails)
- Complete Milestone 3 (Face management APIs)

### Session 4: Metadata UI (4-5 hours)
- Complete Milestone 4A (All metadata filtering UI)

### Session 5: Face Detection UI (4-5 hours)
- Complete Milestone 4B (All face detection UI)

### Session 6: Testing & Polish (3-4 hours)
- Complete Milestone 5 (Verification)
- Fix any bugs found during testing

---

## 🚀 QUICK START

**Right now, do this:**

```bash
# 1. Open the database schema
code prisma/schema.prisma

# 2. Add EXIF fields to Image model (Issue #2)
# 3. Add Face model (Issue #3)
# 4. Add ImageFace join table (Issue #4)
# 5. Run migration (Issue #5)
npx prisma migrate dev --name add_exif_and_face_detection
npx prisma generate

# 6. Verify it worked
npm run build
```

Then move to Issues #6 and #10 (parallel tracks).

---

## 📝 CHECKPOINTS

After each milestone, verify:
- ✅ `npm run lint` passes
- ✅ `npm run build` succeeds
- ✅ Manual testing confirms feature works
- ✅ Git commit with descriptive message
- ✅ Update GitHub issue status

---

## 🔗 DEPENDENCIES GRAPH

```
#5 (Migration)
├── Track A: Metadata
│   ├── #6 (Install exifr)
│   ├── #7 (Extract EXIF)
│   ├── #8 (Store EXIF)
│   └── #9 (API responses)
│       └── Milestone 4A (UI Metadata)
│           ├── #23, #24, #25, #26, #27
│
└── Track B: Face Detection
    ├── #10 (Install face-api.js)
    ├── #11 (Download models)
    ├── #19 (Detection service)
    │   ├── #12 (/api/faces/detect)
    │   ├── #13 (Async detection)
    │   ├── #14 (Clustering)
    │   ├── #20 (Thumbnails)
    │   └── #21 (Re-clustering)
    │       └── Milestone 3 (Face APIs)
    │           ├── #15, #16, #17, #18, #19
    │           └── Milestone 4B (UI Face Detection)
    │               ├── #28, #29, #30, #31, #32
    │               └── Milestone 5 (Testing)
    │                   ├── #33, #34, #35, #36, #37, #38
```
