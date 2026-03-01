import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import { calculateSimilarity } from "@/lib/utils/similarity";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface ArrangeSentenceQuestion {
    id: string;
    shuffledWords: string;  // คำที่สลับ คั่นด้วย |
    correctSentence: string;
}

/**
 * Get random arrange sentence questions (with difficulty and history filtering)
 */
export async function getRandomArrangeSentenceQuestions(
    userId?: string,
    count: number = 5
): Promise<ArrangeSentenceQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const allQuestions = await prisma.arrangeSentenceQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.arrangeSentenceQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, shuffledWords: q.shuffledWords, correctSentence: q.correctSentence,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "ARRANGE_SENTENCE", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, shuffledWords: q.shuffledWords, correctSentence: q.correctSentence,
    }));
}

/**
 * Get shuffled words array from a question
 */
export function getShuffledWordsArray(question: ArrangeSentenceQuestion): string[] {
    return question.shuffledWords.split('|').map(w => w.trim());
}

/**
 * Check if the arranged sentence is correct
 */
export function checkArrangeSentenceAnswer(userAnswer: string, correctSentence: string): boolean {
    const normalizedUser = normalizeThaiString(userAnswer);
    const normalizedCorrect = normalizeThaiString(correctSentence);

    // Exact match
    if (normalizedUser === normalizedCorrect) return true;

    // Similarity check (90% — more lenient for Thai which has flexible spacing/tone marks)
    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.90;
}

/**
 * Normalize Thai string
 */
function normalizeThaiString(str: string): string {
    return str
        .trim()
        .replace(/\s+/g, '')  // Remove all spaces for comparison
        .replace(/\u200B/g, '');
}


/**
 * Calculate points
 */
export function calculateArrangeSentencePoints(correctCount: number): number {
    return correctCount * 12;
}

/**
 * Format question for LINE message
 */
export function formatArrangeSentenceQuestion(
    question: ArrangeSentenceQuestion,
    currentIndex: number,
    totalCount: number
): string {
    const words = getShuffledWordsArray(question);
    const wordsList = words.map((w, i) => `${i + 1}. ${w}`).join('\n');

    return `🔤 ข้อ ${currentIndex + 1}/${totalCount}

เรียงคำต่อไปนี้ให้เป็นประโยคที่ถูกต้อง:

${wordsList}

พิมพ์ประโยคที่เรียงแล้วเลยครับ`;
}

/**
 * Format result message
 */
export function formatArrangeSentenceResult(correct: boolean, correctSentence: string): string {
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
export function formatArrangeSentenceGameSummary(
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

    return `${emoji} จบเกมเรียงประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "เรียงประโยค" เพื่อเล่นใหม่`;
}
