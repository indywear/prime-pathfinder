import { FollowEvent } from '@line/bot-sdk'
import prisma from '@/lib/db/prisma'
import { replyText } from '@/lib/line/client'

export async function handleFollow(event: FollowEvent) {
    const userId = event.source.userId
    if (!userId) return

    const existingUser = await prisma.user.findUnique({
        where: { lineUserId: userId },
    })

    if (existingUser?.isRegistered) {
        await replyText(
            event.replyToken,
            `ยินดีต้อนรับกลับ คุณ${existingUser.thaiName}!\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด`
        )
    } else {
        await replyText(
            event.replyToken,
            `ยินดีต้อนรับสู่ ProficienThAI!\n\nพิมพ์ "ลงทะเบียน" เพื่อเริ่มต้นใช้งาน`
        )
    }
}
