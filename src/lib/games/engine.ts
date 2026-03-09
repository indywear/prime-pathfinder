import prisma from '@/lib/db/prisma'
import { GameType } from '@prisma/client'

// ==================== GAME TYPES ====================
// 15 ประเภทเกม แบ่งเป็น 4 หมวด
// Note: `points` = คะแนนต่อข้อ (ไม่ใช่ต่อเกม) e.g. points: 10 = ได้ 10 แต้มทุกข้อที่ตอบถูก

export const GAME_TYPES = {
    // ========== Vocabulary Games (4) — Level 1+ ==========
    VOCAB_MATCH: {
        id: 'VOCAB_MATCH',
        name: 'จับคู่คำ',
        description: 'จับคู่คำกับความหมายที่ถูกต้อง',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
        requiredLevel: 1,
    },
    VOCAB_MEANING: {
        id: 'VOCAB_MEANING',
        name: 'ความหมายคำศัพท์',
        description: 'พิมพ์ความหมายของคำที่กำหนด',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
        requiredLevel: 1,
    },
    VOCAB_OPPOSITE: {
        id: 'VOCAB_OPPOSITE',
        name: 'คำตรงข้าม',
        description: 'เลือกคำตรงข้ามจาก 4 ตัวเลือก',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
        requiredLevel: 1,
    },
    VOCAB_SYNONYM: {
        id: 'VOCAB_SYNONYM',
        name: 'คำพ้องความหมาย',
        description: 'เลือกคำพ้องความหมายจาก 4 ตัวเลือก',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
        requiredLevel: 1,
    },

    // ========== Grammar Games (4) — Level 3+ ==========
    FILL_BLANK: {
        id: 'FILL_BLANK',
        name: 'เติมคำ',
        description: 'เติมคำลงในช่องว่างให้ถูกต้อง',
        points: 10,
        questionsPerRound: 5,
        category: 'grammar',
        requiredLevel: 3,
    },
    FIX_SENTENCE: {
        id: 'FIX_SENTENCE',
        name: 'แก้ไขประโยค',
        description: 'แก้ไขประโยคที่ผิดให้ถูกต้อง',
        points: 12,
        questionsPerRound: 5,
        category: 'grammar',
        requiredLevel: 3,
    },
    ARRANGE_SENTENCE: {
        id: 'ARRANGE_SENTENCE',
        name: 'เรียงประโยค',
        description: 'เรียงคำให้เป็นประโยคที่ถูกต้อง',
        points: 12,
        questionsPerRound: 5,
        category: 'grammar',
        requiredLevel: 3,
    },
    SPEED_GRAMMAR: {
        id: 'SPEED_GRAMMAR',
        name: 'Speed Grammar',
        description: 'ตอบคำถามไวยากรณ์ให้เร็วที่สุด',
        points: 15,
        questionsPerRound: 5,
        category: 'grammar',
        requiredLevel: 3,
    },

    // ========== Reading & Writing Games (4) — Level 5+ ==========
    READ_ANSWER: {
        id: 'READ_ANSWER',
        name: 'อ่านแล้วตอบ',
        description: 'อ่านเนื้อเรื่องแล้วตอบคำถาม',
        points: 15,
        questionsPerRound: 3,
        category: 'reading',
        requiredLevel: 5,
    },
    COMPOSE_SENTENCE: {
        id: 'COMPOSE_SENTENCE',
        name: 'แต่งประโยค',
        description: 'แต่งประโยคโดยใช้คำที่กำหนด',
        points: 15,
        questionsPerRound: 3,
        category: 'reading',
        requiredLevel: 5,
    },
    SUMMARIZE: {
        id: 'SUMMARIZE',
        name: 'สรุปเรื่อง',
        description: 'อ่านเนื้อเรื่องแล้วเขียนสรุป',
        points: 20,
        questionsPerRound: 3,
        category: 'reading',
        requiredLevel: 5,
    },
    CONTINUE_STORY: {
        id: 'CONTINUE_STORY',
        name: 'เขียนต่อเรื่อง',
        description: 'อ่านเนื้อเรื่องแล้วเขียนต่อ',
        points: 20,
        questionsPerRound: 3,
        category: 'reading',
        requiredLevel: 5,
    },

    // ========== Fun Games (3) — Level 1+ ==========
    DAILY_VOCAB: {
        id: 'DAILY_VOCAB',
        name: 'คำศัพท์รายวัน',
        description: 'เรียนรู้คำศัพท์ใหม่ทุกวัน',
        points: 5,
        questionsPerRound: 1,
        category: 'fun',
        requiredLevel: 1,
    },
    RACE_CLOCK: {
        id: 'RACE_CLOCK',
        name: 'แข่งกับเวลา',
        description: 'ตอบคำถามให้เร็วที่สุด',
        points: 10,
        questionsPerRound: 10,
        category: 'fun',
        requiredLevel: 1,
    },
    VOCAB_GACHA: {
        id: 'VOCAB_GACHA',
        name: 'กาชาคำศัพท์',
        description: 'สุ่มได้คำศัพท์ใหม่มาสะสม',
        points: 5,
        questionsPerRound: 1,
        category: 'fun',
        requiredLevel: 1,
    },

    // ========== Culture Games (2) — Level 1+ ==========
    THAI_IDIOM: {
        id: 'THAI_IDIOM',
        name: 'สำนวนไทย',
        description: 'เรียนรู้สำนวนไทยและความหมาย',
        points: 10,
        questionsPerRound: 5,
        category: 'culture',
        requiredLevel: 1,
    },
    THAI_CULTURE: {
        id: 'THAI_CULTURE',
        name: 'วัฒนธรรมไทย',
        description: 'เรียนรู้วัฒนธรรม มารยาท คำต้องห้าม',
        points: 10,
        questionsPerRound: 5,
        category: 'culture',
        requiredLevel: 1,
    },

    // ========== Legacy Games ==========
    MULTIPLE_CHOICE: {
        id: 'MULTIPLE_CHOICE',
        name: 'เลือกตอบ',
        description: 'ตอบคำถามแบบเลือกตอบ 4 ตัวเลือก',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
        requiredLevel: 1,
    },
    SENTENCE_WRITING: {
        id: 'SENTENCE_WRITING',
        name: 'แต่งประโยค',
        description: 'แต่งประโยคโดยใช้คำที่กำหนด',
        points: 15,
        questionsPerRound: 3,
        category: 'reading',
        requiredLevel: 5,
    },
} as const

export type GameTypeId = keyof typeof GAME_TYPES

// ==================== NATURAL LANGUAGE MESSAGES ====================
// ข้อความหลากหลาย สุ่มแสดงให้ธรรมชาติเหมือนครูพูดกับนักเรียน

const CORRECT_MESSAGES = [
    "ถูกต้อง! เก่งมากเลย",
    "ดีมาก! ถูกแล้ว",
    "เยี่ยมเลย! ใช่เลย",
    "ถูกต้องแม่นยำ!",
    "สุดยอด! ตอบถูก",
    "ยอดเยี่ยม! เก่งจัง",
    "Perfect! ถูกเป๊ะ",
    "ใช่เลย! ไปต่อกันเลย",
    "ตอบได้ดีมาก!",
    "ถูกต้อง! มาถูกทางแล้ว",
]

const WRONG_MESSAGES = [
    "ยังไม่ถูก ลองอีกครั้งนะ",
    "ไม่ถูกนะ ลองคิดใหม่",
    "เกือบแล้ว! ลองดูอีกที",
    "ยังไม่ใช่ ลองอีกรอบ",
    "ผิดนิดเดียว ลองใหม่",
    "ไม่ถูกต้อง ไม่เป็นไร ลองอีกที",
    "ยังไม่ตรง ลองคิดดูอีกนิด",
    "พลาดไป สู้ๆ ลองใหม่!",
]

const WRONG_RETRY_MESSAGES = [
    "ยังไม่ถูกอีก ลองอีกครั้ง",
    "ยังไม่ใช่เลย คิดดีๆ นะ",
    "ไม่ถูกอีกแล้ว ลองดูคำใบ้ไหม?",
    "พลาดอีกครั้ง สู้ๆ!",
    "ยังผิดอยู่ ลองเปลี่ยนคำตอบดู",
]

const SESSION_COMPLETE_PERFECT = [
    "Perfect! ตอบถูกหมดเลย!",
    "เก่งสุดๆ! ถูกทุกข้อเลย!",
    "ยอดเยี่ยมมาก! คะแนนเต็ม!",
    "สุดยอดไปเลย! ไม่มีผิดสักข้อ!",
]

const SESSION_COMPLETE_GOOD = [
    "เก่งมาก! ทำได้ดี!",
    "ดีมากเลย! เก่งจัง!",
    "ทำได้ดีทีเดียว!",
    "เยี่ยมเลย! ไปได้สวย!",
]

const SESSION_COMPLETE_OK = [
    "ดีมาก! พัฒนาขึ้นเรื่อยๆ",
    "ทำได้ดี ฝึกต่อนะ!",
    "ไม่เลวเลย! ฝึกอีกนิด!",
    "โอเค! ลองเล่นอีกรอบไหม?",
]

const SESSION_COMPLETE_LOW = [
    "ไม่เป็นไร สู้ๆ นะ!",
    "พยายามอีกนิด! เล่นใหม่ไหม?",
    "ฝึกอีกหน่อย จะเก่งขึ้นแน่ๆ!",
    "ไม่ต้องท้อ ลองอีกรอบนะ!",
]

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get a random "correct" encouragement message
 */
export function getCorrectMessage(customMsg?: string): string {
    return customMsg || pickRandom(CORRECT_MESSAGES)
}

/**
 * Get a random "wrong" encouragement message
 * @param isRetry - true if user has already answered wrong before (pendingWrong)
 */
export function getWrongMessage(customMsg?: string, isRetry: boolean = false): string {
    if (customMsg) return customMsg
    return isRetry ? pickRandom(WRONG_RETRY_MESSAGES) : pickRandom(WRONG_MESSAGES)
}

/**
 * Get a random session complete encouragement based on score percentage
 */
export function getSessionCompleteEmoji(percentage: number): { emoji: string; message: string } {
    if (percentage === 100) return { emoji: '🌟', message: pickRandom(SESSION_COMPLETE_PERFECT) }
    if (percentage >= 80) return { emoji: '🎉', message: pickRandom(SESSION_COMPLETE_GOOD) }
    if (percentage >= 50) return { emoji: '👍', message: pickRandom(SESSION_COMPLETE_OK) }
    return { emoji: '💪', message: pickRandom(SESSION_COMPLETE_LOW) }
}

// ==================== LEVEL GATE ====================
// ล็อคเกมยากตาม Level ของผู้เรียน
// Vocabulary + Fun: Level 1+, Grammar: Level 3+, Reading/Writing: Level 5+

/**
 * Check if user meets the level requirement for a game
 * Returns null if OK, or a lock message string if blocked
 */
export function checkLevelGate(gameType: string, userLevel: number): string | null {
    const config = GAME_TYPES[gameType as GameTypeId]
    if (!config) return null // unknown game type → allow (shouldn't happen)

    const required = config.requiredLevel
    if (userLevel >= required) return null // user meets requirement

    const categoryNames: Record<string, string> = {
        grammar: 'ไวยากรณ์',
        reading: 'การอ่าน-เขียน',
    }
    const categoryLabel = categoryNames[config.category] || config.category

    return `🔒 เกม "${config.name}" ต้อง Level ${required} ขึ้นไป

📊 Level ปัจจุบันของคุณ: Level ${userLevel}
📚 หมวด: ${categoryLabel}

💡 เล่นเกมคำศัพท์และเกมสนุกเพื่อสะสมคะแนนเลเวลอัป!
พิมพ์ "ฝึกฝน" เพื่อเลือกเกมที่เล่นได้`
}

// ==================== LIGHTWEIGHT SESSION HELPERS ====================
// These work with User.gameData JSON field (used by handlers.ts)
// to enable multi-question sessions (ข้อ 1/5, 2/5, 3/5...)

export interface GameSessionState {
    sessionType: string        // game type id
    gameType: string           // alias for sessionType (consistency with DB model)
    questionIds: string[]      // all question IDs in this session
    currentIndex: number       // 0-based index of current question
    totalQuestions: number     // total questions in session
    correctCount: number       // how many answered correctly
    wrongCount: number         // how many answered wrong
    pointsEarned: number       // total points so far
    pointsPerQuestion: number  // base points per correct answer
    pointMultiplier: number    // 1.0 or 0.5 (diminishing returns)
    startedAt: string          // ISO timestamp
    answers: { questionId: string; correct: boolean; points: number }[]
    hintsUsed: string[]  // question IDs where hint was used
    isReviewSession?: boolean  // true = ทบทวนข้อผิดจากรอบก่อน (คะแนน 50%)
}

/**
 * Create a new multi-question session data object
 * Stores in User.gameData as JSON string
 */
export function createSessionData(
    gameType: string,
    questionIds: string[],
    pointMultiplier: number = 1.0
): GameSessionState {
    const config = GAME_TYPES[gameType as GameTypeId]
    return {
        sessionType: gameType,
        gameType,
        questionIds,
        currentIndex: 0,
        totalQuestions: questionIds.length,
        correctCount: 0,
        wrongCount: 0,
        pointsEarned: 0,
        pointsPerQuestion: config?.points ?? 10,
        pointMultiplier,
        startedAt: new Date().toISOString(),
        answers: [],
        hintsUsed: [],
    }
}

/**
 * Parse gameData JSON string into GameSessionState
 * Returns null if invalid or not a session
 */
export function parseSessionData(gameData: string | null): GameSessionState | null {
    if (!gameData) return null
    try {
        const data = JSON.parse(gameData)
        if (data.sessionType && Array.isArray(data.questionIds)) {
            return data as GameSessionState
        }
        return null
    } catch {
        return null
    }
}

/**
 * Get the current question ID from session
 */
export function getCurrentQuestionId(session: GameSessionState): string | null {
    if (session.currentIndex >= session.questionIds.length) return null
    return session.questionIds[session.currentIndex]
}

/**
 * Advance session to next question after answering
 * Returns updated session state
 */
export function advanceSession(
    session: GameSessionState,
    isCorrect: boolean,
    hintUsed: boolean = false,
): GameSessionState {
    const basePoints = isCorrect ? session.pointsPerQuestion : 0
    const hintPenalty = hintUsed ? 0.5 : 1.0
    const earnedPoints = Math.round(basePoints * session.pointMultiplier * hintPenalty)
    const currentQuestionId = session.questionIds[session.currentIndex] || ''

    return {
        ...session,
        currentIndex: session.currentIndex + 1,
        correctCount: session.correctCount + (isCorrect ? 1 : 0),
        wrongCount: session.wrongCount + (isCorrect ? 0 : 1),
        pointsEarned: session.pointsEarned + earnedPoints,
        answers: [
            ...session.answers,
            { questionId: currentQuestionId, correct: isCorrect, points: earnedPoints },
        ],
        hintsUsed: hintUsed
            ? [...session.hintsUsed, currentQuestionId]
            : session.hintsUsed,
    }
}

/**
 * Check if the session is complete (all questions answered)
 */
export function isSessionComplete(session: GameSessionState): boolean {
    return session.currentIndex >= session.totalQuestions
}

/**
 * Get display string for current question number: "ข้อ 2/5"
 */
export function getSessionProgress(session: GameSessionState): string {
    return `ข้อ ${session.currentIndex + 1}/${session.totalQuestions}`
}

/**
 * Format game summary message when session completes
 */
export function formatSessionSummary(session: GameSessionState): string {
    const percentage = session.totalQuestions > 0
        ? Math.round((session.correctCount / session.totalQuestions) * 100)
        : 0

    const { emoji, message } = getSessionCompleteEmoji(percentage)

    const gameName = GAME_TYPES[session.sessionType as GameTypeId]?.name ?? session.sessionType
    const reviewLabel = session.isReviewSession ? ' (ทบทวน)' : ''
    const multiplierNote = session.pointMultiplier < 1.0 && !session.isReviewSession
        ? `\n⚠️ คะแนนลด ${Math.round((1 - session.pointMultiplier) * 100)}% (เล่นเกินรอบฟรีวันนี้)`
        : session.isReviewSession
        ? `\n📝 ทบทวนข้อผิด — คะแนน 50%`
        : ''

    const hintNote = session.hintsUsed.length > 0
        ? `\n💡 ใช้คำใบ้: ${session.hintsUsed.length} ข้อ`
        : ''

    return `${emoji} จบเกม${gameName}${reviewLabel}แล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${session.correctCount}/${session.totalQuestions} ข้อ
📈 ได้คะแนน: +${session.pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%${hintNote}${multiplierNote}

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`
}

// ==================== DAILY ROUND TRACKING ====================
// ป้องกันปั้มคะแนนไม่จำกัด: หลัง 5 รอบ/เกม/วัน → คะแนนลด 50%

export const DAILY_FREE_ROUNDS = 5

/**
 * Count how many rounds the user has played for a specific game type today
 */
export async function getDailyRoundCount(
    userId: string,
    gameType: string
): Promise<number> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const count = await prisma.languageGameSession.count({
        where: {
            odUserId: userId,
            gameType: gameType as GameType,
            isCompleted: true,
            startedAt: { gte: todayStart },
        },
    })
    return count
}

/**
 * Calculate point multiplier based on daily round count
 * First 5 rounds: 1.0 (full points)
 * After 5 rounds: 0.5 (half points)
 */
export function calculatePointMultiplier(roundCount: number): number {
    return roundCount >= DAILY_FREE_ROUNDS ? 0.5 : 1.0
}

/**
 * Get warning message when starting a round beyond free limit
 * Returns null if within free rounds
 */
export function getDailyLimitMessage(roundCount: number, gameType: string): string {
    if (roundCount < DAILY_FREE_ROUNDS) return ""
    const gameName = GAME_TYPES[gameType as GameTypeId]?.name ?? gameType
    return `⚠️ คุณเล่น${gameName}ไปแล้ว ${roundCount} รอบวันนี้ (ฟรี ${DAILY_FREE_ROUNDS} รอบ)\nเล่นต่อได้ แต่คะแนนจะลด 50%`
}

// ==================== SESSION MANAGEMENT ====================

export interface GameSessionData {
    id: string
    gameType: string
    status: string
    currentQuestion: number
    totalQuestions: number
    correctCount: number
    pointsEarned: number
    startedAt: Date
    lastActivityAt: Date
}

export async function createGameSession(
    userId: string,
    gameType: string,
    totalQuestions: number,
    savedState?: Record<string, unknown>
): Promise<GameSessionData> {
    const session = await prisma.languageGameSession.create({
        data: {
            odUserId: userId,
            gameType: gameType as GameType,
            questions: [],
            answers: [],
            currentIndex: 0,
            isCompleted: false,
            correctCount: 0,
            totalCount: totalQuestions,
            pointsEarned: 0,
        },
    })

    return {
        id: session.id,
        gameType: session.gameType,
        status: session.isCompleted ? 'COMPLETED' : 'ACTIVE',
        currentQuestion: session.currentIndex,
        totalQuestions: session.totalCount,
        correctCount: session.correctCount,
        pointsEarned: session.pointsEarned,
        startedAt: session.startedAt,
        lastActivityAt: session.startedAt,
    }
}

export async function getActiveSession(userId: string): Promise<GameSessionData | null> {
    const session = await prisma.languageGameSession.findFirst({
        where: {
            odUserId: userId,
            isCompleted: false,
        },
        orderBy: { startedAt: 'desc' },
    })

    if (!session) return null

    return {
        id: session.id,
        gameType: session.gameType,
        status: session.isCompleted ? 'COMPLETED' : 'ACTIVE',
        currentQuestion: session.currentIndex,
        totalQuestions: session.totalCount,
        correctCount: session.correctCount,
        pointsEarned: session.pointsEarned,
        startedAt: session.startedAt,
        lastActivityAt: session.startedAt,
    }
}

export async function updateGameSession(
    sessionId: string,
    data: {
        currentQuestion?: number
        correctCount?: number
        pointsEarned?: number
        status?: string
        savedState?: Record<string, unknown>
        answeredQuestion?: { questionIndex: number; answer: string; correct: boolean }
    }
): Promise<GameSessionData> {
    const session = await prisma.languageGameSession.findUnique({
        where: { id: sessionId },
    })

    if (!session) throw new Error('Session not found')

    const answers = session.answers as string[]
    if (data.answeredQuestion) {
        answers.push(data.answeredQuestion.answer)
    }

    const updated = await prisma.languageGameSession.update({
        where: { id: sessionId },
        data: {
            currentIndex: data.currentQuestion ?? session.currentIndex,
            correctCount: data.correctCount ?? session.correctCount,
            pointsEarned: data.pointsEarned ?? session.pointsEarned,
            isCompleted: data.status === 'COMPLETED' ? true : session.isCompleted,
            answers: answers,
            ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        },
    })

    return {
        id: updated.id,
        gameType: updated.gameType,
        status: updated.isCompleted ? 'COMPLETED' : 'ACTIVE',
        currentQuestion: updated.currentIndex,
        totalQuestions: updated.totalCount,
        correctCount: updated.correctCount,
        pointsEarned: updated.pointsEarned,
        startedAt: updated.startedAt,
        lastActivityAt: updated.startedAt,
    }
}

export async function pauseSession(sessionId: string): Promise<void> {
    // LanguageGameSession doesn't have pause functionality
    // This is a stub for compatibility
    console.log('Pause session called for:', sessionId)
}

export async function resumeSession(sessionId: string): Promise<GameSessionData> {
    const session = await prisma.languageGameSession.findUnique({
        where: { id: sessionId },
    })

    if (!session || session.isCompleted) {
        throw new Error('Cannot resume session')
    }

    return {
        id: session.id,
        gameType: session.gameType,
        status: session.isCompleted ? 'COMPLETED' : 'ACTIVE',
        currentQuestion: session.currentIndex,
        totalQuestions: session.totalCount,
        correctCount: session.correctCount,
        pointsEarned: session.pointsEarned,
        startedAt: session.startedAt,
        lastActivityAt: new Date(),
    }
}

export async function abandonSession(sessionId: string): Promise<void> {
    await prisma.languageGameSession.update({
        where: { id: sessionId },
        data: { isCompleted: true, completedAt: new Date() },
    })
}

export async function abandonActiveSessions(userId: string): Promise<void> {
    await prisma.languageGameSession.updateMany({
        where: {
            odUserId: userId,
            isCompleted: false,
        },
        data: { isCompleted: true, completedAt: new Date() },
    })
}

// ==================== TIMEOUT HANDLING ====================

const TIMEOUT_CONFIG = {
    inactiveMinutes: 2,       // Pause after 2 min inactive
    reminderMinutes: 30,      // Second reminder after 30 min
    abandonHours: 24,         // Abandon after 24 hours
}

export async function checkSessionTimeouts(): Promise<{
    toPause: string[]
    toRemind: string[]
    toAbandon: string[]
}> {
    // Stub implementation - LanguageGameSession doesn't have pause/timeout features
    return {
        toPause: [],
        toRemind: [],
        toAbandon: [],
    }
}

// ==================== GAME MESSAGES ====================

export const GAME_MESSAGES = {
    timeout: {
        first: [
            'ยังอยู่ไหมครับ? เกมรอคุณอยู่นะ 🎮',
            'หายไปไหนแล้ว? คำตอบรออยู่นะ ✨',
            'ใช้เวลาคิดได้เลย ไม่รีบนะครับ 💭',
        ],
        second: [
            'เก็บ progress ไว้ให้แล้วนะ กลับมาเมื่อไหร่ก็ได้ 📚',
            'พักก่อนได้ เดี๋ยวกลับมาเล่นต่อนะ 🌟',
        ],
        welcomeBack: [
            'กลับมาแล้ว! เล่นต่อจากข้อ {question} เลยนะ 🎯',
            'ยินดีต้อนรับกลับ! ยังเหลืออีก {remaining} ข้อ 💪',
        ],
    },
    correct: [
        'ถูกต้อง! เก่งมาก! 🎉',
        'ใช่เลย! สุดยอด! ⭐',
        'ว้าว! ตอบถูก! 🎯',
        'ยอดเยี่ยม! 💯',
    ],
    incorrect: [
        'ไม่เป็นไร ลองใหม่นะ 💪',
        'เกือบแล้ว! พยายามต่อไป 🌟',
        'ผิดไม่เป็นไร เรียนรู้ได้! 📚',
    ],
    complete: [
        'จบเกมแล้ว! ได้ {points} แต้ม! 🏆',
        'เยี่ยมมาก! {correct}/{total} ข้อ! 🎊',
    ],
    perfect: [
        'Perfect! ตอบถูกหมดเลย! 🌟🌟🌟',
        'สุดยอดไปเลย! Full Score! 💯',
    ],
}

export function getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)]
}
