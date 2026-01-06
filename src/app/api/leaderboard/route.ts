import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard, LeaderboardType } from '@/lib/gamification/leaderboard'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const type = (searchParams.get('type') || 'WEEKLY') as LeaderboardType
        const limit = parseInt(searchParams.get('limit') || '10')
        const userId = searchParams.get('userId') || undefined

        const { entries, userRank } = await getLeaderboard(type, limit, userId)

        return NextResponse.json({ entries, userRank })
    } catch (error) {
        console.error('Leaderboard error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
