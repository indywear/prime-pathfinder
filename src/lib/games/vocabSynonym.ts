import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface VocabSynonymQuestion {
    id: string;
    word: string;
    synonym: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
}

/**
 * Get random vocab synonym questions (with difficulty and history filtering)
 */
export async function getRandomVocabSynonymQuestions(
    userId?: string,
    count: number = 5
): Promise<VocabSynonymQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const allQuestions = await prisma.vocabSynonymQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.vocabSynonymQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, word: q.word, synonym: q.synonym,
            wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "VOCAB_SYNONYM", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, word: q.word, synonym: q.synonym,
        wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
    }));
}

/**
 * Get shuffled options for a question
 */
export function getVocabSynonymOptions(question: VocabSynonymQuestion): string[] {
    const options = [question.synonym, question.wrongA, question.wrongB, question.wrongC];
    return shuffle(options);
}

/**
 * Check if the answer is correct
 */
export function checkVocabSynonymAnswer(userAnswer: string, correctAnswer: string): boolean {
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
export function calculateVocabSynonymPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format question for LINE message
 */
export function formatVocabSynonymQuestion(
    question: VocabSynonymQuestion,
    options: string[],
    currentIndex: number,
    totalCount: number
): string {
    return `🔗 ข้อ ${currentIndex + 1}/${totalCount}

คำพ้องความหมายของ: "${question.word}"

ก. ${options[0]}
ข. ${options[1]}
ค. ${options[2]}
ง. ${options[3]}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message
 */
export function formatVocabSynonymResult(correct: boolean, correctAnswer: string): string {
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
export function formatVocabSynonymGameSummary(
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

    return `${emoji} จบเกมคำพ้องความหมายแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "คำพ้อง" เพื่อเล่นใหม่`;
}
