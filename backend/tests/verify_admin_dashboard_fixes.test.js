// backend/tests/verify_admin_dashboard_fixes.test.js
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import * as adminController from '../src/controllers/adminController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicHtmlPath = path.join(__dirname, '../../frontend/public/admin-dashboard.html');
const publicCssPath = path.join(__dirname, '../../frontend/public/css/dashboard.css');
const srcCssPath = path.join(__dirname, '../../frontend/src/css/dashboard.css');
const publicMockDataPath = path.join(__dirname, '../../frontend/public/js/mock-data.js');
const srcMockDataPath = path.join(__dirname, '../../frontend/src/js/mock-data.js');
const adminControllerPath = path.join(__dirname, '../src/controllers/adminController.js');

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Running Verification Tests for Admin Dashboard Fixes');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

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

  // 1. Backend Controller Timeframe Filtering Code Inspection
  await test('Task 1: adminController applies timeframe filtering in getDashboard and getRequestTypesStats', () => {
    const controller = fs.readFileSync(adminControllerPath, 'utf8');
    assert(controller.includes('where: createdFilter'), 'getDashboard must apply createdFilter to recentRequests, recentAuditLogs and donationUnitsAgg');
    assert(controller.includes('export const getRequestTypesStats'), 'getRequestTypesStats must be exported');
    assert(controller.includes('timeframe'), 'getRequestTypesStats must read timeframe query parameter');
    assert(typeof adminController.getDashboard === 'function', 'getDashboard must be a function');
    assert(typeof adminController.getRequestTypesStats === 'function', 'getRequestTypesStats must be a function');
  });

  // 2. HTML: No duplicate stylesheet links
  await test('Task 4: Exactly one admin-dashboard.css or dashboard.css stylesheet link exists in public HTML pointing to src', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      const matches = html.match(/<link[^>]*href=["'][^"']*(?:admin-)?dashboard\.css["'][^>]*>/g) || [];
      assert.strictEqual(matches.length, 1, `Expected 1 stylesheet link tag in ${htmlPath}, found ${matches.length}`);
      assert(html.includes('href="../src/css/admin-dashboard.css"') || html.includes('href="../src/css/dashboard.css"'), `${htmlPath} must link to ../src/css/(admin-)dashboard.css`);
    });
  });

  // 3. CSS: No dead nav-user-search CSS
  await test('Task 5: Dead in-nav search CSS rules are removed from dashboard.css', () => {
    assert(!fs.existsSync(publicCssPath), 'public/css/dashboard.css must be removed');
    assert(fs.existsSync(srcCssPath), 'src/css/dashboard.css must exist');
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(!css.includes('.nav-user-search-wrap'), `.nav-user-search-wrap must be removed from ${srcCssPath}`);
    assert(!css.includes('.nav-user-search-box'), `.nav-user-search-box must be removed from ${srcCssPath}`);
    assert(!css.includes('.nav-user-search-input'), `.nav-user-search-input must be removed from ${srcCssPath}`);
  });

  // 4. JS: Unused handleUserNavSearch removed
  await test('Task 6: Unused function handleUserNavSearch is removed from HTML scripts', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(!html.includes('function handleUserNavSearch'), `handleUserNavSearch must not exist in ${htmlPath}`);
    });
  });

  // 5. Mock Data Extracted & Timeframe Utilities Test
  await test('Task 7: Mock data file exists in src/js and provides timeframe filtering', async () => {
    assert(!fs.existsSync(publicMockDataPath), 'public/js/mock-data.js must be removed');
    assert(fs.existsSync(srcMockDataPath), 'src/js/mock-data.js must exist');
    const mockModule = await import(`file://${srcMockDataPath.replace(/\\/g, '/')}`);
    const mockData = mockModule.default || mockModule;
    assert(mockData.defaultUsers.length > 0, 'mockData.defaultUsers must be populated');
    assert(mockData.defaultRequests.length > 0, 'mockData.defaultRequests must be populated');
    assert(typeof mockData.filterMockDataByTimeframe === 'function', 'filterMockDataByTimeframe must be a function');
    assert(typeof mockData.getMockRequestTypesForTimeframe === 'function', 'getMockRequestTypesForTimeframe must be a function');

    const todayData = mockData.filterMockDataByTimeframe('today');
    const allData = mockData.filterMockDataByTimeframe('alltime');
    assert(todayData.requests.length <= allData.requests.length, 'Today requests should be <= alltime requests');

    const todayChart = mockData.getMockRequestTypesForTimeframe('today');
    const allChart = mockData.getMockRequestTypesForTimeframe('alltime');
    assert(todayChart.total <= allChart.total, 'Today chart total should be <= alltime chart total');

    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('src="../src/js/mock-data.js"'), `HTML at ${htmlPath} must load ../src/js/mock-data.js`);
    });
  });

  // 6. Dynamic API_BASE configuration
  await test('Task 2: API_BASE is dynamic and not hardcoded to http://localhost:5000/api', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(!html.includes("const API_BASE = 'http://localhost:5000/api';"), `Hardcoded API_BASE must be replaced in ${htmlPath}`);
      assert(html.includes('window.ENV?.API_BASE') || html.includes('window.API_BASE') || html.includes('window.API_URL'), 'Must use configurable API_BASE resolution');
    });
  });

  // 7. Statistics Line Chart on First Open
  await test('Task 3: Statistics view triggers line chart resize / render on view switch', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes("viewName === 'statistics'"), 'Must handle statistics in switchView');
      assert(html.includes('signupsChartInstance.resize()') || html.includes('renderSignupsChart()'), 'Must resize or render signups line chart on statistics view activation');
    });
  });

  // 8. Express Router Route Matching Test
  await test('Express Router registers /dashboard and /stats/request-types', () => {
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

    const hasDashboard = routes.some(r => r.path === '/dashboard' && r.methods.includes('get'));
    const hasRequestTypes = routes.some(r => r.path === '/stats/request-types' && r.methods.includes('get'));
    assert(hasDashboard, 'Route GET /dashboard must be registered');
    assert(hasRequestTypes, 'Route GET /stats/request-types must be registered');
  });

  console.log('\n===========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('===========================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
