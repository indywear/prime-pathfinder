/**
 * Bot Character Configuration — "น้องไทย"
 * บุคลิกของ AI ครูสอนภาษาไทย
 * สนุก อบอุ่น ให้กำลังใจ เหมือนเพื่อนสอนภาษา
 */

export const BOT_NAME = "น้องไทย"

export const BOT_PERSONALITY = {
    name: BOT_NAME,
    role: "ผู้ช่วยเรียนภาษาไทย",
    traits: ["สนุกสนาน", "อบอุ่น", "ให้กำลังใจ", "อดทน"],
    tone: "ร่าเริง ใช้ emoji ไม่เป็นทางการเกินไป",
}

// ==================== GREETING BY TIME ====================

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return "morning"
    if (hour >= 12 && hour < 17) return "afternoon"
    if (hour >= 17 && hour < 21) return "evening"
    return "night"
}

const TIME_GREETINGS = {
    morning: [
        "สวัสดีตอนเช้า ☀️",
        "อรุณสวัสดิ์ 🌅",
        "เช้านี้สดใสจัง ☀️",
    ],
    afternoon: [
        "สวัสดีตอนบ่าย 🌤️",
        "บ่ายนี้สบายดีไหม 🌤️",
        "สวัสดีช่วงบ่าย ☁️",
    ],
    evening: [
        "สวัสดีตอนเย็น 🌇",
        "เย็นนี้มาเรียนกันเถอะ 🌆",
        "สวัสดีช่วงเย็น 🌇",
    ],
    night: [
        "สวัสดีตอนค่ำ 🌙",
        "ค่ำนี้มาฝึกภาษากันไหม 🌙",
        "สวัสดียามค่ำคืน ✨",
    ],
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get time-appropriate greeting
 */
export function getTimeGreeting(): string {
    const time = getTimeOfDay()
    return pickRandom(TIME_GREETINGS[time])
}

// ==================== WELCOME MESSAGE ====================

/**
 * Welcome message for new users (follow event)
 */
export function getNewUserWelcome(): string {
    return `${getTimeGreeting()}

🇹🇭 ยินดีต้อนรับสู่ ProficienThAI!

ฉันคือ "${BOT_NAME}" ผู้ช่วยเรียนภาษาไทยของคุณ 📚

ฉันจะช่วยคุณฝึกภาษาไทยผ่านเกมสนุกๆ ตั้งแต่:
🔤 คำศัพท์ — จับคู่คำ, คำตรงข้าม, คำพ้อง
📝 ไวยากรณ์ — เติมคำ, แก้ประโยค, เรียงประโยค
📖 การอ่าน-เขียน — อ่านแล้วตอบ, แต่งประโยค, เขียนต่อเรื่อง
🎮 เกมสนุก — คำศัพท์รายวัน, แข่งกับเวลา, กาชาคำศัพท์

เริ่มต้นด้วยการลงทะเบียนกันก่อนนะ!
พิมพ์ "ลงทะเบียน" เพื่อเริ่มต้น ✨`
}

/**
 * Welcome back message for returning users
 */
export function getReturningUserWelcome(thaiName: string, gender?: string | null): string {
    const particle = gender === "หญิง" ? "ค่ะ" : "ครับ"
    return `${getTimeGreeting()}

ยินดีต้อนรับกลับ${particle} คุณ${thaiName}! 🎉

พร้อมฝึกภาษาไทยกันต่อไหม${particle}?

พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด
หรือพิมพ์ "ฝึกฝน" เพื่อเริ่มเล่นเกมเลย 🎮`
}

// ==================== ENCOURAGEMENT MESSAGES ====================

const ENCOURAGEMENT = [
    "สู้ๆ นะ ฝึกทุกวันจะเก่งขึ้นแน่ๆ! 💪",
    "เก่งมากเลย ฝึกต่อไป! 🌟",
    "ค่อยๆ เรียนไป ไม่ต้องรีบ 😊",
    "ทุกคนเริ่มต้นจากจุดนี้ สู้ๆ! ✨",
    "ภาษาไทยสนุกใช่ไหม เรียนต่อเลย! 🎯",
]

/**
 * Get random encouragement message
 */
export function getEncouragement(): string {
    return pickRandom(ENCOURAGEMENT)
}

// ==================== LEVEL UP MESSAGES ====================

const LEVEL_UP_MESSAGES = [
    "ว้าว! เลเวลอัปแล้ว! 🎉",
    "ยอดเยี่ยม! ขึ้นเลเวลใหม่! 🌟",
    "เก่งมาก! เลเวลอัป! 🚀",
    "สุดยอด! เลเวลสูงขึ้นแล้ว! ⭐",
]

export function getLevelUpMessage(): string {
    return pickRandom(LEVEL_UP_MESSAGES)
}
