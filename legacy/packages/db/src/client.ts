import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function getPrismaClientOptions(): ConstructorParameters<
  typeof PrismaClient
>[0] {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in packages/db/.env (or environment variables).",
    );
  }

  return {
    adapter: new PrismaPg({ connectionString }),
  };
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient(getPrismaClientOptions());
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
