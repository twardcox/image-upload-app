# Testing README

Quick reference for running tests on the image metadata and face detection features.

## Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run tests
node scripts/test-api.js
```

## What Gets Tested

### Automated Tests (`scripts/test-api.js`)

✅ **Metadata Features**
- EXIF extraction and API responses
- Date range filtering
- Camera/device filtering  
- GPS location filtering
- All 8 sorting options

✅ **Face Detection Features**
- Face detection trigger
- Face listing and pagination
- Face-based image filtering
- Clustering statistics

### Manual Tests (`TESTING_CHECKLIST.md`)

See the comprehensive checklist for:
- UI component testing
- Edge case validation
- Performance benchmarks
- Cross-browser testing

## Test Environment Setup

### 1. Create Test User

Navigate to `/signup` and create:
- Email: `test@example.com`
- Password: `test123`

### 2. Prepare Test Images

You need:
- **EXIF-rich**: Smartphone photos with metadata
- **Faces**: Photos with clear faces (5+ of same person)
- **GPS-tagged**: Images with location data
- **Various**: Screenshots, different cameras, etc.

### 3. Run Automated Tests

```bash
# Basic run
node scripts/test-api.js

# Custom configuration
TEST_BASE_URL=http://localhost:3001 \
TEST_EMAIL=admin@test.com \
TEST_PASSWORD=secret \
node scripts/test-api.js
```

## Expected Results

All tests should pass:

```
🎉 All tests passed!
✅ Passed: 28
❌ Failed: 0
```

## Common Issues

**Authentication fails**:
- Check dev server is running
- Verify test user exists
- Check .env configuration

**No faces detected**:
- Verify face-api.js models in `public/models/`
- Check console for errors
- Ensure images have clear faces

**EXIF not extracting**:
- Verify exifr package installed
- Check images actually have EXIF data
- Test with sample images from exif-samples repo

## Performance Targets

- Image upload: <5s each
- Face detection: 2-5s per face
- API responses: <500ms
- Gallery pagination: <1s

## Full Documentation

- **Comprehensive checklist**: `TESTING_CHECKLIST.md`
- **Step-by-step guide**: See manual testing sections
- **Implementation details**: `IMPLEMENTATION_ROADMAP.md`

## Quick Manual Tests

1. **Upload image** → Verify EXIF displays
2. **Filter by date** → Verify correct results
3. **Detect faces** → Verify faces found
4. **Select face** → Verify image filtering
5. **Rename face** → Verify name updates

All working? ✅ Ready for production testing!
