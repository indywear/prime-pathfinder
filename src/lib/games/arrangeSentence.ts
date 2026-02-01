import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface ArrangeSentenceQuestion {
    id: string;
    shuffledWords: string;  // คำที่สลับ คั่นด้วย |
    correctSentence: string;
}

/**
 * Get random arrange sentence questions
 */
export async function getRandomArrangeSentenceQuestions(count: number = 5): Promise<ArrangeSentenceQuestion[]> {
    const allQuestions = await prisma.arrangeSentenceQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        shuffledWords: q.shuffledWords,
        correctSentence: q.correctSentence,
    }));
}

/**
 * Get shuffled words array from a question
 */
export function getShuffledWordsArray(question: ArrangeSentenceQuestion): string[] {
    return question.shuffledWords.split('|').map(w => w.trim());
}

/**
 * Check if the arranged sentence is correct
 */
export function checkArrangeSentenceAnswer(userAnswer: string, correctSentence: string): boolean {
    const normalizedUser = normalizeThaiString(userAnswer);
    const normalizedCorrect = normalizeThaiString(correctSentence);

    // Exact match
    if (normalizedUser === normalizedCorrect) return true;

    // Similarity check (95% for word arrangement)
    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.95;
}

/**
 * Normalize Thai string
 */
function normalizeThaiString(str: string): string {
    return str
        .trim()
        .replace(/\s+/g, '')  // Remove all spaces for comparison
        .replace(/\u200B/g, '');
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
export function calculateArrangeSentencePoints(correctCount: number): number {
    return correctCount * 12;
}

/**
 * Format question for LINE message
 */
export function formatArrangeSentenceQuestion(
    question: ArrangeSentenceQuestion,
    currentIndex: number,
    totalCount: number
): string {
    const words = getShuffledWordsArray(question);
    const wordsList = words.map((w, i) => `${i + 1}. ${w}`).join('\n');

    return `🔤 ข้อ ${currentIndex + 1}/${totalCount}

เรียงคำต่อไปนี้ให้เป็นประโยคที่ถูกต้อง:

${wordsList}

พิมพ์ประโยคที่เรียงแล้วเลยครับ`;
}

/**
 * Format result message
 */
export function formatArrangeSentenceResult(correct: boolean, correctSentence: string): string {
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
export function formatArrangeSentenceGameSummary(
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

    return `${emoji} จบเกมเรียงประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "เรียงประโยค" เพื่อเล่นใหม่`;
}
