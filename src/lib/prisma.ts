import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

if (!directDatabaseUrl) {
  throw new Error(
    'Missing DIRECT_DATABASE_URL environment variable required for Prisma 7 adapter initialization.'
  );
}

const adapter = new PrismaPg({ connectionString: directDatabaseUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
