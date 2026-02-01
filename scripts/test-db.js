
// Standalone DB Test Script
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

neonConfig.fetchConnectionCache = true;

function parseConnectionString(connStr) {
    try {
        const url = new URL(connStr);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            ssl: true,
        };
    } catch (e) {
        return null;
    }
}

async function main() {
    console.log("--- Starting DB Connection Test ---");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL is not defined in .env");
        process.exit(1);
    }

    console.log("URL found (length):", connectionString.length);

    try {
        const config = parseConnectionString(connectionString);
        console.log("Connecting to host:", config.host);

        const pool = new Pool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: config.ssl,
        });

        const adapter = new PrismaNeon(pool);
        const prisma = new PrismaClient({ adapter });

        console.log("Prisma Client initialized. Attempting query...");

        const count = await prisma.user.count();
        console.log("✅ Connection Successful!");
        console.log("User count in DB:", count);

        await prisma.$disconnect();
    } catch (error) {
        console.error("❌ Connection Failed:", error);
    }
}

main();
