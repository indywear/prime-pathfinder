import { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { handleTextMessage } from '@/lib/line/handlers'

export async function handleMessage(event: MessageEvent) {
    if (event.message.type !== 'text') return
    
    const textEvent = event as MessageEvent & { message: TextEventMessage }
    await handleTextMessage(textEvent as Parameters<typeof handleTextMessage>[0])
}
