import { PostbackEvent } from '@line/bot-sdk'
import { replyText } from '@/lib/line/client'

export async function handlePostback(event: PostbackEvent) {
    const userId = event.source.userId
    if (!userId) return

    await replyText(
        event.replyToken,
        `พิมพ์คำสั่งที่ต้องการได้เลยครับ\n\nตัวอย่าง: "ส่งงาน", "เกม", "แดชบอร์ด"`
    )
}
