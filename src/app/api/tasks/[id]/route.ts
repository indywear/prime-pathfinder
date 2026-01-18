import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/tasks/[id] - Get single task
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        const task = await prisma.weeklyTask.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        submissions: true,
                        feedbackRequests: true,
                        readingSessions: true,
                    },
                },
            },
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        return NextResponse.json({ task })
    } catch (error) {
        console.error('Get task error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const data = await request.json()

        const task = await prisma.weeklyTask.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description && { description: data.description }),
                ...(data.contentHtml && { contentHtml: data.contentHtml }),
                ...(data.minWords && { minWords: data.minWords }),
                ...(data.maxWords && { maxWords: data.maxWords }),
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.deadline && { deadline: new Date(data.deadline) }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.rubrics && { rubrics: data.rubrics }),
            },
        })

        return NextResponse.json({ task })
    } catch (error) {
        console.error('Update task error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// DELETE /api/tasks/[id] - Delete task (soft delete)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Soft delete by setting isActive to false
        const task = await prisma.weeklyTask.update({
            where: { id },
            data: { isActive: false },
        })

        return NextResponse.json({ task })
    } catch (error) {
        console.error('Delete task error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
