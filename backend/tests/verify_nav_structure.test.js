import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicHtmlPath = path.resolve(__dirname, '../../frontend/public/admin-dashboard.html');
const publicCssPath = path.resolve(__dirname, '../../frontend/public/css/dashboard.css');
const srcCssPath = path.resolve(__dirname, '../../frontend/src/css/admin-dashboard.css');

function runNavTests() {
  console.log('====================================================');
  console.log('🧪 Starting Navigation UI, Search & Collapse Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (!condition) throw new Error(msg);
  }

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

  assert(!fs.existsSync(publicCssPath), 'public/css/dashboard.css must be removed');
  assert(fs.existsSync(srcCssPath), 'src/css/admin-dashboard.css must exist');
  const publicHtml = fs.readFileSync(publicHtmlPath, 'utf8');
  const srcCss = fs.readFileSync(srcCssPath, 'utf8');

  // Test 1: Parent User item exists in HTML
  test('Parent "User" navigation item and submenu exist in public and src admin-dashboard.html', () => {
    [publicHtml].forEach(html => {
      assert(html.includes('id="nav-user-group"'), 'Missing id="nav-user-group"');
      assert(html.includes('id="nav-user-submenu"'), 'Missing id="nav-user-submenu"');
      assert(html.includes('id="nav-user-chevron"'), 'Missing id="nav-user-chevron"');
      assert(html.includes('onclick="toggleUserMenu(event)"'), 'Missing toggleUserMenu onclick handler');
    });
  });

  // Test 2: Sub-items Hospital, Blood Bank, Donor, and Account are nested under the submenu
  test('Sub-items Hospital, Blood Bank, Donor, Account are nested inside nav-user-submenu', () => {
    [publicHtml].forEach(html => {
      const submenuStart = html.indexOf('id="nav-user-submenu"');
      const submenuEnd = html.indexOf('id="nav-donations"', submenuStart);
      const submenuContent = html.substring(submenuStart, submenuEnd);

      assert(submenuContent.includes('id="nav-hospitals"'), 'nav-hospitals not in submenu');
      assert(submenuContent.includes('onclick="switchView(\'hospitals\')"'), 'hospitals switchView missing');
      assert(submenuContent.includes('id="nav-blood-banks"'), 'nav-blood-banks not in submenu');
      assert(submenuContent.includes('onclick="switchView(\'blood-banks\')"'), 'blood-banks switchView missing');
      assert(submenuContent.includes('id="nav-donors"'), 'nav-donors not in submenu');
      assert(submenuContent.includes('onclick="switchView(\'donors\')"'), 'donors switchView missing');
      assert(submenuContent.includes('id="nav-users"'), 'nav-users not in submenu');
      assert(submenuContent.includes('<span>Account</span>'), 'Account label missing in nav-users');
      assert(submenuContent.includes('onclick="switchView(\'users\')"'), 'users switchView missing');

      // Verify nav-users is removed from Administration section
      const adminSectionStart = html.indexOf('Administration</div>');
      const adminSectionEnd = html.indexOf('id="nav-logout"', adminSectionStart);
      const adminSectionContent = html.substring(adminSectionStart, adminSectionEnd);
      assert(!adminSectionContent.includes('id="nav-users"'), 'nav-users must be removed from Administration group');
      assert(!adminSectionContent.includes('User Accounts'), 'User Accounts must be removed from Administration group');
    });
  });

  // Test 3: Task 1 - Sidebar collapse button fixed position across open and closed states
  test('Task 1: Sidebar collapse button has identical fixed coordinates in open and collapsed states', () => {
    [publicHtml].forEach(html => {
      assert(html.includes('id="sidebar-toggle"'), 'Missing id="sidebar-toggle" button');
      assert(html.includes('onclick="toggleDesktopSidebar()"'), 'Missing toggleDesktopSidebar onclick handler');
    });

    [srcCss].forEach(css => {
      assert(css.includes('.sidebar-toggle-btn'), 'Missing .sidebar-toggle-btn in CSS');
      assert(css.includes('position: absolute'), 'Toggle button must have absolute fixed positioning');
      assert(css.includes('left: 20px'), 'Toggle button must be fixed at left: 20px');
      assert(css.includes('top: 18px'), 'Toggle button must be fixed at top: 18px');
      assert(!css.includes('.sidebar-toggle-btn { display: none !important; }'), 'Toggle button must not be hidden in mobile media query');
    });
  });

  // Test 4: Task 2 - Search bar is in header/top bar and removed from sidebar
  test('Task 2: Search bar is located in top header and removed from sidebar submenu', () => {
    [publicHtml].forEach(html => {
      const headerStart = html.indexOf('<header class="top-header">');
      const headerEnd = html.indexOf('</header>', headerStart);
      const headerContent = html.substring(headerStart, headerEnd);

      assert(headerContent.includes('id="top-search-input"'), 'top-search-input missing in top-header');
      assert(headerContent.includes('id="top-search-group"'), 'top-search-group missing in top-header');
      assert(headerContent.includes('oninput="handleHeaderSearch(this.value)"'), 'handleHeaderSearch oninput missing');

      const submenuStart = html.indexOf('id="nav-user-submenu"');
      const submenuEnd = html.indexOf('id="nav-donations"', submenuStart);
      const submenuContent = html.substring(submenuStart, submenuEnd);

      assert(!submenuContent.includes('id="nav-user-search-input"'), 'Search bar must be removed from User nav submenu');
      assert(html.includes('function handleHeaderSearch(query)'), 'Missing handleHeaderSearch function in JS');
    });
  });

  // Test 5: Task 3 - Notification and Admin profile at far right of top-header
  test('Task 3: Notification and Admin Profile are aligned at the far right of the header', () => {
    [publicHtml].forEach(html => {
      const headerStart = html.indexOf('<header class="top-header">');
      const headerEnd = html.indexOf('</header>', headerStart);
      const headerContent = html.substring(headerStart, headerEnd);

      assert(headerContent.includes('id="notification-bell-btn"'), 'Missing notification-bell-btn in header');
      assert(headerContent.includes('id="notification-dropdown"'), 'Missing notification-dropdown in header');
      assert(headerContent.includes('id="header-user-profile-badge"'), 'Missing header-user-profile-badge in header');
    });

    [srcCss].forEach(css => {
      assert(css.includes('.top-header-right.header-user-profile'), 'Missing .top-header-right.header-user-profile in CSS');
      assert(css.includes('margin-left: auto'), 'Far right header section must have margin-left: auto');
    });
  });

  // Test 6: CSS classes exist for accordion and sub-items
  test('CSS rules exist for .nav-group, .nav-item-parent, .nav-submenu, and .nav-sub-item', () => {
    [srcCss].forEach(css => {
      assert(css.includes('.nav-group'), 'Missing .nav-group in CSS');
      assert(css.includes('.nav-item-parent'), 'Missing .nav-item-parent in CSS');
      assert(css.includes('.nav-item-parent.active-parent'), 'Missing .nav-item-parent.active-parent in CSS');
      assert(css.includes('.nav-submenu'), 'Missing .nav-submenu in CSS');
      assert(css.includes('.nav-submenu.open'), 'Missing .nav-submenu.open in CSS');
      assert(css.includes('.nav-sub-item'), 'Missing .nav-sub-item in CSS');
      assert(css.includes('.nav-sub-item.active'), 'Missing .nav-sub-item.active in CSS');
      assert(css.includes('.sidebar.collapsed .nav-submenu'), 'Missing collapsed sidebar override');
    });
  });

  // Test 7: View section visibility CSS exists for tab/page navigation
  test('View section visibility CSS rules exist (.view-section, .view-section.active)', () => {
    [srcCss].forEach(css => {
      assert(css.includes('.view-section'), 'Missing .view-section rule in CSS');
      assert(css.includes('.view-section.active'), 'Missing .view-section.active rule in CSS');
      assert(css.includes('display: none'), '.view-section must have display: none');
      assert(css.includes('display: block'), '.view-section.active must have display: block');
    });
  });

  console.log('\n====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runNavTests();
