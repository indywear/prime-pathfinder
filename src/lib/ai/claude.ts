import OpenAI from 'openai'

const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
})

// AI Models
const MODELS = {
    CLAUDE_OPUS: 'anthropic/claude-3-opus',
    CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
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
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_OPUS,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500,
        })

        const content = response.choices[0]?.message?.content || '{}'
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

// ==================== QUESTION GENERATION ====================

interface QuestionRequest {
    gameType: 'vocab' | 'fillblank' | 'arrange' | 'compose' | 'reading'
    difficulty: 1 | 2 | 3
    thaiLevel: string
    count?: number
}

interface Question {
    question: string
    options?: string[]
    correctAnswer: string | number
    explanation?: string
    points: number
}

export async function generateQuestions(request: QuestionRequest): Promise<Question[]> {
    const count = request.count || 5
    const difficultyDesc = request.difficulty === 1 ? 'ง่าย' : request.difficulty === 2 ? 'ปานกลาง' : 'ยาก'

    const gamePrompts: Record<string, string> = {
        vocab: `สร้างคำถามคำศัพท์ภาษาไทย ${count} ข้อ แต่ละข้อมี 4 ตัวเลือก`,
        fillblank: `สร้างประโยคเติมคำ ${count} ข้อ มีช่องว่าง ___ และ 4 ตัวเลือก`,
        arrange: `สร้างคำถามเรียงประโยค ${count} ข้อ ให้คำแยกมา ผู้เล่นต้องเรียงให้ถูก`,
        compose: `สร้างโจทย์แต่งประโยค ${count} ข้อ กำหนดคำศัพท์ให้ใช้`,
        reading: `สร้างบทอ่านสั้นพร้อมคำถาม ${count} ข้อ`,
    }

    const prompt = `สร้างคำถามเกมภาษาไทยสำหรับผู้เรียนต่างชาติ
ระดับ: ${request.thaiLevel}
ความยาก: ${difficultyDesc}

${gamePrompts[request.gameType]}

ตอบเป็น JSON array:
[
  {
    "question": "<คำถาม>",
    "options": ["<ตัวเลือก 1>", "<ตัวเลือก 2>", ...] (ถ้ามี),
    "correctAnswer": <index ของคำตอบถูก หรือ string ถ้าไม่มีตัวเลือก>,
    "explanation": "<คำอธิบาย>",
    "points": <คะแนน 5-15>
  }
]

ตอบเป็น JSON เท่านั้น`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU, // Use faster model for questions
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
        })

        const content = response.choices[0]?.message?.content || '[]'
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as Question[]
        }
        throw new Error('Invalid JSON response')
    } catch (error) {
        console.error('AI Question generation error:', error)
        return []
    }
}

// ==================== HUMOR & ENCOURAGEMENT ====================

interface HumorRequest {
    context: 'correct' | 'incorrect' | 'streak' | 'levelup' | 'nudge' | 'welcome'
    nationality: string
    userName?: string
    additionalContext?: string
}

export async function generateHumor(request: HumorRequest): Promise<string> {
    const contextPrompts: Record<string, string> = {
        correct: 'นักเรียนตอบถูก ให้คำชม',
        incorrect: 'นักเรียนตอบผิด ให้กำลังใจ',
        streak: 'นักเรียนทำ streak ต่อเนื่อง ให้กำลังใจ',
        levelup: 'นักเรียนเลื่อน level ให้คำยินดี',
        nudge: 'เตือนนักเรียนกลับมาเรียน แบบกวนๆ',
        welcome: 'ต้อนรับนักเรียนใหม่',
    }

    const prompt = `สร้างข้อความสั้นๆ (1-2 ประโยค) สำหรับ: ${contextPrompts[request.context]}
${request.userName ? `ชื่อนักเรียน: ${request.userName}` : ''}
สัญชาติ: ${request.nationality}
${request.additionalContext || ''}

ข้อความต้อง:
- เป็นกันเอง สนุกสนาน
- ใส่อีโมจิ
- ถ้าเป็นไปได้ใส่มุกตลกหรือ meme ภาษา${request.nationality}

ตอบเป็นข้อความเลย (ไม่ต้อง JSON)`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_tokens: 200,
        })

        return response.choices[0]?.message?.content || 'สู้ๆ นะ! 💪'
    } catch (error) {
        console.error('AI Humor generation error:', error)
        return 'สู้ๆ นะ! 💪'
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
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 300,
        })

        const content = response.choices[0]?.message?.content || '{}'
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

// ==================== GENERAL CHITCHAT (PLAYFUL) ====================

interface ChitchatRequest {
    userId: string
    message: string
    userContext?: {
        name: string
        level: string
        streak: number
        preferredLanguage: string
    }
}

export async function generateChitchat(request: ChitchatRequest): Promise<string> {
    const prompt = `คุณคือ "น้องไทย" (Nong Thai) AI Companion เพื่อนซี้ฝึกภาษาไทย
บุคลิก: ร่าเริง กวนนิดๆ ขี้เล่น ชอบหยอกล้อ (Teasing/Playful) แต่ก็ให้กำลังใจ
เป้าหมาย: คุยเล่นกับผู้เรียน ให้เขารู้สึกสนุก ผ่อนคลาย แต่ก็แอบแทรกความรู้ภาษาไทยบ้าง

ข้อมูลผู้เรียน:
- ชื่อ: ${request.userContext?.name || 'ไม่ทราบชื่อ'}
- ระดับ: ${request.userContext?.level || 'ไม่ระบุ'}
- Streak: ${request.userContext?.streak || 0} วัน
- ภาษาที่ถนัด: ${request.userContext?.preferredLanguage || 'TH'}

ข้อความจากผู้เรียน: "${request.message}"

คำแนะนำการตอบ:
- ตอบเป็นภาษาไทย (หรือปนอังกฤษถ้าผู้เรียนถนัดอังกฤษ)
- สั้นๆ กระชับ (ไม่เกิน 2-3 ประโยค)
- ***สำคัญ: ต้องมีความกวน ขี้เล่น หรือหยอกล้อ*** (เช่น แซวเรื่อง Streak, แซวว่าหายไปนาน, หรือเล่นมุก)
- ใส่อีโมจิเยอะๆ

ตอบข้อความเท่านั้น:`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9, // High creativity
            max_tokens: 300,
        })

        return response.choices[0]?.message?.content || 'วันนี้น้องไทยสมองแล่นช้าจัง... ถามใหม่อีกทีได้ไหมครับ? 😅'
    } catch (error) {
        console.error('AI Chitchat error:', error)
        return 'วันนี้น้องไทยมึนๆ นิดหน่อย... คุยเรื่องอื่นกันดีกว่าครับ 😵‍💫'
    }
}
