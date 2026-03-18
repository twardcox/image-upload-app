# Testing Checklist: Image Metadata & Face Detection

This document provides comprehensive testing procedures for all implemented features.

---

## Prerequisites

1. **Test Environment Setup**
   - Development server running: `npm run dev`
   - Database migrated: `npx prisma migrate dev`
   - Face-api.js models downloaded in `public/models/`
   - Test user account created

2. **Test Images Required**
   - **EXIF-rich images**: Photos from smartphones/cameras with full metadata
   - **Multiple faces**: Group photos, selfies, portraits
   - **Same person**: 5+ photos of the same individual for clustering tests
   - **Various formats**: JPEG, PNG, WebP
   - **GPS-tagged**: Images with location data
   - **No metadata**: Screenshots, generated images

---

## Issue #33: Test EXIF Extraction Accuracy

### Test Cases

#### TC-33.1: EXIF Metadata Extraction
**Objective**: Verify EXIF data is correctly extracted from uploaded images

**Steps**:
1. Navigate to `/gallery`
2. Upload a photo with EXIF data (smartphone photo recommended)
3. Click on the uploaded image card

**Expected Results**:
- ✅ Date taken displays correctly (format: "MMM DD, YYYY, HH:MM:SS")
- ✅ Camera make and model display (e.g., "Apple iPhone 14 Pro")
- ✅ GPS coordinates display if available (format: "XX.XXXX° N/S, XX.XXXX° E/W")
- ✅ Camera settings display: f-stop, exposure time, ISO, focal length
- ✅ Missing fields are hidden (not shown as "null" or "undefined")

**Database Verification**:
```sql
-- Check extracted EXIF data
SELECT 
  originalName,
  dateTaken,
  cameraMake,
  cameraModel,
  gpsLatitude,
  gpsLongitude,
  fNumber,
  exposureTime,
  iso,
  focalLength
FROM "Image"
ORDER BY createdAt DESC
LIMIT 5;
```

#### TC-33.2: Various Image Formats
**Test with**:
- ✅ JPEG (most common, best EXIF support)
- ✅ PNG (limited EXIF support)
- ✅ WebP (check EXIF support)
- ✅ HEIC/HEIF (iOS format, requires conversion)

#### TC-33.3: Missing EXIF Data
**Objective**: Verify graceful handling of images without metadata

**Steps**:
1. Upload a screenshot or generated image (no EXIF)
2. View image card

**Expected Results**:
- ✅ Image uploads successfully
- ✅ Image displays in gallery
- ✅ EXIF section is hidden (not shown)
- ✅ No errors in console

#### TC-33.4: Corrupted/Partial EXIF
**Test with**:
- Images with some EXIF fields missing
- Images with invalid GPS coordinates
- Images with unusual date formats

**Expected Results**:
- ✅ Upload succeeds
- ✅ Valid fields display correctly
- ✅ Invalid/missing fields are hidden
- ✅ No application crashes

---

## Issue #34: Test Metadata Filtering

### Test Cases

#### TC-34.1: Date Range Filter
**Objective**: Verify date range filtering works correctly

**Steps**:
1. Upload images with different `dateTaken` dates
2. Open Filters popover
3. Set "From" date
4. Verify filtered results
5. Set "To" date
6. Verify date range filtering

**Expected Results**:
- ✅ Setting "From" date filters out older images
- ✅ Setting "To" date filters out newer images
- ✅ Date range includes both boundary dates
- ✅ Active filter badge displays selected dates
- ✅ Click × on badge clears that filter
- ✅ Pagination resets to page 1

**API Verification**:
```bash
# Test date range API filtering
curl "http://localhost:3000/api/images?dateFrom=2024-01-01&dateTo=2024-12-31" \
  -H "Cookie: your-auth-cookie"
```

#### TC-34.2: Camera Filter
**Objective**: Verify camera/device filtering

**Steps**:
1. Upload images from different cameras/phones
2. Open Filters popover
3. Select a camera from dropdown
4. Verify filtered results

**Expected Results**:
- ✅ Only images from selected camera show
- ✅ Camera dropdown shows all unique camera combinations
- ✅ Each camera shows image count
- ✅ "All cameras" option clears filter
- ✅ Active camera badge displays
- ✅ Cameras ordered by count (most used first)

**API Verification**:
```bash
# Get available cameras
curl "http://localhost:3000/api/images/cameras" \
  -H "Cookie: your-auth-cookie"

# Filter by camera
curl "http://localhost:3000/api/images?cameraMake=Apple&cameraModel=iPhone%2014%20Pro" \
  -H "Cookie: your-auth-cookie"
```

#### TC-34.3: GPS/Location Filter
**Objective**: Verify location presence filtering

**Steps**:
1. Upload mix of images with and without GPS data
2. Open Filters popover
3. Select "With location"
4. Verify only GPS-tagged images show
5. Select "Without location"
6. Verify only non-GPS images show

**Expected Results**:
- ✅ "With location" shows only images with GPS coordinates
- ✅ "Without location" shows only images without GPS
- ✅ "All photos" clears the filter
- ✅ Active filter badge displays

#### TC-34.4: Sorting Options
**Objective**: Verify all 8 sorting options work

**Test each**:
- ✅ Newest first (createdAt desc) - default
- ✅ Oldest first (createdAt asc)
- ✅ Date taken (newest) (dateTaken desc)
- ✅ Date taken (oldest) (dateTaken asc)
- ✅ Name (A-Z) (originalName asc)
- ✅ Name (Z-A) (originalName desc)
- ✅ Size (largest) (size desc)
- ✅ Size (smallest) (size asc)

**Expected Results**:
- ✅ Images reorder correctly for each option
- ✅ Sort persists during pagination
- ✅ Sort works with other filters combined

#### TC-34.5: Combined Filters
**Objective**: Verify multiple filters work together

**Steps**:
1. Apply date range filter
2. Add camera filter
3. Add location filter
4. Change sorting

**Expected Results**:
- ✅ All filters apply simultaneously (AND logic)
- ✅ Active badges display for all filters
- ✅ Clearing one filter keeps others active
- ✅ "Clear all" button clears all filters
- ✅ Filter count badge shows correct number

---

## Issue #35: Test Face Detection Accuracy

### Test Cases

#### TC-35.1: Face Detection Trigger
**Objective**: Verify face detection can be triggered

**Steps**:
1. Upload 5-10 images with faces
2. Click "Detect Faces" button
3. Wait for detection to complete

**Expected Results**:
- ✅ Button shows "Detecting..." during processing
- ✅ Button becomes enabled after completion
- ✅ Face thumbnails appear in FaceFilterBar
- ✅ Face count matches detected faces
- ✅ No duplicate face thumbnails initially

**API Verification**:
```bash
# Trigger detection for all images
curl -X POST "http://localhost:3000/api/faces/detect" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"mode": "all"}'

# Check detection results
curl "http://localhost:3000/api/faces" \
  -H "Cookie: your-auth-cookie"
```

#### TC-35.2: Detection Accuracy
**Objective**: Verify face detection quality

**Upload images with**:
- ✅ Single face (frontal)
- ✅ Single face (profile)
- ✅ Multiple faces (group photo)
- ✅ Occluded faces (sunglasses, masks)
- ✅ Poor lighting
- ✅ Small faces (far from camera)

**Expected Results**:
- ✅ Clear frontal faces detected (>95% success)
- ✅ Profile faces mostly detected (>70% success)
- ✅ All faces in group photos detected
- ✅ Confidence scores reasonable (>0.5 for good detections)
- ✅ Low-confidence faces (<0.5) are rejected
- ✅ Face thumbnails are properly cropped

#### TC-35.3: Face Thumbnail Quality
**Objective**: Verify extracted face thumbnails look good

**Expected Results**:
- ✅ Face is centered in thumbnail
- ✅ Entire face visible (not cut off)
- ✅ Reasonable padding around face
- ✅ Aspect ratio preserved
- ✅ 64x64px circular display
- ✅ Image quality acceptable (not pixelated)

---

## Issue #36: Verify Face Clustering Behavior

### Test Cases

#### TC-36.1: Same Person Clustering
**Objective**: Verify same person's faces cluster together

**Steps**:
1. Upload 5+ images of the same person (various angles, lighting)
2. Trigger face detection
3. Check Face Management modal

**Expected Results**:
- ✅ Same person's faces grouped into one cluster
- ✅ Cluster shows correct image count
- ✅ Threshold: <0.6 euclidean distance clusters together
- ✅ Different angles of same person still cluster
- ✅ Lighting variations don't break clustering

**Clustering Statistics**:
```bash
# Get clustering stats
curl "http://localhost:3000/api/faces/stats" \
  -H "Cookie: your-auth-cookie"
```

Expected statistics:
- Matched faces: High percentage for same person
- New clusters: One per unique individual
- Rejected: Low-confidence detections

#### TC-36.2: Different People Separate
**Objective**: Verify different people create separate clusters

**Steps**:
1. Upload images of 3-5 different people
2. Trigger face detection
3. Verify separate face clusters

**Expected Results**:
- ✅ Each person has separate cluster
- ✅ No cross-contamination
- ✅ Face count accurate per person
- ✅ Thumbnails show representative face

#### TC-36.3: Re-clustering
**Objective**: Verify manual re-clustering works

**Steps**:
1. Have some detected faces
2. Click "Re-detect" button
3. Verify re-clustering occurs

**Expected Results**:
- ✅ All images re-processed
- ✅ Existing clusters updated
- ✅ Face descriptors recalculated
- ✅ Statistics reset and recounted
- ✅ UI updates after completion

**API Test**:
```bash
# Trigger re-clustering
curl -X POST "http://localhost:3000/api/faces/recluster" \
  -H "Cookie: your-auth-cookie"
```

#### TC-36.4: Clustering Edge Cases
**Test cases**:
- ✅ Identical twins (should cluster separately ideally)
- ✅ Same person with/without glasses
- ✅ Same person with beard vs clean-shaven
- ✅ Same person as child vs adult (may cluster separately)
- ✅ Very similar-looking people

**Expected behavior**:
- Slight variations (glasses) should still cluster
- Major changes (age) may create separate clusters
- Confidence scores should reflect uncertainty

---

## Issue #37: Test Face Management Operations

### Test Cases

#### TC-37.1: Face Selection and Filtering
**Objective**: Verify face filtering works

**Steps**:
1. Detect faces from multiple images
2. Click on a face thumbnail in FaceFilterBar
3. Verify gallery filters to that person
4. Select additional faces
5. Verify multi-select filtering

**Expected Results**:
- ✅ Clicking face thumbnail toggles selection
- ✅ Selected faces show blue ring indicator
- ✅ Gallery shows only images with selected faces
- ✅ Multiple faces can be selected (OR logic)
- ✅ Selection count badge displays
- ✅ "Clear selection" button removes all selections
- ✅ Pagination resets to page 1

**API Test**:
```bash
# Filter images by face IDs
curl "http://localhost:3000/api/images?faces=face-id-1,face-id-2" \
  -H "Cookie: your-auth-cookie"
```

#### TC-37.2: Rename Face
**Objective**: Verify face naming works

**Steps**:
1. Open Face Management modal
2. Click "Rename" on a face cluster
3. Enter a name (e.g., "John Smith")
4. Click "Save"

**Expected Results**:
- ✅ Input field appears with focus
- ✅ Name saves successfully
- ✅ Face thumbnail updates with new name
- ✅ Name persists after page refresh
- ✅ Empty name changes back to "Unknown"
- ✅ Special characters handled correctly

**API Test**:
```bash
# Update face name
curl -X PUT "http://localhost:3000/api/faces/FACE_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"name": "John Smith"}'
```

#### TC-37.3: Delete Face Cluster
**Objective**: Verify face deletion works

**Steps**:
1. Open Face Management modal
2. Click "Delete" on a face cluster
3. Confirm deletion

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Face cluster removed from database
- ✅ Face thumbnail removed from UI
- ✅ ImageFace relationships deleted
- ✅ Images still remain (only face data deleted)
- ✅ Gallery refreshes

**API Test**:
```bash
# Delete face cluster
curl -X DELETE "http://localhost:3000/api/faces/FACE_ID" \
  -H "Cookie: your-auth-cookie"
```

#### TC-37.4: Face Management Modal UI
**Objective**: Verify modal displays correctly

**Expected behavior**:
- ✅ Modal opens on "Manage Faces" button click
- ✅ Grid layout (2 columns) shows all faces
- ✅ Each face shows: thumbnail, name, image count
- ✅ Rename/Delete buttons visible
- ✅ Modal scrollable for many faces
- ✅ Modal closes properly
- ✅ Changes reflect immediately without refresh

---

## Issue #38: Performance Testing

### Test Cases

#### TC-38.1: Batch Upload Performance
**Objective**: Measure performance with multiple uploads

**Test scenarios**:
1. Upload 10 images simultaneously
2. Upload 25 images
3. Upload 50 images

**Measure**:
- ✅ Upload time per image
- ✅ EXIF extraction speed
- ✅ Database write performance
- ✅ Memory usage during uploads
- ✅ No timeout errors
- ✅ UI remains responsive

**Expected performance**:
- 10 images: <30 seconds total
- 25 images: <60 seconds total
- 50 images: <120 seconds total

#### TC-38.2: Face Detection Performance
**Objective**: Measure face detection speed

**Test with**:
- 10 images with faces
- 25 images with faces
- 50 images with faces

**Measure**:
- ✅ Detection time per image (~2-3 seconds per face)
- ✅ Clustering time
- ✅ Thumbnail generation time
- ✅ Total processing time
- ✅ CPU/memory usage
- ✅ No memory leaks

**Expected performance**:
- Single face detection: 2-5 seconds
- Clustering 50 faces: <10 seconds
- No process hangs or crashes

#### TC-38.3: Gallery Pagination Performance
**Objective**: Verify gallery loads quickly with many images

**Test with**:
- Gallery with 100+ images
- Apply various filters
- Navigate through pages

**Measure**:
- ✅ Initial page load: <2 seconds
- ✅ Pagination navigation: <1 second
- ✅ Filter application: <1 second
- ✅ Smooth scrolling
- ✅ No UI lag

#### TC-38.4: API Response Times
**Objective**: Verify API endpoints perform well

**Test endpoints**:
```bash
# Time each request
time curl "http://localhost:3000/api/images?limit=50" -H "Cookie: your-auth-cookie"
time curl "http://localhost:3000/api/faces?limit=100" -H "Cookie: your-auth-cookie"
time curl "http://localhost:3000/api/images/cameras" -H "Cookie: your-auth-cookie"
```

**Expected times**:
- GET /api/images: <500ms (with 50 results)
- GET /api/faces: <300ms (with 100 results)
- GET /api/images/cameras: <200ms

---

## Issue #34 (Alternative): Automated Test Suite

### Jest/Playwright Tests (Optional)

Create automated tests for critical paths:

```typescript
// tests/exif-extraction.test.ts
describe('EXIF Extraction', () => {
  it('extracts date taken from JPEG', async () => {
    // Upload test image with EXIF
    // Verify database contains correct dateTaken
  });

  it('extracts GPS coordinates', async () => {
    // Upload GPS-tagged image
    // Verify lat/long stored correctly
  });

  it('handles images without EXIF gracefully', async () => {
    // Upload screenshot
    // Verify null values handled properly
  });
});

// tests/face-detection.test.ts
describe('Face Detection', () => {
  it('detects single face in portrait', async () => {
    // Upload single-person image
    // Trigger detection
    // Verify one face detected
  });

  it('clusters same person across multiple images', async () => {
    // Upload 5 images of same person
    // Trigger detection
    // Verify single cluster created
  });
});

// tests/filtering.test.ts
describe('Metadata Filtering', () => {
  it('filters by date range', async () => {
    // Apply date filters
    // Verify correct images returned
  });

  it('filters by camera make', async () => {
    // Apply camera filter
    // Verify correct images returned
  });

  it('filters by face ID', async () => {
    // Select face
    // Verify only matching images shown
  });
});
```

---

## Manual Testing Checklist

### Initial Setup
- [ ] Development server running
- [ ] Database migrated and accessible
- [ ] Face-api.js models downloaded
- [ ] Test user logged in
- [ ] Browser console open (check for errors)

### EXIF Metadata Tests
- [ ] TC-33.1: Upload photo with EXIF, verify display
- [ ] TC-33.2: Test JPEG, PNG, WebP formats
- [ ] TC-33.3: Upload image without EXIF, verify hidden
- [ ] TC-33.4: Test partial/corrupted EXIF handling

### Metadata Filtering Tests
- [ ] TC-34.1: Date range filter works
- [ ] TC-34.2: Camera filter works
- [ ] TC-34.3: GPS filter works
- [ ] TC-34.4: All 8 sorting options work
- [ ] TC-34.5: Combined filters work together

### Face Detection Tests
- [ ] TC-35.1: Face detection triggers successfully
- [ ] TC-35.2: Various face types detected accurately
- [ ] TC-35.3: Face thumbnails look good

### Face Clustering Tests
- [ ] TC-36.1: Same person clusters together
- [ ] TC-36.2: Different people stay separate
- [ ] TC-36.3: Re-clustering works
- [ ] TC-36.4: Edge cases handled reasonably

### Face Management Tests
- [ ] TC-37.1: Face selection and filtering works
- [ ] TC-37.2: Rename face works
- [ ] TC-37.3: Delete face cluster works
- [ ] TC-37.4: Management modal UI correct

### Performance Tests
- [ ] TC-38.1: Batch upload 10, 25, 50 images
- [ ] TC-38.2: Face detection performance acceptable
- [ ] TC-38.3: Gallery pagination smooth
- [ ] TC-38.4: API response times under limits

---

## Bug Report Template

If issues found:

```markdown
**Bug**: [Short description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots**:


**Environment**:
- OS: 
- Browser: 
- Node version: 
- Database: 

**Console Errors**:
```

---

## Test Results Summary

After testing, complete this summary:

**Date**: _______________  
**Tester**: _______________

**Test Coverage**:
- EXIF Tests: __ / 4 passed
- Filter Tests: __ / 5 passed
- Detection Tests: __ / 3 passed
- Clustering Tests: __ / 4 passed
- Management Tests: __ / 4 passed
- Performance Tests: __ / 4 passed

**Total**: __ / 24 test cases passed

**Bugs Found**: _______

**Critical Issues**: _______

**Ready for Production**: Yes / No
