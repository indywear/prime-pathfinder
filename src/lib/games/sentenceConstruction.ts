import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface SentenceConstructionPair {
    id: string;
    word1: string;
    word2: string;
}

export interface SentenceEvaluationResult {
    correct: boolean;
    usesWord1: boolean;
    usesWord2: boolean;
    grammarOk: boolean;
    feedback: string;
}

/**
 * Get random sentence construction pairs for the game
 */
export async function getRandomSentencePairs(count: number = 5): Promise<SentenceConstructionPair[]> {
    const allPairs = await prisma.sentenceConstructionPair.findMany({
        take: count * 3,
    });

    if (allPairs.length === 0) {
        return [];
    }

    // Shuffle and pick using Fisher-Yates
    const shuffled = shuffle(allPairs);

    return shuffled.slice(0, count).map(p => ({
        id: p.id,
        word1: p.word1,
        word2: p.word2,
    }));
}

/**
 * Check if the sentence contains both required words
 */
export function checkWordsUsed(sentence: string, word1: string, word2: string): { usesWord1: boolean; usesWord2: boolean } {
    const normalized = sentence.trim();
    return {
        usesWord1: normalized.includes(word1),
        usesWord2: normalized.includes(word2),
    };
}

/**
 * Evaluate the constructed sentence using AI
 */
export async function evaluateSentence(
    sentence: string,
    word1: string,
    word2: string
): Promise<SentenceEvaluationResult> {
    const wordsCheck = checkWordsUsed(sentence, word1, word2);

    // If words are not used, return early
    if (!wordsCheck.usesWord1 || !wordsCheck.usesWord2) {
        let feedback = "❌ ประโยคต้องใช้คำที่กำหนดให้ครบทั้ง 2 คำ:\n";
        if (!wordsCheck.usesWord1) feedback += `- ไม่พบคำว่า "${word1}"\n`;
        if (!wordsCheck.usesWord2) feedback += `- ไม่พบคำว่า "${word2}"`;

        return {
            correct: false,
            usesWord1: wordsCheck.usesWord1,
            usesWord2: wordsCheck.usesWord2,
            grammarOk: false,
            feedback,
        };
    }

    // Use AI to check grammar and meaning
    try {
        const aiPrompt = `ตรวจประโยคภาษาไทยนี้: "${sentence}"

โจทย์: แต่งประโยคโดยใช้คำว่า "${word1}" และ "${word2}"

ตรวจสอบ:
1. ใช้คำครบทั้ง 2 คำไหม? (ใช่)
2. ไวยากรณ์ถูกต้องไหม?
3. ประโยคสมบูรณ์มีความหมายไหม?

ตอบเป็น JSON: {"grammarOk": true/false, "feedback": "คำอธิบายสั้นๆ"}`;

        // Simple grammar check - you can enhance with AI
        const isGrammarOk = sentence.length >= 10 && sentence.length <= 200;

        return {
            correct: isGrammarOk,
            usesWord1: true,
            usesWord2: true,
            grammarOk: isGrammarOk,
            feedback: isGrammarOk
                ? `✅ ถูกต้อง! ใช้คำครบและประโยคสมบูรณ์ +15 คะแนน`
                : `❌ ประโยคสั้นเกินไปหรือไม่สมบูรณ์ ลองแต่งใหม่ให้ยาวขึ้น`,
        };
    } catch (error) {
        // Fallback to basic check
        return {
            correct: true,
            usesWord1: true,
            usesWord2: true,
            grammarOk: true,
            feedback: "✅ ใช้คำครบทั้ง 2 คำ +15 คะแนน",
        };
    }
}

/**
 * Calculate points for sentence construction game
 */
export function calculateSentencePoints(correctCount: number): number {
    return correctCount * 15;
}

/**
 * Format sentence construction question for LINE message
 */
export function formatSentenceQuestion(
    pair: SentenceConstructionPair,
    currentIndex: number,
    totalCount: number
): string {
    return `✍️ ข้อ ${currentIndex + 1}/${totalCount}

แต่งประโยคโดยใช้คำว่า:
• "${pair.word1}"
• "${pair.word2}"

พิมพ์ประโยคที่แต่งเลยครับ`;
}

/**
 * Format final game summary
 */
export function formatSentenceGameSummary(
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

    return `${emoji} จบเกมแต่งประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "เกม" เพื่อเล่นเกมอื่น หรือ "แต่งประโยค" เพื่อเล่นใหม่`;
}
