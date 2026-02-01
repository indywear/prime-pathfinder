import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface FixSentenceQuestion {
    id: string;
    wrongSentence: string;
    correctSentence: string;
    hint: string | null;
}

/**
 * Get random fix sentence questions
 */
export async function getRandomFixSentenceQuestions(count: number = 5): Promise<FixSentenceQuestion[]> {
    const allQuestions = await prisma.fixSentenceQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        wrongSentence: q.wrongSentence,
        correctSentence: q.correctSentence,
        hint: q.hint,
    }));
}

/**
 * Check if the fixed sentence is correct (flexible matching)
 */
export function checkFixSentenceAnswer(userAnswer: string, correctSentence: string): boolean {
    // Normalize both strings
    const normalizedUser = normalizeThaiString(userAnswer);
    const normalizedCorrect = normalizeThaiString(correctSentence);

    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) return true;

    // Similarity check (90% for sentences)
    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.9;
}

/**
 * Normalize Thai string for comparison
 */
function normalizeThaiString(str: string): string {
    return str
        .trim()
        .replace(/\s+/g, ' ')  // Multiple spaces to single
        .replace(/[""]/g, '"') // Normalize quotes
        .replace(/\u200B/g, ''); // Remove zero-width spaces
}

/**
 * Calculate string similarity
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
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate points
 */
export function calculateFixSentencePoints(correctCount: number): number {
    return correctCount * 12;
}

/**
 * Format question for LINE message
 */
export function formatFixSentenceQuestion(
    question: FixSentenceQuestion,
    currentIndex: number,
    totalCount: number
): string {
    let text = `✏️ ข้อ ${currentIndex + 1}/${totalCount}

แก้ไขประโยคต่อไปนี้ให้ถูกต้อง:

"${question.wrongSentence}"`;

    if (question.hint) {
        text += `\n\n💡 คำใบ้: ${question.hint}`;
    }

    text += `\n\nพิมพ์ประโยคที่ถูกต้องเลยครับ`;

    return text;
}

/**
 * Format result message
 */
export function formatFixSentenceResult(correct: boolean, correctSentence: string): string {
    if (correct) {
        return `✅ ถูกต้อง! +12 คะแนน

ประโยคที่ถูกต้อง:
"${correctSentence}"`;
    } else {
        return `❌ ไม่ถูกต้อง

ประโยคที่ถูกต้องคือ:
"${correctSentence}"`;
    }
}

/**
 * Format game summary
 */
export function formatFixSentenceGameSummary(
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

    return `${emoji} จบเกมแก้ไขประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "แก้ประโยค" เพื่อเล่นใหม่`;
}
