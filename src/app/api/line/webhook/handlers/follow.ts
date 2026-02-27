import { FollowEvent } from '@line/bot-sdk'
import prisma from '@/lib/db/prisma'
import { replyText } from '@/lib/line/client'
import { getNewUserWelcome, getReturningUserWelcome } from '@/lib/line/botCharacter'

export async function handleFollow(event: FollowEvent) {
    const userId = event.source.userId
    if (!userId) return

    const existingUser = await prisma.user.findUnique({
        where: { lineUserId: userId },
    })

    if (existingUser?.isRegistered) {
        // Returning user — welcome back with time greeting
        await replyText(
            event.replyToken,
            getReturningUserWelcome(
                existingUser.thaiName || "เพื่อน",
                existingUser.gender
            )
        )
    } else {
        // New user — full welcome introduction
        await replyText(
            event.replyToken,
            getNewUserWelcome()
        )
    }
}
