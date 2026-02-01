import prisma from "@/lib/db/prisma";
import { Difficulty } from "@prisma/client";

/**
 * Map user level to appropriate difficulty
 * Level 1-3: EASY
 * Level 4-7: MEDIUM
 * Level 8+: HARD
 */
export function getDifficultyForLevel(userLevel: number): Difficulty {
    if (userLevel <= 3) return "EASY";
    if (userLevel <= 7) return "MEDIUM";
    return "HARD";
}

/**
 * Get all difficulties appropriate for user level (inclusive of easier levels)
 * E.g., Level 5 user can see EASY and MEDIUM questions
 */
export function getDifficultiesForLevel(userLevel: number): Difficulty[] {
    if (userLevel <= 3) return ["EASY"];
    if (userLevel <= 7) return ["EASY", "MEDIUM"];
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
    });

    return recentHistory.map(h => h.questionId);
}

/**
 * Record that user answered a question
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

    await prisma.userQuestionHistory.upsert({
        where: {
            userId_questionId_gameType: {
                userId,
                questionId,
                gameType,
            },
        },
        update: {
            wasCorrect,
            answeredAt: new Date(),
        },
        create: {
            userId,
            questionId,
            gameType,
            wasCorrect,
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
