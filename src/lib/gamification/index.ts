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
    DAILY_CHAT: 1,
    CONSECUTIVE_WEEK_BONUS: 20,
    REQUEST_FEEDBACK: 5,
    REQUEST_FEEDBACK_REVISION: 7,
}

export async function addPoints(
    userId: string,
    points: number,
    _source?: string,
    _referenceId?: string,
    _description?: string
): Promise<{ newTotal: number; leveledUp: boolean; newLevel?: number }> {
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { totalPoints: true, currentLevel: true },
        })

        if (!user) throw new Error('User not found')

        const newTotal = user.totalPoints + points
        const newLevel = calculateLevel(newTotal)
        const leveledUp = newLevel > user.currentLevel
        const finalTotal = newTotal + (leveledUp ? POINT_VALUES.LEVEL_UP : 0)

        await tx.user.update({
            where: { id: userId },
            data: {
                totalPoints: finalTotal,
                currentLevel: newLevel,
                updatedAt: new Date(),
            },
        })

        return {
            newTotal: finalTotal,
            leveledUp,
            newLevel: leveledUp ? newLevel : undefined,
        }
    })
}

export function calculateLevel(totalPoints: number): number {
    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_CONFIG[i].xpRequired) {
            return LEVEL_CONFIG[i].level
        }
    }
    return 1
}

export async function updateStreak(userId: string): Promise<{ streak: number; bonusPoints: number }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [sessions, submissions] = await Promise.all([
        prisma.practiceSession.findMany({
            where: {
                userId,
                completedAt: { gte: thirtyDaysAgo },
            },
            select: { completedAt: true },
        }),
        prisma.submission.findMany({
            where: {
                userId,
                submittedAt: { gte: thirtyDaysAgo },
            },
            select: { submittedAt: true },
        }),
    ])

    const activeDays = new Set<string>()
    sessions.forEach((s) => {
        const date = new Date(s.completedAt)
        date.setHours(0, 0, 0, 0)
        activeDays.add(date.toISOString().split('T')[0])
    })
    submissions.forEach((s) => {
        const date = new Date(s.submittedAt)
        date.setHours(0, 0, 0, 0)
        activeDays.add(date.toISOString().split('T')[0])
    })

    let streak = 0
    const checkDate = new Date(today)

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0]
        if (activeDays.has(dateStr)) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
        } else if (streak === 0) {
            checkDate.setDate(checkDate.getDate() - 1)
            if (checkDate < thirtyDaysAgo) break
        } else {
            break
        }
    }

    let bonusPoints = 0
    if (streak === 3) bonusPoints = POINT_VALUES.STREAK_3_DAYS
    else if (streak === 7) bonusPoints = POINT_VALUES.STREAK_7_DAYS
    else if (streak === 14) bonusPoints = POINT_VALUES.STREAK_14_DAYS
    else if (streak === 30) bonusPoints = POINT_VALUES.STREAK_30_DAYS

    if (bonusPoints > 0) {
        await addPoints(userId, bonusPoints, 'STREAK', undefined, `Streak ${streak} วัน`)
    }

    return { streak, bonusPoints }
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

export const POINTS = POINT_VALUES

export function getPointsForNextLevel(currentLevel: number): number {
    const nextLevel = LEVEL_CONFIG.find((l) => l.level === currentLevel + 1)
    if (nextLevel) {
        return nextLevel.xpRequired
    }
    const lastLevel = LEVEL_CONFIG[LEVEL_CONFIG.length - 1]
    return lastLevel.xpRequired + (currentLevel - lastLevel.level + 1) * 500
}

export function getProgressToNextLevel(totalPoints: number, currentLevel: number): number {
    const currentThreshold = LEVEL_CONFIG.find((l) => l.level === currentLevel)?.xpRequired || 0
    const nextThreshold = getPointsForNextLevel(currentLevel)
    const pointsInCurrentLevel = totalPoints - currentThreshold
    const pointsNeeded = nextThreshold - currentThreshold
    if (pointsNeeded <= 0) return 100
    return Math.round((pointsInCurrentLevel / pointsNeeded) * 100)
}

export function formatPointsMessage(points: number, action: string): string {
    if (points > 0) {
        return `+${points} แต้ม (${action})`
    }
    return ''
}

export const BADGE_TYPES = {
    CURIOUS_LEARNER: {
        type: 'CURIOUS_LEARNER',
        name: 'Curious Learner',
        nameThai: 'ผู้ใฝ่รู้',
        description: 'Request feedback 10 times',
        requirement: 10,
        checkField: 'feedbackCount',
    },
    DILIGENT_WRITER: {
        type: 'DILIGENT_WRITER',
        name: 'Diligent Writer',
        nameThai: 'นักเขียนขยัน',
        description: 'Submit 4 consecutive weeks',
        requirement: 4,
        checkField: 'consecutiveWeeks',
    },
    EARLY_BIRD: {
        type: 'EARLY_BIRD',
        name: 'Early Bird',
        nameThai: 'ส่งไว',
        description: 'Submit early 3 times',
        requirement: 3,
        checkField: 'earlySubmissions',
    },
    VOCAB_MASTER_100: {
        type: 'VOCAB_MASTER_100',
        name: 'Vocabulary Master',
        nameThai: 'คำศัพท์ 100',
        description: 'Learn 100 vocabulary words',
        requirement: 100,
        checkField: 'vocabularyCount',
    },
    IMPROVER: {
        type: 'IMPROVER',
        name: 'Fast Improver',
        nameThai: 'นักพัฒนา',
        description: 'Improve scores 3 times in a row',
        requirement: 3,
        checkField: 'improvementStreak',
    },
    PRACTICE_CHAMPION: {
        type: 'PRACTICE_CHAMPION',
        name: 'Practice Champion',
        nameThai: 'แชมป์ฝึกฝน',
        description: 'Complete 50 practice sessions',
        requirement: 50,
        checkField: 'practiceCount',
    },
    PERFECT_SCORE: {
        type: 'PERFECT_SCORE',
        name: 'Perfect Score',
        nameThai: 'คะแนนเต็ม',
        description: 'Get 100/100 on a submission',
        requirement: 100,
        checkField: 'perfectSubmission',
    },
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

const DAILY_CHALLENGES = [
    { type: 'PRACTICE', title: 'นักฝึกฝน', description: 'ทำแบบฝึกหัด 3 ชุด', target: 3, reward: 60 },
    { type: 'VOCABULARY', title: 'นักสะสมคำ', description: 'เรียนคำศัพท์ใหม่ 5 คำ', target: 5, reward: 50 },
    { type: 'PERFECT', title: 'ความสมบูรณ์แบบ', description: 'ได้คะแนนเต็มในแบบฝึกหัด 1 ชุด', target: 1, reward: 80 },
    { type: 'STREAK', title: 'ความต่อเนื่อง', description: 'เข้าใช้งานติดต่อกัน 2 วัน', target: 2, reward: 40 },
    { type: 'WRITING', title: 'นักเขียน', description: 'ส่งงานเขียน 1 ชิ้น', target: 1, reward: 100 },
    { type: 'GAMES', title: 'นักเล่นเกม', description: 'เล่นเกมภาษา 2 รอบ', target: 2, reward: 45 },
    { type: 'FEEDBACK', title: 'ผู้ใฝ่รู้', description: 'ขอ feedback 1 ครั้ง', target: 1, reward: 55 },
]

function getDailyChallengeIndex(): number {
    const today = new Date()
    const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    )
    return dayOfYear % DAILY_CHALLENGES.length
}

export async function getDailyChallenge(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const challengeIndex = getDailyChallengeIndex()
    const challenge = DAILY_CHALLENGES[challengeIndex]
    const challengeId = `daily-${todayStr}-${challenge.type}`

    let progress = 0

    if (challenge.type === 'PRACTICE' || challenge.type === 'GAMES') {
        const sessions = await prisma.practiceSession.count({
            where: {
                userId,
                completedAt: { gte: today },
            },
        })
        progress = sessions
    } else if (challenge.type === 'VOCABULARY') {
        const vocabProgress = await prisma.userVocabulary.count({
            where: {
                userId,
                lastPracticed: { gte: today },
            },
        })
        progress = vocabProgress
    } else if (challenge.type === 'PERFECT') {
        const sessions = await prisma.practiceSession.findMany({
            where: {
                userId,
                completedAt: { gte: today },
            },
            select: { correctCount: true, totalCount: true },
        })
        const perfectCount = sessions.filter((s) => s.totalCount > 0 && s.correctCount === s.totalCount).length
        progress = perfectCount > 0 ? 1 : 0
    } else if (challenge.type === 'STREAK') {
        const { streak } = await updateStreak(userId)
        progress = streak
    } else if (challenge.type === 'WRITING') {
        const submissions = await prisma.submission.count({
            where: {
                userId,
                submittedAt: { gte: today },
            },
        })
        progress = submissions
    } else if (challenge.type === 'FEEDBACK') {
        const feedbacks = await prisma.feedbackRequest.count({
            where: {
                userId,
                requestedAt: { gte: today },
            },
        })
        progress = feedbacks
    }

    const completed = progress >= challenge.target

    return {
        challenge: {
            id: challengeId,
            type: challenge.type,
            title: challenge.title,
            description: challenge.description,
            target: challenge.target,
            reward: challenge.reward,
        },
        progress,
        completed,
    }
}

export async function updateChallengeProgress(
    userId: string,
    _challengeId: string,
    _progressIncrement: number
): Promise<{ completed: boolean; reward?: number }> {
    const { challenge, progress, completed } = await getDailyChallenge(userId)

    if (completed && progress === challenge.target) {
        await addPoints(userId, challenge.reward, 'DAILY_CHALLENGE', challenge.id, `Daily Challenge: ${challenge.title}`)
        return { completed: true, reward: challenge.reward }
    }

    return { completed }
}
