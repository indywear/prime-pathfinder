import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import { calculateSimilarity } from "@/lib/utils/similarity";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface VocabMeaningQuestion {
    id: string;
    word: string;
    meaning: string;
}

/**
 * Get random vocab meaning questions (with difficulty and history filtering)
 */
export async function getRandomVocabMeaningQuestions(
    userId?: string,
    count: number = 5
): Promise<VocabMeaningQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    // Intentional: uses VocabMatchQuestion model (same word/meaning data, different game mode - type meaning instead of match)
    const allQuestions = await prisma.vocabMatchQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.vocabMatchQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, word: q.word, meaning: q.meaning,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "VOCAB_MEANING", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, word: q.word, meaning: q.meaning,
    }));
}

/**
 * Check if the typed meaning is correct (flexible matching)
 */
export function checkVocabMeaningAnswer(userAnswer: string, correctMeaning: string): boolean {
    const normalized = userAnswer.trim().toLowerCase();
    const correct = correctMeaning.trim().toLowerCase();

    // Exact match
    if (normalized === correct) return true;

    // Contains the answer (only if lengths are similar to prevent "น้ำตา" matching "น้ำ")
    if (correct.includes(normalized) && normalized.length >= correct.length * 0.7) return true;
    if (normalized.includes(correct) && correct.length >= normalized.length * 0.7) return true;

    // Similar enough (80% characters match)
    const similarity = calculateSimilarity(normalized, correct);
    return similarity >= 0.8;
}


/**
 * Calculate points for vocab meaning
 */
export function calculateVocabMeaningPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format question for LINE message
 */
export function formatVocabMeaningQuestion(
    question: VocabMeaningQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📖 ข้อ ${currentIndex + 1}/${totalCount}

คำว่า: "${question.word}"

หมายความว่าอะไร?
พิมพ์ความหมายเลยครับ`;
}

/**
 * Format result message
 */
export function formatVocabMeaningResult(correct: boolean, correctMeaning: string, userAnswer: string): string {
    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน

"${userAnswer}" ถูกต้องครับ`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${correctMeaning}`;
    }
}

/**
 * Format game summary
 */
export function formatVocabMeaningGameSummary(
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

    return `${emoji} จบเกมความหมายคำศัพท์แล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "ความหมาย" เพื่อเล่นใหม่`;
}
