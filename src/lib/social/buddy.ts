export interface BuddyMatch {
    id: string
    name: string
    level: number
    nationality: string
    compatibility: number
}

export async function findBuddyMatches(
    userId: string,
    limit: number = 5
): Promise<BuddyMatch[]> {
    return []
}

export async function sendBuddyRequest(
    fromUserId: string,
    toUserId: string
): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Buddy feature not available' }
}

export async function acceptBuddyRequest(
    requestId: string
): Promise<{ success: boolean }> {
    return { success: false }
}

export async function getBuddies(userId: string) {
    return []
}
