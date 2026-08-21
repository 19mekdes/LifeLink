// test_all_features.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const BASE = 'http://localhost:5000/api';

async function main() {
  console.log('Testing all LifeLink features & endpoints...\n');

  // 1. Ensure test admin exists
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@lifelink.org',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const tests = [
    { name: 'GET /api/admin/dashboard', url: `${BASE}/admin/dashboard` },
    { name: 'GET /api/admin/users (paginated)', url: `${BASE}/admin/users?page=1&limit=5` },
    { name: 'GET /api/admin/hospitals (paginated)', url: `${BASE}/admin/hospitals?page=1&limit=5` },
    { name: 'GET /api/admin/blood-banks (paginated)', url: `${BASE}/admin/blood-banks?page=1&limit=5` },
    { name: 'GET /api/admin/donors (paginated)', url: `${BASE}/admin/donors?page=1&limit=5` },
    { name: 'GET /api/admin/audit-logs (paginated)', url: `${BASE}/admin/audit-logs?page=1&limit=5` },
    { name: 'GET /api/admin/stats', url: `${BASE}/admin/stats` },
    { name: 'GET /api/admin/stats/blood-inventory', url: `${BASE}/admin/stats/blood-inventory` },
    { name: 'GET /api/admin/stats/signups (daily)', url: `${BASE}/admin/stats/signups?period=daily` },
    { name: 'GET /api/admin/stats/signups (weekly)', url: `${BASE}/admin/stats/signups?period=weekly` },
    { name: 'GET /api/admin/stats/signups (monthly)', url: `${BASE}/admin/stats/signups?period=monthly` },
    { name: 'GET /api/admin/profile', url: `${BASE}/admin/profile` },
    { name: 'GET /api/admin/notifications', url: `${BASE}/admin/notifications` },
    { name: 'GET /api/admin/export (csv)', url: `${BASE}/admin/export?entity=users&format=csv` }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await fetch(t.url, { headers: authHeaders });
      const data = t.url.includes('format=csv') ? { success: res.status === 200 } : await res.json();
      if (res.status === 200 && (data.success !== false)) {
        console.log(`[PASS] ${t.name} -> Status: ${res.status}`);
        passed++;
      } else {
        console.log(`[FAIL] ${t.name} -> Status: ${res.status}`, data);
      }
    } catch (e) {
      console.log(`[ERR] ${t.name} -> ${e.message}`);
    }
  }

  // Profile Update test
  try {
    const updateRes = await fetch(`${BASE}/admin/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ name: 'System Administrator', phone: '+251911223344' })
    });
    const updateData = await updateRes.json();
    if (updateRes.status === 200 && updateData.success) {
      console.log(`[PASS] PUT /api/admin/profile`);
      passed++;
    } else {
      console.log(`[FAIL] PUT /api/admin/profile`, updateData);
    }
  } catch (e) {
    console.log(`[ERR] PUT /api/admin/profile -> ${e.message}`);
  }

  console.log(`\nResults: ${passed} passed.`);
  await prisma.$disconnect();
}

main().catch(console.error);
