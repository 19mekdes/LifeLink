import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicHtmlPath = path.join(__dirname, '../../frontend/public/admin-dashboard.html');
const publicCssPath = path.join(__dirname, '../../frontend/public/css/dashboard.css');
const srcCssPath = path.join(__dirname, '../../frontend/src/css/admin-dashboard.css');

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Running Responsive Layout & Mobile/Tablet Audit Tests');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Root & Base Overflow Prevention
  test('Task 1: HTML & Body enforce overflow-x: hidden and full width bounds in src/css', () => {
    assert(!fs.existsSync(publicCssPath), 'public/css/dashboard.css must be removed');
    assert(fs.existsSync(srcCssPath), 'src/css/dashboard.css must exist');
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('html {'), `${srcCssPath} should contain html rule`);
    assert(css.includes('overflow-x: hidden;'), `${srcCssPath} should specify overflow-x: hidden`);
    assert(css.includes('max-width: 100vw;'), `${srcCssPath} should clamp root width`);
  });

  // 2. Responsive Breakpoint Media Queries
  test('Task 2: Multi-breakpoint media queries exist for desktop, tablet (1024px), mobile (768px, 480px)', () => {
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('@media (max-width: 1024px)'), `${srcCssPath} must contain @media (max-width: 1024px)`);
    assert(css.includes('@media (max-width: 768px)'), `${srcCssPath} must contain @media (max-width: 768px)`);
    assert(css.includes('@media (max-width: 480px)'), `${srcCssPath} must contain @media (max-width: 480px)`);
  });

  // 3. Data Tables Usability on Small Screens
  test('Task 3: Tables are enclosed with touch scrolling and minimum width to protect cell readability', () => {
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('.table-responsive {'), `${srcCssPath} must define .table-responsive`);
    assert(css.includes('-webkit-overflow-scrolling: touch;'), `${srcCssPath} must have smooth touch scrolling`);
    assert(css.includes('.custom-table {'), `${srcCssPath} must define .custom-table`);
    assert(css.includes('min-width: 640px;'), `${srcCssPath} must have sensible min-width on custom-table`);
  });

  // 4. Modal Viewport Clamping & Mobile Reflow
  test('Task 4: Modals clamp to viewport bounds on mobile and reflow action buttons', () => {
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('max-width: calc(100vw - 1.5rem);'), `${srcCssPath} should clamp modal max-width on mobile`);
    assert(css.includes('flex-direction: column-reverse;'), `${srcCssPath} should stack modal actions on mobile`);
  });

  // 5. Notification Dropdown Viewport Clamping
  test('Task 5: Notification dropdown is clamped within mobile viewports without overflowing off-screen', () => {
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('position: fixed;') && css.includes('max-width: calc(100vw - 20px);'), `${srcCssPath} notification-dropdown should clamp on mobile`);
  });

  // 6. Sidebar Overlay & Hamburger Navigation in HTML
  test('Task 6: HTML has mobile-menu-btn and sidebar-overlay wired with responsive scripts', () => {
    [publicHtmlPath].forEach((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('id="mobile-menu-btn"'), `${htmlPath} must contain mobile-menu-btn`);
      assert(html.includes('id="sidebar-overlay"'), `${htmlPath} must contain sidebar-overlay`);
      assert(html.includes('openMobileSidebar()'), `${htmlPath} must trigger openMobileSidebar`);
      assert(html.includes('closeMobileSidebar()'), `${htmlPath} must trigger closeMobileSidebar`);
      assert(html.includes('if (window.innerWidth <= 1024)'), `${htmlPath} must use 1024px responsive threshold`);
    });
  });

  // 7. Time Range Bar & Chart Controls Reflow
  test('Task 7: Time range bar and chart control groups reflow on small screens', () => {
    const css = fs.readFileSync(srcCssPath, 'utf8');
    assert(css.includes('.time-range-bar {') && css.includes('grid-template-columns: repeat(2, 1fr);'), `${srcCssPath} should reflow time-range-bar on mobile`);
    assert(css.includes('.chart-btn-group {'), `${srcCssPath} should define chart-btn-group`);
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
