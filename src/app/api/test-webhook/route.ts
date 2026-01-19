import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    const body = await request.text()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
        headers[key] = value
    })
    
    console.log('[TestWebhook] POST received')
    console.log('[TestWebhook] Headers:', JSON.stringify(headers, null, 2))
    console.log('[TestWebhook] Body:', body)
    
    return NextResponse.json({ 
        received: true, 
        timestamp: new Date().toISOString(),
        bodyLength: body.length,
        hasSignature: !!request.headers.get('x-line-signature')
    })
}

export async function GET() {
    console.log('[TestWebhook] GET received')
    return NextResponse.json({ 
        status: 'test-webhook-ok',
        timestamp: new Date().toISOString(),
        env: {
            hasSecret: !!process.env.LINE_CHANNEL_SECRET,
            hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        }
    })
}
