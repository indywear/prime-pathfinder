import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface VocabMatchQuestion {
    id: string;
    word: string;
    meaning: string;
    wrongA: string;
    wrongB: string;
    wrongC: string;
}

/**
 * Get random vocab match questions
 */
export async function getRandomVocabMatchQuestions(count: number = 5): Promise<VocabMatchQuestion[]> {
    const allQuestions = await prisma.vocabMatchQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        word: q.word,
        meaning: q.meaning,
        wrongA: q.wrongA,
        wrongB: q.wrongB,
        wrongC: q.wrongC,
    }));
}

/**
 * Get shuffled options for a question
 */
export function getVocabMatchOptions(question: VocabMatchQuestion): string[] {
    const options = [question.meaning, question.wrongA, question.wrongB, question.wrongC];
    return shuffle(options);
}

/**
 * Check if the answer is correct
 */
export function checkVocabMatchAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalized = userAnswer.trim().toUpperCase();
    const correct = correctAnswer.trim().toUpperCase();

    // Accept both Thai (ก,ข,ค,ง) and English (A,B,C,D) and numbers (1,2,3,4)
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
 * Calculate points for vocab match
 */
export function calculateVocabMatchPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format question for LINE message
 */
export function formatVocabMatchQuestion(
    question: VocabMatchQuestion,
    options: string[],
    currentIndex: number,
    totalCount: number
): string {
    return `📚 ข้อ ${currentIndex + 1}/${totalCount}

จับคู่คำว่า: "${question.word}"

ก. ${options[0]}
ข. ${options[1]}
ค. ${options[2]}
ง. ${options[3]}

พิมพ์ ก, ข, ค หรือ ง`;
}

/**
 * Format result message
 */
export function formatVocabMatchResult(correct: boolean, correctAnswer: string): string {
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
export function formatVocabMatchGameSummary(
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

    return `${emoji} จบเกมจับคู่คำแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "จับคู่คำ" เพื่อเล่นใหม่`;
}
