import { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { handleTextMessage } from '@/lib/line/handlers'

export async function handleMessage(event: MessageEvent) {
    console.log('[MessageHandler] Event received, message type:', event.message.type)
    
    if (event.message.type !== 'text') {
        console.log('[MessageHandler] Ignoring non-text message')
        return
    }
    
    const textEvent = event as MessageEvent & { message: TextEventMessage }
    console.log('[MessageHandler] Text message:', textEvent.message.text)
    console.log('[MessageHandler] Reply token:', event.replyToken)
    
    try {
        await handleTextMessage(textEvent as Parameters<typeof handleTextMessage>[0])
        console.log('[MessageHandler] handleTextMessage completed')
    } catch (error) {
        console.error('[MessageHandler] Error in handleTextMessage:', error)
        throw error
    }
}
