import { Question } from '@/lib/ai/claude'

// Fallback questions when AI generation fails
export const FALLBACK_QUESTIONS: Record<string, Question[]> = {
    vocab: [
        {
            question: "'Hello' ภาษาไทยว่าอะไร?",
            options: ["ขอบคุณ", "สวัสดี", "ลาก่อน", "ขอโทษ"],
            correctAnswer: 1,
            explanation: "Hello ภาษาไทยคือ สวัสดี",
            points: 10
        },
        {
            question: "'Thank you' ภาษาไทยว่าอะไร?",
            options: ["ครับ/ค่ะ", "ขอโทษ", "ขอบคุณ", "สวัสดี"],
            correctAnswer: 2,
            explanation: "Thank you ภาษาไทยคือ ขอบคุณ",
            points: 10
        },
        {
            question: "'Water' ภาษาไทยว่าอะไร?",
            options: ["น้ำ", "ข้าว", "อาหาร", "ชา"],
            correctAnswer: 0,
            explanation: "Water ภาษาไทยคือ น้ำ",
            points: 10
        },
        {
            question: "'Rice' ภาษาไทยว่าอะไร?",
            options: ["ก๋วยเตี๋ยว", "ขนมปัง", "ซุป", "ข้าว"],
            correctAnswer: 3,
            explanation: "Rice ภาษาไทยคือ ข้าว",
            points: 10
        },
        {
            question: "'House/Home' ภาษาไทยว่าอะไร?",
            options: ["โรงเรียน", "บ้าน", "ร้าน", "สำนักงาน"],
            correctAnswer: 1,
            explanation: "House/Home ภาษาไทยคือ บ้าน",
            points: 10
        }
    ],

    fillblank: [
        {
            question: "ฉัน ___ ไปโรงเรียน",
            options: ["มา", "กลับ", "ไป", "อยู่"],
            correctAnswer: 2,
            explanation: "ใช้ 'ไป' เพราะหมายถึงเดินทางจากที่หนึ่งไปอีกที่",
            points: 10
        },
        {
            question: "วันนี้อากาศ ___ มาก",
            options: ["ดี", "เลว", "แย่", "ชื่น"],
            correctAnswer: 0,
            explanation: "อากาศดี หมายถึงอากาศสบาย",
            points: 10
        },
        {
            question: "ผม ___ กินข้าว",
            options: ["เกลียด", "รัก", "หวง", "ชอบ"],
            correctAnswer: 3,
            explanation: "ชอบ = like",
            points: 10
        },
        {
            question: "เขา ___ หนังสือทุกวัน",
            options: ["เขียน", "อ่าน", "พูด", "ฟัง"],
            correctAnswer: 1,
            explanation: "อ่านหนังสือ = read books",
            points: 10
        },
        {
            question: "แมว ___ นมตอนเช้า",
            options: ["กิน", "นอน", "ดื่ม", "วิ่ง"],
            correctAnswer: 2,
            explanation: "ดื่มนม = drink milk",
            points: 10
        }
    ],

    arrange: [
        {
            question: "เรียงคำให้เป็นประโยค: ฉัน / ชอบ / กิน / ข้าว",
            correctAnswer: "ฉันชอบกินข้าว",
            explanation: "โครงสร้าง: ประธาน + กริยา + กรรม",
            points: 15
        },
        {
            question: "เรียงคำให้เป็นประโยค: เขา / ไป / โรงเรียน",
            correctAnswer: "เขาไปโรงเรียน",
            explanation: "โครงสร้าง: ประธาน + กริยา + สถานที่",
            points: 15
        },
        {
            question: "เรียงคำให้เป็นประโยค: ฉัน / อ่าน / หนังสือ",
            correctAnswer: "ฉันอ่านหนังสือ",
            explanation: "โครงสร้าง: ประธาน + กริยา + กรรม",
            points: 15
        }
    ],

    compose: [
        {
            question: "แต่งประโยคโดยใช้คำว่า 'แมว' และ 'นอน'",
            correctAnswer: "แมวกำลังนอนบนเตียง",
            explanation: "ตัวอย่างประโยคที่ใช้คำทั้งสองได้ถูกต้อง",
            points: 20
        },
        {
            question: "แต่งประโยคโดยใช้คำว่า 'ฉัน' และ 'ดีใจ'",
            correctAnswer: "ฉันรู้สึกดีใจมาก",
            explanation: "ตัวอย่างประโยคแสดงความรู้สึก",
            points: 20
        }
    ]
}

export function getFallbackQuestions(gameType: string, count: number = 5): Question[] {
    const questions = FALLBACK_QUESTIONS[gameType] || FALLBACK_QUESTIONS.vocab
    return questions.slice(0, count)
}
