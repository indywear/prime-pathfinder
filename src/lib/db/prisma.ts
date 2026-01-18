import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.warn("DATABASE_URL not set, using mock client for build");
        return new Proxy({} as PrismaClient, {
            get: () => {
                throw new Error("DATABASE_URL not configured");
            }
        });
    }

    if (typeof globalThis.WebSocket === 'undefined') {
        try {
            const ws = require('ws');
            neonConfig.webSocketConstructor = ws;
        } catch (e) {
            neonConfig.fetchConnectionCache = true;
        }
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    } as any);
}

let _prisma: PrismaClient | undefined;

function getPrisma(): PrismaClient {
    if (!_prisma) {
        _prisma = globalForPrisma.prisma ?? createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = _prisma;
        }
    }
    return _prisma;
}

const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        const client = getPrisma();
        const value = (client as any)[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

export { prisma };
export default prisma;
