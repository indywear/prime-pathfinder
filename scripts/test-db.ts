
import { prisma } from "../src/lib/db/prisma";

async function main() {
    try {
        console.log("Testing Prisma Connection...");
        const count = await prisma.user.count();
        console.log("Connection Successful! User count:", count);
    } catch (e) {
        console.error("Connection Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
