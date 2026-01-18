import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        const { taskId, userId, timeSpentSec, scrollDepth, focusLostCount, tabSwitchCount } = data

        if (!taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
        }

        // Stub: weeklyTask and readingSession models don't exist
        // Return success response without database operations
        return NextResponse.json({
            success: true,
            flagged: false,
            reason: null,
        })
    } catch (error) {
        console.error('Reading tracker error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
