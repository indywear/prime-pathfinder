import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent, validateSignature } from '@line/bot-sdk'
import { handleMessage } from './handlers/message'
import { handlePostback } from './handlers/postback'
import { handleFollow } from './handlers/follow'

const channelSecret = process.env.LINE_CHANNEL_SECRET!

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature validation
        const body = await request.text()
        const signature = request.headers.get('x-line-signature')

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }

        // Validate signature
        if (!validateSignature(body, channelSecret, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        const events: WebhookEvent[] = JSON.parse(body).events

        // Process events
        await Promise.all(
            events.map(async (event) => {
                try {
                    switch (event.type) {
                        case 'message':
                            await handleMessage(event)
                            break
                        case 'postback':
                            await handlePostback(event)
                            break
                        case 'follow':
                            await handleFollow(event)
                            break
                        case 'unfollow':
                            // Log unfollow but don't delete user data
                            console.log('User unfollowed:', event.source.userId)
                            break
                        default:
                            console.log('Unhandled event type:', event.type)
                    }
                } catch (error) {
                    console.error('Error processing event:', error)
                }
            })
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Health check
export async function GET() {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
