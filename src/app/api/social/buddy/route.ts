import { NextRequest, NextResponse } from 'next/server'
import { findBuddyMatches, sendBuddyRequest, acceptBuddyRequest, getBuddies } from '@/lib/social/buddy'

// GET /api/social/buddy - Get buddies or find matches
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('userId')
        const action = searchParams.get('action') || 'list'

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        if (action === 'find') {
            const matches = await findBuddyMatches(userId)
            return NextResponse.json({ matches })
        }

        const buddies = await getBuddies(userId)
        return NextResponse.json({ buddies })
    } catch (error) {
        console.error('Buddy error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST /api/social/buddy - Send or accept buddy request
export async function POST(request: NextRequest) {
    try {
        const { action, fromUserId, toUserId, requestId } = await request.json()

        if (action === 'send') {
            if (!fromUserId || !toUserId) {
                return NextResponse.json({ error: 'fromUserId and toUserId required' }, { status: 400 })
            }
            const result = await sendBuddyRequest(fromUserId, toUserId)
            return NextResponse.json(result)
        }

        if (action === 'accept') {
            if (!requestId) {
                return NextResponse.json({ error: 'requestId required' }, { status: 400 })
            }
            const result = await acceptBuddyRequest(requestId)
            return NextResponse.json(result)
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Buddy error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
