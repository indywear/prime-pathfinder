import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface VocabMeaningQuestion {
    id: string;
    word: string;
    meaning: string;
}

/**
 * Get random vocab meaning questions (use VocabMatchQuestion as source)
 */
export async function getRandomVocabMeaningQuestions(count: number = 5): Promise<VocabMeaningQuestion[]> {
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
    }));
}

/**
 * Check if the typed meaning is correct (flexible matching)
 */
export function checkVocabMeaningAnswer(userAnswer: string, correctMeaning: string): boolean {
    const normalized = userAnswer.trim().toLowerCase();
    const correct = correctMeaning.trim().toLowerCase();

    // Exact match
    if (normalized === correct) return true;

    // Contains the answer
    if (normalized.includes(correct) || correct.includes(normalized)) return true;

    // Similar enough (80% characters match)
    const similarity = calculateSimilarity(normalized, correct);
    return similarity >= 0.8;
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
function calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,    // deletion
                    dp[i][j - 1] + 1,    // insertion
                    dp[i - 1][j - 1] + 1 // substitution
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate points for vocab meaning
 */
export function calculateVocabMeaningPoints(correctCount: number): number {
    return correctCount * 10;
}

/**
 * Format question for LINE message
 */
export function formatVocabMeaningQuestion(
    question: VocabMeaningQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📖 ข้อ ${currentIndex + 1}/${totalCount}

คำว่า: "${question.word}"

หมายความว่าอะไร?
พิมพ์ความหมายเลยครับ`;
}

/**
 * Format result message
 */
export function formatVocabMeaningResult(correct: boolean, correctMeaning: string, userAnswer: string): string {
    if (correct) {
        return `✅ ถูกต้อง! +10 คะแนน

"${userAnswer}" ถูกต้องครับ`;
    } else {
        return `❌ ไม่ถูกต้อง

คำตอบที่ถูกคือ: ${correctMeaning}`;
    }
}

/**
 * Format game summary
 */
export function formatVocabMeaningGameSummary(
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

    return `${emoji} จบเกมความหมายคำศัพท์แล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "ความหมาย" เพื่อเล่นใหม่`;
}
