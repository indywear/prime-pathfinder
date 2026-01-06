import { Client, ClientConfig, MessageAPIResponseBase, TextMessage, FlexMessage, QuickReply } from '@line/bot-sdk'

const config: ClientConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
}

export const lineClient = new Client(config)

// ==================== MESSAGE HELPERS ====================

export async function replyText(
    replyToken: string,
    text: string,
    quickReply?: QuickReply
): Promise<MessageAPIResponseBase> {
    const message: TextMessage = {
        type: 'text',
        text,
        ...(quickReply && { quickReply }),
    }
    return lineClient.replyMessage(replyToken, [message])
}

export async function replyFlex(
    replyToken: string,
    altText: string,
    contents: FlexMessage['contents'],
    quickReply?: QuickReply
): Promise<MessageAPIResponseBase> {
    const message: FlexMessage = {
        type: 'flex',
        altText,
        contents,
        ...(quickReply && { quickReply }),
    }
    return lineClient.replyMessage(replyToken, [message])
}

export async function pushText(
    userId: string,
    text: string,
    quickReply?: QuickReply
): Promise<MessageAPIResponseBase> {
    const message: TextMessage = {
        type: 'text',
        text,
        ...(quickReply && { quickReply }),
    }
    return lineClient.pushMessage(userId, [message])
}

export async function pushFlex(
    userId: string,
    altText: string,
    contents: FlexMessage['contents'],
    quickReply?: QuickReply
): Promise<MessageAPIResponseBase> {
    const message: FlexMessage = {
        type: 'flex',
        altText,
        contents,
        ...(quickReply && { quickReply }),
    }
    return lineClient.pushMessage(userId, [message])
}

// ==================== QUICK REPLY TEMPLATES ====================

export const quickReplies = {
    mainMenu: {
        items: [
            { type: 'action' as const, action: { type: 'postback' as const, label: '📝 ส่งงาน', data: 'action=submit' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '💬 ขอ Feedback', data: 'action=feedback' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '🎮 ฝึกฝน', data: 'action=practice' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '📊 แดชบอร์ด', data: 'action=dashboard' } },
        ],
    },

    thaiLevels: {
        items: [
            { type: 'action' as const, action: { type: 'postback' as const, label: 'Beginner', data: 'level=BEGINNER' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: 'Intermediate', data: 'level=INTERMEDIATE' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: 'Advanced', data: 'level=ADVANCED' } },
        ],
    },

    yesNo: {
        items: [
            { type: 'action' as const, action: { type: 'postback' as const, label: '✅ ใช่', data: 'confirm=yes' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '❌ ไม่', data: 'confirm=no' } },
        ],
    },

    gameTypes: {
        items: [
            { type: 'action' as const, action: { type: 'postback' as const, label: '🎯 คำศัพท์', data: 'game=vocab' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '✏️ เติมคำ', data: 'game=fillblank' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '🔢 เรียงประโยค', data: 'game=arrange' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '📝 แต่งประโยค', data: 'game=compose' } },
        ],
    },

    consent: {
        items: [
            { type: 'action' as const, action: { type: 'postback' as const, label: '✅ ยินยอม', data: 'consent=yes' } },
            { type: 'action' as const, action: { type: 'postback' as const, label: '❌ ไม่ยินยอม', data: 'consent=no' } },
        ],
    },
}

// ==================== FLEX MESSAGE TEMPLATES ====================

export const flexTemplates = {
    // Welcome card for new users
    welcomeCard: (userName?: string) => ({
        type: 'bubble' as const,
        hero: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'text' as const,
                    text: '🎉 ยินดีต้อนรับ',
                    size: 'xl' as const,
                    weight: 'bold' as const,
                    color: '#ffffff',
                    align: 'center' as const,
                },
                {
                    type: 'text' as const,
                    text: 'สู่ ProficienThAI',
                    size: 'lg' as const,
                    color: '#ffffff',
                    align: 'center' as const,
                },
            ],
            paddingAll: '20px',
            backgroundColor: '#6366f1',
        },
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'text' as const,
                    text: userName ? `สวัสดี ${userName}! 👋` : 'สวัสดี! 👋',
                    weight: 'bold' as const,
                    size: 'lg' as const,
                },
                {
                    type: 'text' as const,
                    text: 'พร้อมพัฒนาทักษะภาษาไทยกันเลย! กดปุ่มด้านล่างเพื่อเริ่มต้น',
                    wrap: true,
                    margin: 'md' as const,
                    color: '#666666',
                },
            ],
        },
        footer: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'button' as const,
                    action: {
                        type: 'postback' as const,
                        label: '📝 ลงทะเบียน',
                        data: 'action=register',
                    },
                    style: 'primary' as const,
                    color: '#6366f1',
                },
            ],
        },
    }),

    // Dashboard summary
    dashboardCard: (data: {
        level: number
        title: string
        xp: number
        nextLevelXp: number
        submittedTasks: number
        totalTasks: number
        streak: number
        vocabCount: number
        totalPoints: number
    }) => ({
        type: 'bubble' as const,
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'text' as const,
                    text: '📊 ความก้าวหน้าของคุณ',
                    weight: 'bold' as const,
                    size: 'lg' as const,
                    color: '#6366f1',
                },
                {
                    type: 'separator' as const,
                    margin: 'md' as const,
                },
                {
                    type: 'box' as const,
                    layout: 'vertical' as const,
                    margin: 'md' as const,
                    contents: [
                        {
                            type: 'text' as const,
                            text: `Level ${data.level}: ${data.title}`,
                            weight: 'bold' as const,
                        },
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            margin: 'sm' as const,
                            contents: [
                                {
                                    type: 'box' as const,
                                    layout: 'vertical' as const,
                                    contents: [],
                                    backgroundColor: '#e0e7ff',
                                    height: '8px',
                                    cornerRadius: '4px',
                                },
                                {
                                    type: 'box' as const,
                                    layout: 'vertical' as const,
                                    contents: [],
                                    backgroundColor: '#6366f1',
                                    height: '8px',
                                    width: `${Math.min((data.xp / data.nextLevelXp) * 100, 100)}%`,
                                    cornerRadius: '4px',
                                    position: 'absolute' as const,
                                },
                            ],
                        },
                        {
                            type: 'text' as const,
                            text: `${data.xp}/${data.nextLevelXp} XP`,
                            size: 'xs' as const,
                            color: '#888888',
                            align: 'end' as const,
                        },
                    ],
                },
                {
                    type: 'box' as const,
                    layout: 'horizontal' as const,
                    margin: 'lg' as const,
                    contents: [
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            contents: [
                                { type: 'text' as const, text: '📝', align: 'center' as const },
                                { type: 'text' as const, text: `${data.submittedTasks}/${data.totalTasks}`, align: 'center' as const, size: 'sm' as const, weight: 'bold' as const },
                                { type: 'text' as const, text: 'งาน', align: 'center' as const, size: 'xs' as const, color: '#888888' },
                            ],
                            flex: 1,
                        },
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            contents: [
                                { type: 'text' as const, text: '🔥', align: 'center' as const },
                                { type: 'text' as const, text: `${data.streak}`, align: 'center' as const, size: 'sm' as const, weight: 'bold' as const },
                                { type: 'text' as const, text: 'Streak', align: 'center' as const, size: 'xs' as const, color: '#888888' },
                            ],
                            flex: 1,
                        },
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            contents: [
                                { type: 'text' as const, text: '📚', align: 'center' as const },
                                { type: 'text' as const, text: `${data.vocabCount}`, align: 'center' as const, size: 'sm' as const, weight: 'bold' as const },
                                { type: 'text' as const, text: 'คำศัพท์', align: 'center' as const, size: 'xs' as const, color: '#888888' },
                            ],
                            flex: 1,
                        },
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            contents: [
                                { type: 'text' as const, text: '⭐', align: 'center' as const },
                                { type: 'text' as const, text: `${data.totalPoints}`, align: 'center' as const, size: 'sm' as const, weight: 'bold' as const },
                                { type: 'text' as const, text: 'แต้ม', align: 'center' as const, size: 'xs' as const, color: '#888888' },
                            ],
                            flex: 1,
                        },
                    ],
                },
            ],
        },
        footer: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                {
                    type: 'button' as const,
                    action: {
                        type: 'uri' as const,
                        label: '📈 ดูรายละเอียด',
                        uri: `${process.env.NEXTAUTH_URL}/dashboard`,
                    },
                    style: 'secondary' as const,
                },
            ],
        },
    }),

    // Level up celebration
    levelUpCard: (level: number, title: string, bonusXP: number) => ({
        type: 'bubble' as const,
        hero: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                { type: 'text' as const, text: '🎊', size: 'xxl' as const, align: 'center' as const },
                { type: 'text' as const, text: 'LEVEL UP!', size: 'xl' as const, weight: 'bold' as const, color: '#ffffff', align: 'center' as const },
            ],
            paddingAll: '20px',
            backgroundColor: '#f59e0b',
        },
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                { type: 'text' as const, text: `Level ${level}`, size: 'xxl' as const, weight: 'bold' as const, align: 'center' as const },
                { type: 'text' as const, text: title, size: 'lg' as const, color: '#6366f1', align: 'center' as const },
                { type: 'text' as const, text: `+${bonusXP} XP Bonus! 🎁`, margin: 'lg' as const, align: 'center' as const },
            ],
        },
    }),

    // Badge earned
    badgeCard: (badgeName: string, description: string, bonusXP: number) => ({
        type: 'bubble' as const,
        hero: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                { type: 'text' as const, text: '🏅', size: 'xxl' as const, align: 'center' as const },
                { type: 'text' as const, text: 'Badge Unlocked!', size: 'lg' as const, weight: 'bold' as const, color: '#ffffff', align: 'center' as const },
            ],
            paddingAll: '20px',
            backgroundColor: '#10b981',
        },
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                { type: 'text' as const, text: badgeName, size: 'lg' as const, weight: 'bold' as const, align: 'center' as const },
                { type: 'text' as const, text: description, wrap: true, align: 'center' as const, color: '#666666', margin: 'md' as const },
                { type: 'text' as const, text: `+${bonusXP} XP! 🎁`, margin: 'lg' as const, align: 'center' as const, weight: 'bold' as const, color: '#10b981' },
            ],
        },
    }),
}
