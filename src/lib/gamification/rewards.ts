import { prisma } from '@/lib/prisma'
import { addPoints, checkAndAwardBadge } from '@/lib/gamification'

// ==================== EASTER EGGS ====================

interface EasterEgg {
    id: string
    trigger: string
    title: string
    message: string
    reward: { type: 'BADGE' | 'XP' | 'SPECIAL'; value: string | number }
}

const EASTER_EGGS: EasterEgg[] = [
    {
        id: 'ANSWER_100',
        trigger: 'answer100Questions',
        title: 'ผู้ไม่หยุดพัฒนา',
        message: 'ว้าว! ตอบครบ 100 ข้อแล้ว! นี่คือรางวัลลับ 🎁',
        reward: { type: 'XP', value: 200 },
    },
    {
        id: 'NIGHT_OWL',
        trigger: 'loginAt3AM',
        title: 'นกฮูกนักเรียน',
        message: 'เรียนดึกจัง! รักษาสุขภาพด้วยนะ 🦉',
        reward: { type: 'XP', value: 50 },
    },
    {
        id: 'PERFECT_WEEK',
        trigger: 'perfectWeek',
        title: 'Double XP Weekend',
        message: 'เก่งมาก! สัปดาห์หน้า XP x2! 🚀',
        reward: { type: 'SPECIAL', value: 'DOUBLE_XP' },
    },
    {
        id: 'HELPER',
        trigger: 'helpFriend5Times',
        title: 'เพื่อนแท้',
        message: 'คุณช่วยเพื่อน 5 ครั้งแล้ว! ใจดีมาก 💕',
        reward: { type: 'XP', value: 100 },
    },
    {
        id: 'SPEED_DEMON',
        trigger: 'answer10In2Min',
        title: 'Speed Demon',
        message: 'เร็วมาก! ตอบ 10 ข้อใน 2 นาที! ⚡',
        reward: { type: 'XP', value: 75 },
    },
    {
        id: 'FIRST_PERFECT',
        trigger: 'firstPerfectScore',
        title: 'First Blood',
        message: 'คะแนนเต็มครั้งแรก! 🎯',
        reward: { type: 'XP', value: 50 },
    },
]

export async function checkEasterEgg(
    userId: string,
    trigger: string
): Promise<{ triggered: boolean; egg?: EasterEgg }> {
    const egg = EASTER_EGGS.find((e) => e.trigger === trigger)
    if (!egg) return { triggered: false }

    // Check if already triggered
    const existing = await prisma.easterEggTrigger.findFirst({
        where: { userId, eggId: egg.id },
    })

    if (existing) return { triggered: false }

    // Record trigger
    await prisma.easterEggTrigger.create({
        data: { userId, eggId: egg.id },
    })

    // Award reward
    if (egg.reward.type === 'XP') {
        await addPoints(
            userId,
            egg.reward.value as number,
            'EASTER_EGG',
            egg.id,
            egg.title
        )
    } else if (egg.reward.type === 'BADGE') {
        await checkAndAwardBadge(userId, egg.reward.value as string)
    }

    return { triggered: true, egg }
}

// ==================== MINI REWARDS ====================

const SPIN_WHEEL_PRIZES = [
    { id: 'XP_10', name: '10 XP', probability: 0.3, value: 10 },
    { id: 'XP_25', name: '25 XP', probability: 0.25, value: 25 },
    { id: 'XP_50', name: '50 XP', probability: 0.15, value: 50 },
    { id: 'XP_100', name: '100 XP', probability: 0.05, value: 100 },
    { id: 'DOUBLE_XP', name: 'Double XP (1hr)', probability: 0.1, value: 0 },
    { id: 'MYSTERY', name: 'Mystery Box', probability: 0.1, value: 0 },
    { id: 'HINT', name: 'Hint Token', probability: 0.05, value: 0 },
]

const MYSTERY_BOX_CONTENTS = [
    { id: 'XP_75', name: '75 XP', probability: 0.4, value: 75 },
    { id: 'XP_150', name: '150 XP', probability: 0.2, value: 150 },
    { id: 'SKIP_TOKEN', name: 'Skip Token', probability: 0.2, value: 0 },
    { id: 'XP_BOOST', name: 'XP Boost 2hr', probability: 0.15, value: 0 },
    { id: 'RARE_BADGE', name: 'Rare Badge Chance', probability: 0.05, value: 0 },
]

function weightedRandom<T extends { probability: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.probability, 0)
    let random = Math.random() * totalWeight

    for (const item of items) {
        random -= item.probability
        if (random <= 0) return item
    }

    return items[items.length - 1]
}

export async function spinWheel(
    userId: string
): Promise<{ success: boolean; prize?: { name: string; xp: number }; message: string }> {
    // Check if already spun today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastSpin = await prisma.spinLog.findFirst({
        where: {
            userId,
            createdAt: { gte: today },
        },
    })

    if (lastSpin) {
        return { success: false, message: 'คุณหมุนแล้ววันนี้! มาใหม่พรุ่งนี้นะ 🎰' }
    }

    // Spin!
    const prize = weightedRandom(SPIN_WHEEL_PRIZES)

    // Log spin
    await prisma.spinLog.create({
        data: {
            userId,
            prizeId: prize.id,
            prizeName: prize.name,
        },
    })

    // Award XP if applicable
    if (prize.value > 0) {
        await addPoints(userId, prize.value, 'SPIN_WHEEL', prize.id, `Spin Wheel: ${prize.name}`)
    }

    return {
        success: true,
        prize: { name: prize.name, xp: prize.value },
        message: `🎰 ได้รับ ${prize.name}! ${prize.value > 0 ? `+${prize.value} XP` : ''}`,
    }
}

export async function openMysteryBox(
    userId: string
): Promise<{ success: boolean; content?: { name: string; xp: number }; message: string }> {
    // Check if user has mystery box
    const hasBox = await prisma.spinLog.findFirst({
        where: {
            userId,
            prizeId: 'MYSTERY',
            used: false,
        },
    })

    if (!hasBox) {
        return { success: false, message: 'คุณไม่มี Mystery Box!' }
    }

    // Mark as used
    await prisma.spinLog.update({
        where: { id: hasBox.id },
        data: { used: true },
    })

    // Open box
    const content = weightedRandom(MYSTERY_BOX_CONTENTS)

    if (content.value > 0) {
        await addPoints(userId, content.value, 'MYSTERY_BOX', content.id, `Mystery Box: ${content.name}`)
    }

    return {
        success: true,
        content: { name: content.name, xp: content.value },
        message: `📦 เปิด Mystery Box ได้: ${content.name}! ${content.value > 0 ? `+${content.value} XP` : ''}`,
    }
}

// ==================== AI COMPANION ====================

const AI_COMPANION = {
    name: 'น้องไทย',
    greetings: {
        morning: [
            'สวัสดีตอนเช้า {name}! พร้อมเรียนรู้วันนี้ไหม? ☀️',
            'อรุณสวัสดิ์ {name}! เริ่มต้นวันใหม่ด้วยการเรียนกัน! 🌅',
        ],
        afternoon: [
            'สวัสดีตอนบ่าย! พักเที่ยงแล้วมาเรียนต่อเลย 🌤️',
            'หวัดดี {name}! บ่ายนี้ลองทำแบบฝึกหัดกันไหม? 📚',
        ],
        evening: [
            'สวัสดีตอนเย็น! มาทบทวนก่อนนอนกันนะ 🌙',
            'ตอนเย็นแล้ว {name}! วันนี้เรียนรู้อะไรบ้าง? 🌆',
        ],
        night: [
            'ดึกแล้วนะ แต่ถ้าอยากเรียน น้องไทยพร้อมช่วย! 🌟',
            'ตั้งใจเรียนจัง! พักผ่อนบ้างนะ {name} 😴',
        ],
    },
    encouragement: {
        struggling: [
            'ไม่เป็นไรนะ ผิดพลาดคือครู ลองใหม่อีกครั้ง! 💪',
            'ค่อยๆ ทำนะ ไม่ต้องรีบ! เดี๋ยวก็เก่งขึ้น 🌱',
        ],
        improving: [
            'ว้าว! เก่งขึ้นมากเลย! ไปต่อเลย! 🎉',
            'เห็นความก้าวหน้าชัดเลย! สุดยอด {name}! 📈',
        ],
        excellent: [
            'สุดยอดไปเลย! คุณเก่งมากจริงๆ! 🏆',
            'Perfect! น้องไทยภูมิใจใน {name} มาก! 🌟',
        ],
    },
}

export function getCompanionGreeting(name: string): string {
    const hour = new Date().getHours()
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'

    if (hour >= 5 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening'
    else timeOfDay = 'night'

    const greetings = AI_COMPANION.greetings[timeOfDay]
    const greeting = greetings[Math.floor(Math.random() * greetings.length)]

    return greeting.replace('{name}', name)
}

export function getCompanionEncouragement(
    performance: 'struggling' | 'improving' | 'excellent',
    name: string
): string {
    const messages = AI_COMPANION.encouragement[performance]
    const message = messages[Math.floor(Math.random() * messages.length)]
    return message.replace('{name}', name)
}
