import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import axios from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

function getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY?.trim();
}

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
export async function getRandomSentencePairs(count: number = 3): Promise<SentenceConstructionPair[]> {
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

    // Basic validation first
    if (sentence.length < 5) {
        return {
            correct: false,
            usesWord1: true,
            usesWord2: true,
            grammarOk: false,
            feedback: "❌ ประโยคสั้นเกินไป กรุณาเขียนประโยคที่สมบูรณ์",
        };
    }

    // Use AI to check grammar and meaning
    const apiKey = getApiKey();
    if (!apiKey) {
        // Fallback to basic check if no API key
        return {
            correct: true,
            usesWord1: true,
            usesWord2: true,
            grammarOk: true,
            feedback: "✅ ใช้คำครบทั้ง 2 คำ +15 คะแนน",
        };
    }

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `คุณเป็นครูสอนภาษาไทย ตรวจประโยคของนักเรียนต่างชาติ
ตอบเป็น JSON เท่านั้น: {"grammarOk": true/false, "feedback": "คำอธิบาย 1-2 ประโยค"}`
                    },
                    {
                        role: "user",
                        content: `ตรวจประโยคนี้: "${sentence}"
โจทย์: แต่งประโยคโดยใช้คำว่า "${word1}" และ "${word2}"

ตรวจ: ไวยากรณ์ถูกไหม? ประโยคสมบูรณ์และมีความหมายไหม?`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://proficienthai.vercel.app",
                    "X-Title": "ProficienThAI",
                },
                timeout: 10000,
            }
        );

        const aiResponse = response.data.choices[0]?.message?.content || "";

        // Try to parse JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            const isGrammarOk = result.grammarOk === true;

            return {
                correct: isGrammarOk,
                usesWord1: true,
                usesWord2: true,
                grammarOk: isGrammarOk,
                feedback: isGrammarOk
                    ? `✅ ${result.feedback || "ประโยคถูกต้อง!"} +15 คะแนน`
                    : `❌ ${result.feedback || "ไวยากรณ์ไม่ถูกต้อง ลองใหม่อีกครั้ง"}`,
            };
        }

        // If can't parse JSON, assume correct (since words are used)
        return {
            correct: true,
            usesWord1: true,
            usesWord2: true,
            grammarOk: true,
            feedback: "✅ ใช้คำครบทั้ง 2 คำ +15 คะแนน",
        };
    } catch (error) {
        console.error("[SentenceEval] AI error:", error);
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

    return `${emoji} จบเกมเขียนประโยคแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "เขียนประโยค" เพื่อเล่นใหม่`;
}
