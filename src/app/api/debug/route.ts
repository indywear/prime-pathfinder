import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Only allow in development or when auth is provided (middleware handles auth)
    const searchParams = request.nextUrl.searchParams;
    const testDB = searchParams.get("testDB") === "true";

    // Safe env status - no secrets exposed
    const envStatus = {
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? "Set" : "NOT SET",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? "Set" : "NOT SET",
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "Set" : "NOT SET",
        DATABASE_URL: process.env.DATABASE_URL ? "Set" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
    };

    if (!testDB) {
        return NextResponse.json({
            status: "ok",
            env: envStatus,
            timestamp: new Date().toISOString(),
        });
    }

    try {
        const userCount = await prisma.user.count();
        const taskCount = await prisma.task.count();
        return NextResponse.json({
            status: "ok",
            userCount,
            taskCount,
            env: envStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error.message,
            env: envStatus,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
