import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/tasks/[id]/submissions - Get all submissions for a task
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        const task = await prisma.task.findUnique({
            where: { id },
            select: { id: true, title: true, weekNumber: true, minWords: true, maxWords: true, deadline: true },
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        const submissions = await prisma.submission.findMany({
            where: { taskId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        lineUserId: true,
                        thaiName: true,
                        chineseName: true,
                        currentLevel: true,
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
        })

        return NextResponse.json({ task, submissions })
    } catch (error) {
        console.error('Get submissions error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
