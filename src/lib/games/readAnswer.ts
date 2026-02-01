import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface ReadAnswerQuestion {
    id: string;
    passage: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
}

/**
 * Get random read & answer questions
 */
export async function getRandomReadAnswerQuestions(count: number = 3): Promise<ReadAnswerQuestion[]> {
    const allQuestions = await prisma.readAnswerQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        passage: q.passage,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
    }));
}

/**
 * Check if the answer is correct
 */
export function checkReadAnswerAnswer(userAnswer: string, correctAnswer: string): boolean {
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
 * Get correct option text
 */
export function getReadAnswerCorrectOption(question: ReadAnswerQuestion): string {
    switch (question.correctAnswer.toUpperCase()) {
        case 'A': return question.optionA;
        case 'B': return question.optionB;
        case 'C': return question.optionC;
        case 'D': return question.optionD;
        default: return question.optionA;
    }
}

/**
 * Calculate points
 */
export function calculateReadAnswerPoints(correctCount: number): number {
    return correctCount * 15;
}

/**
 * Format question for LINE message (passage + question)
 */
export function formatReadAnswerQuestion(
    question: ReadAnswerQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📖 ข้อ ${currentIndex + 1}/${totalCount}

อ่านเนื้อเรื่องต่อไปนี้:

"${question.passage}"

━━━━━━━━━━━━━

❓ ${question.question}

ก. ${question.optionA}
ข. ${question.optionB}
ค. ${question.optionC}
ง. ${question.optionD}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message
 */
export function formatReadAnswerResult(
    correct: boolean,
    correctAnswer: string,
    correctOption: string
): string {
    const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

    if (correct) {
        return `✅ ถูกต้อง! +15 คะแนน`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${answerLabel[correctAnswer]}. ${correctOption}`;
    }
}

/**
 * Format game summary
 */
export function formatReadAnswerGameSummary(
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

    return `${emoji} จบเกมอ่านแล้วตอบแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "อ่านตอบ" เพื่อเล่นใหม่`;
}
