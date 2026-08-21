import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicHtmlPath = path.join(__dirname, '../../frontend/public/admin-dashboard.html');
const publicCssPath = path.join(__dirname, '../../frontend/public/css/dashboard.css');
const srcCssPath = path.join(__dirname, '../../frontend/src/css/admin-dashboard.css');
const adminControllerPath = path.join(__dirname, '../src/controllers/adminController.js');
const adminRoutesPath = path.join(__dirname, '../src/routes/adminRoutes.js');

console.log('=== RUNNING STATS & CHARTS VERIFICATION TESTS ===\n');

// Test 1: Verify Backend Route & Controller
console.log('Test 1: Verifying Backend /stats/request-types route & controller...');
const routesCode = fs.readFileSync(adminRoutesPath, 'utf8');
assert(routesCode.includes("router.get('/stats/request-types', getRequestTypesStats)"), 'Route /stats/request-types must be registered');
assert(routesCode.includes('getRequestTypesStats'), 'getRequestTypesStats must be imported in adminRoutes.js');

const controllerCode = fs.readFileSync(adminControllerPath, 'utf8');
assert(controllerCode.includes('export const getRequestTypesStats'), 'getRequestTypesStats must be exported in adminController.js');
assert(controllerCode.includes('CRITICAL_EMERGENCY'), 'Must include CRITICAL_EMERGENCY urgency mapping');
assert(controllerCode.includes('URGENT'), 'Must include URGENT urgency mapping');
assert(controllerCode.includes('NORMAL'), 'Must include NORMAL urgency mapping');
assert(controllerCode.includes('timeframe'), 'Must support timeframe parameter');
console.log('✔ Test 1 Passed: Backend route & controller exports are properly defined.');

// Test 2: Verify HTML Dashboard view has Request Types Pie Chart & Time Range Bar
console.log('Test 2: Verifying HTML Dashboard view elements...');
[publicHtmlPath].forEach((filePath) => {
  const html = fs.readFileSync(filePath, 'utf8');
  assert(html.includes('id="requestTypesPieChart"'), `${filePath} must contain requestTypesPieChart canvas`);
  assert(html.includes('id="dashboard-time-range-bar"'), `${filePath} must contain dashboard-time-range-bar`);
  assert(html.includes('id="db-trange-today"'), `${filePath} must contain db-trange-today`);
  assert(html.includes('id="db-trange-week"'), `${filePath} must contain db-trange-week`);
  assert(html.includes('id="db-trange-month"'), `${filePath} must contain db-trange-month`);
  assert(html.includes('id="db-trange-alltime"'), `${filePath} must contain db-trange-alltime`);
  assert(html.includes('setDashboardTimeframe'), `${filePath} must wire setDashboardTimeframe`);
});
console.log('✔ Test 2 Passed: Request Types pie chart and dashboard time range buttons are present on Dashboard.');

// Test 3: Verify Statistics view has relocated Signups Over Time Chart & Time Range Bar
console.log('Test 3: Verifying Statistics view elements...');
[publicHtmlPath].forEach((filePath) => {
  const html = fs.readFileSync(filePath, 'utf8');
  const statsSectionMatch = html.match(/<section id="view-statistics" class="view-section">([\s\S]*?)<\/section>/);
  assert(statsSectionMatch, `${filePath} must contain view-statistics section`);
  const statsSection = statsSectionMatch[1];
  assert(statsSection.includes('id="signupsLineChart"'), `${filePath} view-statistics must contain signupsLineChart canvas`);
  assert(statsSection.includes('id="signups-period-toggles"'), `${filePath} view-statistics must contain signups-period-toggles`);
  assert(statsSection.includes('id="signups-series-toggles"'), `${filePath} view-statistics must contain signups-series-toggles`);
  assert(statsSection.includes('id="stats-time-range-bar"'), `${filePath} view-statistics must contain stats-time-range-bar`);
  assert(statsSection.includes('id="trange-today"'), `${filePath} view-statistics must contain trange-today`);
  assert(statsSection.includes('id="trange-alltime"'), `${filePath} view-statistics must contain trange-alltime`);
});
console.log('✔ Test 3 Passed: Signups Over Time chart and statistics time range buttons are present in Statistics view.');

// Test 4: Verify JavaScript functions for charts, stats, and timeframe filtering
console.log('Test 4: Verifying JavaScript functions in HTML...');
[publicHtmlPath].forEach((filePath) => {
  const html = fs.readFileSync(filePath, 'utf8');
  assert(html.includes('function fetchRequestTypesChartData'), `${filePath} must define fetchRequestTypesChartData`);
  assert(html.includes('function renderRequestTypesChart'), `${filePath} must define renderRequestTypesChart`);
  assert(html.includes('function setDashboardTimeframe'), `${filePath} must define setDashboardTimeframe`);
  assert(html.includes('function setStatsRange'), `${filePath} must define setStatsRange`);
  assert(html.includes('function renderSignupsChart'), `${filePath} must define renderSignupsChart`);
  assert(html.includes('function setSignupsPeriod'), `${filePath} must define setSignupsPeriod`);
  assert(html.includes('function setSignupsSeries'), `${filePath} must define setSignupsSeries`);
});
console.log('✔ Test 4 Passed: All chart and timeframe JavaScript functions are properly declared.');

// Test 5: Verify CSS rules
console.log('Test 5: Verifying CSS styles in src/css...');
assert(!fs.existsSync(publicCssPath), 'public/css/dashboard.css must be removed');
assert(fs.existsSync(srcCssPath), 'src/css/dashboard.css must exist');
const css = fs.readFileSync(srcCssPath, 'utf8');
assert(css.includes('.time-range-bar'), `${srcCssPath} must contain .time-range-bar`);
assert(css.includes('.time-range-btn'), `${srcCssPath} must contain .time-range-btn`);
assert(css.includes('.time-range-btn.active'), `${srcCssPath} must contain .time-range-btn.active`);
assert(css.includes('.chart-badge'), `${srcCssPath} must contain .chart-badge`);
console.log('✔ Test 5 Passed: CSS rules for time range bar and chart badges exist in src/css/dashboard.css.');

console.log('\n=== ALL STATS & CHARTS TESTS PASSED! ===');
