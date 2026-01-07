import { Question } from '@/lib/ai/claude'

// Fallback questions when AI generation fails
export const FALLBACK_QUESTIONS: Record<string, Question[]> = {
    vocab: [
        {
            question: "คำว่า 'สวัสดี' แปลว่าอะไร?",
            options: ["Hello", "Goodbye", "Thank you", "Sorry"],
            correctAnswer: 0,
            explanation: "สวัสดี แปลว่า Hello ใช้ทักทายกัน",
            points: 10
        },
        {
            question: "คำว่า 'ขอบคุณ' แปลว่าอะไร?",
            options: ["Thank you", "Please", "Sorry", "Excuse me"],
            correctAnswer: 0,
            explanation: "ขอบคุณ แปลว่า Thank you",
            points: 10
        },
        {
            question: "คำว่า 'น้ำ' แปลว่าอะไร?",
            options: ["Water", "Food", "Rice", "Tea"],
            correctAnswer: 0,
            explanation: "น้ำ แปลว่า Water",
            points: 10
        },
        {
            question: "คำว่า 'ข้าว' แปลว่าอะไร?",
            options: ["Rice", "Noodle", "Bread", "Soup"],
            correctAnswer: 0,
            explanation: "ข้าว แปลว่า Rice",
            points: 10
        },
        {
            question: "คำว่า 'บ้าน' แปลว่าอะไร?",
            options: ["House", "School", "Shop", "Office"],
            correctAnswer: 0,
            explanation: "บ้าน แปลว่า House/Home",
            points: 10
        }
    ],

    fillblank: [
        {
            question: "ฉัน ___ ไปโรงเรียน",
            options: ["ไป", "มา", "กลับ", "อยู่"],
            correctAnswer: 0,
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
            options: ["ชอบ", "เกลียด", "รัก", "หวง"],
            correctAnswer: 0,
            explanation: "ชอบ = like",
            points: 10
        },
        {
            question: "เขา ___ หนังสือทุกวัน",
            options: ["อ่าน", "เขียน", "พูด", "ฟัง"],
            correctAnswer: 0,
            explanation: "อ่านหนังสือ = read books",
            points: 10
        },
        {
            question: "แมว ___ นมตอนเช้า",
            options: ["ดื่ม", "กิน", "นอน", "วิ่ง"],
            correctAnswer: 0,
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
