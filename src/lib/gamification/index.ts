import { prisma } from '@/lib/prisma'
import { PointSource } from '@prisma/client'

// ==================== LEVEL CONFIGURATION ====================

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

// ==================== POINT VALUES ====================

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
    CHEER_RECEIVED: 5,
    CHEER_SENT: 2,
}

// ==================== POINT FUNCTIONS ====================

export async function addPoints(
    userId: string,
    points: number,
    source: PointSource,
    referenceId?: string,
    description?: string
): Promise<{ newTotal: number; leveledUp: boolean; newLevel?: number }> {
    // Add point log
    await prisma.pointLog.create({
        data: {
            userId,
            points,
            source,
            referenceId,
            description,
        },
    })

    // Get current user
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentXP: true, currentLevel: true, totalPoints: true },
    })

    if (!user) throw new Error('User not found')

    const newXP = user.currentXP + points
    const newTotal = user.totalPoints + points

    // Check for level up
    const currentLevelConfig = LEVEL_CONFIG.find((l) => l.level === user.currentLevel)
    const nextLevelConfig = LEVEL_CONFIG.find((l) => l.level === user.currentLevel + 1)

    let leveledUp = false
    let newLevel = user.currentLevel

    if (nextLevelConfig && newXP >= nextLevelConfig.xpRequired) {
        leveledUp = true
        newLevel = nextLevelConfig.level

        // Add level up bonus
        await prisma.pointLog.create({
            data: {
                userId,
                points: POINT_VALUES.LEVEL_UP,
                source: 'LEVEL_UP',
                description: `เลื่อนเป็น Level ${newLevel}: ${nextLevelConfig.title}`,
            },
        })
    }

    // Update user
    await prisma.user.update({
        where: { id: userId },
        data: {
            currentXP: newXP,
            currentLevel: newLevel,
            totalPoints: newTotal + (leveledUp ? POINT_VALUES.LEVEL_UP : 0),
            lastActiveAt: new Date(),
        },
    })

    return {
        newTotal: newTotal + (leveledUp ? POINT_VALUES.LEVEL_UP : 0),
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
    }
}

// ==================== STREAK FUNCTIONS ====================

export async function updateStreak(userId: string): Promise<{ streak: number; bonusPoints: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, lastActiveAt: true },
    })

    if (!user) throw new Error('User not found')

    const now = new Date()
    const lastActive = user.lastActiveAt

    let newStreak = 1
    let bonusPoints = 0

    if (lastActive) {
        const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
            // Consecutive day
            newStreak = user.streak + 1

            // Check for streak bonuses
            if (newStreak === 3) bonusPoints = POINT_VALUES.STREAK_3_DAYS
            else if (newStreak === 7) bonusPoints = POINT_VALUES.STREAK_7_DAYS
            else if (newStreak === 14) bonusPoints = POINT_VALUES.STREAK_14_DAYS
            else if (newStreak === 30) bonusPoints = POINT_VALUES.STREAK_30_DAYS
        } else if (diffDays === 0) {
            // Same day
            newStreak = user.streak
        }
        // If more than 1 day, streak resets to 1
    }

    await prisma.user.update({
        where: { id: userId },
        data: { streak: newStreak },
    })

    if (bonusPoints > 0) {
        await addPoints(userId, bonusPoints, 'STREAK_BONUS', undefined, `Streak ${newStreak} วัน!`)
    }

    return { streak: newStreak, bonusPoints }
}

// ==================== LEVEL FUNCTIONS ====================

export function getLevelInfo(level: number): (typeof LEVEL_CONFIG)[0] {
    return LEVEL_CONFIG.find((l) => l.level === level) || LEVEL_CONFIG[0]
}

export function getNextLevelXP(level: number): number {
    const nextLevel = LEVEL_CONFIG.find((l) => l.level === level + 1)
    return nextLevel?.xpRequired || LEVEL_CONFIG[LEVEL_CONFIG.length - 1].xpRequired
}

export function calculateProgress(currentXP: number, currentLevel: number): number {
    const currentLevelXP = LEVEL_CONFIG.find((l) => l.level === currentLevel)?.xpRequired || 0
    const nextLevelXP = getNextLevelXP(currentLevel)
    const xpInCurrentLevel = currentXP - currentLevelXP
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP
    return Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)
}

// ==================== BADGE FUNCTIONS ====================

export const BADGE_CRITERIA = {
    LEARNER: { code: 'LEARNER', feedbackCount: 10 },
    FAST_IMPROVER: { code: 'FAST_IMPROVER', consecutiveImprovement: 3 },
    ON_TIME: { code: 'ON_TIME', onTimeSubmissions: 5 },
    FIRE_STREAK: { code: 'FIRE_STREAK', streakDays: 7 },
    CHATTERBOX: { code: 'CHATTERBOX', messageCount: 50 },
    PRACTITIONER: { code: 'PRACTITIONER', practiceCount: 20 },
    COMPLETER: { code: 'COMPLETER', weeklySubmissions: 4 },
    VOCAB_MASTER: { code: 'VOCAB_MASTER', vocabularyCount: 100 },
    GRADUATE: { code: 'GRADUATE', levelReached: 5 },
    EXPERT: { code: 'EXPERT', perfectScores: 3 },
}

export async function checkAndAwardBadge(
    userId: string,
    badgeCode: string
): Promise<{ awarded: boolean; badge?: { name: string; nameThai: string; bonusXP: number } }> {
    // Check if already has badge
    const existing = await prisma.achievement.findFirst({
        where: {
            userId,
            badge: { code: badgeCode },
        },
    })

    if (existing) return { awarded: false }

    // Get badge
    const badge = await prisma.badge.findUnique({
        where: { code: badgeCode },
    })

    if (!badge) return { awarded: false }

    // Award badge
    await prisma.achievement.create({
        data: {
            userId,
            badgeId: badge.id,
        },
    })

    // Add bonus XP
    if (badge.bonusXP > 0) {
        await addPoints(userId, badge.bonusXP, 'BADGE', badge.id, `ได้รับ Badge: ${badge.nameThai}`)
    }

    return {
        awarded: true,
        badge: { name: badge.name, nameThai: badge.nameThai, bonusXP: badge.bonusXP },
    }
}

// ==================== DAILY CHALLENGE ====================

export async function getDailyChallenge(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's challenge
    let challenge = await prisma.dailyChallenge.findFirst({
        where: { date: today, isActive: true },
    })

    // Create if not exists
    if (!challenge) {
        const types = ['VOCAB', 'SPEED', 'STREAK', 'PRACTICE'] as const
        const randomType = types[Math.floor(Math.random() * types.length)]
        const challenges = {
            VOCAB: { title: 'นักสะสมคำ', description: 'เรียนรู้คำใหม่ 5 คำ', reward: 50 },
            SPEED: { title: 'Speed Demon', description: 'ตอบถูก 10 ข้อใน 2 นาที', reward: 75 },
            STREAK: { title: 'ไฟแรง', description: 'รักษา streak วันนี้', reward: 30 },
            PRACTICE: { title: 'นักฝึกฝน', description: 'ทำแบบฝึกหัด 3 ชุด', reward: 60 },
        }

        challenge = await prisma.dailyChallenge.create({
            data: {
                type: randomType,
                date: today,
                ...challenges[randomType],
            },
        })
    }

    // Get user's progress
    const userChallenge = await prisma.userDailyChallenge.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
    })

    return {
        challenge,
        progress: userChallenge?.progress || 0,
        completed: userChallenge?.completed || false,
    }
}

export async function updateChallengeProgress(
    userId: string,
    challengeId: string,
    progressIncrement: number
): Promise<{ completed: boolean; reward?: number }> {
    const challenge = await prisma.dailyChallenge.findUnique({
        where: { id: challengeId },
    })

    if (!challenge) return { completed: false }

    const userChallenge = await prisma.userDailyChallenge.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        create: { userId, challengeId, progress: progressIncrement },
        update: { progress: { increment: progressIncrement } },
    })

    // Check if completed (assuming 100% = complete)
    if (!userChallenge.completed && userChallenge.progress >= 100) {
        await prisma.userDailyChallenge.update({
            where: { id: userChallenge.id },
            data: { completed: true, completedAt: new Date() },
        })

        await addPoints(userId, challenge.reward, 'DAILY_CHALLENGE', challengeId, `Daily Challenge: ${challenge.title}`)

        return { completed: true, reward: challenge.reward }
    }

    return { completed: false }
}
