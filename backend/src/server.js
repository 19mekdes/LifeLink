import 'dotenv/config';
import app from './app.js'; // or './index.js' depending on your app filename
import prisma from './config/database.js';

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  try {
    await prisma.connectDB();

    server = app.listen(PORT, () => {
      console.log(`\n==============================================`);
      console.log(`🚀 LifeLink Server running on port: ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`==============================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await prisma.disconnectDB();
      console.log('✅ Server closed');
      process.exit(0);
    });
  } else {
    await prisma.disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();