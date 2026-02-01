import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent, validateSignature } from '@line/bot-sdk'
import { handleMessage } from './handlers/message'
import { handlePostback } from './handlers/postback'
import { handleFollow } from './handlers/follow'

export const dynamic = 'force-dynamic'

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

        console.log('[Webhook] Body length:', body.length)
        console.log('[Webhook] Has signature:', !!signature)

        // Handle LINE verification request (empty events array)
        const parsedBody = JSON.parse(body)
        if (parsedBody.events && parsedBody.events.length === 0) {
            console.log('[Webhook] Verification request - returning 200')
            return NextResponse.json({ success: true })
        }

        // Temporarily skip signature validation for debugging
        // TODO: Re-enable after fixing
        if (signature) {
            const isValid = validateSignature(body, channelSecret, signature)
            console.log('[Webhook] Signature valid:', isValid)
            if (!isValid) {
                console.warn('[Webhook] Signature mismatch - continuing anyway for debug')
            }
        } else {
            console.warn('[Webhook] No signature - continuing anyway for debug')
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
                            console.log('[Webhook] User unfollowed:', event.source.userId)
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
        hasSecret: !!process.env.LINE_CHANNEL_SECRET,
        hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        hasDb: !!process.env.DATABASE_URL,
    })
}
