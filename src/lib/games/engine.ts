import prisma from '@/lib/db/prisma'
import { GameType } from '@prisma/client'

// ==================== GAME TYPES ====================
// 15 ประเภทเกม แบ่งเป็น 4 หมวด

export const GAME_TYPES = {
    // ========== Vocabulary Games (4) ==========
    VOCAB_MATCH: {
        id: 'VOCAB_MATCH',
        name: 'จับคู่คำ',
        description: 'จับคู่คำกับความหมายที่ถูกต้อง',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
    },
    VOCAB_MEANING: {
        id: 'VOCAB_MEANING',
        name: 'ความหมายคำศัพท์',
        description: 'พิมพ์ความหมายของคำที่กำหนด',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
    },
    VOCAB_OPPOSITE: {
        id: 'VOCAB_OPPOSITE',
        name: 'คำตรงข้าม',
        description: 'เลือกคำตรงข้ามจาก 4 ตัวเลือก',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
    },
    VOCAB_SYNONYM: {
        id: 'VOCAB_SYNONYM',
        name: 'คำพ้องความหมาย',
        description: 'เลือกคำพ้องความหมายจาก 4 ตัวเลือก',
        points: 10,
        questionsPerRound: 5,
        category: 'vocabulary',
    },

    // ========== Grammar Games (4) ==========
    FILL_BLANK: {
        id: 'FILL_BLANK',
        name: 'เติมคำ',
        description: 'เติมคำลงในช่องว่างให้ถูกต้อง',
        points: 10,
        questionsPerRound: 5,
        category: 'grammar',
    },
    FIX_SENTENCE: {
        id: 'FIX_SENTENCE',
        name: 'แก้ไขประโยค',
        description: 'แก้ไขประโยคที่ผิดให้ถูกต้อง',
        points: 12,
        questionsPerRound: 5,
        category: 'grammar',
    },
    ARRANGE_SENTENCE: {
        id: 'ARRANGE_SENTENCE',
        name: 'เรียงประโยค',
        description: 'เรียงคำให้เป็นประโยคที่ถูกต้อง',
        points: 12,
        questionsPerRound: 5,
        category: 'grammar',
    },
    SPEED_GRAMMAR: {
        id: 'SPEED_GRAMMAR',
        name: 'Speed Grammar',
        description: 'ตอบคำถามไวยากรณ์ให้เร็วที่สุด',
        points: 15,
        questionsPerRound: 5,
        category: 'grammar',
    },

    // ========== Reading & Writing Games (4) ==========
    READ_ANSWER: {
        id: 'READ_ANSWER',
        name: 'อ่านแล้วตอบ',
        description: 'อ่านเนื้อเรื่องแล้วตอบคำถาม',
        points: 15,
        questionsPerRound: 3,
        category: 'reading',
    },
    COMPOSE_SENTENCE: {
        id: 'COMPOSE_SENTENCE',
        name: 'แต่งประโยค',
        description: 'แต่งประโยคโดยใช้คำที่กำหนด',
        points: 15,
        questionsPerRound: 3,
        category: 'reading',
    },
    SUMMARIZE: {
        id: 'SUMMARIZE',
        name: 'สรุปเรื่อง',
        description: 'อ่านเนื้อเรื่องแล้วเขียนสรุป',
        points: 20,
        questionsPerRound: 3,
        category: 'reading',
    },
    CONTINUE_STORY: {
        id: 'CONTINUE_STORY',
        name: 'เขียนต่อเรื่อง',
        description: 'อ่านเนื้อเรื่องแล้วเขียนต่อ',
        points: 20,
        questionsPerRound: 3,
        category: 'reading',
    },

    // ========== Fun Games (3) ==========
    DAILY_VOCAB: {
        id: 'DAILY_VOCAB',
        name: 'คำศัพท์รายวัน',
        description: 'เรียนรู้คำศัพท์ใหม่ทุกวัน',
        points: 5,
        questionsPerRound: 1,
        category: 'fun',
    },
    RACE_CLOCK: {
        id: 'RACE_CLOCK',
        name: 'แข่งกับเวลา',
        description: 'ตอบคำถามให้เร็วที่สุด',
        points: 10,
        questionsPerRound: 10,
        category: 'fun',
    },
    VOCAB_GACHA: {
        id: 'VOCAB_GACHA',
        name: 'กาชาคำศัพท์',
        description: 'สุ่มได้คำศัพท์ใหม่มาสะสม',
        points: 5,
        questionsPerRound: 1,
        category: 'fun',
    },
} as const

export type GameTypeId = keyof typeof GAME_TYPES

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
        lastActivityAt: session.startedAt,
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
