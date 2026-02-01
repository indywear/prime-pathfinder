import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import axios from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

function getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY?.trim();
}

export interface SummarizeQuestion {
    id: string;
    passage: string;
    sampleSummary: string;
    keywords: string;  // คำสำคัญที่ควรมี คั่นด้วย |
}

export interface SummarizeResult {
    correct: boolean;
    hasKeywords: boolean;
    keywordsFound: string[];
    keywordsMissing: string[];
    feedback: string;
}

/**
 * Get random summarize questions
 */
export async function getRandomSummarizeQuestions(count: number = 3): Promise<SummarizeQuestion[]> {
    const allQuestions = await prisma.summarizeQuestion.findMany({
        take: count * 3,
    });

    if (allQuestions.length === 0) {
        return [];
    }

    const shuffled = shuffle(allQuestions);
    return shuffled.slice(0, count).map(q => ({
        id: q.id,
        passage: q.passage,
        sampleSummary: q.sampleSummary,
        keywords: q.keywords,
    }));
}

/**
 * Get keywords array from question
 */
export function getSummarizeKeywords(question: SummarizeQuestion): string[] {
    return question.keywords.split('|').map(k => k.trim()).filter(k => k.length > 0);
}

/**
 * Check keywords in user's summary
 */
export function checkSummarizeKeywords(userSummary: string, keywords: string[]): {
    found: string[];
    missing: string[];
} {
    const found: string[] = [];
    const missing: string[] = [];

    for (const keyword of keywords) {
        if (userSummary.includes(keyword)) {
            found.push(keyword);
        } else {
            missing.push(keyword);
        }
    }

    return { found, missing };
}

/**
 * Evaluate summary using AI
 */
export async function evaluateSummary(
    userSummary: string,
    passage: string,
    sampleSummary: string,
    keywords: string[]
): Promise<SummarizeResult> {
    // First check keywords
    const { found, missing } = checkSummarizeKeywords(userSummary, keywords);
    const keywordRatio = found.length / keywords.length;

    // Minimum length check
    if (userSummary.length < 20) {
        return {
            correct: false,
            hasKeywords: keywordRatio >= 0.5,
            keywordsFound: found,
            keywordsMissing: missing,
            feedback: "❌ สรุปสั้นเกินไป กรุณาเขียนสรุปที่ครอบคลุมใจความสำคัญ",
        };
    }

    // Use AI to evaluate
    const apiKey = getApiKey();
    if (!apiKey) {
        // Fallback: check based on keywords only
        const isCorrect = keywordRatio >= 0.6;
        return {
            correct: isCorrect,
            hasKeywords: keywordRatio >= 0.5,
            keywordsFound: found,
            keywordsMissing: missing,
            feedback: isCorrect
                ? `✅ สรุปได้ดี! มีคำสำคัญ ${found.length}/${keywords.length} คำ +20 คะแนน`
                : `❌ ลองสรุปใหม่ ขาดคำสำคัญ: ${missing.join(", ")}`,
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
                        content: `คุณเป็นครูสอนภาษาไทย ตรวจการสรุปเรื่องของนักเรียน
ตอบเป็น JSON: {"correct": true/false, "feedback": "คำอธิบาย 1-2 ประโยค"}`
                    },
                    {
                        role: "user",
                        content: `เนื้อเรื่อง: "${passage}"

ตัวอย่างสรุปที่ดี: "${sampleSummary}"

สรุปของนักเรียน: "${userSummary}"

ประเมิน: สรุปได้ใจความสำคัญไหม? ถูกต้องตามเนื้อเรื่องไหม?`
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
            const isCorrect = result.correct === true;

            return {
                correct: isCorrect,
                hasKeywords: keywordRatio >= 0.5,
                keywordsFound: found,
                keywordsMissing: missing,
                feedback: isCorrect
                    ? `✅ ${result.feedback || "สรุปได้ดี!"} +20 คะแนน`
                    : `❌ ${result.feedback || "ลองสรุปใหม่"}`,
            };
        }

        // Fallback
        return {
            correct: keywordRatio >= 0.6,
            hasKeywords: keywordRatio >= 0.5,
            keywordsFound: found,
            keywordsMissing: missing,
            feedback: keywordRatio >= 0.6
                ? `✅ สรุปได้ดี! +20 คะแนน`
                : `❌ ลองสรุปใหม่ ขาดคำสำคัญ`,
        };
    } catch (error) {
        console.error("[Summarize] AI error:", error);
        return {
            correct: keywordRatio >= 0.6,
            hasKeywords: keywordRatio >= 0.5,
            keywordsFound: found,
            keywordsMissing: missing,
            feedback: keywordRatio >= 0.6
                ? `✅ สรุปได้ดี! +20 คะแนน`
                : `❌ ลองสรุปใหม่ ขาดคำสำคัญ`,
        };
    }
}

/**
 * Calculate points
 */
export function calculateSummarizePoints(correctCount: number): number {
    return correctCount * 20;
}

/**
 * Format question for LINE message
 */
export function formatSummarizeQuestion(
    question: SummarizeQuestion,
    currentIndex: number,
    totalCount: number
): string {
    return `📝 ข้อ ${currentIndex + 1}/${totalCount}

อ่านเนื้อเรื่องต่อไปนี้แล้วเขียนสรุป:

"${question.passage}"

━━━━━━━━━━━━━

พิมพ์สรุปเรื่องเลยครับ (ควรมี 2-3 ประโยค)`;
}

/**
 * Format game summary
 */
export function formatSummarizeGameSummary(
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

    return `${emoji} จบเกมสรุปเรื่องแล้ว! ${message}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น หรือ "สรุปเรื่อง" เพื่อเล่นใหม่`;
}
