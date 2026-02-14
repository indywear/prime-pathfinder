import axios, { AxiosError } from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use Claude Haiku 4.5 - fast and cost-effective for chat responses
const MODEL = "anthropic/claude-haiku-4.5";

// Get API key with trimming to remove accidental whitespace/newlines
function getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY?.trim();
}

// Helper to log API errors with details
function logApiError(context: string, error: unknown) {
    console.error(`[AI/${context}] Error occurred`);
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`[AI/${context}] Status:`, axiosError.response?.status);
        console.error(`[AI/${context}] Data:`, JSON.stringify(axiosError.response?.data));
        console.error(`[AI/${context}] Message:`, axiosError.message);
    } else {
        console.error(`[AI/${context}] Unknown error:`, error);
    }
}

// 7-Criteria Rubric Scores (1-4 each, total 28)
interface RubricScores {
    accuracy: number;          // ความถูกต้อง
    contentSelection: number;  // การเลือกสาระ
    interpretation: number;    // การตีความ
    taskFulfillment: number;   // การทำตามภารกิจ
    organization: number;      // การเรียบเรียง
    languageUse: number;       // การใช้ภาษา
    mechanics: number;         // อักขระวิธี
    total: number;
}

interface FeedbackResult {
    scores: RubricScores;
    feedback: string;
    suggestions: string[];
    encouragement: string;
    criteriaFeedback: {
        accuracy: string;
        contentSelection: string;
        interpretation: string;
        taskFulfillment: string;
        organization: string;
        languageUse: string;
        mechanics: string;
    };
}

interface PracticeExamples {
    bestPractice?: string | null;
    generalPractice?: string | null;
    badPractice?: string | null;
}

export async function generateSimpleFeedback(
    content: string
): Promise<string> {
    const systemPrompt = `You are ProficienThAI, a friendly Thai language tutor.
Give brief, helpful feedback on the student's Thai writing in 2-3 sentences.
Focus on encouragement and 1-2 key improvements.
Always respond in Thai language.`;

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `ช่วยตรวจและให้คำแนะนำสั้นๆ:\n\n${content}` },
                ],
                temperature: 0.7,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization: `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    "X-Title": "ProficienThAI",
                },
            }
        );

        return response.data.choices[0]?.message?.content || "ขอบคุณที่ส่งงานมาครับ!";
    } catch (error) {
        logApiError("SimpleFeedback", error);
        return "ขอบคุณที่ส่งงานมาครับ! ลองตรวจสอบการสะกดคำและการเว้นวรรคอีกครั้งนะครับ";
    }
}

export async function generateWritingFeedback(
    content: string,
    taskDescription: string,
    isFullSubmission: boolean = false,
    practiceExamples?: PracticeExamples
): Promise<FeedbackResult> {
    const systemPrompt = `You are a friendly and encouraging Thai language teacher named "ProficienThAI".
You help non-native speakers (mainly Chinese students) improve their Thai reading and writing skills.

Your personality:
- Warm and supportive
- Give constructive feedback
- Celebrate small wins
- Use simple Thai that intermediate learners can understand

เกณฑ์การประเมินงานเขียนภาษาไทย (สำหรับนักศึกษาต่างชาติ) - แต่ละเกณฑ์ให้คะแนน 1-4:

1. ความถูกต้อง (Accuracy) [accuracy]
   - 4 (ดีมาก): ข้อมูลถูกต้องครบถ้วน ไม่บิดเบือนจากแหล่งที่มา ไม่มีข้อมูลที่แต่งเติมขึ้นเอง
   - 3 (ดี): ข้อมูลถูกต้องเป็นส่วนใหญ่ มีข้อมูลคลาดเคลื่อนเล็กน้อย 1-2 จุด
   - 2 (พอใช้): ข้อมูลถูกต้องบางส่วน มีข้อมูลคลาดเคลื่อนหรือแต่งเติมหลายจุด
   - 1 (ต้องปรับปรุง): ข้อมูลผิดพลาดเป็นส่วนใหญ่ หรือแต่งเรื่องขึ้นมาเอง

2. การเลือกสาระ (Content Selection) [contentSelection]
   - 4 (ดีมาก): เลือกประเด็นสำคัญได้ครบถ้วน จัดลำดับความสำคัญได้ดี ไม่มีข้อมูลที่ไม่เกี่ยวข้อง
   - 3 (ดี): เลือกประเด็นสำคัญได้เป็นส่วนใหญ่ แต่อาจขาดบางประเด็นหรือมีข้อมูลปลีกย่อยเกินไป
   - 2 (พอใช้): เลือกสาระได้บางส่วน ขาดประเด็นสำคัญหลายจุด หรือมีข้อมูลที่ไม่จำเป็นปะปนมาก
   - 1 (ต้องปรับปรุง): เลือกสาระไม่ตรงประเด็น หรือสรุปได้ไม่ครอบคลุมเนื้อหาหลัก

3. การตีความ (Interpretation) [interpretation]
   - 4 (ดีมาก): เข้าใจและถ่ายทอดสาระได้ลึกซึ้ง มีการวิเคราะห์หรือเสนอมุมมองของตนเองอย่างสมเหตุสมผล
   - 3 (ดี): เข้าใจเนื้อหาหลักได้ดี ถ่ายทอดได้ถูกต้อง แต่การวิเคราะห์ยังไม่ลึกซึ้ง
   - 2 (พอใช้): เข้าใจเนื้อหาผิวเผิน การตีความบางจุดคลาดเคลื่อนจากต้นฉบับ
   - 1 (ต้องปรับปรุง): ตีความผิดพลาดจากต้นฉบับ หรือไม่แสดงการวิเคราะห์ใดๆ

4. การทำตามภารกิจ (Task Fulfillment) [taskFulfillment]
   - 4 (ดีมาก): ทำตามคำสั่งได้ครบถ้วน รูปแบบถูกต้อง ความยาวเหมาะสม ตอบโจทย์ทุกข้อกำหนด
   - 3 (ดี): ทำตามคำสั่งได้เป็นส่วนใหญ่ แต่อาจขาดบางข้อกำหนดย่อย
   - 2 (พอใช้): ทำตามคำสั่งได้บางส่วน ขาดข้อกำหนดสำคัญ หรือรูปแบบไม่ถูกต้อง
   - 1 (ต้องปรับปรุง): ไม่ทำตามคำสั่ง รูปแบบผิด หรือเนื้อหาไม่ตรงกับภารกิจ

5. การเรียบเรียง (Organization) [organization]
   - 4 (ดีมาก): วางลำดับความดีมาก มีการเชื่อมโยงประโยคและย่อหน้าได้อย่างลื่นไหลเป็นธรรมชาติ
   - 3 (ดี): วางลำดับความเป็นระบบ มีคำเชื่อมที่ถูกต้องเป็นส่วนใหญ่
   - 2 (พอใช้): วางลำดับความยังสับสนในบางจุด ใช้คำเชื่อมซ้ำหรือผิดบริบท
   - 1 (ต้องปรับปรุง): วางลำดับความไม่ชัดเจน สับสน ประโยคไม่ต่อเนื่อง

6. การใช้ภาษา (Language Use) [languageUse]
   - 4 (ดีมาก): ใช้ไวยากรณ์ถูกต้อง เลือกคำศัพท์หลากหลายเหมาะสมกับระดับภาษา ไม่ติดโครงสร้างภาษาแม่
   - 3 (ดี): ใช้ไวยากรณ์ถูกต้องเป็นส่วนใหญ่ คำศัพท์เหมาะสมแต่ยังไม่หลากหลาย
   - 2 (พอใช้): ใช้ไวยากรณ์ผิดพลาดบ่อย คำศัพท์จำกัด หรือใช้คำทับศัพท์มาก
   - 1 (ต้องปรับปรุง): ไวยากรณ์ผิดเป็นส่วนใหญ่ เรียงประโยคแบบภาษาแม่จนอ่านไม่เข้าใจ

7. อักขระวิธี (Mechanics) [mechanics]
   - 4 (ดีมาก): สะกดคำถูกต้องทั้งหมด วรรณยุกต์ถูกต้อง เว้นวรรคตามหลักภาษาไทย
   - 3 (ดี): สะกดคำผิดเล็กน้อย (1-5 จุด) การเว้นวรรคส่วนใหญ่ถูกต้อง
   - 2 (พอใช้): สะกดคำผิดบ่อย วางวรรณยุกต์ผิดที่ เว้นวรรคไม่ถูกต้อง
   - 1 (ต้องปรับปรุง): สะกดคำผิดเป็นส่วนใหญ่ ไม่เว้นวรรค อ่านยาก

IMPORTANT: Always respond in Thai language.`;

    // Build practice examples section if available
    let practiceSection = "";
    if (practiceExamples?.bestPractice || practiceExamples?.generalPractice || practiceExamples?.badPractice) {
        practiceSection = "\n\n--- ตัวอย่างคำตอบอ้างอิง (ใช้เทียบระดับคุณภาพ) ---";
        if (practiceExamples.bestPractice) {
            practiceSection += `\n\nตัวอย่างระดับดีมาก (Best Practice):\n"""\n${practiceExamples.bestPractice}\n"""`;
        }
        if (practiceExamples.generalPractice) {
            practiceSection += `\n\nตัวอย่างระดับกลาง (General Practice):\n"""\n${practiceExamples.generalPractice}\n"""`;
        }
        if (practiceExamples.badPractice) {
            practiceSection += `\n\nตัวอย่างระดับต้องปรับปรุง (Bad Practice):\n"""\n${practiceExamples.badPractice}\n"""`;
        }
        practiceSection += "\n\nเทียบคุณภาพงานนักเรียนกับตัวอย่างข้างต้นเพื่อประเมินให้แม่นยำยิ่งขึ้น";
    }

    const userPrompt = `${isFullSubmission ? "นักเรียนส่งงานเขียน:" : "นักเรียนขอผลป้อนกลับฉบับร่าง:"}

โจทย์: ${taskDescription}
${practiceSection}

งานเขียนของนักเรียน:
"""
${content}
"""

กรุณาประเมินโดยใช้เกณฑ์ 7 ข้อ (1-4 คะแนนต่อข้อ) ตอบเป็น JSON format ดังนี้:
{
  "scores": {
    "accuracy": <1-4>,
    "contentSelection": <1-4>,
    "interpretation": <1-4>,
    "taskFulfillment": <1-4>,
    "organization": <1-4>,
    "languageUse": <1-4>,
    "mechanics": <1-4>
  },
  "criteriaFeedback": {
    "accuracy": "<ข้อเสนอแนะเรื่องความถูกต้อง>",
    "contentSelection": "<ข้อเสนอแนะเรื่องการเลือกสาระ>",
    "interpretation": "<ข้อเสนอแนะเรื่องการตีความ>",
    "taskFulfillment": "<ข้อเสนอแนะเรื่องการทำตามภารกิจ>",
    "organization": "<ข้อเสนอแนะเรื่องการเรียบเรียง>",
    "languageUse": "<ข้อเสนอแนะเรื่องการใช้ภาษา>",
    "mechanics": "<ข้อเสนอแนะเรื่องอักขระวิธี>"
  },
  "feedback": "<ข้อความสรุปภาพรวม 2-3 ประโยค>",
  "suggestions": [
    "<คำแนะนำข้อ 1>",
    "<คำแนะนำข้อ 2>",
    "<คำแนะนำข้อ 3>"
  ],
  "encouragement": "<ข้อความให้กำลังใจ>"
}`;

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 1500,
            },
            {
                headers: {
                    Authorization: `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    "X-Title": "ProficienThAI",
                },
            }
        );

        const assistantMessage = response.data.choices[0]?.message?.content || "";

        // Extract JSON from response
        const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Could not parse AI response");
        }

        const result = JSON.parse(jsonMatch[0]);

        const scores = {
            accuracy: result.scores?.accuracy || 2,
            contentSelection: result.scores?.contentSelection || 2,
            interpretation: result.scores?.interpretation || 2,
            taskFulfillment: result.scores?.taskFulfillment || 2,
            organization: result.scores?.organization || 2,
            languageUse: result.scores?.languageUse || 2,
            mechanics: result.scores?.mechanics || 2,
            total: 0,
        };
        scores.total = scores.accuracy + scores.contentSelection + scores.interpretation +
            scores.taskFulfillment + scores.organization + scores.languageUse + scores.mechanics;

        return {
            scores,
            feedback: result.feedback || "",
            suggestions: result.suggestions || [],
            encouragement: result.encouragement || "",
            criteriaFeedback: {
                accuracy: result.criteriaFeedback?.accuracy || "",
                contentSelection: result.criteriaFeedback?.contentSelection || "",
                interpretation: result.criteriaFeedback?.interpretation || "",
                taskFulfillment: result.criteriaFeedback?.taskFulfillment || "",
                organization: result.criteriaFeedback?.organization || "",
                languageUse: result.criteriaFeedback?.languageUse || "",
                mechanics: result.criteriaFeedback?.mechanics || "",
            },
        };
    } catch (error) {
        logApiError("WritingFeedback", error);

        // Return default feedback on error
        return {
            scores: {
                accuracy: 2, contentSelection: 2, interpretation: 2,
                taskFulfillment: 2, organization: 2, languageUse: 2, mechanics: 2,
                total: 14,
            },
            feedback: "ขอบคุณที่ส่งงานมาครับ งานเขียนของคุณอยู่ในเกณฑ์พอใช้",
            suggestions: [
                "ตรวจสอบความถูกต้องของข้อมูลอีกครั้ง",
                "เลือกประเด็นสำคัญให้ครบถ้วน",
                "ตรวจสอบการสะกดคำและการเว้นวรรค",
            ],
            encouragement: "พยายามต่อไปนะครับ!",
            criteriaFeedback: {
                accuracy: "ตรวจสอบความถูกต้องของข้อมูล",
                contentSelection: "เลือกประเด็นสำคัญให้ครบ",
                interpretation: "ลองวิเคราะห์เนื้อหาให้ลึกขึ้น",
                taskFulfillment: "ทำตามคำสั่งให้ครบถ้วน",
                organization: "จัดลำดับเนื้อหาให้ชัดเจน",
                languageUse: "ใช้คำศัพท์ให้หลากหลายขึ้น",
                mechanics: "ตรวจสอบการสะกดและการเว้นวรรค",
            },
        };
    }
}

export async function generatePracticeHint(
    question: string,
    userAnswer: string,
    correctAnswer: string
): Promise<string> {
    const systemPrompt = `You are ProficienThAI, a Thai language practice assistant.
Give a brief, helpful hint in Thai to help the student understand their mistake.
Keep it encouraging and educational. Max 2 sentences.`;

    const userPrompt = `Question: ${question}
Student's answer: ${userAnswer}
Correct answer: ${correctAnswer}

Give a short hint in Thai:`;

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 150,
            },
            {
                headers: {
                    Authorization: `Bearer ${getApiKey()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    "X-Title": "ProficienThAI",
                },
            }
        );

        return response.data.choices[0]?.message?.content || "ลองอีกครั้งนะครับ!";
    } catch (error) {
        logApiError("PracticeHint", error);
        return "ลองอีกครั้งนะครับ!";
    }
}

export async function generateConversationResponse(
    userMessage: string,
    context: string
): Promise<string> {
    const apiKey = getApiKey();

    // Check if API key is configured
    if (!apiKey) {
        console.error("[AI/ConversationResponse] OPENROUTER_API_KEY not configured");
        return "ขอโทษครับ ระบบ AI ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบครับ";
    }

    console.log("[AI/ConversationResponse] Processing message:", userMessage.substring(0, 50));
    console.log("[AI/ConversationResponse] API Key exists:", !!apiKey);
    console.log("[AI/ConversationResponse] Using model:", MODEL);

    const systemPrompt = `You are ProficienThAI, a Thai language learning assistant.

RULES:
- Respond ONLY in Thai
- Keep responses SHORT: 1-2 sentences maximum
- NO emojis allowed
- Be helpful and direct
- If asked about features, mention: "พิมพ์ 'เมนู' เพื่อดูตัวเลือกทั้งหมด"

${context}`;

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.8,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://proficienthai.vercel.app",
                    "X-Title": "ProficienThAI",
                },
            }
        );

        console.log("[AI/ConversationResponse] Success, response received");
        return response.data.choices[0]?.message?.content || "ขอโทษครับ ไม่เข้าใจ ลองพิมพ์ใหม่อีกครั้งได้ไหมครับ?";
    } catch (error) {
        logApiError("ConversationResponse", error);
        return "ขอโทษครับ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งนะครับ";
    }
}
