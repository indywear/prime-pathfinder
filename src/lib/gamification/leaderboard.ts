import { prisma } from '@/lib/prisma'

// ==================== LEADERBOARD TYPES ====================

export type LeaderboardType = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' | 'CLASS' | 'FRIENDS'

export interface LeaderboardEntry {
    rank: number
    userId: string
    userName: string
    points: number
    level: number
    streak: number
    avatar?: string
}

// ==================== LEADERBOARD FUNCTIONS ====================

export async function getLeaderboard(
    type: LeaderboardType,
    limit: number = 10,
    userId?: string,
    classId?: string
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry }> {
    let dateFilter: Date | undefined
    const now = new Date()

    // Set date filter based on type
    switch (type) {
        case 'WEEKLY':
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
        case 'MONTHLY':
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        case 'ALL_TIME':
        default:
            dateFilter = undefined
    }

    // For weekly/monthly, we sum points from pointLogs
    if (dateFilter) {
        const pointsByUser = await prisma.pointLog.groupBy({
            by: ['userId'],
            _sum: { points: true },
            where: {
                earnedAt: { gte: dateFilter },
            },
            orderBy: { _sum: { points: 'desc' } },
            take: limit,
        })

        const userIds = pointsByUser.map((p) => p.userId)
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                thaiName: true,
                currentLevel: true,
                streak: true,
            },
        })

        const userMap = new Map(users.map((u) => [u.id, u]))

        const entries: LeaderboardEntry[] = pointsByUser.map((p, index) => {
            const user = userMap.get(p.userId)
            return {
                rank: index + 1,
                userId: p.userId,
                userName: user?.thaiName || 'Unknown',
                points: p._sum.points || 0,
                level: user?.currentLevel || 1,
                streak: user?.streak || 0,
            }
        })

        // Get user's rank if not in top
        let userRank: LeaderboardEntry | undefined
        if (userId && !entries.some((e) => e.userId === userId)) {
            const userPoints = await prisma.pointLog.aggregate({
                _sum: { points: true },
                where: {
                    userId,
                    earnedAt: { gte: dateFilter },
                },
            })

            const higherCount = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") as count
        FROM "PointLog"
        WHERE "earnedAt" >= ${dateFilter}
        GROUP BY "userId"
        HAVING SUM(points) > ${userPoints._sum.points || 0}
      `

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { thaiName: true, currentLevel: true, streak: true },
            })

            if (user) {
                userRank = {
                    rank: Number(higherCount[0]?.count || 0) + 1,
                    userId,
                    userName: user.thaiName || 'You',
                    points: userPoints._sum.points || 0,
                    level: user.currentLevel,
                    streak: user.streak,
                }
            }
        }

        return { entries, userRank }
    }

    // For ALL_TIME, use totalPoints
    const topUsers = await prisma.user.findMany({
        orderBy: { totalPoints: 'desc' },
        take: limit,
        select: {
            id: true,
            thaiName: true,
            totalPoints: true,
            currentLevel: true,
            streak: true,
        },
    })

    const entries: LeaderboardEntry[] = topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        userName: user.thaiName || 'Unknown',
        points: user.totalPoints,
        level: user.currentLevel,
        streak: user.streak,
    }))

    // Get user's rank
    let userRank: LeaderboardEntry | undefined
    if (userId && !entries.some((e) => e.userId === userId)) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { thaiName: true, totalPoints: true, currentLevel: true, streak: true },
        })

        if (user) {
            const higherCount = await prisma.user.count({
                where: { totalPoints: { gt: user.totalPoints } },
            })

            userRank = {
                rank: higherCount + 1,
                userId,
                userName: user.thaiName || 'You',
                points: user.totalPoints,
                level: user.currentLevel,
                streak: user.streak,
            }
        }
    }

    return { entries, userRank }
}

// ==================== LEADERBOARD FLEX MESSAGE ====================

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

    const contents: any = {
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

    // Add user's rank if not in top 10
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
