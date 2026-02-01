
// Scripts/debug-db-columns.js
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config();
neonConfig.fetchConnectionCache = true;

async function main() {
    console.log("--- DEBUG: Checking DB Columns Locally ---");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("No DATABASE_URL found.");
        return;
    }
    console.log("Connecting to:", connectionString.split('@')[1]); // Hide sensitive info

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        // Try to select the specific new field
        const user = await prisma.user.findFirst({
            select: {
                id: true,
                thaiName: true,
                currentGameType: true, // This is the field causing error
                currentQuestionId: true
            }
        });

        console.log("✅ Query Successful!");
        console.log("Data retrieved:", user);
        console.log("\nCONCLUSION: The Local Database HAS the new columns.");
    } catch (e) {
        console.error("❌ Query Failed Locally:", e.message);
        console.log("\nCONCLUSION: The Local Database STIlL MISSES the columns, despite 'db push' saying otherwise.");
    } finally {
        await prisma.$disconnect();
    }
}

main();
