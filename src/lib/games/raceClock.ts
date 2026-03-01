import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface RaceClockQuestion {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
}

const TIME_LIMIT_SECONDS = 20;  // 20 seconds per question
const BASE_POINTS = 10;
const MAX_BONUS = 10;  // Max bonus for speed

/**
 * Get random race clock questions (with difficulty and history filtering)
 */
export async function getRandomRaceClockQuestions(
    userId?: string,
    count: number = 10
): Promise<RaceClockQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    // Combine questions from multiple choice and speed grammar
    const [multipleChoice, speedGrammar] = await Promise.all([
        prisma.multipleChoiceQuestion.findMany({
            where: { difficulty: { in: difficulties } },
        }),
        prisma.speedGrammarQuestion.findMany({
            where: { difficulty: { in: difficulties } },
        }),
    ]);

    let allQuestions = [
        ...multipleChoice.map(q => ({
            id: q.id, question: q.question,
            optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
            correctAnswer: q.correctAnswer,
        })),
        ...speedGrammar.map(q => ({
            id: q.id, question: q.question,
            optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
            correctAnswer: q.correctAnswer,
        })),
    ];

    if (allQuestions.length === 0) {
        // Fallback: get any questions
        const [mcFallback, sgFallback] = await Promise.all([
            prisma.multipleChoiceQuestion.findMany(),
            prisma.speedGrammarQuestion.findMany(),
        ]);
        allQuestions = [
            ...mcFallback.map(q => ({
                id: q.id, question: q.question,
                optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
                correctAnswer: q.correctAnswer,
            })),
            ...sgFallback.map(q => ({
                id: q.id, question: q.question,
                optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
                correctAnswer: q.correctAnswer,
            })),
        ];
        if (allQuestions.length === 0) return [];
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "RACE_CLOCK", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered;
}

/**
 * Check if the answer is correct
 */
export function checkRaceClockAnswer(userAnswer: string, correctAnswer: string): boolean {
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
 * Faster = more bonus points
 */
export function calculateRaceClockPoints(
    correct: boolean,
    timeUsedSeconds: number
): number {
    if (!correct) return 0;

    // Base points
    let points = BASE_POINTS;

    // Speed bonus (linear decrease)
    if (timeUsedSeconds < TIME_LIMIT_SECONDS) {
        const timeRatio = (TIME_LIMIT_SECONDS - timeUsedSeconds) / TIME_LIMIT_SECONDS;
        const bonus = Math.round(MAX_BONUS * timeRatio);
        points += bonus;
    }

    return points;
}

/**
 * Get correct option text
 */
export function getRaceClockCorrectOption(question: RaceClockQuestion): string {
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
export function formatRaceClockQuestion(
    question: RaceClockQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `🏎️ ข้อ ${currentIndex + 1}/${totalCount} (${TIME_LIMIT_SECONDS} วินาที!)

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
export function formatRaceClockResult(
    correct: boolean,
    correctAnswer: string,
    correctOption: string,
    timeUsed: number,
    pointsEarned: number
): string {
    const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

    if (correct) {
        return `✅ ถูกต้อง! +${pointsEarned} คะแนน
⏱️ ใช้เวลา: ${timeUsed} วินาที`;
    } else {
        return `❌ ไม่ถูกต้อง
⏱️ ใช้เวลา: ${timeUsed} วินาที

คำตอบที่ถูกคือ: ${answerLabel[correctAnswer]}. ${correctOption}`;
    }
}

/**
 * Format time out message
 */
export function formatTimeOut(correctAnswer: string, correctOption: string): string {
    const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

    return `⏰ หมดเวลา!

คำตอบที่ถูกคือ: ${answerLabel[correctAnswer]}. ${correctOption}`;
}

/**
 * Format game summary
 */
export function formatRaceClockGameSummary(
    correctCount: number,
    totalCount: number,
    totalPoints: number,
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

    return `${emoji} จบเกมแข่งกับเวลาแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${totalPoints} แต้ม
🎯 อัตราถูก: ${percentage}%
⏱️ เวลาเฉลี่ย: ${avgTime} วินาที/ข้อ

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "แข่งเวลา" เพื่อเล่นใหม่`;
}
