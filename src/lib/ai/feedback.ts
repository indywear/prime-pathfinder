import axios, { AxiosError } from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use Claude Haiku 4.5 - fast and cost-effective for chat responses
const MODEL = "anthropic/claude-haiku-4.5";

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

// New 5-Criteria Rubric Scores (1-4 each, total 20)
interface RubricScores {
    content: number;        // เนื้อหาและการนำเสนอ
    organization: number;   // การลำดับความ
    grammar: number;        // ไวยากรณ์และโครงสร้างประโยค
    vocabulary: number;     // การเลือกใช้คำศัพท์
    mechanics: number;      // อักขระวิธีและการเว้นวรรค
    total: number;
}

interface FeedbackResult {
    scores: RubricScores;
    feedback: string;
    suggestions: string[];
    encouragement: string;
    criteriaFeedback: {
        content: string;
        organization: string;
        grammar: string;
        vocabulary: string;
        mechanics: string;
    };
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
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
    isFullSubmission: boolean = false
): Promise<FeedbackResult> {
    const systemPrompt = `You are a friendly and encouraging Thai language teacher named "ProficienThAI". 
You help non-native speakers (mainly Chinese students) improve their Thai reading and writing skills.

Your personality:
- Warm and supportive
- Give constructive feedback
- Celebrate small wins
- Use simple Thai that intermediate learners can understand
- Mix in key vocabulary explanations when relevant

เกณฑ์การประเมินงานเขียนภาษาไทย (สำหรับนักศึกษาต่างชาติ) - แต่ละเกณฑ์ให้คะแนน 1-4:

1. เนื้อหาและการนำเสนอ (Content & Presentation) [content]
   - 4 (ดีมาก): เนื้อหาตรงประเด็น ครบถ้วนตามคำสั่ง มีการขยายความและยกตัวอย่างประกอบชัดเจน น่าสนใจ
   - 3 (ดี): เนื้อหาตรงประเด็นเป็นส่วนใหญ่ มีรายละเอียดสนับสนุนพอสมควร แต่อาจมีบางส่วนที่ไม่ชัดเจน
   - 2 (พอใช้): เนื้อหาตรงประเด็นเพียงบางส่วน รายละเอียดน้อย หรือนำเสนอความคิดแบบซ้ำไปซ้ำมา
   - 1 (ต้องปรับปรุง): เนื้อหาไม่ตรงประเด็น หรือสั้นเกินกว่าจะสื่อความหมายได้

2. การลำดับความ (Organization) [organization]
   - 4 (ดีมาก): วางลำดับความดีมาก (นำ เนื้อ สรุป) มีการเชื่อมโยงประโยคและย่อหน้าได้อย่างลื่นไหล
   - 3 (ดี): วางลำดับความเป็นระบบ มีคำเชื่อมที่ถูกต้องเป็นส่วนใหญ่ แต่การเชื่อมต่อบางจุดยังไม่เป็นธรรมชาติ
   - 2 (พอใช้): วางลำดับความยังสับสนในบางจุด ใช้คำเชื่อมซ้ำ ๆ หรือใช้ผิดบริบท
   - 1 (ต้องปรับปรุง): วางลำดับความไม่ชัดเจน สับสน ประโยคไม่ต่อเนื่อง

3. ไวยากรณ์และโครงสร้างประโยค (Grammar and Structure) [grammar]
   - 4 (ดีมาก): ใช้ไวยากรณ์ได้ถูกต้องและใช้โครงสร้างประโยคหลากหลาย ไม่ติดโครงสร้างภาษาแม่ (L1 Interference)
   - 3 (ดี): ใช้ไวยากรณ์ถูกต้องเป็นส่วนใหญ่ มีข้อผิดพลาดบ้างแต่ไม่กระทบต่อการสื่อสาร
   - 2 (พอใช้): ใช้ไวยากรณ์ผิดพลาดบ่อย หรือใช้ประโยคโครงสร้างเดียวซ้ำ ๆ
   - 1 (ต้องปรับปรุง): ใช้ไวยากรณ์ผิดพลาดเป็นส่วนใหญ่ เรียงโครงสร้างประโยคแบบภาษาแม่จนอ่านไม่เข้าใจ

4. การเลือกใช้คำศัพท์ (Vocabulary Use) [vocabulary]
   - 4 (ดีมาก): เลือกใช้คำศัพท์ได้ถูกต้อง หลากหลาย และเหมาะสมกับระดับภาษา/กาลเทศะ
   - 3 (ดี): เลือกใช้คำศัพท์ได้ถูกต้องตามความหมาย แต่อาจยังใช้คำศัพท์พื้นฐานเป็นหลัก ไม่หลากหลาย
   - 2 (พอใช้): เลือกใช้คำศัพท์จำกัด ใช้คำผิดความหมายหรือใช้คำทับศัพท์บ่อยครั้ง
   - 1 (ต้องปรับปรุง): เลือกใช้คำศัพท์น้อยมาก หรือใช้คำผิดความหมายจนทำให้เข้าใจผิด

5. อักขระวิธีและการเว้นวรรค (Mechanics and Space) [mechanics]
   - 4 (ดีมาก): สะกดคำและวางรูปวรรณยุกต์ถูกต้องทั้งหมด เว้นวรรคตอนได้ถูกต้องตามหลักภาษาไทย
   - 3 (ดี): สะกดคำผิดเล็กน้อย (1-5 จุด) แต่ยังสื่อความหมายได้ การเว้นวรรคส่วนใหญ่ถูกต้อง
   - 2 (พอใช้): สะกดคำผิดบ่อย โดยเฉพาะคำที่มีตัวสะกดไม่ตรงมาตรา หรือวางวรรณยุกต์ผิดที่
   - 1 (ต้องปรับปรุง): สะกดคำผิดเป็นส่วนใหญ่ ไม่มีการเว้นวรรคตอน ทำให้ประโยคปนกันจนอ่านยาก

IMPORTANT: Always respond in Thai language.`;

    const userPrompt = `${isFullSubmission ? "นักเรียนส่งงานเขียน:" : "นักเรียนขอผลป้อนกลับฉบับร่าง:"}

โจทย์: ${taskDescription}

งานเขียนของนักเรียน:
"""
${content}
"""

กรุณาประเมินโดยใช้เกณฑ์ 5 ข้อ (1-4 คะแนนต่อข้อ) ตอบเป็น JSON format ดังนี้:
{
  "scores": {
    "content": <1-4>,
    "organization": <1-4>,
    "grammar": <1-4>,
    "vocabulary": <1-4>,
    "mechanics": <1-4>
  },
  "criteriaFeedback": {
    "content": "<ข้อเสนอแนะเรื่องเนื้อหา>",
    "organization": "<ข้อเสนอแนะเรื่องการลำดับความ>",
    "grammar": "<ข้อเสนอแนะเรื่องไวยากรณ์>",
    "vocabulary": "<ข้อเสนอแนะเรื่องคำศัพท์>",
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
                max_tokens: 1000,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

        return {
            scores: {
                content: result.scores?.content || 2,
                organization: result.scores?.organization || 2,
                grammar: result.scores?.grammar || 2,
                vocabulary: result.scores?.vocabulary || 2,
                mechanics: result.scores?.mechanics || 2,
                total:
                    (result.scores?.content || 2) +
                    (result.scores?.organization || 2) +
                    (result.scores?.grammar || 2) +
                    (result.scores?.vocabulary || 2) +
                    (result.scores?.mechanics || 2),
            },
            feedback: result.feedback || "",
            suggestions: result.suggestions || [],
            encouragement: result.encouragement || "",
            criteriaFeedback: {
                content: result.criteriaFeedback?.content || "",
                organization: result.criteriaFeedback?.organization || "",
                grammar: result.criteriaFeedback?.grammar || "",
                vocabulary: result.criteriaFeedback?.vocabulary || "",
                mechanics: result.criteriaFeedback?.mechanics || "",
            },
        };
    } catch (error) {
        logApiError("WritingFeedback", error);

        // Return default feedback on error
        return {
            scores: {
                content: 2,
                organization: 2,
                grammar: 2,
                vocabulary: 2,
                mechanics: 2,
                total: 10,
            },
            feedback: "ขอบคุณที่ส่งงานมาครับ งานเขียนของคุณอยู่ในเกณฑ์พอใช้",
            suggestions: [
                "ลองอ่านทบทวนอีกครั้งเพื่อตรวจสอบความถูกต้อง",
                "เพิ่มความหลากหลายของคำศัพท์",
                "ตรวจสอบการเรียงลำดับประโยค",
            ],
            encouragement: "พยายามต่อไปนะครับ!",
            criteriaFeedback: {
                content: "ตรวจสอบว่าเนื้อหาตรงประเด็น",
                organization: "ลองจัดลำดับย่อหน้าให้ชัดเจน",
                grammar: "ตรวจสอบโครงสร้างประโยค",
                vocabulary: "เพิ่มความหลากหลายของคำศัพท์",
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
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Check if API key is configured
    if (!apiKey) {
        console.error("[AI/ConversationResponse] OPENROUTER_API_KEY not configured");
        return "ขอโทษครับ ระบบ AI ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบครับ";
    }

    console.log("[AI/ConversationResponse] Processing message:", userMessage.substring(0, 50));
    console.log("[AI/ConversationResponse] API Key exists:", !!apiKey);
    console.log("[AI/ConversationResponse] Using model:", MODEL);

    const systemPrompt = `You are ProficienThAI, a friendly Thai language learning chatbot.
You help students improve their Thai reading and writing skills.
Respond naturally in Thai, keeping messages concise and helpful.
If the student asks about assignments or feedback, guide them to use the appropriate menu.
Be encouraging and supportive.

Context: ${context}`;

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
