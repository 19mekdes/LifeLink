import { PrismaClient } from '@prisma/client';

const isDevelopment = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: isDevelopment
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' }
      ]
    : [{ emit: 'stdout', level: 'error' }]
});

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL database connected successfully via Prisma.');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await prisma.$disconnect();
    console.log('Prisma client disconnected successfully.');
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error.message);
  }
}

prisma.connectDB = connectDB;
prisma.disconnectDB = disconnectDB;

export default prisma;