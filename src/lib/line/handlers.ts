import { WebhookEvent } from "@line/bot-sdk";
import prisma from "@/lib/db/prisma";
import {
    replyText,
    replyWithQuickReply,
    createDashboardFlex,
    createProfileFlex,
    lineClient,
    createTextMessage,
} from "@/lib/line/client";
import { generateWritingFeedback, generateConversationResponse, generateSimpleFeedback } from "@/lib/ai/feedback";
import {
    POINTS,
    calculateLevel,
    getPointsForNextLevel,
    formatPointsMessage,
} from "@/lib/gamification/points";

// =====================
// Registration Flow State
// =====================

const REGISTRATION_STEPS = [
    { field: "chineseName", question: "ชื่อ-นามสกุล (ภาษาจีน) ของคุณคืออะไรครับ?", type: "text" },
    { field: "thaiName", question: "ชื่อภาษาไทยที่ต้องการให้เรียกคืออะไรครับ?", type: "text" },
    { field: "studentId", question: "รหัสนักศึกษาของคุณคืออะไรครับ? (หากไม่มี พิมพ์ '-')", type: "text" },
    { field: "university", question: "คุณเรียนมหาวิทยาลัยอะไรครับ? (กรอกเป็นภาษาอังกฤษ)", type: "text" },
    { field: "email", question: "อีเมลของคุณคืออะไรครับ?", type: "text" },
    { field: "nationality", question: "สัญชาติของคุณคืออะไรครับ?", type: "text" },
    {
        field: "thaiLevel",
        question: "ระดับภาษาไทยของคุณอยู่ระดับไหนครับ?",
        type: "quickReply",
        options: [
            { label: "Beginner", text: "BEGINNER" },
            { label: "Intermediate", text: "INTERMEDIATE" },
            { label: "Advanced", text: "ADVANCED" },
        ],
    },
    {
        field: "consent",
        question: "คุณยินยอมให้ใช้ข้อมูลเพื่อการเรียนการสอนและวิจัยหรือไม่?",
        type: "quickReply",
        options: [
            { label: "ยินยอม", text: "YES" },
            { label: "ไม่ยินยอม", text: "NO" },
        ],
    },
];

// =====================
// Main Menu Keywords
// =====================

const MENU_KEYWORDS = {
    REGISTER: ["ลงทะเบียน", "register", "สมัคร"],
    FEEDBACK: ["ขอผลป้อนกลับ", "feedback", "ผลป้อนกลับ"],
    SUBMIT: ["ส่งงาน", "submit", "ส่ง", "submit task"],
    PRACTICE: ["ฝึกฝน", "practice", "ฝึก"],
    DASHBOARD: ["แดชบอร์ด", "dashboard", "ความก้าวหน้า"],
    PROFILE: ["ข้อมูลส่วนตัว", "profile", "โปรไฟล์"],
    CANCEL: ["ยกเลิก", "cancel", "หยุด", "ออก"],
    HELP: ["ช่วยเหลือ", "help", "วิธีใช้", "เมนู", "menu"],
    LEADERBOARD: ["leaderboard", "อันดับ", "ลีดเดอร์บอร์ด", "ranking"],
    SPIN_WHEEL: ["spin wheel", "สปินวงล้อ", "วงล้อ", "spin", "หมุนวงล้อ"],
    GAME_MENU: ["เกม", "game", "games", "เล่นเกม"],
    VOCAB_GAME: ["คำศัพท์", "vocabulary", "vocab", "คำศัพท์จีน"],
    FILL_BLANK_GAME: ["เติมคำ", "fill blank", "fillblank", "เติมช่องว่าง"],
    WORD_ORDER_GAME: ["เรียงคำ", "word order", "เรียงประโยค"],
    SENTENCE_GAME: ["แต่งประโยค", "sentence", "แต่ง"],
};

function detectMenuAction(text: string): string | null {
    const lowerText = text.toLowerCase().trim();

    for (const [action, keywords] of Object.entries(MENU_KEYWORDS)) {
        if (keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
            return action;
        }
    }
    return null;
}

// =====================
// User Session State (In-Memory)
// =====================

interface UserSession {
    currentAction?: string;
    registrationStep?: number;
    feedbackTaskId?: string;
    submitTaskId?: string;
    practiceSessionId?: string;
    awaitingInput?: boolean;
    // Game state
    gameType?: string;
    gameQuestions?: any[];
    gameCurrentIndex?: number;
    gameCorrectCount?: number;
}

const userSessions = new Map<string, UserSession>();

function getSession(userId: string): UserSession {
    if (!userSessions.has(userId)) {
        userSessions.set(userId, {});
    }
    return userSessions.get(userId)!;
}

function clearSession(userId: string) {
    userSessions.delete(userId);
}

// =====================
// Message Handler
// =====================

export async function handleTextMessage(
    event: WebhookEvent & { type: "message"; message: { type: "text"; text: string } }
) {
    const userId = event.source.userId;
    if (!userId) return;

    const text = event.message.text;
    const session = getSession(userId);

    // Check if user is in registration flow
    if (session.currentAction === "REGISTER" && session.registrationStep !== undefined) {
        await handleRegistrationStep(event.replyToken, userId, text, session);
        return;
    }

    // Check if user is awaiting feedback input
    if (session.currentAction === "FEEDBACK" && session.awaitingInput) {
        await handleFeedbackSubmission(event.replyToken, userId, text);
        return;
    }

    // Check if user is awaiting submission input
    if (session.currentAction === "SUBMIT" && session.awaitingInput) {
        await handleWorkSubmission(event.replyToken, userId, text);
        return;
    }

    // Check if user is playing a game
    if (session.currentAction === "GAME" && session.gameQuestions && session.gameCurrentIndex !== undefined) {
        await handleGameAnswer(event.replyToken, userId, text);
        return;
    }

    // Detect menu action from text
    const menuAction = detectMenuAction(text);

    if (menuAction) {
        switch (menuAction) {
            case "REGISTER":
                await handleRegisterStart(event.replyToken, userId);
                break;
            case "FEEDBACK":
                await handleFeedbackStart(event.replyToken, userId);
                break;
            case "SUBMIT":
                await handleSubmitStart(event.replyToken, userId);
                break;
            case "PRACTICE":
                await handlePracticeStart(event.replyToken, userId);
                break;
            case "DASHBOARD":
                await handleDashboard(event.replyToken, userId);
                break;
            case "PROFILE":
                await handleProfile(event.replyToken, userId);
                break;
            case "CANCEL":
                await handleCancel(event.replyToken, userId);
                break;
            case "HELP":
                await handleHelp(event.replyToken, userId);
                break;
            case "LEADERBOARD":
                await handleLeaderboard(event.replyToken, userId);
                break;
            case "SPIN_WHEEL":
                await handleSpinWheel(event.replyToken, userId);
                break;
            case "GAME_MENU":
                await handleGameMenu(event.replyToken, userId);
                break;
            case "VOCAB_GAME":
                await handleVocabGameStart(event.replyToken, userId);
                break;
            case "FILL_BLANK_GAME":
                await handleFillBlankGameStart(event.replyToken, userId);
                break;
            case "WORD_ORDER_GAME":
                await handleWordOrderGameStart(event.replyToken, userId);
                break;
            case "SENTENCE_GAME":
                await handleSentenceGameStart(event.replyToken, userId);
                break;
        }
        return;
    }

    // General conversation
    await handleGeneralConversation(event.replyToken, userId, text);
}

// =====================
// Registration Handlers
// =====================

async function handleRegisterStart(replyToken: string, userId: string) {
    // Check if already registered
    const existingUser = await prisma.user.findUnique({
        where: { lineUserId: userId },
    });

    if (existingUser?.isRegistered) {
        await replyText(
            replyToken,
            `สวัสดีครับ คุณ${existingUser.thaiName}! คุณลงทะเบียนแล้ว\n\nหากต้องการแก้ไขข้อมูล กรุณาเลือก "ข้อมูลส่วนตัว"`
        );
        return;
    }

    // Create or update user and start registration
    await prisma.user.upsert({
        where: { lineUserId: userId },
        update: { registrationStep: 0 },
        create: { lineUserId: userId, registrationStep: 0 },
    });

    const session = getSession(userId);
    session.currentAction = "REGISTER";
    session.registrationStep = 0;

    const firstStep = REGISTRATION_STEPS[0];

    await replyText(
        replyToken,
        `สวัสดีครับ! ยินดีต้อนรับสู่ ProficienThAI\n\nเริ่มลงทะเบียนกันเลย\n\n${firstStep.question}`
    );
}

async function handleRegistrationStep(
    replyToken: string,
    userId: string,
    answer: string,
    session: UserSession
) {
    const stepIndex = session.registrationStep!;
    const currentStep = REGISTRATION_STEPS[stepIndex];

    // Validate and prepare value
    let value: string | boolean = answer;

    if (currentStep.field === "consent") {
        value = answer.toUpperCase() === "YES";
    } else if (currentStep.field === "thaiLevel") {
        if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(answer.toUpperCase())) {
            value = "INTERMEDIATE";
        } else {
            value = answer.toUpperCase();
        }
    }

    // Update user data
    const updateData: Record<string, unknown> = { [currentStep.field]: value };

    if (currentStep.field === "thaiLevel") {
        updateData.thaiLevel = value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    }

    await prisma.user.update({
        where: { lineUserId: userId },
        data: updateData,
    });

    // Check if registration complete
    if (stepIndex >= REGISTRATION_STEPS.length - 1) {
        // Mark as registered
        const user = await prisma.user.update({
            where: { lineUserId: userId },
            data: { isRegistered: true },
        });

        clearSession(userId);

        await replyText(
            replyToken,
            `ลงทะเบียนเรียบร้อยครับ!\n\nยินดีต้อนรับ คุณ${user.thaiName}\n\nตอนนี้คุณสามารถ:\n- ส่งงาน\n- ขอผลป้อนกลับ\n- ฝึกฝน\n- ดูแดชบอร์ด\n\nเลือกเมนูด้านล่างเพื่อเริ่มต้นได้เลยครับ`
        );
        return;
    }

    // Move to next step
    session.registrationStep = stepIndex + 1;
    const nextStep = REGISTRATION_STEPS[stepIndex + 1];

    if (nextStep.type === "quickReply" && nextStep.options) {
        await replyWithQuickReply(replyToken, nextStep.question, nextStep.options);
    } else {
        await replyText(replyToken, nextStep.question);
    }
}

// =====================
// Feedback Handlers
// =====================

async function handleFeedbackStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    const activeTask = await prisma.task.findFirst({
        where: { isActive: true },
        orderBy: { weekNumber: "desc" },
    });

    const session = getSession(userId);
    session.currentAction = "FEEDBACK";
    session.awaitingInput = true;

    if (activeTask) {
        session.feedbackTaskId = activeTask.id;
        await replyWithQuickReply(
            replyToken,
            `สวัสดีครับ คุณ${user.thaiName}!\n\n📌 ภาระงานปัจจุบัน: สัปดาห์ที่ ${activeTask.weekNumber}\n${activeTask.title}\n\nส่งฉบับร่างมาได้เลยครับ ผมจะช่วยตรวจและให้คะแนนเบื้องต้นตามเกณฑ์ 5 ข้อ`,
            [
                { label: "ขอดูโจทย์", text: `โจทย์สัปดาห์ ${activeTask.weekNumber}` },
                { label: "ยกเลิก", text: "ยกเลิก" },
            ]
        );
    } else {
        session.feedbackTaskId = undefined;
        await replyText(
            replyToken,
            `สวัสดีครับ คุณ${user.thaiName}!\n\nขณะนี้ยังไม่มีภาระงานที่เปิดรับ\n\nส่งข้อความภาษาไทยมาได้เลยครับ ผมจะช่วยตรวจและให้คำแนะนำทั่วไป`
        );
    }
}

async function handleFeedbackSubmission(replyToken: string, userId: string, content: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user) return;

    const session = getSession(userId);
    const isTaskFeedback = session.feedbackTaskId !== undefined;

    let feedbackMessage: string;

    if (isTaskFeedback) {
        const task = await prisma.task.findUnique({ where: { id: session.feedbackTaskId } });
        
        const feedback = await generateWritingFeedback(
            content,
            task?.description || "งานเขียน",
            false
        );

        await prisma.feedbackRequest.create({
            data: {
                userId: user.id,
                taskId: task?.id,
                draftContent: content,
                aiFeedback: JSON.stringify(feedback),
                pointsEarned: POINTS.REQUEST_FEEDBACK,
            },
        });

        feedbackMessage = `📝 ผลป้อนกลับจาก ProficienThAI

📊 คะแนนเบื้องต้น (เต็ม 20):
- เนื้อหา: ${feedback.scores.content}/4
- การลำดับความ: ${feedback.scores.organization}/4
- ไวยากรณ์: ${feedback.scores.grammar}/4
- คำศัพท์: ${feedback.scores.vocabulary}/4
- อักขระวิธี: ${feedback.scores.mechanics}/4
- รวม: ${feedback.scores.total}/20

${feedback.feedback}

💡 คำแนะนำ:
${feedback.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

${feedback.encouragement}

${formatPointsMessage(POINTS.REQUEST_FEEDBACK, "ขอผลป้อนกลับ")}

📌 เมื่อแก้ไขเสร็จแล้ว พิมพ์ "ส่งงาน" เพื่อส่งงานจริง`;
    } else {
        const simpleFeedback = await generateSimpleFeedback(content);

        await prisma.feedbackRequest.create({
            data: {
                userId: user.id,
                draftContent: content,
                aiFeedback: simpleFeedback,
                pointsEarned: POINTS.REQUEST_FEEDBACK,
            },
        });

        feedbackMessage = `📝 ผลป้อนกลับจาก ProficienThAI

${simpleFeedback}

${formatPointsMessage(POINTS.REQUEST_FEEDBACK, "ขอผลป้อนกลับ")}`;
    }

    const newTotalPoints = user.totalPoints + POINTS.REQUEST_FEEDBACK;
    const newLevel = calculateLevel(newTotalPoints);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totalPoints: newTotalPoints,
            currentLevel: newLevel,
        },
    });

    clearSession(userId);
    await replyText(replyToken, feedbackMessage);
}

// =====================
// Submit Work Handlers
// =====================

async function handleSubmitStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    // Get current active task
    const activeTask = await prisma.task.findFirst({
        where: { isActive: true },
        orderBy: { weekNumber: "desc" },
    });

    if (!activeTask) {
        await replyText(replyToken, "ขณะนี้ยังไม่มีภาระงานที่เปิดรับครับ กรุณารอประกาศจากอาจารย์");
        return;
    }

    const session = getSession(userId);
    session.currentAction = "SUBMIT";
    session.submitTaskId = activeTask.id;
    session.awaitingInput = true;

    await replyText(
        replyToken,
        `ภาระงานสัปดาห์ที่ ${activeTask.weekNumber}\n\n${activeTask.title}\n\n${activeTask.description}\n\nอ่านเนื้อหา: ${activeTask.contentUrl}\n\nความยาว: ${activeTask.minWords}-${activeTask.maxWords} คำ\nกำหนดส่ง: ${activeTask.deadline.toLocaleDateString("th-TH")}\n\nพิมพ์งานเขียนของคุณได้เลยครับ`
    );
}

async function handleWorkSubmission(replyToken: string, userId: string, content: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user) return;

    const session = getSession(userId);
    const taskId = session.submitTaskId;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
        clearSession(userId);
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งครับ");
        return;
    }

    // Count words (Thai)
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // Check word count
    if (wordCount < task.minWords) {
        await replyText(
            replyToken,
            `งานเขียนของคุณมี ${wordCount} คำ\nกรุณาเขียนอย่างน้อย ${task.minWords} คำ\n\nพิมพ์งานใหม่ได้เลยครับ`
        );
        return;
    }

    // Check if on time or early
    const now = new Date();
    const isOnTime = now <= task.deadline;
    const isEarly = now < new Date(task.deadline.getTime() - 24 * 60 * 60 * 1000); // 1 day early

    // Generate AI feedback
    const feedback = await generateWritingFeedback(content, task.description, true);

    // Calculate points
    let pointsEarned = isEarly ? POINTS.SUBMIT_EARLY : isOnTime ? POINTS.SUBMIT_ON_TIME : POINTS.SUBMIT_LATE;

    // Save submission
    await prisma.submission.create({
        data: {
            userId: user.id,
            taskId: task.id,
            content,
            wordCount,
            grammarScore: feedback.scores.grammar,
            vocabularyScore: feedback.scores.vocabulary,
            organizationScore: feedback.scores.organization,
            taskFulfillmentScore: feedback.scores.content,
            totalScore: feedback.scores.total,
            aiFeedback: JSON.stringify(feedback),
            pointsEarned,
            onTime: isOnTime,
            earlyBonus: isEarly,
        },
    });

    // Update user points
    const newTotalPoints = user.totalPoints + pointsEarned;
    const newLevel = calculateLevel(newTotalPoints);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totalPoints: newTotalPoints,
            currentLevel: newLevel,
        },
    });

    clearSession(userId);

    // Format submission confirmation
    const statusText = isEarly ? "ส่งก่อนกำหนด" : isOnTime ? "ส่งตรงเวลา" : "ส่งหลังกำหนด";

    const submissionMessage = `✅ ส่งงานสำเร็จ!

📌 สถานะ: ${statusText}
📝 จำนวนคำ: ${wordCount} คำ

📊 คะแนน (เต็ม 20):
- เนื้อหา: ${feedback.scores.content}/4
- การลำดับความ: ${feedback.scores.organization}/4
- ไวยากรณ์: ${feedback.scores.grammar}/4
- คำศัพท์: ${feedback.scores.vocabulary}/4
- อักขระวิธี: ${feedback.scores.mechanics}/4
- รวม: ${feedback.scores.total}/20

${feedback.feedback}

${feedback.encouragement}

${formatPointsMessage(pointsEarned, statusText)}

📅 ภาระงานถัดไปจะเริ่มในเวลา 00:00 น.`;

    await replyText(replyToken, submissionMessage);
}

// =====================
// Practice Handlers
// =====================

async function handlePracticeStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    // Get random vocabulary for practice
    const vocabularyCount = await prisma.vocabulary.count();

    if (vocabularyCount === 0) {
        await replyText(replyToken, "ขณะนี้ยังไม่มีแบบฝึกหัดครับ กรุณารอการอัปเดต");
        return;
    }

    const randomVocab = await prisma.vocabulary.findFirst({
        skip: Math.floor(Math.random() * vocabularyCount),
    });

    if (!randomVocab) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งครับ");
        return;
    }

    await replyWithQuickReply(
        replyToken,
        `ฝึกคำศัพท์\n\nคำว่า "${randomVocab.word}" หมายความว่าอะไร?\n\n${randomVocab.exampleSentence ? `ตัวอย่าง: ${randomVocab.exampleSentence}` : ""}`,
        [
            { label: "ดูคำตอบ", text: `คำตอบ:${randomVocab.meaning}` },
            { label: "ข้อถัดไป", text: "ฝึกฝน" },
            { label: "กลับเมนู", text: "แดชบอร์ด" },
        ]
    );
}

// =====================
// Dashboard Handler
// =====================

async function handleDashboard(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({
        where: { lineUserId: userId },
        include: {
            submissions: true,
            vocabularyProgress: true,
        },
    });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    const totalTasks = await prisma.task.count();

    const dashboardFlex = createDashboardFlex({
        thaiName: user.thaiName || "ผู้ใช้",
        level: user.currentLevel,
        points: user.totalPoints,
        submissionCount: user.submissions.length,
        totalTasks,
        vocabularyCount: user.vocabularyProgress.length,
        nextLevelPoints: getPointsForNextLevel(user.currentLevel),
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [dashboardFlex] as any,
    });
}

// =====================
// Profile Handler
// =====================

async function handleProfile(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    const profileFlex = createProfileFlex({
        chineseName: user.chineseName || "-",
        thaiName: user.thaiName || "-",
        university: user.university || "-",
        email: user.email || "-",
        nationality: user.nationality || "-",
        thaiLevel: user.thaiLevel,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [profileFlex] as any,
    });
}

// =====================
// Cancel Handler
// =====================

async function handleCancel(replyToken: string, userId: string) {
    clearSession(userId);
    await replyText(replyToken, `ยกเลิกการทำงานปัจจุบันแล้วครับ

พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด`);
}

// =====================
// Help Handler
// =====================

async function handleHelp(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    const helpMessage = user?.isRegistered
        ? `สวัสดีครับ คุณ${user.thaiName}!

📌 คำสั่งที่ใช้ได้:

📝 การเรียน:
• "ส่งงาน" - ส่งภาระงานประจำสัปดาห์
• "ขอผลป้อนกลับ" - ขอให้ AI ตรวจร่างงานเขียน
• "ฝึกฝน" - ฝึกคำศัพท์

🎮 เกม:
• "เกม" - ดูเกมทั้งหมด
• "คำศัพท์" - เกมคำศัพท์จีน-ไทย
• "เติมคำ" - เกมเติมคำในช่องว่าง
• "เรียงคำ" - เกมเรียงคำ
• "แต่งประโยค" - เกมแต่งประโยค

📊 อื่นๆ:
• "แดชบอร์ด" - ดูความก้าวหน้า
• "ข้อมูลส่วนตัว" - ดูข้อมูลของคุณ
• "ยกเลิก" - ยกเลิกการทำงานปัจจุบัน`
        : `ยินดีต้อนรับสู่ ProficienThAI!

📌 คำสั่งสำหรับผู้ใช้ใหม่:
• "ลงทะเบียน" - เริ่มลงทะเบียนใช้งาน

เมื่อลงทะเบียนแล้วจะสามารถ:
- ส่งงานเขียน
- ขอผลป้อนกลับจาก AI
- เล่นเกมฝึกภาษา
- สะสมแต้มและ Badge`;

    await replyText(replyToken, helpMessage);
}

// =====================
// General Conversation
// =====================

async function handleGeneralConversation(replyToken: string, userId: string, text: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    const context = user?.isRegistered
        ? `User is registered as ${user.thaiName}, Level ${user.currentLevel}`
        : "User is not registered yet";

    const response = await generateConversationResponse(text, context);

    // Award daily chat point (simple implementation)
    if (user?.isRegistered) {
        await prisma.user.update({
            where: { id: user.id },
            data: { totalPoints: { increment: POINTS.DAILY_CHAT } },
        });
    }

    await replyText(replyToken, response);
}

// =====================
// Game Handlers
// =====================

async function handleGameMenu(replyToken: string, userId: string) {
    const menuMessage = `🎮 เลือกเกมที่ต้องการเล่น:

1️⃣ คำศัพท์จีน-ไทย - พิมพ์ "คำศัพท์"
2️⃣ เติมคำในช่องว่าง - พิมพ์ "เติมคำ"
3️⃣ เรียงคำเป็นประโยค - พิมพ์ "เรียงคำ"
4️⃣ แต่งประโยคจากคำที่กำหนด - พิมพ์ "แต่งประโยค"

เลือกเกมได้เลยครับ! 🎯`;

    await replyText(replyToken, menuMessage);
}

async function handleVocabGameStart(replyToken: string, userId: string) {
    // Fetch random vocabulary questions
    const vocabs = await prisma.chineseVocabulary.findMany({
        take: 5,
        orderBy: { id: 'asc' },
    });

    if (vocabs.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำศัพท์ในระบบ");
        return;
    }

    const session = getSession(userId);
    session.currentAction = "GAME";
    session.gameType = "VOCAB";
    session.gameQuestions = vocabs;
    session.gameCurrentIndex = 0;
    session.gameCorrectCount = 0;

    const question = vocabs[0];
    await replyText(replyToken, `🇨🇳 เกมคำศัพท์จีน-ไทย (ข้อ 1/${vocabs.length})

'${question.chineseWord}' ภาษาไทยว่าอะไร?

พิมพ์คำตอบเลยครับ`);
}

async function handleFillBlankGameStart(replyToken: string, userId: string) {
    const questions = await prisma.fillBlankQuestion.findMany({
        take: 5,
        orderBy: { id: 'asc' },
    });

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ");
        return;
    }

    const session = getSession(userId);
    session.currentAction = "GAME";
    session.gameType = "FILL_BLANK";
    session.gameQuestions = questions;
    session.gameCurrentIndex = 0;
    session.gameCorrectCount = 0;

    const question = questions[0];
    await replyText(replyToken, `📝 เกมเติมคำในช่องว่าง (ข้อ 1/${questions.length})

${question.sentence}

พิมพ์คำที่ต้องใส่ในช่องว่าง`);
}

async function handleWordOrderGameStart(replyToken: string, userId: string) {
    const questions = await prisma.wordOrderQuestion.findMany({
        take: 5,
        orderBy: { id: 'asc' },
    });

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ");
        return;
    }

    const session = getSession(userId);
    session.currentAction = "GAME";
    session.gameType = "WORD_ORDER";
    session.gameQuestions = questions;
    session.gameCurrentIndex = 0;
    session.gameCorrectCount = 0;

    const question = questions[0];
    const words = question.shuffledWords as { number: number; word: string }[];
    const wordsDisplay = words.map(w => `${w.number}.${w.word}`).join(' ');

    await replyText(replyToken, `🔤 เกมเรียงคำ (ข้อ 1/${questions.length})

${wordsDisplay}

พิมพ์ประโยคที่เรียงแล้ว (ไม่ต้องใส่ตัวเลข)`);
}

async function handleSentenceGameStart(replyToken: string, userId: string) {
    const pairs = await prisma.sentenceConstructionPair.findMany({
        take: 5,
        orderBy: { id: 'asc' },
    });

    if (pairs.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ");
        return;
    }

    const session = getSession(userId);
    session.currentAction = "GAME";
    session.gameType = "SENTENCE";
    session.gameQuestions = pairs;
    session.gameCurrentIndex = 0;
    session.gameCorrectCount = 0;

    const pair = pairs[0];
    await replyText(replyToken, `✍️ เกมแต่งประโยค (ข้อ 1/${pairs.length})

แต่งประโยคโดยใช้คำว่า:
• "${pair.word1}"
• "${pair.word2}"

พิมพ์ประโยคที่แต่งเลยครับ`);
}

async function handleGameAnswer(replyToken: string, userId: string, answer: string) {
    const session = getSession(userId);
    const currentIndex = session.gameCurrentIndex ?? 0;
    const questions = session.gameQuestions ?? [];
    const question = questions[currentIndex];
    let isCorrect = false;
    let correctAnswer = "";

    // Check answer based on game type
    switch (session.gameType) {
        case "VOCAB":
            correctAnswer = question.thaiMeaning;
            isCorrect = answer.trim() === correctAnswer;
            break;
        case "FILL_BLANK":
            correctAnswer = question.answer;
            isCorrect = answer.trim() === correctAnswer;
            break;
        case "WORD_ORDER":
            correctAnswer = question.correctAnswer;
            isCorrect = answer.trim().replace(/\s+/g, '') === correctAnswer.replace(/\s+/g, '');
            break;
        case "SENTENCE":
            // For sentence construction, check if both words are used
            const usesWord1 = answer.includes(question.word1);
            const usesWord2 = answer.includes(question.word2);
            isCorrect = usesWord1 && usesWord2 && answer.length >= 10;
            correctAnswer = `${question.word1} + ${question.word2}`;
            break;
    }

    if (isCorrect) {
        session.gameCorrectCount = (session.gameCorrectCount ?? 0) + 1;
    }

    // Move to next question or finish
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
        // Game finished
        const correctCount = session.gameCorrectCount ?? 0;
        const totalCount = questions.length;
        const pointsEarned = correctCount * 10;
        const percentage = Math.round((correctCount / totalCount) * 100);

        // Update user points
        const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { totalPoints: { increment: pointsEarned } },
            });
        }

        clearSession(userId);

        const resultEmoji = percentage >= 80 ? "🎉" : percentage >= 50 ? "👍" : "💪";
        const resultMessage = percentage >= 80 ? "ยอดเยี่ยม!" : percentage >= 50 ? "ดีมาก!" : "พยายามอีกนิด!";

        await replyText(replyToken, `${isCorrect ? "✅ ถูกต้อง!" : `❌ ไม่ถูกต้อง\nคำตอบคือ: ${correctAnswer}`}

${resultEmoji} จบเกมแล้ว! ${resultMessage}

📊 ผลคะแนน:
✅ ถูก: ${correctCount}/${totalCount} ข้อ
📈 ได้คะแนน: +${pointsEarned} แต้ม
🎯 อัตราถูก: ${percentage}%

พิมพ์ "เกม" เพื่อเล่นเกมอื่นๆ`);
    } else {
        // Next question
        session.gameCurrentIndex = nextIndex;
        const nextQuestion = questions[nextIndex];
        let nextQuestionText = "";

        switch (session.gameType) {
            case "VOCAB":
                nextQuestionText = `🇨🇳 เกมคำศัพท์ (ข้อ ${nextIndex + 1}/${questions.length})

'${nextQuestion.chineseWord}' ภาษาไทยว่าอะไร?`;
                break;
            case "FILL_BLANK":
                nextQuestionText = `📝 เกมเติมคำ (ข้อ ${nextIndex + 1}/${questions.length})

${nextQuestion.sentence}`;
                break;
            case "WORD_ORDER":
                const words = nextQuestion.shuffledWords as { number: number; word: string }[];
                const wordsDisplay = words.map(w => `${w.number}.${w.word}`).join(' ');
                nextQuestionText = `🔤 เกมเรียงคำ (ข้อ ${nextIndex + 1}/${questions.length})

${wordsDisplay}`;
                break;
            case "SENTENCE":
                nextQuestionText = `✍️ เกมแต่งประโยค (ข้อ ${nextIndex + 1}/${questions.length})

ใช้คำ: "${nextQuestion.word1}" และ "${nextQuestion.word2}"`;
                break;
        }

        await replyText(replyToken, `${isCorrect ? "✅ ถูกต้อง! +10 คะแนน" : `❌ ไม่ถูกต้อง\nคำตอบคือ: ${correctAnswer}`}

${nextQuestionText}`);
    }
}

// =====================
// Leaderboard Handler
// =====================

async function handleLeaderboard(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    const topUsers = await prisma.user.findMany({
        where: { isRegistered: true },
        orderBy: { totalPoints: "desc" },
        take: 10,
        select: {
            thaiName: true,
            totalPoints: true,
            currentLevel: true,
        },
    });

    if (topUsers.length === 0) {
        await replyText(replyToken, "ยังไม่มีข้อมูลผู้ใช้ในระบบครับ");
        return;
    }

    const userRank = await prisma.user.count({
        where: {
            isRegistered: true,
            totalPoints: { gt: user.totalPoints },
        },
    });
    const myRank = userRank + 1;

    const medals = ["🥇", "🥈", "🥉"];
    const leaderboardLines = topUsers.map((u, i) => {
        const medal = i < 3 ? medals[i] : `${i + 1}.`;
        const isMe = u.thaiName === user.thaiName ? " (คุณ)" : "";
        return `${medal} ${u.thaiName}${isMe} - Lv.${u.currentLevel} (${u.totalPoints} pts)`;
    });

    const leaderboardMessage = `🏆 อันดับนักเรียน Top 10

${leaderboardLines.join("\n")}

📊 อันดับของคุณ: #${myRank}
⭐ คะแนนของคุณ: ${user.totalPoints} pts
🎯 Level: ${user.currentLevel}

พิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้าทั้งหมด`;

    await replyText(replyToken, leaderboardMessage);
}

// =====================
// Spin Wheel Handler
// =====================

const SPIN_WHEEL_REWARDS = [
    { name: "5 แต้ม", points: 5, probability: 0.30 },
    { name: "10 แต้ม", points: 10, probability: 0.25 },
    { name: "20 แต้ม", points: 20, probability: 0.20 },
    { name: "50 แต้ม", points: 50, probability: 0.10 },
    { name: "100 แต้ม", points: 100, probability: 0.05 },
    { name: "เสียใจด้วย ไม่ได้รางวัล", points: 0, probability: 0.10 },
];

const SPIN_COOLDOWN_HOURS = 24;

async function handleSpinWheel(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ");
        return;
    }

    const now = new Date();
    const lastSpin = user.lastSpinAt;
    
    if (lastSpin) {
        const hoursSinceLastSpin = (now.getTime() - lastSpin.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSpin < SPIN_COOLDOWN_HOURS) {
            const hoursRemaining = Math.ceil(SPIN_COOLDOWN_HOURS - hoursSinceLastSpin);
            await replyText(replyToken, `🎡 หมุนวงล้อได้วันละ 1 ครั้ง

⏰ กรุณารออีก ${hoursRemaining} ชั่วโมง

💡 ระหว่างรอ คุณสามารถ:
• "ส่งงาน" - ส่งภาระงานประจำสัปดาห์
• "ฝึกฝน" - ฝึกคำศัพท์
• "เกม" - เล่นเกมสะสมแต้ม`);
            return;
        }
    }

    const random = Math.random();
    let cumulativeProbability = 0;
    let reward = SPIN_WHEEL_REWARDS[SPIN_WHEEL_REWARDS.length - 1];

    for (const r of SPIN_WHEEL_REWARDS) {
        cumulativeProbability += r.probability;
        if (random < cumulativeProbability) {
            reward = r;
            break;
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totalPoints: { increment: reward.points },
            lastSpinAt: now,
        },
    });

    const spinAnimation = ["🎰", "🎡", "🎲", "🎯", "✨"];
    const randomEmoji = spinAnimation[Math.floor(Math.random() * spinAnimation.length)];

    if (reward.points > 0) {
        const newTotal = user.totalPoints + reward.points;
        await replyText(replyToken, `${randomEmoji} หมุนวงล้อ... ${randomEmoji}

🎉 ยินดีด้วย! คุณได้รับ ${reward.name}!

💰 คะแนนรวม: ${newTotal} pts
⏰ หมุนครั้งต่อไปได้ใน ${SPIN_COOLDOWN_HOURS} ชั่วโมง

พิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้าของคุณ`);
    } else {
        await replyText(replyToken, `${randomEmoji} หมุนวงล้อ... ${randomEmoji}

😅 ${reward.name}

💪 อย่าเพิ่งท้อนะครับ! โชคดีครั้งหน้า!
⏰ หมุนครั้งต่อไปได้ใน ${SPIN_COOLDOWN_HOURS} ชั่วโมง

💡 ทำกิจกรรมอื่นเพื่อสะสมแต้ม:
• "ส่งงาน" - ส่งภาระงาน
• "เกม" - เล่นเกมสะสมแต้ม`);
    }
}
