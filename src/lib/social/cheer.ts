import { prisma } from '@/lib/prisma'
import { addPoints } from '@/lib/gamification'

// ==================== CHEER SYSTEM ====================

const CHEER_TYPES = {
    ENCOURAGE: { emoji: '💪', message: 'สู้ๆ นะ!', points: 5 },
    CONGRATS: { emoji: '🎉', message: 'ยินดีด้วย!', points: 5 },
    FIRE: { emoji: '🔥', message: 'ไฟแรงมาก!', points: 5 },
    STAR: { emoji: '⭐', message: 'เก่งมาก!', points: 5 },
    HEART: { emoji: '❤️', message: 'ส่งกำลังใจ!', points: 5 },
} as const

export type CheerType = keyof typeof CHEER_TYPES

export async function sendCheer(
    fromUserId: string,
    toUserId: string,
    cheerType: CheerType
): Promise<{ success: boolean; message: string }> {
    // Check if already cheered today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingCheer = await prisma.cheer.findFirst({
        where: {
            fromUserId,
            toUserId,
            createdAt: { gte: today },
        },
    })

    if (existingCheer) {
        return { success: false, message: 'คุณส่งกำลังใจให้เพื่อนคนนี้แล้ววันนี้!' }
    }

    // Create cheer
    await prisma.cheer.create({
        data: {
            fromUserId,
            toUserId,
            type: cheerType,
            message: CHEER_TYPES[cheerType].message,
        },
    })

    // Award points to receiver
    await addPoints(toUserId, 5, 'CHEER_RECEIVED', undefined, 'ได้รับกำลังใจ!')

    // Award points to sender
    await addPoints(fromUserId, 2, 'CHEER_SENT', undefined, 'ส่งกำลังใจ!')

    return {
        success: true,
        message: `${CHEER_TYPES[cheerType].emoji} ส่งกำลังใจแล้ว!`,
    }
}

export async function getCheersReceived(userId: string, days: number = 7) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const cheers = await prisma.cheer.findMany({
        where: {
            toUserId: userId,
            createdAt: { gte: since },
        },
        include: {
            from: { select: { thaiName: true } },
        },
        orderBy: { createdAt: 'desc' },
    })

    return cheers.map((c) => ({
        from: c.from.thaiName,
        type: c.type as CheerType,
        emoji: CHEER_TYPES[c.type as CheerType]?.emoji || '👏',
        message: c.message,
        createdAt: c.createdAt,
    }))
}

export async function getCheerStats(userId: string) {
    const [received, sent] = await Promise.all([
        prisma.cheer.count({ where: { toUserId: userId } }),
        prisma.cheer.count({ where: { fromUserId: userId } }),
    ])

    return { received, sent }
}

// ==================== CHEER FLEX MESSAGE ====================

export function createCheerFlex(
    cheers: { from: string; emoji: string; message: string }[]
) {
    if (cheers.length === 0) {
        return {
            type: 'bubble' as const,
            body: {
                type: 'box' as const,
                layout: 'vertical' as const,
                contents: [
                    {
                        type: 'text' as const,
                        text: '💬 กำลังใจ',
                        weight: 'bold' as const,
                        size: 'lg' as const,
                    },
                    {
                        type: 'text' as const,
                        text: 'ยังไม่มีกำลังใจใหม่',
                        color: '#888888',
                        margin: 'md' as const,
                    },
                ],
            },
        }
    }

    const cheerItems = cheers.slice(0, 5).map((cheer) => ({
        type: 'box' as const,
        layout: 'horizontal' as const,
        contents: [
            {
                type: 'text' as const,
                text: cheer.emoji,
                flex: 1,
            },
            {
                type: 'text' as const,
                text: `${cheer.from}: ${cheer.message}`,
                flex: 5,
                size: 'sm' as const,
                wrap: true,
            },
        ],
        margin: 'sm' as const,
    }))

    return {
        type: 'bubble' as const,
        header: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'text' as const,
                    text: `💬 กำลังใจ (${cheers.length})`,
                    weight: 'bold' as const,
                    color: '#ffffff',
                },
            ],
            backgroundColor: '#ec4899',
            paddingAll: '15px',
        },
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: cheerItems,
        },
    }
}
