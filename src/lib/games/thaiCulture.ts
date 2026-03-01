import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import {
    getDifficultiesForLevel,
    selectQuestionsWithSRS,
    getUserLevel,
} from "./questionHistory";

export interface ThaiCultureQuestion {
    id: string;
    situation: string;
    correct: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
    explanation: string | null;
    category: string;
}

/**
 * Get random Thai culture questions (with difficulty and history filtering)
 */
export async function getRandomThaiCultureQuestions(
    userId?: string,
    count: number = 5
): Promise<ThaiCultureQuestion[]> {
    const userLevel = userId ? await getUserLevel(userId) : 1;
    const difficulties = getDifficultiesForLevel(userLevel);
    const allQuestions = await prisma.thaiCultureQuestion.findMany({
        where: { difficulty: { in: difficulties } },
    });

    if (allQuestions.length === 0) {
        const fallback = await prisma.thaiCultureQuestion.findMany();
        if (fallback.length === 0) return [];
        return shuffle(fallback).slice(0, count).map(q => ({
            id: q.id, situation: q.situation, correct: q.correct,
            wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
            explanation: q.explanation, category: q.category,
        }));
    }

    // SRS: ข้อถูกไม่ซ้ำ ข้อผิดวนกลับ ข้อใหม่เติมให้
    const filtered = userId
        ? await selectQuestionsWithSRS(allQuestions, userId, "THAI_CULTURE", count, shuffle)
        : shuffle(allQuestions).slice(0, count);
    return filtered.map(q => ({
        id: q.id, situation: q.situation, correct: q.correct,
        wrongA: q.wrongA, wrongB: q.wrongB, wrongC: q.wrongC,
        explanation: q.explanation, category: q.category,
    }));
}

/**
 * Get shuffled options for a question
 */
export function getThaiCultureOptions(question: ThaiCultureQuestion): string[] {
    const correctAns = question.correct.trim();
    const distractors = [question.wrongA, question.wrongB, question.wrongC]
        .map(d => d?.trim())
        .filter(d => d && d !== correctAns);

    const options = [correctAns, ...distractors.slice(0, 3)];

    while (options.length < 4) {
        options.push("(ไม่มีตัวเลือก)");
    }

    return shuffle(options);
}

/**
 * Check if the answer is correct
 */
export function checkThaiCultureAnswer(userAnswer: string, correctAnswer: string): boolean {
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
 * Get category emoji and label
 */
export function getCultureCategoryLabel(category: string): { emoji: string; label: string } {
    const map: Record<string, { emoji: string; label: string }> = {
        manners: { emoji: "🙏", label: "มารยาทไทย" },
        taboo: { emoji: "🚫", label: "คำต้องห้าม" },
        culture: { emoji: "🎭", label: "วัฒนธรรมไทย" },
        greetings: { emoji: "👋", label: "การทักทาย" },
    };
    return map[category] || { emoji: "🇹🇭", label: "วัฒนธรรมไทย" };
}

/**
 * Format question for LINE message
 */
export function formatThaiCultureQuestion(
    question: ThaiCultureQuestion,
    options: string[],
    currentIndex: number,
    totalCount: number
): string {
    const catInfo = getCultureCategoryLabel(question.category);
    return `${catInfo.emoji} ข้อ ${currentIndex + 1}/${totalCount} [${catInfo.label}]

${question.situation}

ก. ${options[0]}
ข. ${options[1]}
ค. ${options[2]}
ง. ${options[3]}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message (with explanation)
 */
export function formatThaiCultureResult(
    correct: boolean,
    correctAnswer: string,
    explanation: string | null
): string {
    if (correct) {
        let msg = `✅ ถูกต้อง! +10 คะแนน`;
        if (explanation) {
            msg += `\n\n💡 เพิ่มเติม: ${explanation}`;
        }
        return msg;
    } else {
        let msg = `❌ ไม่ถูกต้อง\n\nคำตอบที่ถูกคือ: ${correctAnswer}`;
        if (explanation) {
            msg += `\n\n💡 เพิ่มเติม: ${explanation}`;
        }
        return msg;
    }
}

/**
 * Format game summary
 */
export function formatThaiCultureGameSummary(
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

    return `${emoji} จบเกมวัฒนธรรมไทยแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "วัฒนธรรมไทย" เพื่อเล่นใหม่`;
}
