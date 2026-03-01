import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import { calculateSimilarity } from "@/lib/utils/similarity";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface FixSentenceQuestion {
    id: string;
    wrongSentence: string;
    correctSentence: string;
    hint: string | null;
}

/**
 * Get random fix sentence questions (with difficulty and history filtering)
 */
export async function getRandomFixSentenceQuestions(
    userId?: string,
    count: number = 5
): Promise<FixSentenceQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const allQuestions = await prisma.fixSentenceQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.fixSentenceQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, wrongSentence: q.wrongSentence,
            correctSentence: q.correctSentence, hint: q.hint,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "FIX_SENTENCE", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, wrongSentence: q.wrongSentence,
        correctSentence: q.correctSentence, hint: q.hint,
    }));
}

/**
 * Check if the fixed sentence is correct (flexible matching)
 */
export function checkFixSentenceAnswer(userAnswer: string, correctSentence: string): boolean {
    // Normalize both strings
    const normalizedUser = normalizeThaiString(userAnswer);
    const normalizedCorrect = normalizeThaiString(correctSentence);

    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) return true;

    // Similarity check (90% for sentences)
    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.9;
}

/**
 * Normalize Thai string for comparison
 */
function normalizeThaiString(str: string): string {
    return str
        .trim()
        .replace(/\s+/g, ' ')  // Multiple spaces to single
        .replace(/[""]/g, '"') // Normalize quotes
        .replace(/\u200B/g, ''); // Remove zero-width spaces
}


/**
 * Calculate points
 */
export function calculateFixSentencePoints(correctCount: number): number {
    return correctCount * 12;
}

/**
 * Format question for LINE message
 */
export function formatFixSentenceQuestion(
    question: FixSentenceQuestion,
    currentIndex: number,
    totalCount: number
): string {
    let text = `✏️ ข้อ ${currentIndex + 1}/${totalCount}

แก้ไขประโยคต่อไปนี้ให้ถูกต้อง:

"${question.wrongSentence}"`;

    if (question.hint) {
        text += `\n\n💡 คำใบ้: ${question.hint}`;
    }

    text += `\n\nพิมพ์ประโยคที่ถูกต้องเลยครับ`;

    return text;
}

/**
 * Format result message
 */
export function formatFixSentenceResult(correct: boolean, correctSentence: string): string {
    if (correct) {
        return `✅ ถูกต้อง! +12 คะแนน

ประโยคที่ถูกต้อง:
"${correctSentence}"`;
    } else {
        return `❌ ไม่ถูกต้อง

ประโยคที่ถูกต้องคือ:
"${correctSentence}"`;
    }
}

/**
 * Format game summary
 */
export function formatFixSentenceGameSummary(
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

    return `${emoji} จบเกมแก้ไขประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "แก้ประโยค" เพื่อเล่นใหม่`;
}
