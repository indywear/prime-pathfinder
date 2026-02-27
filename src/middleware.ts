import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function checkBasicAuth(req: NextRequest): boolean {
    const basicAuth = req.headers.get('authorization')
    if (!basicAuth) return false

    try {
        const authValue = basicAuth.split(' ')[1]
        const decoded = atob(authValue)
        const colonIndex = decoded.indexOf(':')
        if (colonIndex === -1) return false

        const user = decoded.substring(0, colonIndex).trim()
        const pwd = decoded.substring(colonIndex + 1).trim()

        const validUser = (process.env.ADMIN_EMAIL || 'admin').trim()
        const validPass = (process.env.ADMIN_PASSWORD || 'prime-pathfinder-admin').trim()

        return user === validUser && pwd === validPass
    } catch {
        return false
    }
}

function denyAuth(): NextResponse {
    return new NextResponse('Authentication required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    })
}

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname
    const method = req.method

    // --- Admin pages: always require auth ---
    if (pathname.startsWith('/admin')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Admin API: always require auth ---
    if (pathname.startsWith('/api/admin')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Debug endpoint: require auth ---
    if (pathname.startsWith('/api/debug')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Users lookup: require auth ---
    if (pathname.startsWith('/api/users/lookup')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Tasks API: GET is public (LINE bot uses it), write operations require auth ---
    if (pathname.startsWith('/api/tasks')) {
        if (method !== 'GET') {
            if (!checkBasicAuth(req)) return denyAuth()
        }
        return NextResponse.next()
    }

    // --- Seed endpoint: require auth ---
    if (pathname.startsWith('/api/seed')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Rich Menu endpoints: require auth ---
    if (pathname.startsWith('/api/richmenu')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Test-games endpoint: require auth ---
    if (pathname.startsWith('/api/test-games')) {
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    // --- Cron nudge endpoint: require CRON_SECRET or admin auth ---
    if (pathname.startsWith('/api/cron')) {
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
            return NextResponse.next()
        }
        if (!checkBasicAuth(req)) return denyAuth()
        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
        '/api/debug/:path*',
        '/api/users/lookup',
        '/api/tasks/:path*',
        '/api/seed/:path*',
        '/api/richmenu/:path*',
        '/api/test-games/:path*',
        '/api/cron/:path*',
    ],
}
