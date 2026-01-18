import prisma from '@/lib/db/prisma'

export type LeaderboardType = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' | 'CLASS' | 'FRIENDS'

export interface LeaderboardEntry {
    rank: number
    userId: string
    userName: string
    points: number
    level: number
}

export async function getLeaderboard(
    type: LeaderboardType,
    limit: number = 10,
    userId?: string
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry }> {
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
