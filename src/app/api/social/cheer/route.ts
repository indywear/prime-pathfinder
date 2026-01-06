import { NextRequest, NextResponse } from 'next/server'
import { sendCheer, getCheersReceived, getCheerStats, CheerType } from '@/lib/social/cheer'

// GET /api/social/cheer - Get cheers received
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('userId')
        const action = searchParams.get('action') || 'list'

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        if (action === 'stats') {
            const stats = await getCheerStats(userId)
            return NextResponse.json({ stats })
        }

        const cheers = await getCheersReceived(userId)
        return NextResponse.json({ cheers })
    } catch (error) {
        console.error('Cheer error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST /api/social/cheer - Send a cheer
export async function POST(request: NextRequest) {
    try {
        const { fromUserId, toUserId, cheerType } = await request.json()

        if (!fromUserId || !toUserId || !cheerType) {
            return NextResponse.json(
                { error: 'fromUserId, toUserId, and cheerType required' },
                { status: 400 }
            )
        }

        const result = await sendCheer(fromUserId, toUserId, cheerType as CheerType)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Cheer error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
