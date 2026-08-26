import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing Neon PostgreSQL connection...');
  
  try {
    // Try to connect
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful!');
    
    console.log('🎉 Database is working perfectly!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();