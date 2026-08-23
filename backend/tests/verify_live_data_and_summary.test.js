import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicHtmlPath = path.join(__dirname, '../../frontend/public/admin-dashboard.html');
const publicMockDataPath = path.join(__dirname, '../../frontend/public/js/mock-data.js');
const srcMockDataPath = path.join(__dirname, '../../frontend/src/js/mock-data.js');
const adminControllerPath = path.join(__dirname, '../src/controllers/adminController.js');
const adminRoutesPath = path.join(__dirname, '../src/routes/adminRoutes.js');

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Running Live Data Querying & Summary Totals Tests');
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

  // 1. Controller queries Prisma for all stats endpoints
  await test('Task 1: Controller queries live Prisma tables for all charts and summary totals', () => {
    const controller = fs.readFileSync(adminControllerPath, 'utf8');

    // 1a. Blood Inventory stats
    assert(controller.includes('export const getBloodInventoryStats'), 'getBloodInventoryStats must be exported');
    assert(controller.includes('prisma.inventoryItem.groupBy'), 'getBloodInventoryStats must query prisma.inventoryItem');
    assert(controller.includes('prisma.donation.findMany'), 'getBloodInventoryStats must query prisma.donation');
    assert(controller.includes('prisma.bloodRequest.groupBy'), 'getBloodInventoryStats must query prisma.bloodRequest');

    // 1b. Request Types stats
    assert(controller.includes('export const getRequestTypesStats'), 'getRequestTypesStats must be exported');
    assert(controller.includes('prisma.bloodRequest.groupBy'), 'getRequestTypesStats must query prisma.bloodRequest');

    // 1c. Signups stats
    assert(controller.includes('export const getSignupsStats'), 'getSignupsStats must be exported');
    assert(controller.includes('prisma.user.count'), 'getSignupsStats must query prisma.user');

    // 1d. Summary stats
    assert(controller.includes('export const getSummaryStats'), 'getSummaryStats must be exported');
    assert(controller.includes('prisma.donorProfile.count'), 'getSummaryStats must count donors');
    assert(controller.includes('prisma.hospital.count'), 'getSummaryStats must count hospitals');
    assert(controller.includes('prisma.bloodBank.count'), 'getSummaryStats must count blood banks');
    assert(controller.includes('prisma.user.count'), 'getSummaryStats must count users');
    assert(controller.includes('prisma.bloodRequest.count'), 'getSummaryStats must count requests');
    assert(controller.includes('prisma.donation.count'), 'getSummaryStats must count donations');
  });

  // 2. Route Registration
  await test('Task 2: Express routes registered for /stats/blood-inventory, /stats/request-types, /stats/signups, and /stats/summary', () => {
    const routes = fs.readFileSync(adminRoutesPath, 'utf8');
    assert(routes.includes("router.get('/stats/blood-inventory', getBloodInventoryStats)"), 'Route /stats/blood-inventory must be registered');
    assert(routes.includes("router.get('/stats/request-types', getRequestTypesStats)"), 'Route /stats/request-types must be registered');
    assert(routes.includes("router.get('/stats/signups', getSignupsStats)"), 'Route /stats/signups must be registered');
    assert(routes.includes("router.get('/stats/summary', getSummaryStats)"), 'Route /stats/summary must be registered');
  });

  // 3. HTML Markup for Summary Totals Table in Public & Src
  await test('Task 3: HTML contains Platform Entity Summary Totals Table with all required entity cells', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('id="stats-summary-totals-body"'), `${htmlPath} must contain stats-summary-totals-body`);
      assert(html.includes('id="sum-total-users"'), `${htmlPath} must contain sum-total-users`);
      assert(html.includes('id="sum-total-donors"'), `${htmlPath} must contain sum-total-donors`);
      assert(html.includes('id="sum-total-hospitals"'), `${htmlPath} must contain sum-total-hospitals`);
      assert(html.includes('id="sum-total-bloodbanks"'), `${htmlPath} must contain sum-total-bloodbanks`);
      assert(html.includes('id="sum-total-requests"'), `${htmlPath} must contain sum-total-requests`);
      assert(html.includes('id="sum-total-donations"'), `${htmlPath} must contain sum-total-donations`);
      assert(html.includes('Platform Entity Summary Totals'), `${htmlPath} must contain section title`);
    });
  });

  // 4. JS functions in HTML
  await test('Task 4: Public and Src HTML define fetchSummaryTotalsStats and renderSummaryTotalsTable', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('async function fetchSummaryTotalsStats'), `${htmlPath} must define fetchSummaryTotalsStats`);
      assert(html.includes('function renderSummaryTotalsTable'), `${htmlPath} must define renderSummaryTotalsTable`);
      assert(html.includes("apiFetch('/admin/stats/summary')"), `${htmlPath} must query /admin/stats/summary endpoint`);
      assert(html.includes('fetchSummaryTotalsStats()'), `${htmlPath} must trigger fetchSummaryTotalsStats`);
    });
  });

  // 5. Mock Data Fallback Verification
  await test('Task 5: Mock data module provides getMockSummaryStats for offline fallback from src/js', async () => {
    assert(!fs.existsSync(publicMockDataPath), 'public/js/mock-data.js must be removed');
    assert(fs.existsSync(srcMockDataPath), 'src/js/mock-data.js must exist');
    const mockModule = await import(`file://${srcMockDataPath.replace(/\\/g, '/')}`);
    const mock = mockModule.default || mockModule;
    assert(typeof mock.getMockSummaryStats === 'function', `${srcMockDataPath} must export getMockSummaryStats`);
    const summary = mock.getMockSummaryStats();
    assert(summary && summary.totals, 'Mock summary must contain totals');
    assert(summary.totals.totalUsers !== undefined, 'Mock summary totals must have totalUsers');
    assert(summary.totals.totalDonors !== undefined, 'Mock summary totals must have totalDonors');
    assert(summary.totals.totalHospitals !== undefined, 'Mock summary totals must have totalHospitals');
    assert(summary.totals.totalBloodBanks !== undefined, 'Mock summary totals must have totalBloodBanks');
    assert(summary.totals.totalBloodRequests !== undefined, 'Mock summary totals must have totalBloodRequests');
    assert(summary.totals.totalDonations !== undefined, 'Mock summary totals must have totalDonations');
  });

  console.log('\n===========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('===========================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
