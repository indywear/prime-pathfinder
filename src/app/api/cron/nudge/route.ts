import { NextResponse } from 'next/server'
import { sendNudges } from '@/lib/nudge/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max execution

// This endpoint is called by Vercel Cron
export async function GET(request: Request) {
    try {
        // Verify cron secret (required — also protected by middleware basic auth)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const results = await sendNudges()

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results,
        })
    } catch (error) {
        console.error('Nudge cron error:', error)
        return NextResponse.json(
            {
                error: 'Failed to send nudges',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
