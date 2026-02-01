import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") === "true";

    try {
        const tasks = await prisma.task.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: { weekNumber: "desc" },
            include: {
                _count: {
                    select: {
                        submissions: true,
                        feedbackRequests: true,
                    },
                },
            },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Tasks API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/tasks - Create new task (admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            weekNumber,
            title,
            description,
            contentUrl,
            minWords = 80,
            maxWords = 120,
            deadline,
            rubric,
        } = body;

        if (!weekNumber || !title || !description || !contentUrl || !deadline) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const task = await prisma.task.create({
            data: {
                weekNumber,
                title,
                description,
                contentUrl,
                minWords,
                maxWords,
                deadline: new Date(deadline),
                rubric: rubric || undefined,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Create Task Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
