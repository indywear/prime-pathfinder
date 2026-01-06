import { PostbackEvent } from '@line/bot-sdk'
import { prisma } from '@/lib/prisma'
import { replyText, replyFlex, flexTemplates, quickReplies, pushText } from '@/lib/line/client'
import { getLevelInfo, getNextLevelXP, addPoints } from '@/lib/gamification'
import { GAME_TYPES, createGameSession } from '@/lib/games/engine'
import { generateQuestions } from '@/lib/ai/claude'
import {
    userStates,
    startRegistrationFlow,
    startFeedbackFlow,
    startSubmissionFlow,
    finalizeRegistration,
} from './message'

export async function handlePostback(event: PostbackEvent) {
    const userId = event.source.userId
    if (!userId) return

    const data = new URLSearchParams(event.postback.data)
    const action = data.get('action')
    const level = data.get('level')
    const game = data.get('game')
    const confirm = data.get('confirm')
    const consent = data.get('consent')

    // Get user
    const user = await prisma.user.findUnique({
        where: { lineUserId: userId },
    })

    // Handle registration level selection
    if (level) {
        const state = userStates.get(userId)
        if (state?.flow === 'register' && state.step === 7) {
            userStates.set(userId, { ...state, step: 8, data: { ...state.data, thaiLevel: level } })
            await replyText(
                event.replyToken,
                `📋 ข้อตกลงการใช้งาน\n\nข้อมูลของคุณจะถูกใช้เพื่อ:\n• การเรียนการสอนภาษาไทย\n• การวิจัยและพัฒนาระบบ\n\nข้อมูลจะถูกเก็บรักษาอย่างปลอดภัยและไม่เปิดเผยต่อบุคคลภายนอก\n\nคุณยินยอมให้ใช้ข้อมูลหรือไม่?`,
                quickReplies.consent
            )
            return
        }
    }

    // Handle consent
    if (consent) {
        if (consent === 'yes') {
            const state = userStates.get(userId)
            if (state?.flow === 'register') {
                const thaiLevel = state.data.thaiLevel as string
                const newUser = await finalizeRegistration(userId, thaiLevel)
                if (newUser) {
                    await replyFlex(
                        event.replyToken,
                        'ลงทะเบียนสำเร็จ!',
                        {
                            type: 'bubble',
                            hero: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '🎉', size: 'xxl', align: 'center' },
                                    { type: 'text', text: 'ลงทะเบียนสำเร็จ!', size: 'xl', weight: 'bold', color: '#ffffff', align: 'center' },
                                ],
                                paddingAll: '20px',
                                backgroundColor: '#10b981',
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: `ยินดีต้อนรับ ${newUser.thaiName}!`, weight: 'bold', size: 'lg' },
                                    { type: 'text', text: 'คุณได้รับ 50 แต้มต้อนรับ! 🎁', margin: 'md' },
                                    { type: 'text', text: 'พร้อมเริ่มเรียนภาษาไทยแล้ว!', margin: 'md', color: '#666666' },
                                ],
                            },
                        },
                        quickReplies.mainMenu
                    )
                }
            }
        } else {
            userStates.delete(userId)
            await replyText(
                event.replyToken,
                'ไม่เป็นไรครับ หากเปลี่ยนใจสามารถกดลงทะเบียนใหม่ได้ทุกเมื่อนะครับ 😊',
                quickReplies.mainMenu
            )
        }
        return
    }

    // Handle actions
    switch (action) {
        case 'register':
            if (user) {
                await replyText(event.replyToken, 'คุณลงทะเบียนแล้วครับ! 😊', quickReplies.mainMenu)
            } else {
                startRegistrationFlow(userId)
                await replyText(event.replyToken, 'เริ่มลงทะเบียนกันเลย! 📝\n\nชื่อ-นามสกุลภาษาจีนของคุณคืออะไรครับ?\n(เช่น 张伟)')
            }
            break

        case 'feedback':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            startFeedbackFlow(userId)
            await replyText(event.replyToken, '💬 ขอ Feedback\n\nส่งงานเขียนฉบับร่างมาได้เลยครับ น้องไทยจะช่วยประเมินให้! 📝')
            break

        case 'submit':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            // Get current task
            const currentTask = await prisma.weeklyTask.findFirst({
                where: { isActive: true },
                orderBy: { weekNumber: 'desc' },
            })
            if (currentTask) {
                startSubmissionFlow(userId, currentTask.id)
                await replyText(
                    event.replyToken,
                    `📝 ส่งงาน: ${currentTask.title}\n\n${currentTask.description}\n\n📏 ความยาว: ${currentTask.minWords}-${currentTask.maxWords} คำ\n⏰ Deadline: ${currentTask.deadline.toLocaleDateString('th-TH')}\n\nพิมพ์งานเขียนส่งมาได้เลยครับ!`
                )
            } else {
                startSubmissionFlow(userId)
                await replyText(event.replyToken, '📝 ส่งงาน\n\nพิมพ์งานเขียนส่งมาได้เลยครับ! น้องไทยจะช่วยประเมินให้ 📊')
            }
            break

        case 'practice':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            await replyText(
                event.replyToken,
                '🎮 เลือกเกมที่อยากเล่นครับ!\n\n🎯 คำศัพท์ - จับคู่คำกับความหมาย\n✏️ เติมคำ - เติมคำลงในประโยค\n🔢 เรียงประโยค - เรียงคำให้ถูกต้อง\n📝 แต่งประโยค - แต่งประโยคจากคำที่กำหนด',
                quickReplies.gameTypes
            )
            break

        case 'dashboard':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            // Get stats
            const submissionCount = await prisma.submission.count({ where: { userId: user.id } })
            const totalTasks = await prisma.weeklyTask.count({ where: { isActive: true } })
            const vocabCount = await prisma.practiceSession.count({
                where: { userId: user.id, gameType: { contains: 'vocab' } },
            })
            const levelInfo = getLevelInfo(user.currentLevel)
            const nextLevelXP = getNextLevelXP(user.currentLevel)

            await replyFlex(
                event.replyToken,
                'แดชบอร์ดของคุณ',
                flexTemplates.dashboardCard({
                    level: user.currentLevel,
                    title: levelInfo.title,
                    xp: user.currentXP,
                    nextLevelXp: nextLevelXP,
                    submittedTasks: submissionCount,
                    totalTasks,
                    streak: user.streak,
                    vocabCount,
                    totalPoints: user.totalPoints,
                }),
                quickReplies.mainMenu
            )
            break

        case 'profile':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            await replyText(
                event.replyToken,
                `👤 ข้อมูลของคุณ\n\n` +
                `ชื่อ: ${user.chineseName || '-'}\n` +
                `ชื่อภาษาไทย: ${user.thaiName || '-'}\n` +
                `มหาวิทยาลัย: ${user.university || '-'}\n` +
                `อีเมล: ${user.email || '-'}\n` +
                `สัญชาติ: ${user.nationality || '-'}\n` +
                `ระดับภาษา: ${user.thaiLevel}\n\n` +
                `ต้องการแก้ไขข้อมูลไหมครับ?`,
                quickReplies.mainMenu
            )
            break
    }

    // Handle game selection
    if (game) {
        if (!user) return

        const gameTypeMap: Record<string, keyof typeof GAME_TYPES> = {
            vocab: 'VOCAB_MEANING',
            fillblank: 'FILL_BLANK',
            arrange: 'ARRANGE_SENTENCE',
            compose: 'COMPOSE_SENTENCE',
        }

        const gameType = GAME_TYPES[gameTypeMap[game] || 'VOCAB_MEANING']

        // Generate questions
        const questions = await generateQuestions({
            gameType: game as 'vocab' | 'fillblank' | 'arrange' | 'compose',
            difficulty: gameType.difficulty as 1 | 2 | 3,
            thaiLevel: user.thaiLevel,
            count: 5,
        })

        if (questions.length === 0) {
            await replyText(event.replyToken, 'ขออภัย ไม่สามารถสร้างคำถามได้ในขณะนี้ ลองใหม่อีกครั้งนะครับ 🙏', quickReplies.mainMenu)
            return
        }

        // Create game session
        const session = await createGameSession(user.id, game, questions.length, { questions })

        // Send first question
        const firstQ = questions[0]
        let questionText = `🎮 ${gameType.name}\n\n📝 ข้อ 1/${questions.length}\n${firstQ.question}`

        if (firstQ.options) {
            questionText += '\n\n' + firstQ.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')
            questionText += '\n\nพิมพ์หมายเลขคำตอบเลยครับ!'
        } else {
            questionText += '\n\nพิมพ์คำตอบเลยครับ!'
        }

        await replyText(event.replyToken, questionText)
    }
}
