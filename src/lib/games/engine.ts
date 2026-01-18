import prisma from '@/lib/db/prisma'
import { GameType } from '@prisma/client'

// ==================== GAME TYPES ====================

export const GAME_TYPES = {
    // Vocabulary Games
    VOCAB_MATCH: { id: 'vocab_match', name: 'จับคู่คำ', difficulty: 1, timeLimit: 60, points: 10 },
    VOCAB_MEANING: { id: 'vocab_meaning', name: 'ความหมายคำศัพท์', difficulty: 1, timeLimit: 45, points: 10 },
    VOCAB_OPPOSITE: { id: 'vocab_opposite', name: 'คำตรงข้าม', difficulty: 2, timeLimit: 45, points: 15 },
    VOCAB_SYNONYM: { id: 'vocab_synonym', name: 'คำพ้องความหมาย', difficulty: 3, timeLimit: 45, points: 20 },

    // Grammar Games
    FILL_BLANK: { id: 'fill_blank', name: 'เติมคำในช่องว่าง', difficulty: 1, timeLimit: 60, points: 10 },
    FIX_SENTENCE: { id: 'fix_sentence', name: 'แก้ไขประโยค', difficulty: 2, timeLimit: 90, points: 15 },
    ARRANGE_SENTENCE: { id: 'arrange_sentence', name: 'เรียงประโยค', difficulty: 2, timeLimit: 60, points: 15 },
    SPEED_GRAMMAR: { id: 'speed_grammar', name: 'Speed Grammar', difficulty: 3, timeLimit: 120, points: 25 },

    // Reading & Writing Games
    READ_ANSWER: { id: 'read_answer', name: 'อ่านแล้วตอบ', difficulty: 2, timeLimit: 180, points: 20 },
    COMPOSE_SENTENCE: { id: 'compose_sentence', name: 'แต่งประโยค', difficulty: 2, timeLimit: 120, points: 20 },
    SUMMARIZE: { id: 'summarize', name: 'สรุปเรื่อง', difficulty: 3, timeLimit: 300, points: 30 },
    CONTINUE_STORY: { id: 'continue_story', name: 'เขียนต่อเรื่อง', difficulty: 3, timeLimit: 300, points: 30 },

    // Fun Games
    DAILY_VOCAB: { id: 'daily_vocab', name: 'คำศัพท์รายวัน', difficulty: 1, timeLimit: null, points: 5 },
    RACE_CLOCK: { id: 'race_clock', name: 'แข่งกับเวลา', difficulty: 2, timeLimit: 60, points: 25 },
    VOCAB_GACHA: { id: 'vocab_gacha', name: 'กาชาคำศัพท์', difficulty: 1, timeLimit: null, points: 3 },
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
