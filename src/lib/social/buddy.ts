import { prisma } from '@/lib/prisma'

// ==================== STUDY BUDDY SYSTEM ====================

export interface BuddyMatch {
    id: string
    name: string
    level: number
    nationality: string
    streak: number
    compatibility: number
}

export async function findBuddyMatches(
    userId: string,
    limit: number = 5
): Promise<BuddyMatch[]> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            thaiLevel: true,
            nationality: true,
            currentLevel: true,
        },
    })

    if (!user) return []

    // Find users with similar level (±2)
    const potentialBuddies = await prisma.user.findMany({
        where: {
            id: { not: userId },
            currentLevel: {
                gte: Math.max(1, user.currentLevel - 2),
                lte: user.currentLevel + 2,
            },
        },
        select: {
            id: true,
            thaiName: true,
            currentLevel: true,
            nationality: true,
            streak: true,
            thaiLevel: true,
        },
        take: 20,
    })

    // Calculate compatibility score
    const matches: BuddyMatch[] = potentialBuddies.map((buddy) => {
        let compatibility = 50 // Base score

        // Same nationality bonus
        if (buddy.nationality === user.nationality) {
            compatibility += 20
        }

        // Same Thai level bonus
        if (buddy.thaiLevel === user.thaiLevel) {
            compatibility += 15
        }

        // Similar game level bonus
        const levelDiff = Math.abs(buddy.currentLevel - user.currentLevel)
        compatibility += (2 - levelDiff) * 5

        // Active streak bonus
        if (buddy.streak > 3) {
            compatibility += 10
        }

        return {
            id: buddy.id,
            name: buddy.thaiName || 'Unknown',
            level: buddy.currentLevel,
            nationality: buddy.nationality || 'Unknown',
            streak: buddy.streak,
            compatibility: Math.min(100, compatibility),
        }
    })

    // Sort by compatibility and return top matches
    return matches.sort((a, b) => b.compatibility - a.compatibility).slice(0, limit)
}

export async function sendBuddyRequest(
    fromUserId: string,
    toUserId: string
): Promise<{ success: boolean; message: string }> {
    // Check if already buddies
    const existing = await prisma.studyBuddy.findFirst({
        where: {
            OR: [
                { userId: fromUserId, buddyId: toUserId },
                { userId: toUserId, buddyId: fromUserId },
            ],
        },
    })

    if (existing) {
        return { success: false, message: 'Already buddies or request pending' }
    }

    await prisma.studyBuddy.create({
        data: {
            userId: fromUserId,
            buddyId: toUserId,
            status: 'PENDING',
        },
    })

    return { success: true, message: 'Buddy request sent!' }
}

export async function acceptBuddyRequest(
    requestId: string
): Promise<{ success: boolean }> {
    await prisma.studyBuddy.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED', connectedAt: new Date() },
    })

    return { success: true }
}

export async function getBuddies(userId: string) {
    const buddies = await prisma.studyBuddy.findMany({
        where: {
            OR: [{ userId }, { buddyId: userId }],
            status: 'ACCEPTED',
        },
        include: {
            user: { select: { id: true, thaiName: true, currentLevel: true, streak: true } },
            buddy: { select: { id: true, thaiName: true, currentLevel: true, streak: true } },
        },
    })

    return buddies.map((b) => {
        const buddy = b.userId === userId ? b.buddy : b.user
        return {
            id: buddy.id,
            name: buddy.thaiName,
            level: buddy.currentLevel,
            streak: buddy.streak,
        }
    })
}
