import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface VocabularyQuestion {
    id: string;
    chineseWord: string;
    thaiMeaning: string;
}

export interface GameResult {
    correct: boolean;
    correctAnswer: string;
    userAnswer: string;
}

/**
 * Get random vocabulary questions for the game
 */
export async function getRandomVocabularyQuestions(count: number = 5): Promise<VocabularyQuestion[]> {
    const totalCount = await prisma.chineseVocabulary.count();

    if (totalCount === 0) {
        return [];
    }

    // Get random questions using skip
    const questions: VocabularyQuestion[] = [];
    const usedIds = new Set<string>();

    const allVocab = await prisma.chineseVocabulary.findMany({
        take: Math.min(count * 3, totalCount), // Get more than needed for randomness
    });

    // Shuffle and pick using Fisher-Yates
    const shuffled = shuffle(allVocab);

    for (const vocab of shuffled) {
        if (questions.length >= count) break;
        if (!usedIds.has(vocab.id)) {
            usedIds.add(vocab.id);
            questions.push({
                id: vocab.id,
                chineseWord: vocab.chineseWord,
                thaiMeaning: vocab.thaiMeaning,
            });
        }
    }

    return questions;
}

/**
 * Check if the user's answer is correct (exact match)
 */
export function checkVocabularyAnswer(userAnswer: string, correctAnswer: string): boolean {
    // Normalize both strings: trim, lowercase (for consistency)
    const normalized = userAnswer.trim();
    const correct = correctAnswer.trim();

    return normalized === correct;
}

/**
 * Calculate points for vocabulary game
 */
export function calculateVocabularyPoints(correctCount: number, totalCount: number): number {
    // 10 points per correct answer
    return correctCount * 10;
}

/**
 * Format vocabulary question for LINE message
 */
export function formatVocabularyQuestion(
    question: VocabularyQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📝 ข้อ ${currentIndex + 1}/${totalCount}

'${question.chineseWord}' ภาษาไทยว่าอะไร?

พิมพ์คำตอบเลยครับ`;
}

/**
 * Format game result message
 */
export function formatVocabularyResult(
    result: GameResult,
    currentIndex: number,
    totalCount: number
): string {
    if (result.correct) {
        return `✅ ถูกต้อง! +10 คะแนน

${currentIndex < totalCount - 1 ? "ไปข้อถัดไปกันเลย..." : ""}`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${result.correctAnswer}

${currentIndex < totalCount - 1 ? "ไปข้อถัดไปกันเลย..." : ""}`;
    }
}

/**
 * Format final game summary
 */
export function formatVocabularyGameSummary(
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

    return `${emoji} จบเกมแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "เกม" เพื่อเล่นเกมอื่น หรือ "คำศัพท์" เพื่อเล่นใหม่`;
}
