import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    const dbUrl = process.env.DATABASE_URL;
    
    const envStatus = {
        DATABASE_URL: dbUrl ? `Set (length: ${dbUrl.length}, starts: ${dbUrl.substring(0, 25)}...)` : "NOT SET",
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? "Set" : "NOT SET",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? "Set" : "NOT SET",
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "Set" : "NOT SET",
        ADMIN_EMAIL: process.env.ADMIN_EMAIL ? "Set" : "NOT SET",
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "Set" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
    };

    if (!dbUrl) {
        return NextResponse.json({
            status: "error",
            message: "DATABASE_URL not set",
            env: envStatus,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }

    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({ 
            status: "ok", 
            userCount, 
            env: envStatus,
            timestamp: new Date().toISOString(),
            prismaVersion: "5.22.0"
        });
    } catch (error: any) {
        console.error("Database Error:", error);

        return NextResponse.json({
            status: "error",
            message: error.message,
            code: error.code,
            errorName: error.name,
            stack: error.stack?.split('\n').slice(0, 5),
            env: envStatus,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
