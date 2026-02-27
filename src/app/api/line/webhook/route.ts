import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent, validateSignature } from '@line/bot-sdk'
import { handleMessage } from './handlers/message'
import { handlePostback } from './handlers/postback'
import { handleFollow } from './handlers/follow'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow up to 30 seconds for AI evaluation calls

const channelSecret = process.env.LINE_CHANNEL_SECRET

export async function POST(request: NextRequest) {
    console.log('[Webhook] Received request')

    try {
        if (!channelSecret) {
            console.error('[Webhook] LINE_CHANNEL_SECRET not set')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const body = await request.text()
        const signature = request.headers.get('x-line-signature')

        // Parse body safely
        let parsedBody: any
        try {
            parsedBody = JSON.parse(body)
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (parsedBody.events && parsedBody.events.length === 0) {
            console.log('[Webhook] Verification request - returning 200')
            return NextResponse.json({ success: true })
        }

        // Validate LINE signature (REQUIRED for security)
        if (!signature) {
            console.error('[Webhook] Missing signature - rejecting request')
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
        }

        const isValid = validateSignature(body, channelSecret, signature)
        if (!isValid) {
            console.error('[Webhook] Invalid signature - rejecting request')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const events: WebhookEvent[] = parsedBody.events
        console.log('[Webhook] Events count:', events.length)

        await Promise.all(
            events.map(async (event) => {
                console.log('[Webhook] Processing event:', event.type)
                try {
                    switch (event.type) {
                        case 'message':
                            console.log('[Webhook] Message type:', (event as any).message?.type)
                            await handleMessage(event)
                            break
                        case 'postback':
                            await handlePostback(event)
                            break
                        case 'follow':
                            await handleFollow(event)
                            break
                        case 'unfollow':
                            console.log('[Webhook] User unfollowed:', event.source?.userId ?? 'unknown')
                            break
                        default:
                            console.log('[Webhook] Unhandled event type:', event.type)
                    }
                } catch (error) {
                    console.error('[Webhook] Error processing event:', error)
                }
            })
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Webhook] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    })
}
