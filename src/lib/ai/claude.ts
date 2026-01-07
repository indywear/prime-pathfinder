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

export async function generateQuestions(request: QuestionRequest): Promise<Question[]> {
    const count = request.count || 5
    const difficultyDesc = request.difficulty === 1 ? 'ง่าย (A1-A2)' : request.difficulty === 2 ? 'ปานกลาง (B1-B2)' : 'ยาก (C1-C2)'

    // Detailed prompts with examples for each game type
    const gamePrompts: Record<string, string> = {
        // ===== VOCABULARY GAMES =====
        vocab: `สร้างคำถามคำศัพท์ภาษาไทย ${count} ข้อ

กฎสำคัญ:
- แต่ละข้อต้องมี 4 ตัวเลือกที่แตกต่างกันทั้งหมด
- ถามเป็นภาษาอังกฤษหรือความหมาย ให้ตอบเป็นภาษาไทย
- ตัวเลือกที่ผิดต้องดูน่าเชื่อถือ (distractors ที่ดี)
- correctAnswer เป็นตัวเลข 0-3 (index ของ options)

ตัวอย่าง:
{
  "question": "'Cat' ภาษาไทยว่าอะไร?",
  "options": ["แมว", "หมา", "นก", "ปลา"],
  "correctAnswer": 0,
  "explanation": "Cat ภาษาไทยคือ แมว",
  "points": 10
}`,

        fillblank: `สร้างประโยคเติมคำ ${count} ข้อ (Fill in the blank)

กฎสำคัญ:
- ประโยคต้องมีช่องว่าง ___ ที่ต้องเติม
- 4 ตัวเลือกต้องแตกต่างกัน และเป็นคำที่เหมาะสมทางไวยากรณ์
- แต่มีเพียง 1 คำเดียวที่ถูกต้องตามบริบท
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "ฉัน ___ ไปโรงเรียนทุกวัน",
  "options": ["ไป", "มา", "กลับ", "วิ่ง"],
  "correctAnswer": 0,
  "explanation": "ใช้ 'ไป' เพราะหมายถึงการเดินทางจากที่หนึ่งไปอีกที่",
  "points": 10
}`,

        arrange: `สร้างคำถามเรียงประโยค ${count} ข้อ

กฎสำคัญ:
- ให้คำศัพท์แยกกันมา 4-6 คำ
- ผู้เล่นต้องเรียงคำให้เป็นประโยคที่ถูกต้อง
- correctAnswer เป็น string ของประโยคที่ถูกต้อง (ไม่มี options)
- ห้ามใส่ options สำหรับเกมนี้

ตัวอย่าง:
{
  "question": "เรียงคำต่อไปนี้ให้เป็นประโยค: ฉัน / ชอบ / กิน / ข้าว",
  "correctAnswer": "ฉันชอบกินข้าว",
  "explanation": "โครงสร้าง: ประธาน + กริยา + กรรม",
  "points": 15
}`,

        compose: `สร้างโจทย์แต่งประโยค ${count} ข้อ

กฎสำคัญ:
- ให้คำศัพท์ 2-3 คำที่ต้องใช้
- ผู้เล่นต้องแต่งประโยคเอง (ไม่มี options)
- correctAnswer เป็น string ตัวอย่างประโยคที่ถูกต้อง

ตัวอย่าง:
{
  "question": "แต่งประโยคโดยใช้คำว่า 'แมว' และ 'นอน'",
  "correctAnswer": "แมวกำลังนอนบนเตียง",
  "explanation": "ตัวอย่างประโยคที่ใช้ทั้ง 2 คำถูกต้อง",
  "points": 20
}`,

        // ===== NEW VOCAB GAMES =====
        vocabmatch: `สร้างคำถามจับคู่คำศัพท์ ${count} ข้อ (Matching)

กฎสำคัญ:
- ให้คำศัพท์ไทย และให้เลือกความหมายที่ถูกต้อง
- 4 ตัวเลือกต้องเป็นความหมายที่แตกต่างกัน
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "คำว่า 'ร้อน' หมายถึงอะไร?",
  "options": ["อุณหภูมิสูง", "อุณหภูมิต่ำ", "ชื้น", "แห้ง"],
  "correctAnswer": 0,
  "explanation": "ร้อน หมายถึง อุณหภูมิสูง",
  "points": 10
}`,

        vocabopposite: `สร้างคำถามคำตรงข้าม ${count} ข้อ

กฎสำคัญ:
- ให้คำศัพท์ 1 คำ และให้เลือกคำตรงข้าม
- 4 ตัวเลือกต้องแตกต่างกัน
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "คำตรงข้ามของ 'ร้อน' คืออะไร?",
  "options": ["เย็น", "อุ่น", "ชื้น", "แห้ง"],
  "correctAnswer": 0,
  "explanation": "ร้อน ตรงข้ามกับ เย็น",
  "points": 15
}`,

        vocabsynonym: `สร้างคำถามคำพ้องความหมาย ${count} ข้อ

กฎสำคัญ:
- ให้คำศัพท์ 1 คำ และให้เลือกคำที่มีความหมายใกล้เคียง
- 4 ตัวเลือกต้องแตกต่างกัน
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "คำใดมีความหมายเหมือน 'สวย'?",
  "options": ["งาม", "น่าเกลียด", "ดี", "เก่ง"],
  "correctAnswer": 0,
  "explanation": "สวย และ งาม มีความหมายเหมือนกัน",
  "points": 20
}`,

        // ===== GRAMMAR GAMES =====
        fixsentence: `สร้างคำถามแก้ไขประโยค ${count} ข้อ

กฎสำคัญ:
- ให้ประโยคที่ผิดไวยากรณ์
- 4 ตัวเลือกเป็นประโยคที่แก้แล้ว (1 ถูก 3 ผิด)
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "แก้ไขประโยคนี้: ฉันไปโรงเรียนเมื่อวานนี้",
  "options": ["ฉันไปโรงเรียนเมื่อวาน", "ฉันไปโรงเรียนวันนี้", "ฉันไปโรงเรียนพรุ่งนี้", "ฉันไม่ไปโรงเรียน"],
  "correctAnswer": 0,
  "explanation": "ใช้ 'เมื่อวาน' ไม่ต้องมี 'นี้'",
  "points": 15
}`,

        speedgrammar: `สร้างคำถามไวยากรณ์เร็ว ${count} ข้อ (Speed Grammar)

กฎสำคัญ:
- คำถามสั้นๆ ตรงประเด็น
- ตอบได้รวดเร็ว
- 4 ตัวเลือก
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "กริยาใดถูกต้อง: ฉัน ___ ข้าว",
  "options": ["กิน", "กินแล้ว", "จะกิน", "กำลังกิน"],
  "correctAnswer": 0,
  "explanation": "ใช้ 'กิน' (ปัจจุบัน)",
  "points": 10
}`,

        // ===== READING & WRITING =====
        readanswer: `สร้างบทอ่านสั้นพร้อมคำถาม ${count} ข้อ

กฎสำคัญ:
- บทอ่าน 2-3 ประโยค
- คำถามเกี่ยวกับเนื้อหา
- 4 ตัวเลือก
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "อ่านแล้วตอบ: 'วันนี้อากาศดี ฉันไปเดินเล่นที่สวน' - ฉันทำอะไร?",
  "options": ["เดินเล่น", "วิ่ง", "นอน", "กิน"],
  "correctAnswer": 0,
  "explanation": "ตามบทอ่าน ฉันไปเดินเล่น",
  "points": 15
}`,

        summarize: `สร้างโจทย์สรุปเรื่อง ${count} ข้อ

กฎสำคัญ:
- ให้บทอ่านสั้น 3-4 ประโยค
- ผู้เล่นสรุปเป็นประโยคเดียว (free-form)
- correctAnswer เป็น string ตัวอย่างคำสรุป
- ไม่มี options

ตัวอย่าง:
{
  "question": "สรุปเรื่อง: 'วันนี้อากาศดี ฉันไปตลาด ซื้อผักและผลไม้ แล้วกลับบ้าน'",
  "correctAnswer": "ฉันไปตลาดซื้อของแล้วกลับบ้าน",
  "explanation": "สรุปกิจกรรมหลัก",
  "points": 20
}`,

        continuestory: `สร้างโจทย์เขียนต่อเรื่อง ${count} ข้อ

กฎสำคัญ:
- ให้ประโยคเริ่มต้น
- ผู้เล่นเขียนต่อ (free-form)
- correctAnswer เป็น string ตัวอย่าง
- ไม่มี options

ตัวอย่าง:
{
  "question": "เขียนต่อ: 'วันหนึ่งฉันเห็นแมวน้อยตัวหนึ่ง...'",
  "correctAnswer": "มันหิวข้าว ฉันเลยให้อาหารมัน",
  "explanation": "ตัวอย่างการเขียนต่อที่สมเหตุสมผล",
  "points": 25
}`,

        // ===== FUN GAMES =====
        dailyvocab: `สร้างคำศัพท์รายวัน ${count} ข้อ (Daily Vocab)

กฎสำคัญ:
- คำศัพท์ที่ใช้บ่อยในชีวิตประจำวัน
- 4 ตัวเลือก
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "อาหารเช้าภาษาอังกฤษคืออะไร?",
  "options": ["breakfast", "lunch", "dinner", "snack"],
  "correctAnswer": 0,
  "explanation": "breakfast = อาหารเช้า",
  "points": 5
}`,

        raceclock: `สร้างคำถามแข่งกับเวลา ${count} ข้อ (Race the Clock)

กฎสำคัญ:
- คำถามสั้น ตอบเร็ว
- 4 ตัวเลือก
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "1+1=?",
  "options": ["2", "3", "4", "5"],
  "correctAnswer": 0,
  "explanation": "1+1=2",
  "points": 5
}`,

        vocabgacha: `สร้างคำศัพท์สุ่ม ${count} ข้อ (Gacha Vocab)

กฎสำคัญ:
- คำศัพท์แปลก/น่ารู้
- 4 ตัวเลือก
- correctAnswer เป็นตัวเลข 0-3

ตัวอย่าง:
{
  "question": "คำว่า 'ระเบิด' แปลว่าอะไร?",
  "options": ["ระเบิด", "ดัง", "ไฟ", "เสียง"],
  "correctAnswer": 0,
  "explanation": "ระเบิด = explode",
  "points": 3
}`
    }

    const prompt = `คุณเป็นผู้สร้างคำถามภาษาไทยสำหรับผู้เรียนต่างชาติ

ข้อมูลผู้เรียน:
- ระดับภาษาไทย: ${request.thaiLevel}
- ความยาก: ${difficultyDesc}

งาน: ${gamePrompts[request.gameType]}

⚠️ สำคัญมาก:
1. ตัวเลือกทั้ง 4 ต้องแตกต่างกันทั้งหมด (ห้ามซ้ำโดยเด็ดขาด!)
2. ตรวจสอบให้แน่ใจว่าไม่มีตัวเลือกซ้ำกัน
3. correctAnswer สำหรับ Multiple Choice = ตัวเลข 0-3 (index)
4. correctAnswer สำหรับ Free Form = string
5. ตอบเป็น JSON array เท่านั้น ไม่ต้องอธิบายเพิ่ม

❌ ตัวอย่างที่ผิด (ห้ามทำ):
{
  "options": ["กิน", "กิน", "กิน", "กิน"] // ❌ ซ้ำกัน!
}

✅ ตัวอย่างที่ถูก:
{
  "options": ["กิน", "ดื่ม", "นอน", "เดิน"] // ✅ แตกต่างกันหมด
}

Format:
[
  {
    "question": "<คำถาม>",
    "options": ["<ตัวเลือก1>", "<ตัวเลือก2>", "<ตัวเลือก3>", "<ตัวเลือก4>"],
    "correctAnswer": <0-3 หรือ string>,
    "explanation": "<คำอธิบาย>",
    "points": <5-20>
  }
]`

    try {
        let validQuestions: Question[] = []
        let attempts = 0
        const maxAttempts = 3

        while (validQuestions.length < count && attempts < maxAttempts) {
            attempts++

            const response = await openrouter.chat.completions.create({
                model: MODELS.CLAUDE_OPUS, // Use better model for quality
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 3000,
            })

            const content = response.choices[0]?.message?.content || '[]'
            const jsonMatch = content.match(/\[[\s\S]*\]/)

            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]) as Question[]

                // Validate questions
                const newValidQuestions = questions.filter(q => {
                    // Check for duplicate options
                    if (q.options && Array.isArray(q.options)) {
                        const uniqueOptions = new Set(q.options)
                        if (uniqueOptions.size !== q.options.length) {
                            console.warn(`[Attempt ${attempts}] Duplicate options detected, skipping:`, q.question, q.options)
                            return false
                        }
                    }
                    return true
                })

                validQuestions = [...validQuestions, ...newValidQuestions]

                // If we have enough valid questions, break
                if (validQuestions.length >= count) {
                    break
                }

                console.log(`[Attempt ${attempts}] Got ${newValidQuestions.length} valid questions, need ${count - validQuestions.length} more`)
            }
        }

        // If we don't have enough questions, use fallback
        if (validQuestions.length < count) {
            console.warn(`[generateQuestions] Only got ${validQuestions.length}/${count} questions, using fallback`)
            const { getFallbackQuestions } = await import('@/lib/games/fallback-questions')
            const fallbackQuestions = getFallbackQuestions(request.gameType, count - validQuestions.length)
            validQuestions = [...validQuestions, ...fallbackQuestions]
        }

        // Return only what we need
        return validQuestions.slice(0, count)
    } catch (error) {
        console.error('AI Question generation error:', error)
        // Return fallback questions on error
        const { getFallbackQuestions } = await import('@/lib/games/fallback-questions')
        return getFallbackQuestions(request.gameType, count)
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
    const prompt = `คุณคือ "น้องไทย" (Nong Thai) AI Companion ผู้ช่วยฝึกภาษาไทย
บุคลิก: เป็นมิตร ช่วยเหลือ ให้กำลังใจ พูดจาตรงประเด็น
เป้าหมาย: ช่วยเหลือผู้เรียน ตอบคำถาม ให้คำแนะนำ และชวนให้ฝึกฝนภาษาไทย

ข้อมูลผู้เรียน:
- ชื่อ: ${request.userContext?.name || 'ไม่ทราบชื่อ'}
- ระดับ: ${request.userContext?.level || 'ไม่ระบุ'}
- Streak: ${request.userContext?.streak || 0} วัน
- ภาษาที่ถนัด: ${request.userContext?.preferredLanguage || 'TH'}

ข้อความจากผู้เรียน: "${request.message}"

คำแนะนำการตอบ:
- ตอบเป็นภาษาไทย (หรือปนอังกฤษถ้าผู้เรียนถนัดอังกฤษ)
- สั้นๆ กระชับ (1-2 ประโยค)
- มีประโยชน์ ตรงประเด็น ไม่หยอกล้อ
- ถ้าไม่เข้าใจคำถาม แนะนำให้กดเมนูด้านล่าง
- ใส่อีโมจิเล็กน้อย (1-2 ตัว)

ตอบข้อความเท่านั้น:`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, // Moderate creativity
            max_tokens: 300,
        })

        return response.choices[0]?.message?.content || 'วันนี้น้องไทยสมองแล่นช้าจัง... ถามใหม่อีกทีได้ไหมครับ? 😅'
    } catch (error) {
        console.error('AI Chitchat error:', error)
        return 'วันนี้น้องไทยมึนๆ นิดหน่อย... คุยเรื่องอื่นกันดีกว่าครับ 😵‍💫'
    }
}

// ==================== ADAPTIVE LANGUAGE (ภาษาตามเลเวล) ====================

interface AdaptiveMessageRequest {
    message: string // The message to adapt
    userLevel: number // 1-10
    preferredLanguage: string // 'TH', 'CN', 'EN'
    messageType: 'game_correct' | 'game_wrong' | 'encouragement' | 'instruction' | 'general'
}

export async function generateAdaptiveMessage(request: AdaptiveMessageRequest): Promise<string> {
    // Calculate language mix based on level
    // Level 1-2: 100% native, Level 9-10: 100% Thai
    const thaiPercent = Math.min(100, Math.max(0, (request.userLevel - 1) * 12.5))
    const nativePercent = 100 - thaiPercent

    const languageMap: Record<string, string> = {
        'CN': 'Chinese (中文)',
        'EN': 'English',
        'TH': 'Thai (ภาษาไทย)'
    }

    const prompt = `คุณคือ "น้องไทย" AI ช่วยฝึกภาษาไทย
    
งาน: แปลง/ปรับข้อความต่อไปนี้ให้ผสมภาษาตามสัดส่วนที่กำหนด

ข้อความต้นฉบับ: "${request.message}"
ภาษาแม่ของผู้เรียน: ${languageMap[request.preferredLanguage]}
เลเวลผู้เรียน: ${request.userLevel}/10

สัดส่วนภาษา:
- ภาษาไทย: ${thaiPercent}%
- ${languageMap[request.preferredLanguage]}: ${nativePercent}%

กฎสำคัญ:
1. ไวยากรณ์ต้องถูกต้องทั้งสองภาษา (Make Sense)
2. ผสมอย่างเป็นธรรมชาติ ไม่ใช่แปะคำมั่ว
3. ถ้า Level ต่ำ ใช้ภาษาแม่เป็นหลัก เสริมคำไทยง่ายๆ
4. ถ้า Level สูง ใช้ภาษาไทยเป็นหลัก เสริมคำภาษาแม่เพื่อเน้น
5. อารมณ์เหมือนเพื่อนคุยกัน ไม่ใช่ครูสอน

ตัวอย่าง (ถ้าภาษาแม่คือจีน):
- Level 1: "哇！答对了！你真 เก่ง！"
- Level 5: "ว้าว！ตอบถูกแล้ว！เก่งมาก 👍"
- Level 10: "ว้าว! ตอบถูกแล้ว! เก่งมากๆ เลยนะ!"

ตอบข้อความที่ปรับแล้วเท่านั้น (ไม่ต้องอธิบาย):`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 200,
        })

        let adaptedMessage = response.choices[0]?.message?.content || request.message

        // Filter out debug/explanation lines
        const lines = adaptedMessage.split('\n')
        const filtered = lines.filter(line => {
            const lower = line.toLowerCase()
            return !lower.includes('เนื่องจาก') &&
                !lower.includes('ระดับผู้เรียน') &&
                !lower.includes('สัดส่วน') &&
                !lower.includes('%')
        })

        adaptedMessage = filtered.join('\n').trim() || request.message

        // Profanity filter
        const profanityWords = ['เย็ด', 'ควย', 'หี', 'สัส']
        profanityWords.forEach(word => {
            const regex = new RegExp(word, 'gi')
            if (word === 'เย็ด') {
                adaptedMessage = adaptedMessage.replace(regex, 'เยี่ยม')
            } else {
                adaptedMessage = adaptedMessage.replace(regex, '***')
            }
        })

        return adaptedMessage
    } catch (error) {
        console.error('Adaptive Message error:', error)
        return request.message // Fallback to original
    }
}

// ==================== INTENT CLASSIFICATION ====================

export type IntentType = 'command' | 'question' | 'answer' | 'unknown'

interface IntentResult {
    intent: IntentType
    command?: 'exit' | 'hint' | 'menu' | 'help' | 'skip' | null
    confidence: number
}

export async function classifyIntent(text: string, isInGame: boolean): Promise<IntentResult> {
    // First: Quick keyword matching for common commands (no AI needed)
    const lowerText = text.toLowerCase().trim()

    // Exit commands
    const exitKeywords = ['ออก', 'ออกจากเกม', 'เลิกเล่น', 'หยุด', 'พอแค่นี้', 'เมนู', 'menu', 'exit', 'quit', 'stop', 'main menu', 'กลับ', 'ยกเลิก']
    if (exitKeywords.includes(lowerText)) {
        return { intent: 'command', command: 'exit', confidence: 1.0 }
    }

    // Hint commands
    const hintKeywords = ['hint', 'ใบ้', 'คำใบ้', 'ช่วย', 'ช่วยด้วย', 'ไม่รู้', 'บอกใบ้', 'clue']
    if (hintKeywords.includes(lowerText)) {
        return { intent: 'command', command: 'hint', confidence: 1.0 }
    }

    // Help/Question patterns
    const questionPatterns = ['ทำไม', 'อธิบาย', 'หมายความว่า', 'แปลว่า', 'คืออะไร', 'why', 'explain', 'what does', 'how']
    if (questionPatterns.some(p => lowerText.includes(p))) {
        return { intent: 'question', command: null, confidence: 0.9 }
    }

    // Skip command
    if (['ข้าม', 'skip', 'next', 'ต่อไป'].includes(lowerText)) {
        return { intent: 'command', command: 'skip', confidence: 1.0 }
    }

    // If short and in game, likely an answer
    if (isInGame && text.length <= 50) {
        return { intent: 'answer', command: null, confidence: 0.8 }
    }

    // Default: treat as answer in game, unknown otherwise
    return {
        intent: isInGame ? 'answer' : 'unknown',
        command: null,
        confidence: 0.5
    }
}

// ==================== HINT GENERATION ====================

interface HintRequest {
    question: string
    correctAnswer: string
    hintLevel: 1 | 2 | 3 // 1 = subtle, 2 = moderate, 3 = obvious
    gameType: string
}

export async function generateHint(request: HintRequest): Promise<string> {
    const hintStyles: Record<number, string> = {
        1: 'แบบแนะเบาๆ (เช่น หมวดหมู่ของคำ, จำนวนพยางค์)',
        2: 'แบบปานกลาง (เช่น ตัวอักษรแรก, ความหมายคร่าวๆ)',
        3: 'แบบชัดเจน (เช่น เกือบบอกคำตอบ แต่ให้คิดนิดหน่อย)'
    }

    const prompt = `คุณคือ "น้องไทย" AI ช่วยฝึกภาษาไทย

โจทย์: "${request.question}"
คำตอบที่ถูกต้อง: "${request.correctAnswer}"
ประเภทเกม: ${request.gameType}
ระดับคำใบ้: ${hintStyles[request.hintLevel]}

สร้างคำใบ้ที่:
1. ไม่บอกคำตอบตรงๆ
2. ช่วยให้ผู้เรียนคิดได้
3. สั้นๆ กระชับ (1-2 ประโยค)
4. ใส่อารมณ์เป็นกันเอง

ตอบคำใบ้เท่านั้น:`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 100,
        })

        return response.choices[0]?.message?.content || 'ลองคิดอีกนิดนะ! 🤔'
    } catch (error) {
        console.error('Hint generation error:', error)
        return 'ลองคิดอีกนิดนะ! 💭'
    }
}

// ==================== EXPLAIN ANSWER ====================

export async function explainAnswer(question: string, correctAnswer: string, userAnswer: string): Promise<string> {
    const prompt = `คุณคือ "น้องไทย" AI ช่วยฝึกภาษาไทย

โจทย์: "${question}"
คำตอบที่ถูกต้อง: "${correctAnswer}"
คำตอบของผู้เรียน: "${userAnswer}"

อธิบายสั้นๆ ว่า:
1. ทำไมคำตอบที่ถูกจึงถูก
2. ถ้าผู้เรียนตอบผิด อธิบายว่าผิดตรงไหน
3. ให้ตัวอย่างการใช้คำที่ถูกต้องในประโยค

อารมณ์: เป็นกันเอง ให้กำลังใจ ไม่ตำหนิ
ความยาว: ไม่เกิน 3-4 ประโยค

ตอบคำอธิบายเท่านั้น:`

    try {
        const response = await openrouter.chat.completions.create({
            model: MODELS.CLAUDE_HAIKU,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
            max_tokens: 200,
        })

        return response.choices[0]?.message?.content || 'คำตอบที่ถูกคือ: ' + correctAnswer
    } catch (error) {
        console.error('Explain answer error:', error)
        return `คำตอบที่ถูกคือ "${correctAnswer}" ครับ 📚`
    }
}

