import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface SpeedGrammarQuestion {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    timeLimit: number;
}

/**
 * Get random speed grammar questions
 */
export async function getRandomSpeedGrammarQuestions(count: number = 5): Promise<SpeedGrammarQuestion[]> {
    const allQuestions = await prisma.speedGrammarQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit,
    }));
}

/**
 * Check if the answer is correct
 */
export function checkSpeedGrammarAnswer(userAnswer: string, correctAnswer: string): boolean {
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
 * Calculate points based on time taken
 * Faster = more points (base 15, max bonus 10)
 */
export function calculateSpeedGrammarPoints(
    correctCount: number,
    totalTimeUsed: number,
    totalTimeLimit: number
): number {
    const basePoints = correctCount * 15;

    // Bonus for speed (up to 50% bonus)
    const timeRatio = Math.max(0, (totalTimeLimit - totalTimeUsed) / totalTimeLimit);
    const speedBonus = Math.round(basePoints * timeRatio * 0.5);

    return basePoints + speedBonus;
}

/**
 * Get correct option text
 */
export function getSpeedGrammarCorrectOption(question: SpeedGrammarQuestion): string {
    switch (question.correctAnswer.toUpperCase()) {
        case 'A': return question.optionA;
        case 'B': return question.optionB;
        case 'C': return question.optionC;
        case 'D': return question.optionD;
        default: return question.optionA;
    }
}

/**
 * Format question for LINE message
 */
export function formatSpeedGrammarQuestion(
    question: SpeedGrammarQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `⚡ ข้อ ${currentIndex + 1}/${totalCount} (${question.timeLimit} วินาที)

${question.question}

ก. ${question.optionA}
ข. ${question.optionB}
ค. ${question.optionC}
ง. ${question.optionD}

⏱️ ตอบให้เร็ว! พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message
 */
export function formatSpeedGrammarResult(
    correct: boolean,
    correctAnswer: string,
    correctOption: string,
    timeUsed: number
): string {
    const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

    if (correct) {
        return `✅ ถูกต้อง! +15 คะแนน
⏱️ ใช้เวลา: ${timeUsed} วินาที`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${answerLabel[correctAnswer]}. ${correctOption}`;
    }
}

/**
 * Format game summary
 */
export function formatSpeedGrammarGameSummary(
    correctCount: number,
    totalCount: number,
    pointsEarned: number,
    totalTimeUsed: number
): string {
    const percentage = Math.round((correctCount / totalCount) * 100);
    const avgTime = Math.round(totalTimeUsed / totalCount);

    let emoji = "🎉";
    let message = "ยอดเยี่ยม!";

    if (percentage < 50) {
        emoji = "💪";
        message = "พยายามอีกนิด!";
    } else if (percentage < 80) {
        emoji = "👍";
        message = "ดีมาก!";
    }

    return `${emoji} จบเกม Speed Grammar แล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%
⏱️ เวลาเฉลี่ย: ${avgTime} วินาที/ข้อ

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "speed grammar" เพื่อเล่นใหม่`;
}
