import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import * as donorController from '../src/user/donor/donorController.js';
import * as donorRoutes from '../src/user/donor/donorRoutes.js';
import * as donorValidator from '../src/user/donor/donorValidator.js';
import * as hospitalController from '../src/user/hospital/hospitalController.js';
import * as hospitalRoutes from '../src/user/hospital/hospitalRoutes.js';
import * as bloodBankController from '../src/user/bloodbank/bloodBankController.js';
import * as bloodBankRoutes from '../src/user/bloodbank/bloodBankRoutes.js';
import * as adminController from '../src/controllers/adminController.js';
import * as auditService from '../src/services/auditService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

async function runTests() {
  console.log('====================================================');
  console.log('🔍 Starting Folder Structure & Route Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Verify module exports and structure
  await test('User module exports exist in user/donor, user/hospital, user/bloodbank', () => {
    assert(donorController.getProfile, 'donorController.getProfile missing');
    assert(donorController.updateProfile, 'donorController.updateProfile missing');
    assert(donorController.getDashboard, 'donorController.getDashboard missing');
    assert(donorValidator.updateProfileValidation, 'donorValidator.updateProfileValidation missing');
    assert(hospitalController.getDashboardStats, 'hospitalController.getDashboardStats missing');
    assert(hospitalController.getProfile, 'hospitalController.getProfile missing');
    assert(bloodBankController.getDashboardStats, 'bloodBankController.getDashboardStats missing');
    assert(bloodBankController.getProfile, 'bloodBankController.getProfile missing');
  });

  // 2. Start HTTP server to test express router mounting & route matching
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = jwt.sign(
    { id: 'test-admin-id', role: 'ADMIN', email: 'admin@lifelink.org' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const donorToken = jwt.sign(
    { id: 'test-donor-id', role: 'DONOR', email: 'donor@lifelink.org' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // 3. Test Admin endpoints are mounted and accessible (expecting 200 or db/auth response, not 404)
    const adminEndpoints = [
      { method: 'GET', path: '/api/admin/hospitals', name: 'GET /api/admin/hospitals' },
      { method: 'PUT', path: '/api/admin/hospitals/test-id/verify', name: 'PUT /api/admin/hospitals/:id/verify', body: { verificationStatus: 'VERIFIED' } },
      { method: 'GET', path: '/api/admin/blood-banks', name: 'GET /api/admin/blood-banks' },
      { method: 'PUT', path: '/api/admin/blood-banks/test-id/verify', name: 'PUT /api/admin/blood-banks/:id/verify', body: { verificationStatus: 'VERIFIED' } },
      { method: 'GET', path: '/api/admin/donors', name: 'GET /api/admin/donors' },
      { method: 'PUT', path: '/api/admin/donors/test-id/verify', name: 'PUT /api/admin/donors/:id/verify', body: { isVerified: true } },
      { method: 'GET', path: '/api/admin/audit-logs', name: 'GET /api/admin/audit-logs' }
    ];

    for (const ep of adminEndpoints) {
      await test(`Endpoint ${ep.name} responds without 404 Route Not Found`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined
        });

        const data = await res.json().catch(() => ({}));
        // Must NOT be 404 Route Not Found
        if (res.status === 404 && data.message === 'Route not found') {
          throw new Error(`Endpoint ${ep.name} returned 404 Route Not Found`);
        }
      });
    }

    // 4. Test User endpoints under /api/donors, /api/hospitals, /api/blood-banks
    const userEndpoints = [
      { method: 'GET', path: '/api/donors/dashboard', role: donorToken, name: 'GET /api/donors/dashboard' },
      { method: 'GET', path: '/api/hospitals/dashboard', role: adminToken, name: 'GET /api/hospitals/dashboard' },
      { method: 'GET', path: '/api/blood-banks/dashboard', role: adminToken, name: 'GET /api/blood-banks/dashboard' }
    ];

    for (const ep of userEndpoints) {
      await test(`User endpoint ${ep.name} is mounted without 404 Route Not Found`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: {
            'Authorization': `Bearer ${ep.role}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json().catch(() => ({}));
        if (res.status === 404 && data.message === 'Route not found') {
          throw new Error(`Endpoint ${ep.name} returned 404 Route Not Found`);
        }
      });
    }

    // 5. Verify Admin Controller and Audit Log functions
    await test('Admin controller handlers exist and are functions', () => {
      assert(typeof adminController.getHospitals === 'function', 'getHospitals is not a function');
      assert(typeof adminController.verifyHospital === 'function', 'verifyHospital is not a function');
      assert(typeof adminController.getBloodBanks === 'function', 'getBloodBanks is not a function');
      assert(typeof adminController.verifyBloodBank === 'function', 'verifyBloodBank is not a function');
      assert(typeof adminController.getDonors === 'function', 'getDonors is not a function');
      assert(typeof adminController.verifyDonor === 'function', 'verifyDonor is not a function');
      assert(typeof adminController.getAuditLogs === 'function', 'getAuditLogs is not a function');
      assert(typeof auditService.createAuditLog === 'function', 'createAuditLog is not a function');
    });

    console.log('\n====================================================');
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
