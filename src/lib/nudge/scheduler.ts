import prisma from '@/lib/db/prisma'
import { pushMessage, createTextMessage } from '@/lib/line/client'

async function pushText(userId: string, text: string) {
    await pushMessage(userId, [createTextMessage(text)])
}

const NUDGE_MESSAGES = {
    INACTIVE: {
        chinese: [
            '嘿 {name}！泰语课程想念你了 📚 回来学习吧！',
            '大帅哥/大美女 {name}，不回来继续学习吗？😊',
            '加油！你的进度快要掉了哦 💪',
        ],
        thai: [
            'เฮ้ {name}! บทเรียนภาษาไทยคิดถึงนะ 📚',
            'สุดหล่อ {name} ไม่กลับมาเรียนต่อหรอ? 😊',
            'สู้ๆ นะ! กลับมาฝึกฝนกันเถอะ 💪',
        ],
        english: [
            'Hey {name}! Your Thai lessons miss you 📚',
            'Champion {name}, not coming back to study? 😊',
        ],
    },
    DEADLINE: {
        thai: [
            '⏰ เตือนนะ! งานสัปดาห์นี้ต้องส่งภายใน {hours} ชั่วโมง',
            '🚨 ใกล้ deadline แล้ว! อย่าลืมส่งงานนะ {name}',
        ],
    },
    STREAK: {
        thai: [
            '🔥 อย่าให้ streak หลุดนะ! เข้ามาทำกิจกรรมวันนี้เลย',
            '💥 กลับมาฝึกฝนกันเถอะ! รีบมาต่อเลย',
        ],
    },
}

function getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)]
}

function formatMessage(template: string, vars: Record<string, string>): string {
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, value)
    })
    return result
}

async function sendInactiveNudges() {
    const inactiveThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const inactiveUsers = await prisma.user.findMany({
        where: {
            updatedAt: {
                lt: inactiveThreshold,
            },
            isRegistered: true,
        },
        select: {
            id: true,
            lineUserId: true,
            thaiName: true,
            chineseName: true,
            nationality: true,
            currentLevel: true,
        },
    })

    let sentCount = 0

    for (const user of inactiveUsers) {
        try {
            const lang = user.nationality?.toLowerCase() === 'chinese' ? 'chinese' : 'thai'
            const messages = NUDGE_MESSAGES.INACTIVE[lang] || NUDGE_MESSAGES.INACTIVE.thai
            const message = formatMessage(getRandomMessage(messages), {
                name: user.thaiName || user.chineseName || 'คุณ',
            })

            await pushText(user.lineUserId, message)
            sentCount++
        } catch (error) {
            console.error('Failed to send nudge:', error)
        }
    }

    return sentCount
}

async function sendDeadlineReminders() {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const upcomingTasks = await prisma.task.findMany({
        where: {
            isActive: true,
            deadline: {
                gte: now,
                lte: in24Hours,
            },
        },
    })

    let sentCount = 0

    for (const task of upcomingTasks) {
        const usersWithoutSubmission = await prisma.user.findMany({
            where: {
                isRegistered: true,
                submissions: {
                    none: {
                        taskId: task.id,
                    },
                },
            },
            select: {
                id: true,
                lineUserId: true,
                thaiName: true,
            },
        })

        for (const user of usersWithoutSubmission) {
            const hoursLeft = Math.floor((task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
            const message = formatMessage(getRandomMessage(NUDGE_MESSAGES.DEADLINE.thai), {
                name: user.thaiName || 'คุณ',
                hours: String(hoursLeft),
            })

            try {
                await pushText(user.lineUserId, message)
                sentCount++
            } catch (error) {
                console.error('Failed to send deadline reminder:', error)
            }
        }
    }

    return sentCount
}

async function sendStreakReminders() {
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
        where: {
            isRegistered: true,
            totalPoints: { gte: 50 },
            updatedAt: {
                lt: twentyHoursAgo,
            },
        },
        select: {
            id: true,
            lineUserId: true,
            thaiName: true,
        },
    })

    let sentCount = 0

    for (const user of users) {
        const message = formatMessage(getRandomMessage(NUDGE_MESSAGES.STREAK.thai), {
            name: user.thaiName || 'คุณ',
            days: '7',
        })

        try {
            await pushText(user.lineUserId, message)
            sentCount++
        } catch (error) {
            console.error('Failed to send streak reminder:', error)
        }
    }

    return sentCount
}

export async function sendNudges() {
    const [inactiveCount, deadlineCount, streakCount] = await Promise.all([
        sendInactiveNudges(),
        sendDeadlineReminders(),
        sendStreakReminders(),
    ])

    return {
        inactiveNudges: inactiveCount,
        deadlineReminders: deadlineCount,
        streakReminders: streakCount,
        total: inactiveCount + deadlineCount + streakCount,
    }
}
