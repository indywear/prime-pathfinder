import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface WordOrderQuestion {
    id: string;
    shuffledWords: { number: number; word: string }[];
    correctAnswer: string;
}

/**
 * Get random word-order questions for the game
 */
export async function getRandomWordOrderQuestions(count: number = 5): Promise<WordOrderQuestion[]> {
    const allQuestions = await prisma.wordOrderQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    // Shuffle and pick using Fisher-Yates
    const shuffled = shuffle(allQuestions);

    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        shuffledWords: q.shuffledWords as { number: number; word: string }[],
        correctAnswer: q.correctAnswer,
    }));
}

/**
 * Check if the user's answer is correct (exact match)
 */
export function checkWordOrderAnswer(userAnswer: string, correctAnswer: string): boolean {
    // Normalize: remove extra spaces, trim
    const normalized = userAnswer.trim().replace(/\s+/g, '');
    const correct = correctAnswer.trim().replace(/\s+/g, '');
    return normalized === correct;
}

/**
 * Calculate points for word-order game
 */
export function calculateWordOrderPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format word-order question for LINE message
 */
export function formatWordOrderQuestion(
    question: WordOrderQuestion,
    currentIndex: number,
    totalCount: number
): string {
    const wordsDisplay = question.shuffledWords
        .map(w => `${w.number}.${w.word}`)
        .join(' ');

    return `📝 ข้อ ${currentIndex + 1}/${totalCount}

จงเรียงคำให้เป็นประโยคที่ถูกต้อง:

${wordsDisplay}

พิมพ์ประโยคที่เรียงแล้ว (ไม่ต้องใส่ตัวเลข)`;
}

/**
 * Format game result message
 */
export function formatWordOrderResult(
    correct: boolean,
    correctAnswer: string,
    currentIndex: number,
    totalCount: number
): string {
    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${correctAnswer}`;
    }
}

/**
 * Format final game summary
 */
export function formatWordOrderGameSummary(
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

    return `${emoji} จบเกมเรียงคำแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "เกม" เพื่อเล่นเกมอื่น หรือ "เรียงคำ" เพื่อเล่นใหม่`;
}
