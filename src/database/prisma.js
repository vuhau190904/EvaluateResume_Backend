import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * Tránh tạo nhiều instance của PrismaClient
 */

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  // Tắt log truy vấn Prisma (prisma:query) để terminal đỡ bị spam
  // Nếu cần debug, có thể đổi lại thành: ['query', 'error', 'warn']
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}


export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ PostgreSQL disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from PostgreSQL:', error);
  }
};

export default prisma;

