import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectAIUsage } from '@/lib/ai/claude'

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        const { taskId, userId, timeSpentSec, scrollDepth, focusLostCount, tabSwitchCount } = data

        if (!taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
        }

        // Get task to calculate expected reading time
        const task = await prisma.weeklyTask.findUnique({
            where: { id: taskId },
            select: { contentHtml: true },
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Calculate expected time (avg reading speed: 200 words/min)
        const wordCount = task.contentHtml.split(/\s+/).length
        const expectedTimeSeconds = (wordCount / 200) * 60

        // Check for suspicious behavior
        const tooFast = timeSpentSec < expectedTimeSeconds * 0.3
        const lowScrollDepth = scrollDepth < 50
        const manyTabSwitches = tabSwitchCount > 5

        const flaggedSuspicious = tooFast || lowScrollDepth || manyTabSwitches

        let suspiciousReason = null
        if (flaggedSuspicious) {
            const reasons = []
            if (tooFast) reasons.push('อ่านเร็วมาก')
            if (lowScrollDepth) reasons.push('เลื่อนดูไม่ครบ')
            if (manyTabSwitches) reasons.push('สลับแท็บบ่อย')
            suspiciousReason = reasons.join(', ')
        }

        // Save reading session (if userId provided)
        if (userId) {
            const user = await prisma.user.findUnique({ where: { lineUserId: userId } })
            if (user) {
                await prisma.readingSession.create({
                    data: {
                        userId: user.id,
                        taskId,
                        timeSpentSec,
                        scrollDepth,
                        focusLostCount,
                        tabSwitchCount,
                        completed: scrollDepth >= 80,
                        flaggedSuspicious,
                        suspiciousReason,
                        endedAt: new Date(),
                    },
                })
            }
        }

        return NextResponse.json({
            success: true,
            flagged: flaggedSuspicious,
            reason: suspiciousReason,
        })
    } catch (error) {
        console.error('Reading tracker error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
