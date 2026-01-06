import { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { prisma } from '@/lib/prisma'
import { replyText, replyFlex, flexTemplates, quickReplies } from '@/lib/line/client'
import { addPoints, updateStreak } from '@/lib/gamification'
import { generateFeedback, generateChitchat } from '@/lib/ai/claude'
import { getActiveSession, updateGameSession, GAME_MESSAGES, getRandomMessage, abandonSession } from '@/lib/games/engine'

export async function handleMessage(event: MessageEvent) {
    const userId = event.source.userId
    if (!userId) return

    try {
        // Handle non-text messages
        if (event.message.type !== 'text') {
            await replyText(event.replyToken, 'น้องไทยยังอ่านรูปภาพหรือสติกเกอร์ไม่ได้ครับ 😅\nพิมพ์ข้อความมาคุยกันนะครับ!')
            return
        }

        // Get or create user
        let user = await prisma.user.findUnique({
            where: { lineUserId: userId },
        })

        // Check if user is in a registration/flow state (Persistent DB Check)
        const state = await prisma.registrationState.findUnique({
            where: { lineUserId: userId },
        })

        const text = (event.message as TextEventMessage).text.trim()

        // Handle registration flow (Priority)
        if (state) {
            await handlePersistentRegistrationFlow(event.replyToken, userId, state, text)
            return
        }

        // If user not found and not registering -> Start Registration
        if (!user) {
            await startRegistrationFlow(userId, event.replyToken)
            return
        }

        // --- Authenticated User Logic Below ---

        // Handle active game session
        const gameSession = await getActiveSession(user.id)
        if (gameSession) {
            // Check for exit/special commands during game
            const lowerText = text.toLowerCase()
            const exitKeywords = ['ออก', 'ออกจากเกม', 'เลิกเล่น', 'หยุด', 'พอแค่นี้', 'เมนู', 'menu', 'exit', 'quit', 'stop', 'main menu']

            if (exitKeywords.includes(lowerText)) {
                await abandonSession(gameSession.id)
                await replyText(
                    event.replyToken,
                    'ออกจากเกมแล้วครับ 👋 พักผ่อนก่อนแล้วมาเล่นใหม่นะครับ!',
                    quickReplies.mainMenu
                )
                return
            }

            await handleGameAnswer(event.replyToken, user.id, gameSession, text)
            return
        }

        // Update streak and add points for message
        await updateStreak(user.id)
        await addPoints(user.id, 2, 'MESSAGE')

        // Natural language understanding
        const lowerText = text.toLowerCase()

        if (lowerText.includes('สวัสดี') || lowerText.includes('hello') || lowerText.includes('hi')) {
            await replyText(
                event.replyToken,
                `สวัสดีครับ ${user.thaiName || 'คุณ'}! 👋\n\nวันนี้อยากทำอะไรครับ?`,
                quickReplies.mainMenu
            )
        } else if (lowerText.includes('ช่วย') || lowerText.includes('help')) {
            await replyText(
                event.replyToken,
                `น้องไทยช่วยได้เรื่องเหล่านี้ครับ:\n\n📝 ส่งงาน - ส่งภาระงานรายสัปดาห์\n💬 ขอ Feedback - รับคำแนะนำก่อนส่งจริง\n🎮 ฝึกฝน - เล่นเกมฝึกภาษาไทย\n📊 แดชบอร์ด - ดูความก้าวหน้า\n👤 โปรไฟล์ - ดู/แก้ไขข้อมูล\n\nกดปุ่มด้านล่างเลยนะครับ!`,
                quickReplies.mainMenu
            )
        } else {
            // Check for triggered keywords (Submission, Feedback, etc.)
            if (text === '📝 ส่งงาน') {
                // Trigger submission flow (Implement persistent state if needed later)
                await replyText(event.replyToken, 'ระบบส่งงานจะเปิดให้ใช้งานเร็วๆ นี้นะครับ (กำลังย้ายระบบใหม่) 🚧')
            } else if (text === 'ยืนยันการลงทะเบียน') {
                // Specific catch for text-based confirmation if postback fails
                // But normally this should be in Reg Flow. 
                // Since this block is for authenticated users, this is unlikely to be hit for REGISTRATION.
                // Keeping it generic chitchat below.
                await replyText(
                    event.replyToken,
                    `ไม่เข้าใจครับ 😅 ลองกดปุ่มด้านล่างดูนะครับ!`,
                    quickReplies.mainMenu
                )
            } else {
                // AI Chitchat Fallback
                const response = await generateChitchat({
                    userId,
                    message: text,
                    userContext: {
                        name: user.thaiName || user.chineseName || 'Friend',
                        level: user.thaiLevel,
                        streak: user.streak,
                        preferredLanguage: user.preferredLanguage,
                    }
                })
                await replyText(event.replyToken, response, quickReplies.mainMenu)
            }
        }
    } catch (error) {
        console.error('Error in handleMessage:', error)
        // Reply with error to debug in chat
        await replyText(
            event.replyToken,
            `เกิดข้อผิดพลาด: ${(error as Error).message}\n\nกรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ`
        )
    }
}

// ==================== PERSISTENT REGISTRATION FLOW ====================

export async function startRegistrationFlow(userId: string, replyToken?: string) {
    // Initialize state in DB
    await prisma.registrationState.upsert({
        where: { lineUserId: userId },
        update: { step: 0, data: {} },
        create: { lineUserId: userId, step: 0, data: {} }
    })

    if (replyToken) {
        await replyText(
            replyToken,
            'ยินดีต้อนรับสู่ ProficienThAI! 🌟\n\nโปรดเลือกภาษาที่คุณถนัด / Please select your preferred language:',
            {
                items: [
                    {
                        type: 'action',
                        action: { type: 'message', label: '🇹🇭 ภาษาไทย', text: 'Thai' }
                    },
                    {
                        type: 'action',
                        action: { type: 'message', label: '🇨🇳 中文 (Chinese)', text: 'Chinese' }
                    },
                    {
                        type: 'action',
                        action: { type: 'message', label: '🇬🇧 English', text: 'English' }
                    }
                ]
            }
        )
    }
}

async function handlePersistentRegistrationFlow(
    replyToken: string,
    userId: string,
    state: { step: number; data: any },
    text: string
) {
    const data = state.data || {}
    let nextStep = state.step
    let responseMsg = ''
    let quickReply = undefined
    let useFlex = false
    let flexContent: any = null

    // Update State Logic
    switch (state.step) {
        case 0: // Language Selection
            let lang = 'TH'
            if (text.includes('Chinese') || text.includes('中文')) lang = 'CN'
            else if (text.includes('English')) lang = 'EN'

            data.preferredLanguage = lang

            // Branching based on language
            if (lang === 'TH') {
                nextStep = 2 // Skip Chinese name, go straight to Thai Name (or Nickname)
                responseMsg = 'ยินดีต้อนรับครับ! ขอทราบ "ชื่อเล่น" หรือชื่อที่คุณอยากให้ผมเรียกหน่อยครับ?'
            } else {
                nextStep = 1 // Go to Chinese Name
                responseMsg = lang === 'CN'
                    ? '欢迎! 请问您的中文名字是什么? (What is your Chinese name?)'
                    : 'Welcome! What is your Chinese name?'
            }
            break

        case 1: // Chinese Name (for Non-Thai)
            data.chineseName = text
            nextStep = 2
            const lang1 = data.preferredLanguage
            responseMsg = lang1 === 'CN'
                ? '谢谢!接下来,请问您的泰语名字是什么? (如果没有,请用英语)'
                : 'Thanks! Next, what is your Thai name? (Or English name to call you by)'
            break

        case 2: // Thai Name / Nickname
            data.thaiName = text
            nextStep = 3
            responseMsg = `สวัสดีครับคุณ ${text}! 😊\n\nขอทราบรหัสนักศึกษาหน่อยครับ? (ถ้าไม่มี พิมพ์ "-")`
            break

        case 3: // Student ID
            data.studentId = text === '-' ? null : text
            nextStep = 4
            responseMsg = 'มหาวิทยาลัยของคุณชื่ออะไรครับ? (กรอกเป็นภาษาอังกฤษจะดีมากครับ)'
            break

        case 4: // University
            data.university = text
            nextStep = 5
            responseMsg = 'ขออีเมลสำหรับติดต่อและส่งรายงานผลการเรียนครับ?'
            break

        case 5: // Email
            data.email = text
            nextStep = 6
            // Skip Nationality if Thai/Chinese (infer from language) or ask
            // For simplicity, let's ask to be sure, or auto-fill
            if (data.preferredLanguage === 'TH') {
                data.nationality = 'Thai'
                nextStep = 7 // Go to Level
                // Skip asking, move logic to next block or just force update now?
                // Let's just ask level immediately
                responseMsg = 'ระดับภาษาไทยของคุณตอนนี้เป็นอย่างไรครับ?'
                quickReply = quickReplies.thaiLevels
            } else {
                responseMsg = 'สัญชาติของคุณคืออะไรครับ? (เช่น Chinese, Vietnamese)'
            }
            break

        case 6: // Nationality (if not skipped)
            data.nationality = text
            nextStep = 7
            responseMsg = 'ระดับภาษาไทยของคุณตอนนี้เป็นอย่างไรครับ?'
            quickReply = quickReplies.thaiLevels
            break

        case 7: // Thai Level -> Go to Confirmation (NEW)
            // Map level text to enum for preview
            let levelRaw = text
            let level = 'BEGINNER'
            if (levelRaw.includes('กลาง') || levelRaw.includes('Intermediate')) level = 'INTERMEDIATE'
            if (levelRaw.includes('สูง') || levelRaw.includes('Advanced')) level = 'ADVANCED'
            data.thaiLevel = level // Store in data for confirmation

            nextStep = 8 // Confirmation Step
            useFlex = true
            flexContent = {
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
                            // Simplified reject to just cancel/reset flow
                            action: { type: 'postback', label: '❌ แก้ไข/เริ่มใหม่', data: 'action=cancel_reg' }
                        }
                    ]
                }
            }
            responseMsg = 'กรุณาตรวจสอบข้อมูลก่อนยืนยันนะครับ'
            break

        case 8:
            // Waiting for Confirmation.
            // If user types text "ยืนยัน" instead of button
            if (text === 'ยืนยัน' || text === 'Confirm') {
                // Finalize
                await finalizeRegistration(userId, data, data.thaiLevel)
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                // Welcome message handled in finalize helper or here?
                // Reuse the welcome logic from postback or just simple text
                // Let's replicate simple success here
                await replyText(replyToken, '🎉 ลงทะเบียนเสร็จสมบูรณ์! เริ่มต้นใช้งานได้เลยครับ', quickReplies.mainMenu)
                return
            } else if (text === 'แก้ไข' || text === 'Cancel') {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ยกเลิกการลงทะเบียนแล้วครับ พิมพ์ข้อความเพื่อเริ่มใหม่ได้เลยครับ', quickReplies.mainMenu)
                return
            } else {
                responseMsg = 'กรุณากดยืนยันหรือยกเลิกนะครับ'
                // Resend flex?
                useFlex = true
                flexContent = { // Re-send confirmation card
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '📋 ตรวจสอบข้อมูล', weight: 'bold', size: 'lg', color: '#6366f1' },
                            { type: 'text', text: 'กรุณายืนยันข้อมูลเพื่อดำเนินการต่อ', margin: 'md' }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'sm',
                        contents: [
                            { type: 'button', style: 'primary', action: { type: 'postback', label: '✅ ยืนยัน', data: 'action=confirm_reg' } },
                            { type: 'button', style: 'secondary', action: { type: 'postback', label: '❌ ยกเลิก', data: 'action=cancel_reg' } }
                        ]
                    }
                }
            }
            break

        // ==================== FEEDBACK MODE (step 100+) ====================
        case 100:
            // Cancel check
            if (text === 'ยกเลิก' || text.toLowerCase() === 'cancel') {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ยกเลิกขอ Feedback แล้วครับ 👋', quickReplies.mainMenu)
                return
            }

            // Get user for context
            const feedbackUser = await prisma.user.findUnique({ where: { lineUserId: userId } })
            if (!feedbackUser) {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนครับ', quickReplies.mainMenu)
                return
            }

            // Process feedback with AI
            await replyText(replyToken, '🔍 กำลังวิเคราะห์... รอสักครู่นะครับ')

            try {
                const feedback = await generateFeedback({
                    content: text,
                    nationality: feedbackUser.nationality || 'International',
                    thaiLevel: feedbackUser.thaiLevel,
                    userName: feedbackUser.thaiName || feedbackUser.chineseName || undefined
                })

                // Add points for requesting feedback
                await addPoints(feedbackUser.id, 5, 'FEEDBACK_REQUEST', undefined, 'ขอ Feedback')

                // Clear state
                await prisma.registrationState.delete({ where: { lineUserId: userId } })

                // Format response
                const scoreText = feedback.scores.map(s =>
                    `${s.name}: ${s.score}/${s.maxScore}`
                ).join('\n')

                await replyFlex(
                    replyToken,
                    'Feedback ของคุณ',
                    {
                        type: 'bubble',
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text', text: `📊 คะแนนรวม: ${feedback.overallScore}/100`, weight: 'bold', size: 'lg', color: '#6366f1' },
                                { type: 'separator', margin: 'md' },
                                { type: 'text', text: scoreText, margin: 'md', wrap: true, size: 'sm' },
                                { type: 'separator', margin: 'md' },
                                { type: 'text', text: feedback.generalFeedback, margin: 'md', wrap: true },
                                { type: 'text', text: feedback.encouragement, margin: 'md', wrap: true, color: '#10b981' }
                            ]
                        },
                        footer: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text' as const, text: '💡 จุดที่ควรปรับปรุง:', weight: 'bold' as const, size: 'sm' as const },
                                ...feedback.improvements.slice(0, 3).map(imp => (
                                    { type: 'text' as const, text: `• ${imp}`, size: 'xs' as const, wrap: true, color: '#666666' }
                                ))
                            ]
                        }
                    },
                    quickReplies.mainMenu
                )
                return
            } catch (error) {
                console.error('Feedback error:', error)
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ขออภัย ไม่สามารถวิเคราะห์ได้ในขณะนี้ ลองใหม่อีกครั้งนะครับ 🙏', quickReplies.mainMenu)
                return
            }

        // ==================== SUBMIT WORK MODE (step 200-201) ====================
        case 200:
            // Task selection (when multiple tasks available)
            if (text === 'ยกเลิก' || text.toLowerCase() === 'cancel') {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ยกเลิกการส่งงานแล้วครับ 👋', quickReplies.mainMenu)
                return
            }

            const taskNumber = parseInt(text)
            const availableTasks = data.availableTasks || []

            if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > availableTasks.length) {
                await replyText(replyToken, `กรุณาพิมพ์หมายเลข 1-${availableTasks.length} เพื่อเลือกภาระงานครับ`)
                return
            }

            const selectedTask = availableTasks[taskNumber - 1]
            await prisma.registrationState.update({
                where: { lineUserId: userId },
                data: {
                    step: 201,
                    data: { mode: 'submit', selectedTaskId: selectedTask.id, taskTitle: selectedTask.title, minWords: selectedTask.minWords }
                }
            })
            await replyText(
                replyToken,
                `📝 ส่งงาน: "${selectedTask.title}"\n\n✍️ พิมพ์งานเขียนของคุณได้เลยครับ\n(ขั้นต่ำ ${selectedTask.minWords} คำ)\n\n(พิมพ์ "ยกเลิก" เพื่อออก)`
            )
            return

        case 201:
            // Content submission
            if (text === 'ยกเลิก' || text.toLowerCase() === 'cancel') {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ยกเลิกการส่งงานแล้วครับ 👋', quickReplies.mainMenu)
                return
            }

            // Get user for submission
            const submitUser = await prisma.user.findUnique({ where: { lineUserId: userId } })
            if (!submitUser) {
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนก่อนครับ', quickReplies.mainMenu)
                return
            }

            // Word count check
            const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
            const minWords = data.minWords || 80

            if (wordCount < minWords) {
                await replyText(
                    replyToken,
                    `⚠️ งานเขียนสั้นเกินไปครับ\n\nคำที่เขียน: ${wordCount} คำ\nขั้นต่ำ: ${minWords} คำ\n\nลองเพิ่มเนื้อหาอีกนิดนะครับ!`
                )
                return
            }

            // Process with AI
            await replyText(replyToken, '🔍 กำลังตรวจงาน... รอสักครู่นะครับ')

            try {
                // Get task details for rubrics
                const task = await prisma.weeklyTask.findUnique({
                    where: { id: data.selectedTaskId }
                })

                const feedback = await generateFeedback({
                    content: text,
                    taskTitle: task?.title,
                    rubrics: task?.rubrics as any,
                    nationality: submitUser.nationality || 'International',
                    thaiLevel: submitUser.thaiLevel,
                    userName: submitUser.thaiName || submitUser.chineseName || undefined
                })

                // Calculate if early submission (bonus points)
                const isEarly = task && new Date() < new Date(new Date(task.deadline).getTime() - 24 * 60 * 60 * 1000) // 1 day before deadline

                // Save submission
                await prisma.submission.create({
                    data: {
                        userId: submitUser.id,
                        taskId: data.selectedTaskId,
                        content: text,
                        wordCount,
                        scores: feedback.scores,
                        aiFeedback: JSON.stringify(feedback),
                        totalScore: feedback.overallScore,
                        isEarly: isEarly || false
                    }
                })

                // Award points
                const basePoints = Math.round(feedback.overallScore / 5) + 10
                const earlyBonus = isEarly ? 10 : 0
                const totalPoints = basePoints + earlyBonus

                await addPoints(submitUser.id, totalPoints, isEarly ? 'SUBMISSION_EARLY' : 'SUBMISSION', data.selectedTaskId,
                    `ส่งงาน: ${data.taskTitle}${isEarly ? ' (ส่งก่อนเวลา!)' : ''}`)

                // Clear state
                await prisma.registrationState.delete({ where: { lineUserId: userId } })

                // Format response
                const scoreText = feedback.scores.map(s =>
                    `${s.name}: ${s.score}/${s.maxScore}`
                ).join('\n')

                await replyFlex(
                    replyToken,
                    'ส่งงานสำเร็จ!',
                    {
                        type: 'bubble',
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { type: 'text' as const, text: `✅ ส่งงานสำเร็จ!`, weight: 'bold' as const, size: 'lg' as const, color: '#10b981' },
                                { type: 'text' as const, text: data.taskTitle, size: 'sm' as const, color: '#666666', margin: 'sm' as const },
                                { type: 'separator' as const, margin: 'md' as const },
                                { type: 'text' as const, text: `📊 คะแนน: ${feedback.overallScore}/100`, weight: 'bold' as const, size: 'md' as const, margin: 'md' as const },
                                { type: 'text' as const, text: `📝 จำนวนคำ: ${wordCount} คำ`, size: 'sm' as const, margin: 'sm' as const },
                                { type: 'text' as const, text: `🎯 ได้รับ: +${totalPoints} แต้ม${isEarly ? ' (รวมโบนัสส่งก่อน!)' : ''}`, size: 'sm' as const, color: '#6366f1', margin: 'sm' as const },
                                { type: 'separator' as const, margin: 'md' as const },
                                { type: 'text' as const, text: scoreText, margin: 'md' as const, wrap: true, size: 'xs' as const },
                                { type: 'separator' as const, margin: 'md' as const },
                                { type: 'text' as const, text: feedback.generalFeedback, margin: 'md' as const, wrap: true, size: 'sm' as const }
                            ]
                        }
                    },
                    quickReplies.mainMenu
                )
                return
            } catch (error) {
                console.error('Submit error:', error)
                await prisma.registrationState.delete({ where: { lineUserId: userId } })
                await replyText(replyToken, 'ขออภัย ไม่สามารถตรวจงานได้ในขณะนี้ ลองใหม่อีกครั้งนะครับ 🙏', quickReplies.mainMenu)
                return
            }
    }

    // Save intermediate state
    if (state.step !== nextStep) {
        await prisma.registrationState.update({
            where: { lineUserId: userId },
            data: { step: nextStep, data }
        })

        if (useFlex && flexContent) {
            await replyFlex(replyToken, responseMsg, flexContent)
        } else if (responseMsg) {
            await replyText(replyToken, responseMsg, quickReply)
        }
    }
}

export async function finalizeRegistration(userId: string, data: any, levelRaw: string) {
    // Map level text to enum
    let level = 'BEGINNER'
    if (levelRaw && (levelRaw.includes('กลาง') || levelRaw.includes('Intermediate') || levelRaw === 'INTERMEDIATE')) level = 'INTERMEDIATE'
    if (levelRaw && (levelRaw.includes('สูง') || levelRaw.includes('Advanced') || levelRaw === 'ADVANCED')) level = 'ADVANCED'

    await prisma.user.create({
        data: {
            lineUserId: userId,
            chineseName: data.chineseName,
            thaiName: data.thaiName,
            studentId: data.studentId,
            university: data.university,
            email: data.email,
            nationality: data.nationality || 'International', // Fallback
            thaiLevel: level as any,
            preferredLanguage: data.preferredLanguage,
            consentGiven: true,
            totalPoints: 50,
            currentXP: 50
        }
    })

    // Add welcome bonus log
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } })
    if (user) {
        await prisma.pointLog.create({
            data: {
                userId: user.id,
                points: 50,
                source: 'BADGE',
                description: 'Welcome Bonus! ยินดีต้อนรับสู่ ProficienThAI',
            },
        })
    }
}

// ==================== GAME ANSWER HANDLING (Full Featured) ====================

import { classifyIntent, generateHint, explainAnswer, generateAdaptiveMessage } from '@/lib/ai/claude'
import { addPoints as addGamePoints } from '@/lib/gamification'

async function handleGameAnswer(
    replyToken: string,
    internalUserId: string,
    session: { id: string; currentQuestion: number; totalQuestions: number; correctCount: number },
    text: string
) {
    const fullSession = await prisma.gameSession.findUnique({
        where: { id: session.id },
        include: { user: true }
    })
    if (!fullSession) return

    const savedState = fullSession.savedState as any
    const questions = savedState?.questions || []
    const currentQ = questions[session.currentQuestion]
    const user = fullSession.user

    if (!currentQ) {
        await updateGameSession(session.id, { status: 'COMPLETED' })
        const endMsg = await generateAdaptiveMessage({
            message: 'เกมจบแล้ว! เก่งมากครับ 🎉',
            userLevel: user.currentLevel,
            preferredLanguage: user.preferredLanguage,
            messageType: 'encouragement'
        })
        await replyText(replyToken, endMsg, quickReplies.mainMenu)
        return
    }

    // Use Intent Classification
    const intent = await classifyIntent(text, true)

    // Handle based on intent
    switch (intent.intent) {
        case 'command':
            if (intent.command === 'hint') {
                // Check if user has enough points (cost: 5 points)
                if (user.totalPoints < 5) {
                    await replyText(replyToken, 'แต้มไม่พอขอ Hint ครับ 😅 (ต้องการ 5 แต้ม)\n\nตอบคำถามต่อเลยนะ!')
                    return
                }

                // Deduct points
                await prisma.user.update({
                    where: { id: internalUserId },
                    data: { totalPoints: { decrement: 5 } }
                })

                // Generate hint
                const hintLevel = (savedState.hintCount || 0) + 1
                const hint = await generateHint({
                    question: currentQ.question,
                    correctAnswer: String(currentQ.correctAnswer),
                    hintLevel: Math.min(3, hintLevel) as 1 | 2 | 3,
                    gameType: fullSession.gameType
                })

                // Save hint count
                await updateGameSession(session.id, {
                    savedState: { ...savedState, hintCount: hintLevel }
                })

                const hintMsg = await generateAdaptiveMessage({
                    message: `💡 คำใบ้ (-5 แต้ม):\n${hint}`,
                    userLevel: user.currentLevel,
                    preferredLanguage: user.preferredLanguage,
                    messageType: 'instruction'
                })
                await replyText(replyToken, hintMsg)
                return
            }

            if (intent.command === 'skip') {
                // Move to next question
                if (session.currentQuestion >= session.totalQuestions - 1) {
                    await updateGameSession(session.id, { status: 'COMPLETED' })
                    await replyText(replyToken, `เกมจบแล้ว! คุณตอบถูก ${session.correctCount}/${session.totalQuestions} ข้อ 🎉`, quickReplies.mainMenu)
                } else {
                    await updateGameSession(session.id, { currentQuestion: session.currentQuestion + 1 })
                    const nextQ = questions[session.currentQuestion + 1]
                    await replyText(replyToken, `⏭️ ข้ามแล้ว! คำตอบคือ "${currentQ.correctAnswer}"\n\nข้อต่อไป: ${nextQ.question}`)
                }
                return
            }
            break

        case 'question':
            // User is asking "why?" or wants explanation
            const explanation = await explainAnswer(
                currentQ.question,
                String(currentQ.correctAnswer),
                savedState.lastAnswer || 'ยังไม่ได้ตอบ'
            )
            const explainMsg = await generateAdaptiveMessage({
                message: explanation,
                userLevel: user.currentLevel,
                preferredLanguage: user.preferredLanguage,
                messageType: 'instruction'
            })
            await replyText(replyToken, `📚 ${explainMsg}\n\nลองตอบอีกครั้งได้เลยนะ!`)
            return

        case 'answer':
        default:
            // Process as answer
            break
    }

    // --- Answer Processing ---
    const isCorrect = text.toLowerCase().trim() === String(currentQ.correctAnswer).toLowerCase().trim()
    const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount

    // Save last answer for explanation feature
    await updateGameSession(session.id, {
        savedState: { ...savedState, lastAnswer: text }
    })

    if (session.currentQuestion >= session.totalQuestions - 1) {
        // Finish game
        await updateGameSession(session.id, { status: 'COMPLETED', correctCount: newCorrect })

        // Award points
        const pointsEarned = newCorrect * 5 + (newCorrect === session.totalQuestions ? 10 : 0) // Bonus for perfect
        await addGamePoints(internalUserId, pointsEarned, 'PRACTICE', session.id, `เกม: ${newCorrect}/${session.totalQuestions} ข้อ`)

        const resultMsg = newCorrect === session.totalQuestions
            ? `🎉 Perfect! ตอบถูกหมดเลย! (+${pointsEarned} แต้ม)`
            : `เกมจบแล้ว! คุณตอบถูก ${newCorrect}/${session.totalQuestions} ข้อ (+${pointsEarned} แต้ม)`

        const adaptiveResult = await generateAdaptiveMessage({
            message: resultMsg,
            userLevel: user.currentLevel,
            preferredLanguage: user.preferredLanguage,
            messageType: isCorrect ? 'game_correct' : 'encouragement'
        })
        await replyText(replyToken, adaptiveResult, quickReplies.mainMenu)
    } else {
        // Next question
        await updateGameSession(session.id, {
            currentQuestion: session.currentQuestion + 1,
            correctCount: newCorrect
        })
        const nextQ = questions[session.currentQuestion + 1]

        const feedbackMsg = isCorrect
            ? '✅ ถูกต้อง!'
            : `❌ ผิดครับ (คำตอบ: ${currentQ.correctAnswer})`

        const adaptiveFeedback = await generateAdaptiveMessage({
            message: feedbackMsg,
            userLevel: user.currentLevel,
            preferredLanguage: user.preferredLanguage,
            messageType: isCorrect ? 'game_correct' : 'game_wrong'
        })

        await replyText(replyToken, `${adaptiveFeedback}\n\n📝 ข้อ ${session.currentQuestion + 2}/${session.totalQuestions}: ${nextQ.question}`)
    }
}



