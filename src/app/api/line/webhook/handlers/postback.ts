import { PostbackEvent } from '@line/bot-sdk'
import { prisma } from '@/lib/prisma'
import { replyText, replyFlex, flexTemplates, quickReplies, pushText } from '@/lib/line/client'
import { getLevelInfo, getNextLevelXP, addPoints } from '@/lib/gamification'
import { GAME_TYPES, createGameSession } from '@/lib/games/engine'
import { generateQuestions } from '@/lib/ai/claude'
import {
    startRegistrationFlow,
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

    // Handle registration level selection (Persistent)
    if (level) {
        const state = await prisma.registrationState.findUnique({ where: { lineUserId: userId } })

        // Ensure we are in the correct step (Step 7: Level Selection)
        if (state && state.step === 7) {
            // Save Level
            await prisma.registrationState.update({
                where: { lineUserId: userId },
                data: {
                    step: 8, // Go to Confirmation
                    data: { ...state.data as any, thaiLevel: level }
                }
            })

            const data = { ...state.data as any, thaiLevel: level }

            // Show Confirmation (Same as message.ts)
            await replyFlex(
                event.replyToken,
                'ตรวจสอบข้อมูล',
                {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📋 ตรวจสอบข้อมูล', weight: 'bold', size: 'lg', color: '#6366f1' },
                            { type: 'separator', margin: 'md' },
                            { type: 'text', text: `ชื่อ: ${data.chineseName || '-'}`, margin: 'md' },
                            { type: 'text', text: `ชื่อไทย: ${data.thaiName}` },
                            { type: 'text', text: `รหัสนักศึกษา: ${data.studentId || '-'}` },
                            { type: 'text', text: `มหาวิทยาลัย: ${data.university}` },
                            { type: 'text', text: `อีเมล: ${data.email}` },
                            { type: 'text', text: `สัญชาติ: ${data.nationality}` },
                            { type: 'text', text: `ระดับภาษา: ${level}` },
                            { type: 'text', text: 'โดยการกดยืนยัน ถือว่าท่านยอมรับข้อตกลงการใช้งาน', size: 'xs', color: '#aaaaaa', margin: 'lg', wrap: true }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                action: { type: 'postback', label: '✅ ยืนยัน', data: 'action=confirm_reg' }
                            },
                            {
                                type: 'button',
                                style: 'secondary',
                                action: { type: 'postback', label: '❌ แก้ไข/เริ่มใหม่', data: 'action=cancel_reg' }
                            }
                        ]
                    }
                }
            )
            return
        }
    }

    // Handle actions
    switch (action) {
        case 'confirm_reg':
            const state = await prisma.registrationState.findUnique({ where: { lineUserId: userId } })
            if (state && state.step === 8) {
                const data = state.data as any
                await finalizeRegistration(userId, data, data.thaiLevel)
                await prisma.registrationState.delete({ where: { lineUserId: userId } })

                // Get new user for name
                const newUser = await prisma.user.findUnique({ where: { lineUserId: userId } })

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
                                { type: 'text', text: `ยินดีต้อนรับ ${newUser?.thaiName || ''}!`, weight: 'bold', size: 'lg' },
                                { type: 'text', text: 'คุณได้รับ 50 แต้มต้อนรับ! 🎁', margin: 'md' },
                                { type: 'text', text: 'พร้อมเริ่มเรียนภาษาไทยแล้ว!', margin: 'md', color: '#666666' },
                            ],
                        },
                    },
                    quickReplies.mainMenu
                )
            }
            break;

        case 'cancel_reg':
            await prisma.registrationState.delete({ where: { lineUserId: userId } })
            await replyText(event.replyToken, 'ยกเลิกการลงทะเบียนเรียบร้อยครับ พิมพ์ข้อความเพื่อเริ่มใหม่ได้เสมอครับ', quickReplies.mainMenu)
            break;

        case 'register':
            if (user) {
                await replyText(event.replyToken, 'คุณลงทะเบียนแล้วครับ! 😊', quickReplies.mainMenu)
            } else {
                await startRegistrationFlow(userId, event.replyToken)
                // Note: startRegistrationFlow handles the reply now with language selection
            }
            break

        case 'feedback':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            await replyText(event.replyToken, 'ระบบ Feedback กำลังปรับปรุงให้ดียิ่งขึ้น รอสักครู่นะครับ! 🚧')
            // Temporarily disabled until Feedback flow is persistent
            break

        case 'submit':
            if (!user) {
                await replyFlex(event.replyToken, 'กรุณาลงทะเบียนก่อน', flexTemplates.welcomeCard())
                return
            }
            await replyText(event.replyToken, 'ระบบส่งงานกำลังปรับปรุงให้ดียิ่งขึ้น รอสักครู่นะครับ! 🚧')
            // Temporarily disabled
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
