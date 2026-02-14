import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    getRecentlyAnsweredQuestionIds,
    filterQuestionsForUser,
    getUserLevel,
} from "./questionHistory";

export interface FillBlankQuestion {
    id: string;
    sentence: string;  // Contains __________ as placeholder
    answer: string;
}

/**
 * Get random fill-in-blank questions for the game (with history filtering)
 * @param userId - User ID for personalized question selection
 * @param count - Number of questions to return
 */
export async function getRandomFillBlankQuestions(
    userId?: string,
    count: number = 5
): Promise<FillBlankQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const answeredIds = userId
        ? await getRecentlyAnsweredQuestionIds(userId, "FILL_BLANK", 24)
        : [];

    const allQuestions = await prisma.fillBlankQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        // Fallback: get any questions regardless of difficulty
        const fallback = await prisma.fillBlankQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, sentence: q.sentence, answer: q.answer,
        }));
    }

    const filtered = filterQuestionsForUser(allQuestions, answeredIds, count, shuffle);

    return filtered.map(q => ({
        id: q.id,
        sentence: q.sentence,
        answer: q.answer,
    }));
}

/**
 * Check if the user's answer is correct (exact match)
 */
export function checkFillBlankAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalized = userAnswer.trim();
    const correct = correctAnswer.trim();
    return normalized === correct;
}

/**
 * Calculate points for fill-blank game
 */
export function calculateFillBlankPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format fill-blank question for LINE message
 */
export function formatFillBlankQuestion(
    question: FillBlankQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📝 ข้อ ${currentIndex + 1}/${totalCount}

${question.sentence}

พิมพ์คำตอบที่ถูกต้องลงในช่องว่าง`;
}

/**
 * Format game result message
 */
export function formatFillBlankResult(
    correct: boolean,
    correctAnswer: string,
    currentIndex: number,
    totalCount: number
): string {
    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน

${currentIndex < totalCount - 1 ? "" : ""}`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${correctAnswer}`;
    }
}

/**
 * Format final game summary
 */
export function formatFillBlankGameSummary(
    correctCount: number,
    totalCount: number,
    pointsEarned: number
): string {
    const percentage = Math.round((correctCount / totalCount) * 100);
    let emoji = "🎉";
    let message = "ยอดเยี่ยม!";

    if (percentage < 50) {
        emoji = "💪";
        message = "พยายามอีกนิด!";
    } else if (percentage < 80) {
        emoji = "👍";
        message = "ดีมาก!";
    }

    return `${emoji} จบเกมเติมคำแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "เกม" เพื่อเล่นเกมอื่น หรือ "เติมคำ" เพื่อเล่นใหม่`;
}
