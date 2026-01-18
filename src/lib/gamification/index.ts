import prisma from '@/lib/db/prisma'

export const LEVEL_CONFIG = [
    { level: 1, title: 'มือใหม่หัดพิมพ์', titleEn: 'Typing Newbie', xpRequired: 0 },
    { level: 2, title: 'นักสำรวจภาษา', titleEn: 'Language Explorer', xpRequired: 100 },
    { level: 3, title: 'นักเขียนตัวน้อย', titleEn: 'Little Writer', xpRequired: 300 },
    { level: 4, title: 'นักอ่านผู้ช่ำชอง', titleEn: 'Skilled Reader', xpRequired: 600 },
    { level: 5, title: 'นักวิชาการภาษา', titleEn: 'Language Scholar', xpRequired: 1000 },
    { level: 6, title: 'เซียนภาษาไทย', titleEn: 'Thai Expert', xpRequired: 1500 },
    { level: 7, title: 'ปรมาจารย์ภาษาไทย', titleEn: 'Thai Master', xpRequired: 2200 },
    { level: 8, title: 'เทพแห่งอักษร', titleEn: 'Letter God', xpRequired: 3000 },
    { level: 9, title: 'ตำนานแห่งภาษา', titleEn: 'Language Legend', xpRequired: 4000 },
    { level: 10, title: 'ราชาภาษาไทย', titleEn: 'Thai Language King', xpRequired: 5500 },
]

export const POINT_VALUES = {
    MESSAGE_SENT: 2,
    FEEDBACK_REQUEST: 5,
    FEEDBACK_REVISION: 3,
    SUBMIT_ON_TIME: 20,
    SUBMIT_EARLY: 10,
    SUBMIT_LATE: 10,
    PRACTICE_COMPLETE: 5,
    PRACTICE_PERFECT: 10,
    STREAK_3_DAYS: 15,
    STREAK_7_DAYS: 50,
    STREAK_14_DAYS: 100,
    STREAK_30_DAYS: 300,
    FIRST_SUBMISSION: 30,
    FIRST_FEEDBACK: 20,
    LEVEL_UP: 50,
    BADGE_EARNED: 25,
    DAILY_CHALLENGE: 20,
}

export async function addPoints(
    userId: string,
    points: number,
    _source?: string,
    _referenceId?: string,
    _description?: string
): Promise<{ newTotal: number; leveledUp: boolean; newLevel?: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true, currentLevel: true },
    })

    if (!user) throw new Error('User not found')

    const newTotal = user.totalPoints + points

    const newLevel = calculateLevel(newTotal)
    const leveledUp = newLevel > user.currentLevel

    await prisma.user.update({
        where: { id: userId },
        data: {
            totalPoints: newTotal + (leveledUp ? POINT_VALUES.LEVEL_UP : 0),
            currentLevel: newLevel,
            updatedAt: new Date(),
        },
    })

    return {
        newTotal: newTotal + (leveledUp ? POINT_VALUES.LEVEL_UP : 0),
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
    }
}

export function calculateLevel(totalPoints: number): number {
    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_CONFIG[i].xpRequired) {
            return LEVEL_CONFIG[i].level
        }
    }
    return 1
}

export async function updateStreak(_userId: string): Promise<{ streak: number; bonusPoints: number }> {
    return { streak: 1, bonusPoints: 0 }
}

export function getLevelInfo(level: number): (typeof LEVEL_CONFIG)[0] {
    return LEVEL_CONFIG.find((l) => l.level === level) || LEVEL_CONFIG[0]
}

export function getNextLevelXP(level: number): number {
    const nextLevel = LEVEL_CONFIG.find((l) => l.level === level + 1)
    return nextLevel?.xpRequired || LEVEL_CONFIG[LEVEL_CONFIG.length - 1].xpRequired
}

export function calculateProgress(currentPoints: number, currentLevel: number): number {
    const currentLevelXP = LEVEL_CONFIG.find((l) => l.level === currentLevel)?.xpRequired || 0
    const nextLevelXP = getNextLevelXP(currentLevel)
    const xpInCurrentLevel = currentPoints - currentLevelXP
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP
    return Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)
}

export const BADGE_CRITERIA = {
    LEARNER: { code: 'LEARNER', feedbackCount: 10 },
    FAST_IMPROVER: { code: 'FAST_IMPROVER', consecutiveImprovement: 3 },
    ON_TIME: { code: 'ON_TIME', onTimeSubmissions: 5 },
    FIRE_STREAK: { code: 'FIRE_STREAK', streakDays: 7 },
    PRACTITIONER: { code: 'PRACTITIONER', practiceCount: 20 },
    COMPLETER: { code: 'COMPLETER', weeklySubmissions: 4 },
    VOCAB_MASTER: { code: 'VOCAB_MASTER', vocabularyCount: 100 },
    GRADUATE: { code: 'GRADUATE', levelReached: 5 },
    EXPERT: { code: 'EXPERT', perfectScores: 3 },
}

export async function checkAndAwardBadge(
    userId: string,
    badgeCode: string
): Promise<{ awarded: boolean; badge?: { name: string; nameThai: string } }> {
    const existing = await prisma.userBadge.findFirst({
        where: {
            userId,
            badge: { badgeType: badgeCode },
        },
    })

    if (existing) return { awarded: false }

    const badge = await prisma.badge.findFirst({
        where: { badgeType: badgeCode },
    })

    if (!badge) return { awarded: false }

    await prisma.userBadge.create({
        data: {
            userId,
            badgeId: badge.id,
        },
    })

    await addPoints(userId, POINT_VALUES.BADGE_EARNED, 'BADGE', badge.id, `ได้รับ Badge: ${badge.nameThai}`)

    return {
        awarded: true,
        badge: { name: badge.name, nameThai: badge.nameThai },
    }
}

export async function getDailyChallenge(_userId: string) {
    return {
        challenge: {
            id: 'stub',
            type: 'PRACTICE',
            title: 'นักฝึกฝน',
            description: 'ทำแบบฝึกหัด 3 ชุด',
            reward: 60,
        },
        progress: 0,
        completed: false,
    }
}

export async function updateChallengeProgress(
    _userId: string,
    _challengeId: string,
    _progressIncrement: number
): Promise<{ completed: boolean; reward?: number }> {
    return { completed: false }
}
