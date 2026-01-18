import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error("[Prisma] DATABASE_URL is not defined");
        throw new Error("DATABASE_URL environment variable is required");
    }

    console.log("[Prisma] Connecting with DATABASE_URL length:", connectionString.length);

    try {
        const sql = neon(connectionString);
        const adapter = new PrismaNeon(sql as any);

        const client = new PrismaClient({
            adapter,
        } as any);

        console.log("[Prisma] Client created successfully with HTTP adapter");
        return client;
    } catch (error) {
        console.error("[Prisma] Failed to create client:", error);
        throw error;
    }
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
