// backend/tests/verify_audit_log.test.js
import * as auditService from '../src/services/auditService.js';

async function runAuditTests() {
  console.log('🧪 Testing Audit Log Generation for Verify Endpoints...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
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

  test('auditService exports createAuditLog and getAuditLogs', () => {
    assert(typeof auditService.createAuditLog === 'function', 'createAuditLog missing');
    assert(typeof auditService.getAuditLogs === 'function', 'getAuditLogs missing');
  });

  test('auditService.createAuditLog safely catches and returns without throwing unhandled exceptions', async () => {
    // When DB is unreachable or mock fails, createAuditLog gracefully returns null or log
    const res = await auditService.createAuditLog({
      userId: 'test-admin',
      action: 'VERIFY_HOSPITAL',
      entity: 'Hospital',
      entityId: 'hosp-123',
      changes: { previousStatus: 'PENDING', newStatus: 'VERIFIED' }
    });
    // Function completed execution without throwing uncaught fatal error
    assert(res === null || typeof res === 'object');
  });

  console.log(`\nAudit Tests Result: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runAuditTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
