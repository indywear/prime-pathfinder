import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent, validateSignature } from '@line/bot-sdk'
import { handleMessage } from './handlers/message'
import { handlePostback } from './handlers/postback'
import { handleFollow } from './handlers/follow'

export const dynamic = 'force-dynamic'

const channelSecret = process.env.LINE_CHANNEL_SECRET

export async function POST(request: NextRequest) {
    console.log('[Webhook] === REQUEST RECEIVED ===')
    
    try {
        if (!channelSecret) {
            console.error('[Webhook] LINE_CHANNEL_SECRET not set')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const body = await request.text()
        const signature = request.headers.get('x-line-signature')
        
        console.log('[Webhook] Body:', body.substring(0, 500))
        console.log('[Webhook] Signature present:', !!signature)

        if (!signature) {
            console.error('[Webhook] Missing signature')
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }

        const isValid = validateSignature(body, channelSecret, signature)
        console.log('[Webhook] Signature valid:', isValid)
        
        if (!isValid) {
            console.error('[Webhook] Invalid signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const parsed = JSON.parse(body)
        const events: WebhookEvent[] = parsed.events
        console.log('[Webhook] Events count:', events.length)

        for (const event of events) {
            console.log('[Webhook] Processing event type:', event.type)
            console.log('[Webhook] Event source:', JSON.stringify(event.source))
            
            try {
                switch (event.type) {
                    case 'message':
                        console.log('[Webhook] Message:', JSON.stringify((event as any).message))
                        await handleMessage(event)
                        console.log('[Webhook] Message handled successfully')
                        break
                    case 'postback':
                        await handlePostback(event)
                        break
                    case 'follow':
                        await handleFollow(event)
                        break
                    case 'unfollow':
                        console.log('[Webhook] User unfollowed:', event.source.userId)
                        break
                    default:
                        console.log('[Webhook] Unhandled event type:', event.type)
                }
            } catch (error) {
                console.error('[Webhook] Error processing event:', error)
            }
        }

        console.log('[Webhook] === REQUEST COMPLETE ===')
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Webhook] Fatal Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        hasSecret: !!process.env.LINE_CHANNEL_SECRET,
        hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        hasDb: !!process.env.DATABASE_URL,
    })
}
