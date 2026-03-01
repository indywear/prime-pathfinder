import prisma from "@/lib/db/prisma";
import { Difficulty } from "@prisma/client";

/**
 * Map user level to appropriate difficulty
 * Level 1-2: EASY  (ง่าย สำหรับมือใหม่)
 * Level 3-5: MEDIUM (ปานกลาง)
 * Level 6+: HARD   (ยาก)
 *
 * ปรับให้ EASY อยู่นานขึ้น ลดความยากสำหรับมือใหม่
 * (เดิม: Level 1-3 EASY, Level 4-7 MEDIUM, Level 8+ HARD)
 */
export function getDifficultyForLevel(userLevel: number): Difficulty {
    if (userLevel <= 2) return "EASY";
    if (userLevel <= 5) return "MEDIUM";
    return "HARD";
}

/**
 * Get all difficulties appropriate for user level (inclusive of easier levels)
 * Level 1-2: EASY only
 * Level 3-5: EASY + MEDIUM
 * Level 6+:  EASY + MEDIUM + HARD
 *
 * ปรับให้ EASY อยู่นานขึ้น ลดความยากสำหรับมือใหม่
 * (เดิม: Level 1-3 EASY, Level 4-7 EASY+MEDIUM, Level 8+ ทั้งหมด)
 */
export function getDifficultiesForLevel(userLevel: number): Difficulty[] {
    if (userLevel <= 2) return ["EASY"];
    if (userLevel <= 5) return ["EASY", "MEDIUM"];
    return ["EASY", "MEDIUM", "HARD"];
}

/**
 * Get internal user ID from LINE user ID
 */
async function getInternalUserId(lineUserId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { lineUserId },
        select: { id: true },
    });
    return user?.id ?? null;
}

/**
 * Get question IDs that user has answered recently (within cooldown period)
 * ใช้ distinct เพราะตอนนี้ 1 ข้อมีหลาย rows (หลาย attempt)
 * @param lineUserId - LINE user ID
 */
export async function getRecentlyAnsweredQuestionIds(
    lineUserId: string,
    gameType: string,
    cooldownHours: number = 24  // Don't repeat within 24 hours
): Promise<string[]> {
    const userId = await getInternalUserId(lineUserId);
    if (!userId) return [];

    const cooldownTime = new Date();
    cooldownTime.setHours(cooldownTime.getHours() - cooldownHours);

    const recentHistory = await prisma.userQuestionHistory.findMany({
        where: {
            userId,
            gameType,
            answeredAt: {
                gte: cooldownTime,
            },
        },
        select: {
            questionId: true,
        },
        distinct: ['questionId'],
    });

    return recentHistory.map(h => h.questionId);
}

/**
 * Record that user answered a question (เก็บทุก attempt ไม่เขียนทับ)
 * @param lineUserId - LINE user ID
 */
export async function recordQuestionAnswered(
    lineUserId: string,
    questionId: string,
    gameType: string,
    wasCorrect: boolean
): Promise<void> {
    const userId = await getInternalUserId(lineUserId);
    if (!userId) return;

    // นับจำนวน attempt ก่อนหน้า
    const previousAttempts = await prisma.userQuestionHistory.count({
        where: { userId, questionId, gameType },
    });

    await prisma.userQuestionHistory.create({
        data: {
            userId,
            questionId,
            gameType,
            wasCorrect,
            attemptNumber: previousAttempts + 1,
        },
    });
}

/**
 * Get user's current level from database
 * @param lineUserId - LINE user ID
 */
export async function getUserLevel(lineUserId: string): Promise<number> {
    const user = await prisma.user.findUnique({
        where: { lineUserId },
        select: { currentLevel: true },
    });
    return user?.currentLevel ?? 1;
}

/**
 * Filter and shuffle questions based on user history and level
 * @deprecated ใช้ selectQuestionsWithSRS() แทน
 */
export function filterQuestionsForUser<T extends { id: string }>(
    allQuestions: T[],
    answeredIds: string[],
    count: number,
    shuffleFn: (arr: T[]) => T[]
): T[] {
    // First, try to get unanswered questions
    const unanswered = allQuestions.filter(q => !answeredIds.includes(q.id));

    if (unanswered.length >= count) {
        // Enough unanswered questions
        return shuffleFn(unanswered).slice(0, count);
    }

    // Not enough unanswered, include some answered questions
    const shuffledUnanswered = shuffleFn(unanswered);
    const shuffledAnswered = shuffleFn(allQuestions.filter(q => answeredIds.includes(q.id)));

    // Prioritize unanswered, fill rest with answered
    const result = [...shuffledUnanswered];
    for (const q of shuffledAnswered) {
        if (result.length >= count) break;
        result.push(q);
    }

    return result.slice(0, count);
}

// =====================================================
// SRS (Spaced Repetition System) — ระบบไม่ซ้ำคำถาม
// =====================================================

/**
 * วิเคราะห์สถานะ mastery ของแต่ละคำถาม
 * - mastered: ตอบถูกล่าสุด → ไม่แสดงอีก
 * - dueForReview: ตอบผิดล่าสุด + ผ่าน cooldown แล้ว → แสดงอีกครั้ง
 * - recentWrong: ตอบผิดล่าสุด + ยังไม่ผ่าน cooldown → ยังไม่แสดง
 */
export async function getQuestionMasteryStatus(
    lineUserId: string,
    gameType: string,
    reviewCooldownHours: number = 1
): Promise<{
    masteredIds: string[];
    dueForReviewIds: string[];
    recentWrongIds: string[];
}> {
    const userId = await getInternalUserId(lineUserId);
    if (!userId) return { masteredIds: [], dueForReviewIds: [], recentWrongIds: [] };

    // ดึงประวัติทั้งหมดเรียงจากใหม่→เก่า
    const allHistory = await prisma.userQuestionHistory.findMany({
        where: { userId, gameType },
        select: { questionId: true, wasCorrect: true, answeredAt: true },
        orderBy: { answeredAt: 'desc' },
    });

    // หาผลลัพธ์ล่าสุดของแต่ละคำถาม (row แรกที่เจอ = ล่าสุด)
    const latestByQuestion = new Map<string, { wasCorrect: boolean; answeredAt: Date }>();
    for (const h of allHistory) {
        if (!latestByQuestion.has(h.questionId)) {
            latestByQuestion.set(h.questionId, { wasCorrect: h.wasCorrect, answeredAt: h.answeredAt });
        }
    }

    const masteredIds: string[] = [];
    const dueForReviewIds: string[] = [];
    const recentWrongIds: string[] = [];
    const now = Date.now();

    for (const [qId, latest] of latestByQuestion) {
        if (latest.wasCorrect) {
            // ตอบถูกล่าสุด → mastered → ไม่เจออีก
            masteredIds.push(qId);
        } else {
            // ตอบผิดล่าสุด → เช็คว่าถึงเวลาทบทวนหรือยัง
            const hoursSince = (now - latest.answeredAt.getTime()) / (1000 * 60 * 60);
            if (hoursSince >= reviewCooldownHours) {
                dueForReviewIds.push(qId);
            } else {
                recentWrongIds.push(qId);
            }
        }
    }

    return { masteredIds, dueForReviewIds, recentWrongIds };
}

/**
 * เลือกคำถามด้วยระบบ SRS
 * ลำดับ: ข้อที่ต้องทบทวน (ตอบผิด) → ข้อใหม่ (ยังไม่เคยตอบ)
 * ข้อที่ตอบถูกแล้ว → ไม่โผล่มาอีกเลย
 */
export async function selectQuestionsWithSRS<T extends { id: string }>(
    allQuestions: T[],
    lineUserId: string,
    gameType: string,
    count: number,
    shuffleFn: (arr: T[]) => T[]
): Promise<T[]> {
    const { masteredIds, dueForReviewIds, recentWrongIds } = await getQuestionMasteryStatus(lineUserId, gameType);

    const masteredSet = new Set(masteredIds);
    const reviewSet = new Set(dueForReviewIds);
    const recentWrongSet = new Set(recentWrongIds);

    // 1. ข้อที่ต้องทบทวน (ตอบผิดล่าสุด + ถึงเวลาแล้ว)
    const reviewQuestions = shuffleFn(allQuestions.filter(q => reviewSet.has(q.id)));

    // 2. ข้อใหม่ (ยังไม่เคยตอบเลย)
    const newQuestions = shuffleFn(allQuestions.filter(q =>
        !masteredSet.has(q.id) && !reviewSet.has(q.id) && !recentWrongSet.has(q.id)
    ));

    // รวม: ทบทวนก่อน แล้วเติมข้อใหม่
    return [...reviewQuestions, ...newQuestions].slice(0, count);
}
