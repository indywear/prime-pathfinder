import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function parseConnectionString(connStr: string) {
    const url = new URL(connStr);
    return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        ssl: true,
    };
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        throw new Error("DATABASE_URL is required");
    }

    console.log("[Prisma] Creating client with URL length:", connectionString.length);

    const config = parseConnectionString(connectionString);
    console.log("[Prisma] Parsed config - host:", config.host, "user:", config.user, "db:", config.database);

    const pool = new Pool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
    });
    
    const adapter = new PrismaNeon(pool);
    
    return new PrismaClient({ adapter } as any);
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
