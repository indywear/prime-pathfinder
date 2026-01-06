import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tasks - List all tasks
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const isActive = searchParams.get('isActive')

        const tasks = await prisma.weeklyTask.findMany({
            where: isActive !== null ? { isActive: isActive === 'true' } : undefined,
            orderBy: { weekNumber: 'desc' },
            include: {
                _count: {
                    select: {
                        submissions: true,
                        feedbackRequests: true,
                    },
                },
            },
        })

        return NextResponse.json({ tasks })
    } catch (error) {
        console.error('Get tasks error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        const {
            weekNumber,
            title,
            description,
            contentHtml,
            landingPageSlug,
            minWords,
            maxWords,
            startDate,
            deadline,
            rubrics,
            createdBy,
        } = data

        // Validation
        if (!title || !description || !contentHtml || !landingPageSlug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if slug already exists
        const existing = await prisma.weeklyTask.findUnique({
            where: { landingPageSlug },
        })

        if (existing) {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
        }

        const task = await prisma.weeklyTask.create({
            data: {
                weekNumber: weekNumber || 1,
                title,
                description,
                contentHtml,
                landingPageSlug,
                minWords: minWords || 80,
                maxWords: maxWords || 150,
                startDate: new Date(startDate),
                deadline: new Date(deadline),
                rubrics: rubrics || [
                    { name: 'Grammar', description: 'ความถูกต้องทางไวยากรณ์', maxScore: 25 },
                    { name: 'Vocabulary', description: 'การใช้คำศัพท์', maxScore: 25 },
                    { name: 'Organization', description: 'การจัดลำดับความคิด', maxScore: 25 },
                    { name: 'Task Fulfillment', description: 'ตอบโจทย์ตรงประเด็น', maxScore: 25 },
                ],
                createdBy: createdBy || 'admin',
            },
        })

        return NextResponse.json({ task }, { status: 201 })
    } catch (error) {
        console.error('Create task error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
