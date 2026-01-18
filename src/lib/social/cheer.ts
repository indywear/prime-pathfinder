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
    return {
        success: true,
        message: `${CHEER_TYPES[cheerType].emoji} ส่งกำลังใจแล้ว!`,
    }
}

export async function getCheersReceived(userId: string, days: number = 7) {
    return []
}

export async function getCheerStats(userId: string) {
    return { received: 0, sent: 0 }
}

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
