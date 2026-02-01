import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    getRecentlyAnsweredQuestionIds,
    filterQuestionsForUser,
    getUserLevel,
} from "./questionHistory";

export interface MultipleChoiceQuestion {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string; // A, B, C, or D
}

/**
 * Get random multiple choice questions for the game (with difficulty and history filtering)
 * @param userId - User ID for personalized question selection
 * @param count - Number of questions to return
 */
export async function getRandomMultipleChoiceQuestions(
    userId?: string,
    count: number = 5
): Promise<MultipleChoiceQuestion[]> {
    // Get user level for difficulty filtering
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);

    // Get recently answered question IDs
    const answeredIds = userId
        ? await getRecentlyAnsweredQuestionIds(userId, "MULTIPLE_CHOICE", 24)
        : [];

    // Fetch questions matching user's difficulty level
    const allQuestions = await prisma.multipleChoiceQuestion.findMany({
        where: {
            difficulty: { in: difficulties },
        },
    });

    if (allQuestions.length === 0) {
        // Fallback: get any questions if none match difficulty
        const fallbackQuestions = await prisma.multipleChoiceQuestion.findMany();
        if (fallbackQuestions.length === 0) return [];

        return shuffle(fallbackQuestions).slice(0, count).map(q => ({
            id: q.id,
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
        }));
    }

    // Filter out recently answered, prioritize new questions
    const filtered = filterQuestionsForUser(allQuestions, answeredIds, count, shuffle);

    return filtered.map(q => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
    }));
}

/**
 * Check if the user's answer is correct
 */
export function checkMultipleChoiceAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalized = userAnswer.trim().toUpperCase();
    const correct = correctAnswer.trim().toUpperCase();

    // Accept both "A" and "ก" style answers
    const answerMap: Record<string, string> = {
        'ก': 'A', '1': 'A',
        'ข': 'B', '2': 'B',
        'ค': 'C', '3': 'C',
        'ง': 'D', '4': 'D',
    };

    const mappedAnswer = answerMap[normalized] || normalized;
    return mappedAnswer === correct;
}

/**
 * Calculate points for multiple choice game
 */
export function calculateMultipleChoicePoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format multiple choice question for LINE message
 */
export function formatMultipleChoiceQuestion(
    question: MultipleChoiceQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📋 ข้อ ${currentIndex + 1}/${totalCount}

${question.question}

ก. ${question.optionA}
ข. ${question.optionB}
ค. ${question.optionC}
ง. ${question.optionD}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format game result message
 */
export function formatMultipleChoiceResult(
    correct: boolean,
    correctAnswer: string,
    correctOption: string
): string {
    const answerLabel: Record<string, string> = {
        'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง'
    };

    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${answerLabel[correctAnswer]}. ${correctOption}`;
    }
}

/**
 * Get the text of the correct option
 */
export function getCorrectOptionText(question: MultipleChoiceQuestion): string {
    switch (question.correctAnswer.toUpperCase()) {
        case 'A': return question.optionA;
        case 'B': return question.optionB;
        case 'C': return question.optionC;
        case 'D': return question.optionD;
        default: return question.optionA;
    }
}

/**
 * Format final game summary
 */
export function formatMultipleChoiceGameSummary(
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

    return `${emoji} จบเกมเลือกตอบแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "เลือกตอบ" เพื่อเล่นใหม่`;
}
