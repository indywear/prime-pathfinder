import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    getRecentlyAnsweredQuestionIds,
    filterQuestionsForUser,
    getUserLevel,
} from "./questionHistory";

export interface ThaiIdiomQuestion {
    id: string;
    idiom: string;
    meaning: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
    example: string | null;
}

/**
 * Get random Thai idiom questions (with difficulty and history filtering)
 */
export async function getRandomThaiIdiomQuestions(
    userId?: string,
    count: number = 5
): Promise<ThaiIdiomQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const answeredIds = userId
        ? await getRecentlyAnsweredQuestionIds(userId, "THAI_IDIOM", 24)
        : [];

    const allQuestions = await prisma.thaiIdiomQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.thaiIdiomQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, idiom: q.idiom, meaning: q.meaning,
            wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
            example: q.example,
        }));
    }

    const filtered = filterQuestionsForUser(allQuestions, answeredIds, count, shuffle);
    return filtered.map(q => ({
        id: q.id, idiom: q.idiom, meaning: q.meaning,
        wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
        example: q.example,
    }));
}

/**
 * Get shuffled options for a question
 */
export function getThaiIdiomOptions(question: ThaiIdiomQuestion): string[] {
    const correct = question.meaning.trim();
    const distractors = [question.wrongA, question.wrongB, question.wrongC]
        .map(d => d?.trim())
        .filter(d => d && d !== correct);

    const options = [correct, ...distractors.slice(0, 3)];

    while (options.length < 4) {
        options.push("(ไม่มีตัวเลือก)");
    }

    return shuffle(options);
}

/**
 * Check if the answer is correct
 */
export function checkThaiIdiomAnswer(userAnswer: string, correctAnswer: string): boolean {
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
 * Format question for LINE message
 */
export function formatThaiIdiomQuestion(
    question: ThaiIdiomQuestion,
    options: string[],
    currentIndex: number,
    totalCount: number
): string {
    return `🏮 ข้อ ${currentIndex + 1}/${totalCount}

สำนวน: "${question.idiom}"
ความหมายคืออะไร?

ก. ${options[0]}
ข. ${options[1]}
ค. ${options[2]}
ง. ${options[3]}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message (with example usage)
 */
export function formatThaiIdiomResult(
    correct: boolean,
    correctAnswer: string,
    example: string | null
): string {
    if (correct) {
        let msg = `✅ ถูกต้อง! +10 คะแนน`;
        if (example) {
            msg += `\n\n📝 ตัวอย่าง: ${example}`;
        }
        return msg;
    } else {
        let msg = `❌ ไม่ถูกต้อง\n\nคำตอบที่ถูกคือ: ${correctAnswer}`;
        if (example) {
            msg += `\n\n📝 ตัวอย่าง: ${example}`;
        }
        return msg;
    }
}

/**
 * Format game summary
 */
export function formatThaiIdiomGameSummary(
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

    return `${emoji} จบเกมสำนวนไทยแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "สำนวนไทย" เพื่อเล่นใหม่`;
}
