import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface VocabOppositeQuestion {
    id: string;
    word: string;
    opposite: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
}

/**
 * Get random vocab opposite questions
 */
export async function getRandomVocabOppositeQuestions(count: number = 5): Promise<VocabOppositeQuestion[]> {
    const allQuestions = await prisma.vocabOppositeQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        word: q.word,
        opposite: q.opposite,
        wrongA: q.wrongA,
        wrongB: q.wrongB,
        wrongC: q.wrongC,
    }));
}

/**
 * Get shuffled options for a question
 */
export function getVocabOppositeOptions(question: VocabOppositeQuestion): string[] {
    const options = [question.opposite, question.wrongA, question.wrongB, question.wrongC];
    return shuffle(options);
}

/**
 * Check if the answer is correct
 */
export function checkVocabOppositeAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalized = userAnswer.trim().toUpperCase();
    const correct = correctAnswer.trim().toUpperCase();

    const answerMap: Record<string, string> = {
        'ก': 'A', '1': 'A', 'a': 'A',
        'ข': 'B', '2': 'B', 'b': 'B',
        'ค': 'C', '3': 'C', 'c': 'C',
        'ง': 'D', '4': 'D', 'd': 'D',
    };

    const mappedAnswer = answerMap[normalized] || normalized;
    return mappedAnswer === correct;
}

/**
 * Calculate points
 */
export function calculateVocabOppositePoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format question for LINE message
 */
export function formatVocabOppositeQuestion(
    question: VocabOppositeQuestion,
    options: string[],
    currentIndex: number,
    totalCount: number
): string {
    return `🔄 ข้อ ${currentIndex + 1}/${totalCount}

คำตรงข้ามของ: "${question.word}"

ก. ${options[0]}
ข. ${options[1]}
ค. ${options[2]}
ง. ${options[3]}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message
 */
export function formatVocabOppositeResult(correct: boolean, correctAnswer: string): string {
    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${correctAnswer}`;
    }
}

/**
 * Format game summary
 */
export function formatVocabOppositeGameSummary(
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

    return `${emoji} จบเกมคำตรงข้ามแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "คำตรงข้าม" เพื่อเล่นใหม่`;
}
