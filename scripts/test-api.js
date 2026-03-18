#!/usr/bin/env node

/**
 * API Integration Tests for Image Upload App
 * Tests EXIF metadata extraction, face detection, and filtering APIs
 * 
 * Usage: node scripts/test-api.js
 * Requires: Development server running on http://localhost:3000
 */

/* eslint-disable */
const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';

let authCookie = '';
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper: Make HTTP request
function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
        ...headers
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Save cookies from response
        if (res.headers['set-cookie']) {
          authCookie = res.headers['set-cookie']
            .map(c => c.split(';')[0])
            .join('; ');
        }

        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

// Test assertion helper
function assert(condition, testName, message) {
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED`);
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, message });
    console.log(`❌ ${testName}: FAILED - ${message}`);
    return false;
  }
}

// Authentication
async function authenticate() {
  console.log('\n=== Authentication ===');
  
  try {
    // Attempt login (simplified - may need adjustment based on actual auth flow)
    const loginRes = await request('POST', '/api/auth/callback/credentials', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      callbackUrl: '/gallery'
    });

    assert(
      loginRes.status === 200 || loginRes.status === 302,
      'Authentication',
      'Should login successfully'
    );

    return true;
  } catch (err) {
    console.error('Authentication failed:', err.message);
    assert(false, 'Authentication', err.message);
    return false;
  }
}

// Test 1: GET /api/images with metadata
async function testGetImages() {
  console.log('\n=== Test: GET /api/images ===');
  
  try {
    const res = await request('GET', '/api/images?limit=5');
    
    assert(res.status === 200, 'GET /api/images - Status', 'Should return 200');
    assert(res.data.images !== undefined, 'GET /api/images - Response structure', 'Should have images array');
    assert(res.data.pagination !== undefined, 'GET /api/images - Pagination', 'Should have pagination data');
    
    if (res.data.images && res.data.images.length > 0) {
      const image = res.data.images[0];
      const hasExifFields = [
        'dateTaken', 'gpsLatitude', 'gpsLongitude', 'cameraMake', 
        'cameraModel', 'fNumber', 'exposureTime', 'iso', 'focalLength'
      ].some(field => image[field] !== undefined);
      
      assert(hasExifFields, 'GET /api/images - EXIF fields', 'Should include EXIF metadata fields');
    }
  } catch (err) {
    assert(false, 'GET /api/images', err.message);
  }
}

// Test 2: Date range filtering
async function testDateRangeFilter() {
  console.log('\n=== Test: Date Range Filtering ===');
  
  try {
    const dateFrom = '2020-01-01';
    const dateTo = '2025-12-31';
    const res = await request('GET', `/api/images?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    
    assert(res.status === 200, 'Date range filter - Status', 'Should return 200');
    
    if (res.data.images && res.data.images.length > 0) {
      const allInRange = res.data.images.every(img => {
        if (!img.dateTaken) return true; // Null dates pass
        const date = new Date(img.dateTaken);
        return date >= new Date(dateFrom) && date <= new Date(dateTo);
      });
      assert(allInRange, 'Date range filter - Results', 'All results should be within date range');
    } else {
      console.log('⚠️  No images with dateTaken to test filtering');
    }
  } catch (err) {
    assert(false, 'Date range filter', err.message);
  }
}

// Test 3: Camera filtering
async function testCameraFilter() {
  console.log('\n=== Test: Camera Filtering ===');
  
  try {
    // First get available cameras
    const camerasRes = await request('GET', '/api/images/cameras');
    assert(camerasRes.status === 200, 'GET /api/images/cameras - Status', 'Should return 200');
    assert(Array.isArray(camerasRes.data.cameras), 'GET /api/images/cameras - Response', 'Should return cameras array');
    
    if (camerasRes.data.cameras.length > 0) {
      const camera = camerasRes.data.cameras[0];
      const res = await request('GET', `/api/images?cameraMake=${encodeURIComponent(camera.make)}&cameraModel=${encodeURIComponent(camera.model)}`);
      
      assert(res.status === 200, 'Camera filter - Status', 'Should return 200');
      
      if (res.data.images && res.data.images.length > 0) {
        const allMatch = res.data.images.every(img => 
          img.cameraMake === camera.make && img.cameraModel === camera.model
        );
        assert(allMatch, 'Camera filter - Results', 'All results should match camera filter');
      }
      
      assert(
        camerasRes.data.cameras[0].count > 0,
        'Camera filter - Counts',
        'Should include image counts'
      );
    } else {
      console.log('⚠️  No cameras found to test filtering');
    }
  } catch (err) {
    assert(false, 'Camera filter', err.message);
  }
}

// Test 4: GPS filtering
async function testGPSFilter() {
  console.log('\n=== Test: GPS Location Filtering ===');
  
  try {
    const withGPS = await request('GET', '/api/images?hasGPS=true');
    assert(withGPS.status === 200, 'GPS filter (with) - Status', 'Should return 200');
    
    if (withGPS.data.images && withGPS.data.images.length > 0) {
      const allHaveGPS = withGPS.data.images.every(img => 
        img.gpsLatitude !== null && img.gpsLongitude !== null
      );
      assert(allHaveGPS, 'GPS filter (with) - Results', 'All results should have GPS data');
    }
    
    const withoutGPS = await request('GET', '/api/images?hasGPS=false');
    assert(withoutGPS.status === 200, 'GPS filter (without) - Status', 'Should return 200');
    
    if (withoutGPS.data.images && withoutGPS.data.images.length > 0) {
      const noneMissGPS = withoutGPS.data.images.every(img => 
        img.gpsLatitude === null || img.gpsLongitude === null
      );
      assert(noneMissGPS, 'GPS filter (without) - Results', 'Results should be missing GPS data');
    }
  } catch (err) {
    assert(false, 'GPS filter', err.message);
  }
}

// Test 5: Sorting
async function testSorting() {
  console.log('\n=== Test: Sorting Options ===');
  
  const sortOptions = [
    { sortBy: 'createdAt', sortOrder: 'desc' },
    { sortBy: 'createdAt', sortOrder: 'asc' },
    { sortBy: 'originalName', sortOrder: 'asc' },
    { sortBy: 'size', sortOrder: 'desc' }
  ];
  
  for (const sort of sortOptions) {
    try {
      const res = await request('GET', `/api/images?sortBy=${sort.sortBy}&sortOrder=${sort.sortOrder}&limit=5`);
      assert(
        res.status === 200,
        `Sort by ${sort.sortBy} ${sort.sortOrder} - Status`,
        'Should return 200'
      );
      
      if (res.data.images && res.data.images.length > 1) {
        // Verify sort order
        let sorted = true;
        for (let i = 1; i < res.data.images.length; i++) {
          const prev = res.data.images[i - 1][sort.sortBy];
          const curr = res.data.images[i][sort.sortBy];
          
          if (sort.sortOrder === 'asc' && prev > curr) sorted = false;
          if (sort.sortOrder === 'desc' && prev < curr) sorted = false;
        }
        
        assert(
          sorted,
          `Sort by ${sort.sortBy} ${sort.sortOrder} - Order`,
          'Results should be in correct sort order'
        );
      }
    } catch (err) {
      assert(false, `Sort by ${sort.sortBy} ${sort.sortOrder}`, err.message);
    }
  }
}

// Test 6: GET /api/faces
async function testGetFaces() {
  console.log('\n=== Test: GET /api/faces ===');
  
  try {
    const res = await request('GET', '/api/faces?limit=10');
    
    assert(res.status === 200, 'GET /api/faces - Status', 'Should return 200');
    assert(Array.isArray(res.data.faces), 'GET /api/faces - Response', 'Should return faces array');
    assert(res.data.pagination !== undefined, 'GET /api/faces - Pagination', 'Should have pagination');
    
    if (res.data.faces.length > 0) {
      const face = res.data.faces[0];
      assert(face.id !== undefined, 'GET /api/faces - Face ID', 'Face should have ID');
      assert(face.thumbnailPath !== undefined, 'GET /api/faces - Thumbnail', 'Face should have thumbnail path');
      assert(typeof face.imageCount === 'number', 'GET /api/faces - Count', 'Face should have image count');
    } else {
      console.log('⚠️  No faces detected yet');
    }
  } catch (err) {
    assert(false, 'GET /api/faces', err.message);
  }
}

// Test 7: Face filtering
async function testFaceFilter() {
  console.log('\n=== Test: Face Filtering ===');
  
  try {
    const facesRes = await request('GET', '/api/faces?limit=1');
    
    if (facesRes.data.faces && facesRes.data.faces.length > 0) {
      const faceId = facesRes.data.faces[0].id;
      const res = await request('GET', `/api/images?faces=${faceId}`);
      
      assert(res.status === 200, 'Face filter - Status', 'Should return 200');
      console.log(`✅ Face filter returned ${res.data.images.length} images`);
    } else {
      console.log('⚠️  No faces to test filtering');
    }
  } catch (err) {
    assert(false, 'Face filter', err.message);
  }
}

// Test 8: Face detection trigger
async function testFaceDetection() {
  console.log('\n=== Test: Face Detection ===');
  
  try {
    // Note: This will be slow for many images
    const res = await request('POST', '/api/faces/detect', {
      mode: 'unprocessed' // Only process new images
    });
    
    assert(
      res.status === 200 || res.status === 201,
      'POST /api/faces/detect - Status',
      'Should trigger face detection'
    );
    
    if (res.data.processed !== undefined) {
      console.log(`✅ Processed ${res.data.processed} images`);
    }
  } catch (err) {
    assert(false, 'Face detection trigger', err.message);
  }
}

// Test 9: Face clustering stats
async function testFaceStats() {
  console.log('\n=== Test: Face Clustering Stats ===');
  
  try {
    const res = await request('GET', '/api/faces/stats');
    
    assert(res.status === 200, 'GET /api/faces/stats - Status', 'Should return 200');
    assert(typeof res.data.totalFaces === 'number', 'Face stats - Total', 'Should have totalFaces count');
    assert(typeof res.data.matchedToExisting === 'number', 'Face stats - Matched', 'Should have matched count');
    assert(typeof res.data.newClustersCreated === 'number', 'Face stats - New', 'Should have new clusters count');
    
    console.log(`  Total faces: ${res.data.totalFaces}`);
    console.log(`  Matched: ${res.data.matchedToExisting}`);
    console.log(`  New clusters: ${res.data.newClustersCreated}`);
  } catch (err) {
    assert(false, 'Face stats', err.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting API Integration Tests\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User: ${TEST_EMAIL}\n`);
  
  const authenticated = await authenticate();
  
  if (!authenticated) {
    console.log('\n❌ Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }
  
  // Run all tests
  await testGetImages();
  await testDateRangeFilter();
  await testCameraFilter();
  await testGPSFilter();
  await testSorting();
  await testGetFaces();
  await testFaceFilter();
  await testFaceDetection();
  await testFaceStats();
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.errors.forEach(err => {
      console.log(`  - ${err.test}: ${err.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runTests, request };
