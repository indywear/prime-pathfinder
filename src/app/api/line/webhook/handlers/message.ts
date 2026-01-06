import { MessageEvent, TextEventMessage } from '@line/bot-sdk'
import { prisma } from '@/lib/prisma'
import { replyText, replyFlex, flexTemplates, quickReplies } from '@/lib/line/client'
import { addPoints, updateStreak } from '@/lib/gamification'
import { generateFeedback } from '@/lib/ai/claude'
import { getActiveSession, updateGameSession, GAME_MESSAGES, getRandomMessage } from '@/lib/games/engine'

// User state tracking for multi-step flows
const userStates = new Map<string, { flow: string; step: number; data: Record<string, unknown> }>()

export async function handleMessage(event: MessageEvent) {
    const userId = event.source.userId
    if (!userId) return

    // Get or create user
    let user = await prisma.user.findUnique({
        where: { lineUserId: userId },
    })

    // Check if user is in a flow
    const state = userStates.get(userId)

    if (event.message.type === 'text') {
        const text = (event.message as TextEventMessage).text.trim()

        // Handle registration flow
        if (state?.flow === 'register') {
            await handleRegistrationFlow(event.replyToken, userId, state, text)
            return
        }

        // Handle feedback flow
        if (state?.flow === 'feedback') {
            await handleFeedbackFlow(event.replyToken, userId, user, text)
            return
        }

        // Handle submission flow
        if (state?.flow === 'submit') {
            await handleSubmissionFlow(event.replyToken, userId, user, text)
            return
        }

        // Handle active game session
        const gameSession = await getActiveSession(userId)
        if (gameSession) {
            await handleGameAnswer(event.replyToken, userId, gameSession, text)
            return
        }

        // Default responses
        if (!user) {
            await replyFlex(
                event.replyToken,
                'ยินดีต้อนรับสู่ ProficienThAI',
                flexTemplates.welcomeCard()
            )
            return
        }

        // Update streak and add points for message
        await updateStreak(userId)
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
            await replyText(
                event.replyToken,
                `ไม่เข้าใจครับ 😅 ลองกดปุ่มด้านล่างดูนะครับ!`,
                quickReplies.mainMenu
            )
        }
    }
}

// ==================== REGISTRATION FLOW ====================

export function startRegistrationFlow(userId: string) {
    userStates.set(userId, { flow: 'register', step: 1, data: {} })
}

async function handleRegistrationFlow(
    replyToken: string,
    userId: string,
    state: { flow: string; step: number; data: Record<string, unknown> },
    text: string
) {
    const data = state.data

    switch (state.step) {
        case 1: // Chinese name
            data.chineseName = text
            userStates.set(userId, { flow: 'register', step: 2, data })
            await replyText(replyToken, 'ขอบคุณครับ! ต่อไป ชื่อภาษาไทยของคุณคืออะไรครับ? (สำหรับให้น้องไทยเรียกนะครับ)')
            break

        case 2: // Thai name
            data.thaiName = text
            userStates.set(userId, { flow: 'register', step: 3, data })
            await replyText(replyToken, `สวัสดีครับ คุณ${text}! 😊\n\nรหัสนักศึกษาของคุณคืออะไรครับ? (ถ้าไม่มี พิมพ์ "-" ได้เลย)`)
            break

        case 3: // Student ID
            data.studentId = text === '-' ? null : text
            userStates.set(userId, { flow: 'register', step: 4, data })
            await replyText(replyToken, 'มหาวิทยาลัยของคุณชื่ออะไรครับ? (กรอกเป็นภาษาอังกฤษนะครับ)')
            break

        case 4: // University
            data.university = text
            userStates.set(userId, { flow: 'register', step: 5, data })
            await replyText(replyToken, 'อีเมลของคุณครับ? (สำหรับส่งรายงานและติดต่อ)')
            break

        case 5: // Email
            data.email = text
            userStates.set(userId, { flow: 'register', step: 6, data })
            await replyText(replyToken, 'สัญชาติของคุณคืออะไรครับ? (เช่น Chinese, Vietnamese, Korean)')
            break

        case 6: // Nationality
            data.nationality = text
            userStates.set(userId, { flow: 'register', step: 7, data })
            await replyText(
                replyToken,
                'ระดับภาษาไทยของคุณตอนนี้เป็นอย่างไรครับ?',
                quickReplies.thaiLevels
            )
            break

        case 7: // Thai level (handled by postback)
            // This step is handled by postback handler
            break

        case 8: // Consent
            // Handled by postback, then finalize
            break
    }
}

export async function finalizeRegistration(userId: string, thaiLevel: string) {
    const state = userStates.get(userId)
    if (!state || state.flow !== 'register') return null

    const data = state.data

    // Create user
    const user = await prisma.user.create({
        data: {
            lineUserId: userId,
            chineseName: data.chineseName as string,
            thaiName: data.thaiName as string,
            studentId: data.studentId as string | null,
            university: data.university as string,
            email: data.email as string,
            nationality: data.nationality as string,
            thaiLevel: thaiLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
            consentGiven: true,
            totalPoints: 50, // Welcome bonus
            currentXP: 50,
        },
    })

    // Clear state
    userStates.delete(userId)

    // Add welcome bonus log
    await prisma.pointLog.create({
        data: {
            userId: user.id,
            points: 50,
            source: 'BADGE',
            description: 'Welcome Bonus! ยินดีต้อนรับสู่ ProficienThAI',
        },
    })

    return user
}

// ==================== FEEDBACK FLOW ====================

export function startFeedbackFlow(userId: string) {
    userStates.set(userId, { flow: 'feedback', step: 1, data: {} })
}

async function handleFeedbackFlow(
    replyToken: string,
    userId: string,
    user: { id: string; nationality: string | null; thaiLevel: string; thaiName: string | null } | null,
    text: string
) {
    if (!user) return

    // Clear flow state
    userStates.delete(userId)

    // Show processing message
    await replyText(replyToken, 'กำลังวิเคราะห์งานเขียนของคุณ... 🔍')

    // Generate feedback
    const feedback = await generateFeedback({
        content: text,
        nationality: user.nationality || 'International',
        thaiLevel: user.thaiLevel,
        userName: user.thaiName || undefined,
    })

    // Save feedback request
    await prisma.feedbackRequest.create({
        data: {
            userId: user.id,
            draftContent: text,
            aiFeedback: feedback.generalFeedback,
            detailedScores: feedback.scores,
            pointsEarned: 5,
        },
    })

    // Add points
    await addPoints(user.id, 5, 'FEEDBACK_REQUEST')

    // Format feedback message
    const scoreText = feedback.scores
        .map((s) => `${s.name}: ${s.score}/${s.maxScore} - ${s.feedback}`)
        .join('\n')

    const feedbackMessage = `📝 ผลการประเมิน\n\n${scoreText}\n\n💬 ${feedback.generalFeedback}\n\n🎯 สิ่งที่ควรปรับปรุง:\n${feedback.improvements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\n${feedback.encouragement}\n\n+5 แต้ม! 🎉`

    // Send feedback via push message (since we already replied)
    const { pushText } = await import('@/lib/line/client')
    await pushText(userId, feedbackMessage, quickReplies.mainMenu)
}

// ==================== SUBMISSION FLOW ====================

export function startSubmissionFlow(userId: string, taskId?: string) {
    userStates.set(userId, { flow: 'submit', step: 1, data: { taskId } })
}

async function handleSubmissionFlow(
    replyToken: string,
    userId: string,
    user: { id: string; nationality: string | null; thaiLevel: string; thaiName: string | null } | null,
    text: string
) {
    if (!user) return

    const state = userStates.get(userId)
    const taskId = state?.data?.taskId as string | undefined

    // Clear flow state
    userStates.delete(userId)

    // Word count check
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length

    // Get current task
    const currentTask = await prisma.weeklyTask.findFirst({
        where: { isActive: true },
        orderBy: { weekNumber: 'desc' },
    })

    if (currentTask) {
        if (wordCount < currentTask.minWords) {
            await replyText(
                replyToken,
                `⚠️ งานเขียนสั้นเกินไปครับ\n\nต้องมีความยาว ${currentTask.minWords}-${currentTask.maxWords} คำ\nตอนนี้มี ${wordCount} คำ\n\nลองเขียนเพิ่มแล้วส่งใหม่นะครับ!`,
                quickReplies.mainMenu
            )
            return
        }

        if (wordCount > currentTask.maxWords) {
            await replyText(
                replyToken,
                `⚠️ งานเขียนยาวเกินไปครับ\n\nต้องมีความยาว ${currentTask.minWords}-${currentTask.maxWords} คำ\nตอนนี้มี ${wordCount} คำ\n\nลองตัดให้สั้นลงแล้วส่งใหม่นะครับ!`,
                quickReplies.mainMenu
            )
            return
        }
    }

    // Generate feedback
    const feedback = await generateFeedback({
        content: text,
        taskTitle: currentTask?.title,
        nationality: user.nationality || 'International',
        thaiLevel: user.thaiLevel,
        userName: user.thaiName || undefined,
    })

    // Check if on time
    const now = new Date()
    const isOnTime = currentTask ? now <= currentTask.deadline : true
    const isEarly = currentTask ? now < new Date(currentTask.deadline.getTime() - 24 * 60 * 60 * 1000) : false

    // Calculate points
    let points = isOnTime ? 20 : 10
    if (isEarly) points += 10

    // Save submission
    const submission = await prisma.submission.create({
        data: {
            userId: user.id,
            taskId: currentTask?.id || taskId || '',
            content: text,
            wordCount,
            scores: feedback.scores,
            aiFeedback: feedback.generalFeedback,
            totalScore: feedback.overallScore,
            pointsEarned: points,
            isOnTime,
            isEarly,
        },
    })

    // Add points
    await addPoints(user.id, points, isOnTime ? 'SUBMISSION' : 'SUBMIT_LATE', submission.id)
    if (isEarly) {
        await addPoints(user.id, 10, 'SUBMISSION_EARLY', submission.id, 'ส่งงานก่อนเวลา!')
    }

    // Format response
    const statusEmoji = isOnTime ? (isEarly ? '🚀' : '✅') : '⏰'
    const statusText = isOnTime ? (isEarly ? 'ส่งก่อนเวลา! +10 โบนัส!' : 'ส่งตรงเวลา!') : 'ส่งช้านิดหน่อย'

    const responseMessage = `${statusEmoji} ส่งงานสำเร็จ! ${statusText}\n\n📊 คะแนน: ${feedback.overallScore}/100\n\n${feedback.generalFeedback}\n\n${feedback.encouragement}\n\n+${points} แต้ม! 🎉`

    await replyText(replyToken, responseMessage, quickReplies.mainMenu)
}

// ==================== GAME ANSWER HANDLING ====================

async function handleGameAnswer(
    replyToken: string,
    userId: string,
    session: { id: string; currentQuestion: number; totalQuestions: number; correctCount: number },
    text: string
) {
    // Get saved state with questions
    const fullSession = await prisma.gameSession.findUnique({
        where: { id: session.id },
    })

    if (!fullSession) return

    const savedState = fullSession.savedState as { questions?: { correctAnswer: string | number }[] }
    const questions = savedState?.questions || []
    const currentQ = questions[session.currentQuestion]

    if (!currentQ) {
        await updateGameSession(session.id, { status: 'COMPLETED' })
        await replyText(replyToken, 'เกมจบแล้ว! ขอบคุณที่เล่นนะครับ 🎉', quickReplies.mainMenu)
        return
    }

    // Check answer
    const isCorrect =
        text.toLowerCase() === String(currentQ.correctAnswer).toLowerCase() ||
        text === String(currentQ.correctAnswer)

    const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount
    const isLast = session.currentQuestion >= session.totalQuestions - 1

    if (isLast) {
        // Game complete
        const points = newCorrect * 5
        const isPerfect = newCorrect === session.totalQuestions

        await updateGameSession(session.id, {
            correctCount: newCorrect,
            pointsEarned: points,
            status: 'COMPLETED',
        })

        // Get user
        const user = await prisma.user.findUnique({ where: { lineUserId: userId } })
        if (user) {
            await addPoints(user.id, points, isPerfect ? 'PRACTICE_PERFECT' : 'PRACTICE')
        }

        const completeMsg = isPerfect
            ? getRandomMessage(GAME_MESSAGES.perfect)
            : getRandomMessage(GAME_MESSAGES.complete)
                .replace('{points}', String(points))
                .replace('{correct}', String(newCorrect))
                .replace('{total}', String(session.totalQuestions))

        await replyText(replyToken, `${isCorrect ? '✅' : '❌'} ${completeMsg}`, quickReplies.mainMenu)
    } else {
        // Next question
        await updateGameSession(session.id, {
            currentQuestion: session.currentQuestion + 1,
            correctCount: newCorrect,
            answeredQuestion: {
                questionIndex: session.currentQuestion,
                answer: text,
                correct: isCorrect,
            },
        })

        const feedback = isCorrect
            ? getRandomMessage(GAME_MESSAGES.correct)
            : getRandomMessage(GAME_MESSAGES.incorrect)

        // Send next question (simplified - in real app would format properly)
        const nextQ = questions[session.currentQuestion + 1]
        const nextQText = typeof nextQ === 'object' && 'question' in nextQ ? (nextQ as { question: string }).question : 'คำถามถัดไป'

        await replyText(
            replyToken,
            `${isCorrect ? '✅' : '❌'} ${feedback}\n\n📝 ข้อ ${session.currentQuestion + 2}/${session.totalQuestions}\n${nextQText}`
        )
    }
}

// Export state management
export { userStates }
