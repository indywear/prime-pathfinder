import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface VocabOppositeQuestion {
    id: string;
    word: string;
    opposite: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
}

/**
 * Get random vocab opposite questions (with difficulty and history filtering)
 */
export async function getRandomVocabOppositeQuestions(
    userId?: string,
    count: number = 5
): Promise<VocabOppositeQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const allQuestions = await prisma.vocabOppositeQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.vocabOppositeQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, word: q.word, opposite: q.opposite,
            wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "VOCAB_OPPOSITE", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, word: q.word, opposite: q.opposite,
        wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
    }));
}

/**
 * Get shuffled options for a question
 * Also validates that distractors don't duplicate the correct answer
 */
export function getVocabOppositeOptions(question: VocabOppositeQuestion): string[] {
    const correct = question.opposite.trim();
    // Filter out any distractor that matches the correct answer (prevents duplicate options)
    const distractors = [question.wrongA, question.wrongB, question.wrongC]
        .map(d => d?.trim())
        .filter(d => d && d !== correct);

    // Always include the correct answer + up to 3 unique distractors
    const options = [correct, ...distractors.slice(0, 3)];

    // Pad with placeholder if we lost distractors due to duplicates
    while (options.length < 4) {
        options.push("(ไม่มีตัวเลือก)");
    }

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
