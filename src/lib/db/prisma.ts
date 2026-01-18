import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.warn("DATABASE_URL not set - database operations will fail");
        return new Proxy({} as PrismaClient, {
            get(target, prop) {
                if (prop === 'then') return undefined;
                return () => Promise.reject(new Error("DATABASE_URL not configured"));
            }
        });
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);

    return new PrismaClient({
        adapter,
    } as any);
}

function getPrismaClient(): PrismaClient {
    if (!prismaInstance) {
        prismaInstance = globalForPrisma.prisma ?? createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = prismaInstance;
        }
    }
    return prismaInstance;
}

const prisma = new Proxy({} as PrismaClient, {
    get(target, prop) {
        if (prop === 'then') return undefined;
        const client = getPrismaClient();
        const value = (client as any)[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

export { prisma };
export default prisma;
