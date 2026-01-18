import axios from 'axios'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// AI Models
const MODELS = {
    CLAUDE_OPUS: 'anthropic/claude-3-opus',
    CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
}

// Question Type for Games
export interface Question {
    question: string
    options?: string[]
    correctAnswer: number | string
    explanation: string
    points: number
}

// ==================== FEEDBACK GENERATION ====================

interface FeedbackRequest {
    content: string
    taskTitle?: string
    rubrics?: { name: string; description: string; maxScore: number }[]
    nationality: string
    thaiLevel: string
    userName?: string
}

interface FeedbackResponse {
    overallScore: number
    scores: { name: string; score: number; maxScore: number; feedback: string }[]
    generalFeedback: string
    encouragement: string
    improvements: string[]
}

export async function generateFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    const defaultRubrics = [
        { name: 'Grammar', description: 'ความถูกต้องทางไวยากรณ์', maxScore: 25 },
        { name: 'Vocabulary', description: 'การใช้คำศัพท์หลากหลาย', maxScore: 25 },
        { name: 'Organization', description: 'การจัดลำดับความคิด', maxScore: 25 },
        { name: 'Task Fulfillment', description: 'ตอบโจทย์ตรงประเด็น', maxScore: 25 },
    ]

    const rubrics = request.rubrics || defaultRubrics

    const prompt = `คุณเป็นครูสอนภาษาไทยที่ใจดีและสนุกสนาน ชื่อ "น้องไทย"
คุณกำลังให้ feedback งานเขียนของนักเรียนต่างชาติ

ข้อมูลนักเรียน:
- สัญชาติ: ${request.nationality}
- ระดับภาษาไทย: ${request.thaiLevel}
${request.userName ? `- ชื่อ: ${request.userName}` : ''}
${request.taskTitle ? `- ภาระงาน: ${request.taskTitle}` : ''}

เกณฑ์การประเมิน:
${rubrics.map((r) => `- ${r.name} (${r.maxScore} คะแนน): ${r.description}`).join('\n')}

งานเขียน:
"""
${request.content}
"""

กรุณาให้ feedback ในรูปแบบ JSON ดังนี้:
{
  "overallScore": <คะแนนรวม>,
  "scores": [
    {"name": "<ชื่อเกณฑ์>", "score": <คะแนน>, "maxScore": <คะแนนเต็ม>, "feedback": "<feedback สั้นๆ>"}
  ],
  "generalFeedback": "<feedback รวมแบบเป็นกันเอง ใส่อีโมจิ>",
  "encouragement": "<คำให้กำลังใจ อาจใส่มุกตลกหรือ meme ภาษา${request.nationality}ได้>",
  "improvements": ["<จุดที่ควรปรับปรุง 1>", "<จุดที่ควรปรับปรุง 2>"]
}

ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น`

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODELS.CLAUDE_OPUS,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1500,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'X-Title': 'ProficienThAI',
                },
            }
        )

        const content = response.data.choices[0]?.message?.content || '{}'
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as FeedbackResponse
        }
        throw new Error('Invalid JSON response')
    } catch (error) {
        console.error('AI Feedback error:', error)
        // Return default response on error
        return {
            overallScore: 0,
            scores: rubrics.map((r) => ({ name: r.name, score: 0, maxScore: r.maxScore, feedback: 'ไม่สามารถประเมินได้' })),
            generalFeedback: 'ขออภัย ระบบไม่สามารถประเมินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
            encouragement: 'สู้ๆ นะ! 💪',
            improvements: [],
        }
    }
}

// ==================== AI DETECTION (PLAYFUL) ====================

interface AIDetectionRequest {
    content: string
    timeSpentSeconds: number
    expectedTimeSeconds: number
}

interface AIDetectionResponse {
    suspicious: boolean
    confidence: number
    playfulMessage?: string
}

export async function detectAIUsage(request: AIDetectionRequest): Promise<AIDetectionResponse> {
    // Quick heuristic check first
    const tooFast = request.timeSpentSeconds < request.expectedTimeSeconds * 0.3

    if (!tooFast && request.content.length < 500) {
        return { suspicious: false, confidence: 0 }
    }

    const prompt = `วิเคราะห์ว่างานเขียนนี้น่าจะเขียนเองหรือใช้ AI ช่วย:
- เวลาที่ใช้: ${request.timeSpentSeconds} วินาที (คาดหวัง: ${request.expectedTimeSeconds} วินาที)
- ความยาว: ${request.content.length} ตัวอักษร

งานเขียน:
"""
${request.content.substring(0, 500)}
"""

ถ้าสงสัยว่าใช้ AI ให้สร้างข้อความหยอกล้อแบบน่ารัก (ไม่ตำหนิ)

ตอบเป็น JSON:
{
  "suspicious": <true/false>,
  "confidence": <0-100>,
  "playfulMessage": "<ข้อความหยอกล้อถ้า suspicious>"
}

ตอบเป็น JSON เท่านั้น`

    try {
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODELS.CLAUDE_HAIKU,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'X-Title': 'ProficienThAI',
                },
            }
        )

        const content = response.data.choices[0]?.message?.content || '{}'
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as AIDetectionResponse
        }
        return { suspicious: false, confidence: 0 }
    } catch (error) {
        console.error('AI Detection error:', error)
        return { suspicious: false, confidence: 0 }
    }
}
