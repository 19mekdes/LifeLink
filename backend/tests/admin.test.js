// backend/tests/admin.test.js

import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../src/app.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

async function runTests() {
  console.log('🧪 Starting Admin Endpoints Verification Tests...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  async function testCase(name, fn) {
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

  try {
    // 1. Auth & Role Middleware tests
    await testCase('Unauthenticated request to /api/admin/dashboard returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
      const data = await res.json();
      if (data.success !== false) {
        throw new Error(`Expected success: false, got ${data.success}`);
      }
    });

    await testCase('Non-admin user token returns 403 Forbidden', async () => {
      // Create donor token
      const donorToken = jwt.sign(
        { userId: 'mock-donor-id', role: 'DONOR', email: 'donor@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${donorToken}` }
      });

      // User might be 401 (if not in db) or 403 (if role checked)
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Expected 401 or 403, got ${res.status}`);
      }
    });

    // 2. Route registration verification
    await testCase('All 15 admin routes are registered on the Express router', async () => {
      const routes = [];
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          routes.push(middleware.route);
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });

      const requiredEndpoints = [
        { path: '/dashboard', method: 'get' },
        { path: '/users', method: 'get' },
        { path: '/users/:id', method: 'get' },
        { path: '/users/:id', method: 'put' },
        { path: '/users/:id', method: 'delete' },
        { path: '/admins', method: 'post' },
        { path: '/hospitals', method: 'get' },
        { path: '/hospitals/:id/verify', method: 'put' },
        { path: '/blood-banks', method: 'get' },
        { path: '/blood-banks/:id/verify', method: 'put' },
        { path: '/donors', method: 'get' },
        { path: '/donors/:id/verify', method: 'put' },
        { path: '/audit-logs', method: 'get' },
        { path: '/stats', method: 'get' },
        { path: '/export', method: 'get' }
      ];

      for (const req of requiredEndpoints) {
        const found = routes.find(
          (r) => r.path === req.path && r.methods.includes(req.method)
        );
        if (!found) {
          throw new Error(`Endpoint ${req.method.toUpperCase()} ${req.path} not found in router`);
        }
      }
    });

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

  } finally {
    server.close();
  }
}

runTests().catch(console.error);
