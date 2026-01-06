import { prisma } from '../src/lib/prisma'

const BADGES = [
    {
        code: 'LEARNER',
        name: 'Eager Learner',
        nameThai: 'ผู้ใฝ่รู้',
        description: 'ขอ feedback 10 ครั้ง',
        iconUrl: '/badges/learner.svg',
        category: 'LEARNING' as const,
        criteria: { feedbackCount: 10 },
        bonusXP: 50,
    },
    {
        code: 'FAST_IMPROVER',
        name: 'Fast Improver',
        nameThai: 'พัฒนาเร็ว',
        description: 'คะแนนดีขึ้นต่อเนื่อง 3 ครั้ง',
        iconUrl: '/badges/improver.svg',
        category: 'LEARNING' as const,
        criteria: { consecutiveImprovement: 3 },
        bonusXP: 75,
    },
    {
        code: 'ON_TIME',
        name: 'Punctual Pro',
        nameThai: 'ตรงเวลา',
        description: 'ส่งงานตรงเวลา 5 ครั้ง',
        iconUrl: '/badges/ontime.svg',
        category: 'ENGAGEMENT' as const,
        criteria: { onTimeSubmissions: 5 },
        bonusXP: 60,
    },
    {
        code: 'FIRE_STREAK',
        name: 'Fire Streak',
        nameThai: 'ไฟแรง',
        description: 'Streak 7 วันติดต่อกัน',
        iconUrl: '/badges/fire.svg',
        category: 'STREAK' as const,
        criteria: { streakDays: 7 },
        bonusXP: 100,
    },
    {
        code: 'CHATTERBOX',
        name: 'Chatterbox',
        nameThai: 'นักพูด',
        description: 'ส่งข้อความ 50 ครั้ง',
        iconUrl: '/badges/chat.svg',
        category: 'ENGAGEMENT' as const,
        criteria: { messageCount: 50 },
        bonusXP: 40,
    },
    {
        code: 'PRACTITIONER',
        name: 'Practitioner',
        nameThai: 'นักฝึกฝน',
        description: 'เล่นเกมฝึกหัด 20 ครั้ง',
        iconUrl: '/badges/practice.svg',
        category: 'LEARNING' as const,
        criteria: { practiceCount: 20 },
        bonusXP: 80,
    },
    {
        code: 'COMPLETER',
        name: 'Completer',
        nameThai: 'นักทำงานจบ',
        description: 'ส่งงานครบทุกสัปดาห์ 4 สัปดาห์',
        iconUrl: '/badges/complete.svg',
        category: 'ENGAGEMENT' as const,
        criteria: { weeklySubmissions: 4 },
        bonusXP: 120,
    },
    {
        code: 'VOCAB_MASTER',
        name: 'Vocabulary Master',
        nameThai: 'ผู้พิชิตคำศัพท์',
        description: 'สะสมคำศัพท์ 100 คำ',
        iconUrl: '/badges/vocab.svg',
        category: 'LEARNING' as const,
        criteria: { vocabularyCount: 100 },
        bonusXP: 100,
    },
    {
        code: 'GRADUATE',
        name: 'Graduate',
        nameThai: 'บัณฑิต',
        description: 'ถึง Level 5',
        iconUrl: '/badges/graduate.svg',
        category: 'SPECIAL' as const,
        criteria: { levelReached: 5 },
        bonusXP: 150,
    },
    {
        code: 'EXPERT',
        name: 'Expert',
        nameThai: 'ผู้เชี่ยวชาญ',
        description: 'คะแนนเต็ม 100 ได้ 3 ครั้ง',
        iconUrl: '/badges/expert.svg',
        category: 'SPECIAL' as const,
        criteria: { perfectScores: 3 },
        bonusXP: 200,
    },
]

async function seed() {
    console.log('🌱 Starting seed...')

    // Clear existing badges
    await prisma.badge.deleteMany()

    // Create badges
    for (const badge of BADGES) {
        await prisma.badge.create({ data: badge })
    }

    console.log(`✅ Created ${BADGES.length} badges`)
    console.log('🎉 Seed completed!')
}

seed()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
