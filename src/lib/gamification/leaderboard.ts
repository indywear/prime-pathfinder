import prisma from '@/lib/db/prisma'
import { getBangkokStartOfDay } from '@/lib/utils/timezone'

export type LeaderboardType = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' | 'CLASS' | 'FRIENDS'

export interface LeaderboardEntry {
    rank: number
    userId: string
    userName: string
    points: number
    level: number
}

function getDateRangeForType(type: LeaderboardType): Date | null {
    switch (type) {
        case 'WEEKLY': {
            const today = getBangkokStartOfDay()
            today.setDate(today.getDate() - 7)
            return today
        }
        case 'MONTHLY': {
            const today = getBangkokStartOfDay()
            today.setDate(1)
            return today
        }
        default:
            return null // ALL_TIME, CLASS, FRIENDS — no date filter
    }
}

export async function getLeaderboard(
    type: LeaderboardType,
    limit: number = 10,
    userId?: string
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry }> {
    const since = getDateRangeForType(type)

    // For WEEKLY/MONTHLY, aggregate points from PracticeSession within the date range
    if (since) {
        const sessionData = await prisma.practiceSession.groupBy({
            by: ['userId'],
            where: { completedAt: { gte: since } },
            _sum: { pointsEarned: true },
            orderBy: { _sum: { pointsEarned: 'desc' } },
            take: limit,
        })

        const userIds = sessionData.map(s => s.userId)
        const users = await prisma.user.findMany({
            where: { id: { in: userIds }, isRegistered: true },
            select: { id: true, thaiName: true, currentLevel: true },
        })
        const userMap = new Map(users.map(u => [u.id, u]))

        const entries: LeaderboardEntry[] = sessionData
            .filter(s => userMap.has(s.userId))
            .map((s, index) => {
                const user = userMap.get(s.userId)!
                return {
                    rank: index + 1,
                    userId: s.userId,
                    userName: user.thaiName || 'Unknown',
                    points: s._sum.pointsEarned || 0,
                    level: user.currentLevel,
                }
            })

        let userRank: LeaderboardEntry | undefined
        if (userId && !entries.some(e => e.userId === userId)) {
            const userSession = await prisma.practiceSession.aggregate({
                where: { userId, completedAt: { gte: since } },
                _sum: { pointsEarned: true },
            })
            const userPoints = userSession._sum.pointsEarned || 0
            if (userPoints > 0) {
                const higherCount = await prisma.practiceSession.groupBy({
                    by: ['userId'],
                    where: { completedAt: { gte: since } },
                    _sum: { pointsEarned: true },
                    having: { pointsEarned: { _sum: { gt: userPoints } } },
                })
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { thaiName: true, currentLevel: true },
                })
                if (user) {
                    userRank = {
                        rank: higherCount.length + 1,
                        userId,
                        userName: user.thaiName || 'You',
                        points: userPoints,
                        level: user.currentLevel,
                    }
                }
            }
        }

        return { entries, userRank }
    }

    // ALL_TIME: use totalPoints directly
    const topUsers = await prisma.user.findMany({
        where: { isRegistered: true },
        orderBy: { totalPoints: 'desc' },
        take: limit,
        select: {
            id: true,
            thaiName: true,
            totalPoints: true,
            currentLevel: true,
        },
    })

    const entries: LeaderboardEntry[] = topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        userName: user.thaiName || 'Unknown',
        points: user.totalPoints,
        level: user.currentLevel,
    }))

    let userRank: LeaderboardEntry | undefined
    if (userId && !entries.some((e) => e.userId === userId)) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { thaiName: true, totalPoints: true, currentLevel: true },
        })

        if (user) {
            const higherCount = await prisma.user.count({
                where: {
                    isRegistered: true,
                    totalPoints: { gt: user.totalPoints }
                },
            })

            userRank = {
                rank: higherCount + 1,
                userId,
                userName: user.thaiName || 'You',
                points: user.totalPoints,
                level: user.currentLevel,
            }
        }
    }

    return { entries, userRank }
}

export function createLeaderboardFlex(
    type: LeaderboardType,
    entries: LeaderboardEntry[],
    userRank?: LeaderboardEntry
) {
    const typeLabels: Record<LeaderboardType, string> = {
        WEEKLY: '🏆 Weekly Ranking',
        MONTHLY: '🏆 Monthly Ranking',
        ALL_TIME: '🏆 All-Time Ranking',
        CLASS: '🏆 Class Ranking',
        FRIENDS: '🏆 Friends Ranking',
    }

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

    const entryRows = entries.slice(0, 10).map((entry, index) => ({
        type: 'box' as const,
        layout: 'horizontal' as const,
        contents: [
            {
                type: 'text' as const,
                text: rankEmojis[index] || `${entry.rank}`,
                flex: 1,
                align: 'center' as const,
            },
            {
                type: 'text' as const,
                text: entry.userName,
                flex: 3,
                size: 'sm' as const,
            },
            {
                type: 'text' as const,
                text: `Lv.${entry.level}`,
                flex: 1,
                size: 'xs' as const,
                color: '#888888',
            },
            {
                type: 'text' as const,
                text: `${entry.points}`,
                flex: 2,
                align: 'end' as const,
                weight: 'bold' as const,
                color: '#6366f1',
            },
        ],
        margin: 'md' as const,
    }))

    const contents: Record<string, unknown> = {
        type: 'bubble' as const,
        header: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'text' as const,
                    text: typeLabels[type],
                    weight: 'bold' as const,
                    size: 'lg' as const,
                    color: '#ffffff',
                },
            ],
            backgroundColor: '#6366f1',
            paddingAll: '15px',
        },
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: entryRows,
        },
    }

    if (userRank && userRank.rank > 10) {
        contents.footer = {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'separator' as const,
                },
                {
                    type: 'box' as const,
                    layout: 'horizontal' as const,
                    contents: [
                        {
                            type: 'text' as const,
                            text: `#${userRank.rank}`,
                            flex: 1,
                            weight: 'bold' as const,
                        },
                        {
                            type: 'text' as const,
                            text: 'You',
                            flex: 3,
                            weight: 'bold' as const,
                        },
                        {
                            type: 'text' as const,
                            text: `${userRank.points}`,
                            flex: 2,
                            align: 'end' as const,
                            weight: 'bold' as const,
                            color: '#f59e0b',
                        },
                    ],
                    margin: 'md' as const,
                },
            ],
        }
    }

    return contents
}
