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
const srcCssPath = path.join(__dirname, '../../frontend/src/css/admin-dashboard.css');
const publicMockDataPath = path.join(__dirname, '../../frontend/public/js/mock-data.js');
const srcMockDataPath = path.join(__dirname, '../../frontend/src/js/mock-data.js');
const adminRoutesPath = path.join(__dirname, '../src/routes/adminRoutes.js');
const adminControllerPath = path.join(__dirname, '../src/controllers/adminController.js');

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Running Comprehensive Admin Statistics Verification');
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

  // 1. Controller Functions & Backend Calculations
  await test('Task 1: Controller exports getFulfillmentStats and getGeographicStats', () => {
    assert(typeof adminController.getFulfillmentStats === 'function', 'getFulfillmentStats must be exported');
    assert(typeof adminController.getGeographicStats === 'function', 'getGeographicStats must be exported');
    assert(typeof adminController.getDashboard === 'function', 'getDashboard must be exported');
    assert(typeof adminController.getRequestTypesStats === 'function', 'getRequestTypesStats must be exported');
    assert(typeof adminController.getBloodInventoryStats === 'function', 'getBloodInventoryStats must be exported');
    assert(typeof adminController.getSignupsStats === 'function', 'getSignupsStats must be exported');

    const controllerCode = fs.readFileSync(adminControllerPath, 'utf8');
    assert(controllerCode.includes('criticalAlerts:'), 'getDashboard must aggregate criticalAlerts');
    assert(controllerCode.includes('verificationBottlenecks:'), 'getDashboard must aggregate verificationBottlenecks');
    assert(controllerCode.includes('export const getFulfillmentStats'), 'getFulfillmentStats definition present');
    assert(controllerCode.includes('export const getGeographicStats'), 'getGeographicStats definition present');
  });

  // 2. Route Registration
  await test('Task 2: Routes /stats/fulfillment and /stats/geographic are registered', () => {
    const routesCode = fs.readFileSync(adminRoutesPath, 'utf8');
    assert(routesCode.includes("router.get('/stats/fulfillment', getFulfillmentStats)"), 'Route /stats/fulfillment registered in adminRoutes.js');
    assert(routesCode.includes("router.get('/stats/geographic', getGeographicStats)"), 'Route /stats/geographic registered in adminRoutes.js');

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

    assert(routes.some(r => r.path === '/stats/fulfillment' && r.methods.includes('get')), 'GET /stats/fulfillment registered on Express Router');
    assert(routes.some(r => r.path === '/stats/geographic' && r.methods.includes('get')), 'GET /stats/geographic registered on Express Router');
  });

  // 3. HTML Markup & KPI Widgets in Public and Src HTML
  await test('Task 3: Dashboard & Statistics views have all required widgets in public and src HTML', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');

      // Main Dashboard widgets
      assert(html.includes('id="critical-alert-banner-container"'), `${htmlPath} must contain critical-alert-banner-container`);
      assert(html.includes('id="stat-pending-verifications"'), `${htmlPath} must contain stat-pending-verifications`);
      assert(html.includes('id="stat-total-bloodbanks"'), `${htmlPath} must contain stat-total-bloodbanks`);
      assert(html.includes('id="stat-total-hospitals"'), `${htmlPath} must contain stat-total-hospitals`);
      assert(html.includes('id="stat-total-donors"'), `${htmlPath} must contain stat-total-donors`);
      assert(html.includes('id="stat-total-requests"'), `${htmlPath} must contain stat-total-requests`);
      assert(html.includes('id="stat-completed-donations"'), `${htmlPath} must contain stat-completed-donations`);

      // Statistics view widgets
      assert(html.includes('id="fulfillment-cards-grid"'), `${htmlPath} must contain fulfillment-cards-grid`);
      assert(html.includes('id="geographic-cards-grid"'), `${htmlPath} must contain geographic-cards-grid`);
      assert(html.includes('id="signupsLineChart"'), `${htmlPath} must contain signupsLineChart`);
      assert(html.includes('id="stats-summary-table-body"'), `${htmlPath} must contain stats-summary-table-body`);
      assert(html.includes('id="stats-hospital-ranking-body"'), `${htmlPath} must contain stats-hospital-ranking-body`);
      assert(html.includes('exportStatsReport('), `${htmlPath} must wire exportStatsReport`);
    });
  });

  // 4. JavaScript Functions in Public and Src HTML
  await test('Task 4: Required analytical and alert functions are declared in public and src HTML', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('function fetchFulfillmentStats'), `${htmlPath} must define fetchFulfillmentStats`);
      assert(html.includes('function renderFulfillmentStats'), `${htmlPath} must define renderFulfillmentStats`);
      assert(html.includes('function fetchGeographicStats'), `${htmlPath} must define fetchGeographicStats`);
      assert(html.includes('function renderGeographicStats'), `${htmlPath} must define renderGeographicStats`);
      assert(html.includes('function renderCriticalAlertsBanner'), `${htmlPath} must define renderCriticalAlertsBanner`);
      assert(html.includes('function exportStatsReport'), `${htmlPath} must define exportStatsReport`);
      assert(html.includes('function setStatsRange'), `${htmlPath} must define setStatsRange`);
    });
  });

  // 5. CSS Rules in Src Stylesheet
  await test('Task 5: CSS styles exist for critical alerts, fulfillment metrics, and geographic cards in src/css', () => {
    assert(!fs.existsSync(publicCssPath), 'public/css/dashboard.css must be removed');
    assert(fs.existsSync(srcCssPath), 'src/css/dashboard.css must exist');
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('.critical-alert-banner'), `${srcCssPath} must contain .critical-alert-banner`);
    assert(css.includes('.fulfillment-grid'), `${srcCssPath} must contain .fulfillment-grid`);
    assert(css.includes('.geo-grid'), `${srcCssPath} must contain .geo-grid`);
    assert(css.includes('.status-pill-deficit'), `${srcCssPath} must contain .status-pill-deficit`);
    assert(css.includes('.status-pill-surplus'), `${srcCssPath} must contain .status-pill-surplus`);
    assert(css.includes('.stock-healthy-tag'), `${srcCssPath} must contain .stock-healthy-tag`);
    assert(css.includes('.low-stock-critical-tag'), `${srcCssPath} must contain .low-stock-critical-tag`);
  });

  // 6. Mock Data Module Verification
  await test('Task 6: Mock data in src/js provides fulfillment and geographic data and helper functions', async () => {
    assert(!fs.existsSync(publicMockDataPath), 'public/js/mock-data.js must be removed');
    assert(fs.existsSync(srcMockDataPath), 'src/js/mock-data.js must exist');
    const mockModule = await import(`file://${srcMockDataPath.replace(/\\/g, '/')}`);
    const mock = mockModule.default || mockModule;
    assert(mock.defaultFulfillmentStats, `${srcMockDataPath} must contain defaultFulfillmentStats`);
    assert(mock.defaultGeographicStats, `${srcMockDataPath} must contain defaultGeographicStats`);
    assert(typeof mock.getMockFulfillmentForTimeframe === 'function', `${srcMockDataPath} must provide getMockFulfillmentForTimeframe`);
    assert(typeof mock.getMockGeographicStats === 'function', `${srcMockDataPath} must provide getMockGeographicStats`);

    const todayFulfillment = mock.getMockFulfillmentForTimeframe('today');
    assert(todayFulfillment.breakdown.length > 0, 'Today fulfillment breakdown must have entries');
    const geo = mock.getMockGeographicStats();
    assert(geo.regions.length > 0, 'Geographic regions must be populated');
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
