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
  console.log('🧪 Running Signups Chart Periods & Aggregations Verification');
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

  // 1. HTML markup check for Yearly button
  await test('Task 1: Signups period toggles contain Daily, Weekly, Monthly, and Yearly in public HTML', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes("onclick=\"setSignupsPeriod('daily')\""), `${htmlPath} missing Daily button`);
      assert(html.includes("onclick=\"setSignupsPeriod('weekly')\""), `${htmlPath} missing Weekly button`);
      assert(html.includes("onclick=\"setSignupsPeriod('monthly')\""), `${htmlPath} missing Monthly button`);
      assert(html.includes("onclick=\"setSignupsPeriod('yearly')\""), `${htmlPath} missing Yearly button`);
      assert(html.includes('fetchSignupsChartData()'), `${htmlPath} missing fetchSignupsChartData`);
      assert(html.includes('renderSignupsChart()'), `${htmlPath} missing renderSignupsChart`);
    });
  });

  // 2. Controller code verification for all 4 periods
  await test('Task 2: Backend getSignupsStats handles daily, weekly, monthly, and yearly period aggregations', () => {
    const controllerCode = fs.readFileSync(adminControllerPath, 'utf8');
    assert(controllerCode.includes('export const getSignupsStats'), 'getSignupsStats must be exported');
    assert(controllerCode.includes("period === 'yearly'"), 'Must handle yearly period in controller');
    assert(controllerCode.includes("period === 'monthly'"), 'Must handle monthly period in controller');
    assert(controllerCode.includes("period === 'weekly'"), 'Must handle weekly period in controller');
    assert(controllerCode.includes('totalDonors:') && controllerCode.includes('totalHospitals:') && controllerCode.includes('totalBloodBanks:'), 'Must calculate summary totals');
    assert(controllerCode.includes('labels') && controllerCode.includes('series:'), 'Must structure response with labels and series');

    const routesCode = fs.readFileSync(adminRoutesPath, 'utf8');
    assert(routesCode.includes("router.get('/stats/signups', getSignupsStats)"), 'Route /stats/signups must be registered on router');
  });

  // 3. Mock Data generator provides all 4 periods
  await test('Task 3: Mock data module in src/js provides getMockSignupsForPeriod for all 4 periods', async () => {
    assert(!fs.existsSync(publicMockDataPath), 'public/js/mock-data.js must be removed');
    assert(fs.existsSync(srcMockDataPath), 'src/js/mock-data.js must exist');
    const periods = ['daily', 'weekly', 'monthly', 'yearly'];
    const mockModule = await import(`file://${srcMockDataPath.replace(/\\/g, '/')}`);
    const mock = mockModule.default || mockModule;
    assert(typeof mock.getMockSignupsForPeriod === 'function', `${srcMockDataPath} must export getMockSignupsForPeriod`);

    for (const p of periods) {
      const result = mock.getMockSignupsForPeriod(p);
      assert(result && result.period === p, `${srcMockDataPath} mock data must return period ${p}`);
      assert(result.labels.length > 0, `${srcMockDataPath} mock labels for ${p} must not be empty`);
      assert(result.series.bloodBanks.length === result.labels.length, `${srcMockDataPath} series length must match labels for ${p}`);
      assert(result.series.hospitals.length === result.labels.length, `${srcMockDataPath} series length must match labels for ${p}`);
      assert(result.series.donors.length === result.labels.length, `${srcMockDataPath} series length must match labels for ${p}`);
    }
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
