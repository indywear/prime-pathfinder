import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import axios from "axios";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const testAI = searchParams.get("testAI") === "true";

    const dbUrl = process.env.DATABASE_URL;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    const envStatus = {
        DATABASE_URL: dbUrl ? `Set (length: ${dbUrl.length}, starts: ${dbUrl.substring(0, 25)}...)` : "NOT SET",
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? "Set" : "NOT SET",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? "Set" : "NOT SET",
        OPENROUTER_API_KEY: openRouterKey ? `Set (${openRouterKey.substring(0, 15)}...)` : "NOT SET",
        ADMIN_EMAIL: process.env.ADMIN_EMAIL ? "Set" : "NOT SET",
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "Set" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
    };

    // Test OpenRouter API if requested
    let aiTestResult = null;
    if (testAI && openRouterKey) {
        try {
            const startTime = Date.now();
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "anthropic/claude-haiku-4.5",
                    messages: [{ role: "user", content: "Say hi in Thai" }],
                    max_tokens: 50,
                },
                {
                    headers: {
                        Authorization: `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://proficienthai.vercel.app",
                        "X-Title": "ProficienThAI",
                    },
                    timeout: 30000,
                }
            );
            const endTime = Date.now();
            aiTestResult = {
                success: true,
                responseTime: `${endTime - startTime}ms`,
                model: response.data.model,
                content: response.data.choices[0]?.message?.content,
            };
        } catch (error: any) {
            aiTestResult = {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
            };
        }
    }

    if (!dbUrl) {
        return NextResponse.json({
            status: "error",
            message: "DATABASE_URL not set",
            env: envStatus,
            aiTest: aiTestResult,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }

    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({
            status: "ok",
            userCount,
            env: envStatus,
            aiTest: aiTestResult,
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
            aiTest: aiTestResult,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
