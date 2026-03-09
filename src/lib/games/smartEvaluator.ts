/**
 * Smart Answer Evaluator — ตรวจคำตอบแบบยืดหยุ่น
 *
 * ระบบ 6 ชั้น (เช็คเร็ว→ช้า):
 * 1. Exact match → ถูก 100%
 * 2. Normalize + match → ถูก 100%
 * 3. Levenshtein ≥90% → ถูก 100%
 * 4. Substring match → ใกล้เคียง 50%
 * 5. Levenshtein ≥70% → ใกล้เคียง 50%
 * 6. AI evaluation (borderline) → AI ตัดสิน
 * 7. ผิด → 0%
 */

import { levenshteinDistance, calculateSimilarity } from "@/lib/utils/similarity";
import axios from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

export type EvalStatus = "correct" | "partial" | "incorrect";

export interface SmartEvalResult {
    status: EvalStatus;
    scoreMultiplier: number; // 1.0 = full, 0.5 = partial, 0 = wrong
    feedback: string;
}

function getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY?.trim();
}

/** Normalize Thai text: trim, single spaces, normalize quotes, remove zero-width */
function normalize(str: string): string {
    return str.trim()
        .replace(/\s+/g, ' ')
        .replace(/[""]/g, '"')
        .replace(/\u200B/g, '');
}

/** Normalize removing ALL spaces (for Thai character-level comparison) */
function normalizeNoSpaces(str: string): string {
    return str.trim()
        .replace(/\s+/g, '')
        .replace(/\u200B/g, '');
}

// ============================================================
// FILL_BLANK — ตรวจคำเติมในช่องว่าง
// ============================================================

export async function smartCheckFillBlank(
    userAnswer: string,
    correctAnswer: string,
    sentenceContext?: string
): Promise<SmartEvalResult> {
    const user = normalize(userAnswer);
    const correct = normalize(correctAnswer);

    // Layer 1: Exact match
    if (user === correct) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 2: Short words (≤3 chars) must be exact — "น้ำ" vs "นำ" ต่างกันชัด
    if (correct.length <= 3) {
        return { status: "incorrect", scoreMultiplier: 0, feedback: `คำตอบที่ถูกคือ: "${correctAnswer}"` };
    }

    // Layer 3: High Levenshtein (≥90%) → typo tolerance
    const similarity = calculateSimilarity(user, correct);
    if (similarity >= 0.9) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 4: Substring match — "รับรางวัล" ⊂ "งานรับรางวัล"
    // Only give partial when user typed LESS than correct (correct contains user)
    // NOT when user typed MORE (user contains correct) — that's a different/wrong answer
    if (user.length >= 3 && correct.includes(user)) {
        const ratio = user.length / correct.length;
        // ต้องครอบคลุมอย่างน้อย 50% ของคำตอบเต็ม
        if (ratio >= 0.5) {
            return {
                status: "partial",
                scoreMultiplier: 0.5,
                feedback: `ใกล้เคียง! คำตอบเต็มคือ: "${correctAnswer}"`,
            };
        }
    }

    // Layer 5: Medium Levenshtein (≥70%) → ใกล้เคียง
    if (similarity >= 0.7) {
        return {
            status: "partial",
            scoreMultiplier: 0.5,
            feedback: `ใกล้เคียง! คำตอบที่ถูกคือ: "${correctAnswer}"`,
        };
    }

    // Layer 6: AI evaluation for borderline (50-70% similarity)
    if (similarity >= 0.5) {
        const aiResult = await aiCheckFillBlank(user, correct, correctAnswer, sentenceContext);
        if (aiResult) return aiResult;
    }

    // Layer 7: Incorrect
    return { status: "incorrect", scoreMultiplier: 0, feedback: `คำตอบที่ถูกคือ: "${correctAnswer}"` };
}

// ============================================================
// FIX_SENTENCE — ตรวจประโยคที่แก้ไข
// ============================================================

export async function smartCheckFixSentence(
    userAnswer: string,
    correctSentence: string
): Promise<SmartEvalResult> {
    const user = normalize(userAnswer);
    const correct = normalize(correctSentence);

    // Layer 1: Exact match
    if (user === correct) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 2: No-space comparison (Thai spacing varies)
    if (normalizeNoSpaces(user) === normalizeNoSpaces(correct)) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 3: High similarity (≥90%)
    const similarity = calculateSimilarity(user, correct);
    if (similarity >= 0.9) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 4: Words match check — ใช้คำถูกแต่ลำดับต่างนิด
    const correctWords = correct.split(/\s+/).filter(w => w.length > 0);
    const userWords = user.split(/\s+/).filter(w => w.length > 0);
    const matchedWords = correctWords.filter(w => userWords.some(uw => uw.includes(w) || w.includes(uw)));
    const wordMatchRatio = correctWords.length > 0 ? matchedWords.length / correctWords.length : 0;

    if (wordMatchRatio >= 0.8 && similarity >= 0.65) {
        return {
            status: "partial",
            scoreMultiplier: 0.5,
            feedback: `เกือบถูก! ประโยคที่ถูกต้องคือ:\n"${correctSentence}"`,
        };
    }

    // Layer 5: Medium similarity (≥70%)
    if (similarity >= 0.7) {
        return {
            status: "partial",
            scoreMultiplier: 0.5,
            feedback: `ใกล้เคียง! ประโยคที่ถูกต้องคือ:\n"${correctSentence}"`,
        };
    }

    // Layer 6: AI evaluation for borderline
    if (similarity >= 0.5) {
        const aiResult = await aiCheckSentence(user, correct, correctSentence, "fix");
        if (aiResult) return aiResult;
    }

    return {
        status: "incorrect",
        scoreMultiplier: 0,
        feedback: `ประโยคที่ถูกต้องคือ:\n"${correctSentence}"`,
    };
}

// ============================================================
// ARRANGE_SENTENCE — ตรวจประโยคที่เรียง
// ============================================================

export async function smartCheckArrangeSentence(
    userAnswer: string,
    correctSentence: string
): Promise<SmartEvalResult> {
    const user = normalizeNoSpaces(userAnswer);
    const correct = normalizeNoSpaces(correctSentence);

    // Layer 1: Exact match (no spaces)
    if (user === correct) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 2: High similarity (≥90%)
    const similarity = calculateSimilarity(user, correct);
    if (similarity >= 0.9) {
        return { status: "correct", scoreMultiplier: 1.0, feedback: "ถูกต้อง!" };
    }

    // Layer 3: Same characters, different order → มีคำครบแต่ลำดับผิด
    const userChars = [...user].sort().join('');
    const correctChars = [...correct].sort().join('');
    if (userChars === correctChars) {
        return {
            status: "partial",
            scoreMultiplier: 0.5,
            feedback: `มีคำครบ! แต่ลำดับยังไม่ถูกต้อง:\n"${correctSentence}"`,
        };
    }

    // Layer 4: Medium similarity (≥70%)
    if (similarity >= 0.7) {
        return {
            status: "partial",
            scoreMultiplier: 0.5,
            feedback: `ใกล้เคียง! ลำดับที่ถูกต้องคือ:\n"${correctSentence}"`,
        };
    }

    // Layer 5: AI evaluation for borderline (50-70% similarity)
    if (similarity >= 0.5) {
        const aiResult = await aiCheckSentence(user, correct, correctSentence, "arrange");
        if (aiResult) return aiResult;
    }

    return {
        status: "incorrect",
        scoreMultiplier: 0,
        feedback: `ประโยคที่ถูกต้องคือ:\n"${correctSentence}"`,
    };
}

// ============================================================
// AI Helpers — เรียก AI เฉพาะกรณี borderline
// ============================================================

async function aiCheckFillBlank(
    userAnswer: string,
    correctAnswer: string,
    originalCorrect: string,
    sentenceContext?: string
): Promise<SmartEvalResult | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const context = sentenceContext ? `ประโยค: "${sentenceContext}"\n` : '';

        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `คุณเป็นครูสอนภาษาไทยสำหรับนักเรียนต่างชาติ ตรวจคำตอบเติมคำในช่องว่าง
ตอบ JSON เท่านั้น: {"acceptable": true/false, "partial": true/false, "feedback": "คำอธิบายสั้นๆ 1 ประโยค"}
- acceptable=true: คำตอบถูกหรือใช้แทนกันได้
- partial=true: ถูกบางส่วน ความหมายใกล้เคียงแต่ไม่สมบูรณ์
- ทั้งสอง false: ผิดชัดเจน ความหมายต่างกัน`,
                    },
                    {
                        role: "user",
                        content: `${context}คำตอบที่ถูก: "${correctAnswer}"
คำตอบของนักเรียน: "${userAnswer}"
คำตอบนี้ถูกต้องหรือใกล้เคียงพอรับได้ไหม?`,
                    },
                ],
                temperature: 0.1,
                max_tokens: 100,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://proficienthai.vercel.app",
                    "X-Title": "ProficienThAI",
                },
                timeout: 8000,
            }
        );

        const aiText = response.data.choices[0]?.message?.content || "";
        const cleaned = aiText.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (result.acceptable === true) {
                return {
                    status: "correct",
                    scoreMultiplier: 1.0,
                    feedback: result.feedback || "ถูกต้อง!",
                };
            }
            if (result.partial === true) {
                return {
                    status: "partial",
                    scoreMultiplier: 0.5,
                    feedback: `${result.feedback || "ใกล้เคียง!"} คำตอบเต็มคือ: "${originalCorrect}"`,
                };
            }
            return {
                status: "incorrect",
                scoreMultiplier: 0,
                feedback: `${result.feedback || ""} คำตอบที่ถูกคือ: "${originalCorrect}"`,
            };
        }
    } catch (error) {
        console.error("[SmartEval] AI fillBlank error:", error);
    }

    return null; // AI failed → fallback to local result
}

async function aiCheckSentence(
    userAnswer: string,
    correctSentence: string,
    originalCorrect: string,
    gameType: "fix" | "arrange"
): Promise<SmartEvalResult | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const task = gameType === "fix" ? "แก้ไขประโยคให้ถูกต้อง" : "เรียงคำให้เป็นประโยค";

        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `คุณเป็นครูสอนภาษาไทยสำหรับนักเรียนต่างชาติ ตรวจคำตอบเกม "${task}"
ตอบ JSON เท่านั้น: {"acceptable": true/false, "partial": true/false, "feedback": "คำอธิบายสั้นๆ 1 ประโยค"}
- acceptable=true: ประโยคถูกต้องหรือใช้ได้ (อาจสลับลำดับคำนิดหน่อยแต่ความหมายถูก)
- partial=true: ถูกบางส่วน ความหมายใกล้เคียง
- ทั้งสอง false: ผิดชัดเจน`,
                    },
                    {
                        role: "user",
                        content: `ประโยคที่ถูกต้อง: "${correctSentence}"
คำตอบของนักเรียน: "${userAnswer}"
คำตอบนี้ถูกต้องหรือใกล้เคียงพอรับได้ไหม?`,
                    },
                ],
                temperature: 0.1,
                max_tokens: 100,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://proficienthai.vercel.app",
                    "X-Title": "ProficienThAI",
                },
                timeout: 8000,
            }
        );

        const aiText = response.data.choices[0]?.message?.content || "";
        const cleaned = aiText.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (result.acceptable === true) {
                return {
                    status: "correct",
                    scoreMultiplier: 1.0,
                    feedback: result.feedback || "ถูกต้อง!",
                };
            }
            if (result.partial === true) {
                return {
                    status: "partial",
                    scoreMultiplier: 0.5,
                    feedback: `${result.feedback || "ใกล้เคียง!"}\nประโยคที่ถูกต้องคือ:\n"${originalCorrect}"`,
                };
            }
            return {
                status: "incorrect",
                scoreMultiplier: 0,
                feedback: `${result.feedback || ""}\nประโยคที่ถูกต้องคือ:\n"${originalCorrect}"`,
            };
        }
    } catch (error) {
        console.error("[SmartEval] AI sentence error:", error);
    }

    return null;
}
