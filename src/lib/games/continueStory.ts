import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import axios from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

function getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY?.trim();
}

export interface ContinueStoryQuestion {
    id: string;
    storyStart: string;
    keywords: string;  // คำสำคัญที่ควรมี คั่นด้วย |
    minLength: number;
}

export interface ContinueStoryResult {
    correct: boolean;
    hasKeywords: boolean;
    isLongEnough: boolean;
    isCoherent: boolean;
    feedback: string;
}

/**
 * Get random continue story questions
 */
export async function getRandomContinueStoryQuestions(count: number = 3): Promise<ContinueStoryQuestion[]> {
    const allQuestions = await prisma.continueStoryQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        storyStart: q.storyStart,
        keywords: q.keywords,
        minLength: q.minLength,
    }));
}

/**
 * Get keywords array
 */
export function getContinueStoryKeywords(question: ContinueStoryQuestion): string[] {
    return question.keywords.split('|').map(k => k.trim()).filter(k => k.length > 0);
}

/**
 * Check keywords in continuation
 */
export function checkContinueStoryKeywords(continuation: string, keywords: string[]): {
    found: string[];
    missing: string[];
} {
    const found: string[] = [];
    const missing: string[] = [];

    for (const keyword of keywords) {
        if (continuation.includes(keyword)) {
            found.push(keyword);
        } else {
            missing.push(keyword);
        }
    }

    return { found, missing };
}

/**
 * Evaluate story continuation using AI
 */
export async function evaluateContinuation(
    userContinuation: string,
    storyStart: string,
    keywords: string[],
    minLength: number
): Promise<ContinueStoryResult> {
    // Length check
    const isLongEnough = userContinuation.length >= minLength;

    // Keywords check
    const { found, missing } = checkContinueStoryKeywords(userContinuation, keywords);
    const hasKeywords = found.length >= Math.ceil(keywords.length * 0.5);

    // Basic validation
    if (!isLongEnough) {
        return {
            correct: false,
            hasKeywords,
            isLongEnough: false,
            isCoherent: false,
            feedback: `❌ เขียนต่อสั้นเกินไป กรุณาเขียนอย่างน้อย ${minLength} ตัวอักษร`,
        };
    }

    // Use AI to check coherence
    const apiKey = getApiKey();
    if (!apiKey) {
        // Fallback: check length and keywords
        const isCorrect = isLongEnough && hasKeywords;
        return {
            correct: isCorrect,
            hasKeywords,
            isLongEnough,
            isCoherent: true,
            feedback: isCorrect
                ? `✅ เขียนต่อเรื่องได้ดี! +20 คะแนน`
                : `❌ ลองเขียนใหม่ ใส่คำว่า: ${missing.join(", ")}`,
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
                        content: `คุณเป็นครูสอนภาษาไทย ตรวจการเขียนต่อเรื่องของนักเรียน
ตอบเป็น JSON: {"coherent": true/false, "creative": true/false, "feedback": "คำอธิบาย 1-2 ประโยค"}`
                    },
                    {
                        role: "user",
                        content: `เรื่องเริ่มต้น: "${storyStart}"

นักเรียนเขียนต่อว่า: "${userContinuation}"

ประเมิน: เขียนต่อเรื่องได้สอดคล้องกับเนื้อเรื่องไหม? มีความสร้างสรรค์ไหม?`
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
        const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            const isCoherent = result.coherent === true;
            const isCorrect = isCoherent && isLongEnough;

            return {
                correct: isCorrect,
                hasKeywords,
                isLongEnough,
                isCoherent,
                feedback: isCorrect
                    ? `✅ ${result.feedback || "เขียนต่อเรื่องได้ดี!"} +20 คะแนน`
                    : `❌ ${result.feedback || "ลองเขียนให้สอดคล้องกับเนื้อเรื่องมากขึ้น"}`,
            };
        }

        // Fallback
        return {
            correct: isLongEnough && hasKeywords,
            hasKeywords,
            isLongEnough,
            isCoherent: true,
            feedback: isLongEnough && hasKeywords
                ? `✅ เขียนต่อเรื่องได้ดี! +20 คะแนน`
                : `❌ ลองเขียนใหม่`,
        };
    } catch (error) {
        console.error("[ContinueStory] AI error:", error);
        return {
            correct: isLongEnough && hasKeywords,
            hasKeywords,
            isLongEnough,
            isCoherent: true,
            feedback: isLongEnough && hasKeywords
                ? `✅ เขียนต่อเรื่องได้ดี! +20 คะแนน`
                : `❌ ลองเขียนใหม่`,
        };
    }
}

/**
 * Calculate points
 */
export function calculateContinueStoryPoints(correctCount: number): number {
    return correctCount * 20;
}

/**
 * Format question for LINE message
 */
export function formatContinueStoryQuestion(
    question: ContinueStoryQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📖 ข้อ ${currentIndex + 1}/${totalCount}

อ่านเรื่องต่อไปนี้แล้วเขียนต่อ:

"${question.storyStart}"

...

━━━━━━━━━━━━━

พิมพ์เนื้อเรื่องต่อเลยครับ (อย่างน้อย ${question.minLength} ตัวอักษร)`;
}

/**
 * Format game summary
 */
export function formatContinueStoryGameSummary(
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

    return `${emoji} จบเกมเขียนต่อเรื่องแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "เขียนต่อ" เพื่อเล่นใหม่`;
}
