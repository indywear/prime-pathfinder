import { prisma } from '@/lib/prisma'
import { pushText } from '@/lib/line/client'

// Nudge types and messages
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
            'สู้ๆ นะ! ใกล้หลุด streak แล้ว 💪',
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
            '💥 streak {days} วันจะหายไป! รีบมาต่อเลย',
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
    const inactiveThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours

    const inactiveUsers = await prisma.user.findMany({
        where: {
            lastActiveAt: {
                lt: inactiveThreshold,
            },
        },
        select: {
            id: true,
            lineUserId: true,
            thaiName: true,
            nationality: true,
            streak: true,
        },
    })

    for (const user of inactiveUsers) {
        const lang = user.nationality?.toLowerCase() === 'chinese' ? 'chinese' : 'thai'
        const messages = NUDGE_MESSAGES.INACTIVE[lang] || NUDGE_MESSAGES.INACTIVE.thai

        const message = formatMessage(getRandomMessage(messages), {
            name: user.thaiName || 'คุณ',
        })

        try {
            await pushText(user.lineUserId, message)
            await prisma.nudgeLog.create({
                data: {
                    userId: user.id,
                    type: 'INACTIVE',
                    message,
                    delivered: true,
                },
            })
        } catch (error) {
            console.error('Failed to send nudge:', error)
            await prisma.nudgeLog.create({
                data: {
                    userId: user.id,
                    type: 'INACTIVE',
                    message,
                    delivered: false,
                },
            })
        }
    }

    return inactiveUsers.length
}

async function sendDeadlineReminders() {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const upcomingTasks = await prisma.weeklyTask.findMany({
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
        // Find users who haven't submitted
        const usersWithoutSubmission = await prisma.user.findMany({
            where: {
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
                await prisma.nudgeLog.create({
                    data: {
                        userId: user.id,
                        type: 'DEADLINE',
                        message,
                        delivered: true,
                    },
                })
                sentCount++
            } catch (error) {
                console.error('Failed to send deadline reminder:', error)
            }
        }
    }

    return sentCount
}

async function sendStreakReminders() {
    const users = await prisma.user.findMany({
        where: {
            streak: {
                gte: 3, // Only remind users with streaks
            },
            lastActiveAt: {
                lt: new Date(Date.now() - 20 * 60 * 60 * 1000), // Haven't been active in 20 hours
            },
        },
        select: {
            id: true,
            lineUserId: true,
            thaiName: true,
            streak: true,
        },
    })

    for (const user of users) {
        const message = formatMessage(getRandomMessage(NUDGE_MESSAGES.STREAK.thai), {
            name: user.thaiName || 'คุณ',
            days: String(user.streak),
        })

        try {
            await pushText(user.lineUserId, message)
            await prisma.nudgeLog.create({
                data: {
                    userId: user.id,
                    type: 'STREAK',
                    message,
                    delivered: true,
                },
            })
        } catch (error) {
            console.error('Failed to send streak reminder:', error)
        }
    }

    return users.length
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
