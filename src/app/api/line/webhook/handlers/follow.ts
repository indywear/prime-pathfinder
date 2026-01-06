import { FollowEvent } from '@line/bot-sdk'
import { prisma } from '@/lib/prisma'
import { replyFlex, flexTemplates } from '@/lib/line/client'

export async function handleFollow(event: FollowEvent) {
    const userId = event.source.userId
    if (!userId) return

    // Check if returning user
    const existingUser = await prisma.user.findUnique({
        where: { lineUserId: userId },
    })

    if (existingUser) {
        // Welcome back
        await replyFlex(
            event.replyToken,
            'ยินดีต้อนรับกลับ!',
            {
                type: 'bubble',
                hero: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '👋', size: 'xxl', align: 'center' },
                        { type: 'text', text: 'ยินดีต้อนรับกลับ!', size: 'xl', weight: 'bold', color: '#ffffff', align: 'center' },
                    ],
                    paddingAll: '20px',
                    backgroundColor: '#6366f1',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: `สวัสดีครับ ${existingUser.thaiName}!`, weight: 'bold', size: 'lg' },
                        { type: 'text', text: 'น้องไทยคิดถึงนะ! พร้อมเรียนต่อกันเลย 📚', margin: 'md', wrap: true, color: '#666666' },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: { type: 'postback', label: '🎮 ฝึกฝน', data: 'action=practice' },
                            style: 'primary',
                            color: '#6366f1',
                        },
                        {
                            type: 'button',
                            action: { type: 'postback', label: '📊 แดชบอร์ด', data: 'action=dashboard' },
                            style: 'secondary',
                            margin: 'sm',
                        },
                    ],
                },
            }
        )
    } else {
        // New user
        await replyFlex(
            event.replyToken,
            'ยินดีต้อนรับสู่ ProficienThAI!',
            flexTemplates.welcomeCard()
        )
    }
}
