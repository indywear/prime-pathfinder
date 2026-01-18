import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // Try to find user by studentId or email
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { studentId: query },
                { email: query.toLowerCase() },
            ]
        },
        select: { id: true }
    })

    if (user) {
        return NextResponse.json({ userId: user.id })
    }

    return NextResponse.json({ userId: null })
}
