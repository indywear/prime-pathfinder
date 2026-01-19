import { WebhookEvent } from "@line/bot-sdk";
import prisma from "@/lib/db/prisma";
import {
    replyText,
    replyWithQuickReply,
    createDashboardFlex,
    createProfileFlex,
    lineClient,
} from "@/lib/line/client";
import { generateWritingFeedback, generateConversationResponse, generateSimpleFeedback } from "@/lib/ai/feedback";
import {
    POINTS,
    calculateLevel,
    getPointsForNextLevel,
    formatPointsMessage,
} from "@/lib/gamification/points";

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

const MENU_KEYWORDS = {
    REGISTER: ["ลงทะเบียน", "register", "สมัคร"],
    FEEDBACK: ["ขอผลป้อนกลับ", "feedback", "ผลป้อนกลับ"],
    SUBMIT: ["ส่งงาน", "submit", "ส่ง", "submit task"],
    PRACTICE: ["ฝึกฝน", "practice", "ฝึก"],
    DASHBOARD: ["แดชบอร์ด", "dashboard", "ความก้าวหน้า", "ดูความก้าวหน้า"],
    PROFILE: ["ข้อมูลส่วนตัว", "profile", "โปรไฟล์"],
    CANCEL: ["ยกเลิก", "cancel", "หยุด", "ออก"],
    HELP: ["ช่วยเหลือ", "help", "วิธีใช้", "เมนู", "menu", "รายการ"],
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

export async function handleTextMessage(
    event: WebhookEvent & { type: "message"; message: { type: "text"; text: string } }
) {
    const userId = event.source.userId;
    if (!userId) return;

    const text = event.message.text.trim();

    const user = await prisma.user.findUnique({
        where: { lineUserId: userId },
    });

    if (user && !user.isRegistered && user.registrationStep >= 0 && user.registrationStep < REGISTRATION_STEPS.length) {
        if (detectMenuAction(text) === "CANCEL") {
            await prisma.user.update({
                where: { lineUserId: userId },
                data: { registrationStep: -1 },
            });
            await replyText(event.replyToken, `ยกเลิกการลงทะเบียนแล้วครับ\n\nพิมพ์ "ลงทะเบียน" เพื่อเริ่มใหม่`);
            return;
        }
        
        await handleRegistrationStep(event.replyToken, userId, text, user.registrationStep);
        return;
    }

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
                await replyText(event.replyToken, "ไม่มีการทำงานที่ต้องยกเลิกครับ");
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

    await handleGeneralConversation(event.replyToken, userId, text);
}

async function handleRegisterStart(replyToken: string, userId: string) {
    const existingUser = await prisma.user.findUnique({
        where: { lineUserId: userId },
    });

    if (existingUser?.isRegistered) {
        await replyText(
            replyToken,
            `สวัสดีครับ คุณ${existingUser.thaiName}! คุณลงทะเบียนแล้ว\n\nพิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้า\nหรือ "ข้อมูลส่วนตัว" เพื่อดูข้อมูลของคุณ`
        );
        return;
    }

    await prisma.user.upsert({
        where: { lineUserId: userId },
        update: { registrationStep: 0 },
        create: { lineUserId: userId, registrationStep: 0 },
    });

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
    stepIndex: number
) {
    const currentStep = REGISTRATION_STEPS[stepIndex];

    let value: string | boolean = answer;

    if (currentStep.field === "consent") {
        value = answer.toUpperCase() === "YES" || answer === "ยินยอม";
    } else if (currentStep.field === "thaiLevel") {
        const upperAnswer = answer.toUpperCase();
        if (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(upperAnswer)) {
            value = upperAnswer;
        } else {
            value = "INTERMEDIATE";
        }
    }

    const updateData: Record<string, unknown> = { 
        [currentStep.field]: value,
        registrationStep: stepIndex + 1,
    };

    if (stepIndex >= REGISTRATION_STEPS.length - 1) {
        updateData.isRegistered = true;
        updateData.registrationStep = -1;

        const user = await prisma.user.update({
            where: { lineUserId: userId },
            data: updateData,
        });

        await replyText(
            replyToken,
            `🎉 ลงทะเบียนเรียบร้อยครับ!\n\nยินดีต้อนรับ คุณ${user.thaiName}\n\nตอนนี้คุณสามารถ:\n• พิมพ์ "ส่งงาน" - ส่งภาระงาน\n• พิมพ์ "ขอผลป้อนกลับ" - ขอให้ AI ตรวจงาน\n• พิมพ์ "เกม" - เล่นเกมสะสมแต้ม\n• พิมพ์ "แดชบอร์ด" - ดูความก้าวหน้า\n\nหรือพิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด`
        );
        return;
    }

    await prisma.user.update({
        where: { lineUserId: userId },
        data: updateData,
    });

    const nextStep = REGISTRATION_STEPS[stepIndex + 1];

    if (nextStep.type === "quickReply" && nextStep.options) {
        await replyWithQuickReply(replyToken, nextStep.question, nextStep.options);
    } else {
        await replyText(replyToken, nextStep.question);
    }
}

async function handleFeedbackStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    await replyText(
        replyToken,
        `สวัสดีครับ คุณ${user.thaiName}!\n\n📝 ส่งข้อความภาษาไทยที่ต้องการให้ตรวจมาได้เลยครับ\n\nผมจะช่วยตรวจและให้คำแนะนำ`
    );
}

async function handleSubmitStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const activeTask = await prisma.task.findFirst({
        where: { isActive: true },
        orderBy: { weekNumber: "desc" },
    });

    if (!activeTask) {
        await replyText(replyToken, "ขณะนี้ยังไม่มีภาระงานที่เปิดรับครับ กรุณารอประกาศจากอาจารย์");
        return;
    }

    await replyText(
        replyToken,
        `📌 ภาระงานสัปดาห์ที่ ${activeTask.weekNumber}\n\n${activeTask.title}\n\n${activeTask.description}\n\n📖 อ่านเนื้อหา: ${activeTask.contentUrl}\n\n✏️ ความยาว: ${activeTask.minWords}-${activeTask.maxWords} คำ\n📅 กำหนดส่ง: ${activeTask.deadline.toLocaleDateString("th-TH")}\n\nพิมพ์งานเขียนของคุณได้เลยครับ`
    );
}

async function handlePracticeStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const vocabularyCount = await prisma.vocabulary.count();

    if (vocabularyCount === 0) {
        await replyText(replyToken, "ขณะนี้ยังไม่มีแบบฝึกหัดครับ กรุณารอการอัปเดต\n\nลองพิมพ์ \"เกม\" เพื่อเล่นเกมอื่นๆ");
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
        `🔤 ฝึกคำศัพท์\n\nคำว่า "${randomVocab.word}" หมายความว่าอะไร?\n\n${randomVocab.exampleSentence ? `ตัวอย่าง: ${randomVocab.exampleSentence}` : ""}`,
        [
            { label: "ดูคำตอบ", text: `คำตอบ: ${randomVocab.meaning}` },
            { label: "ข้อถัดไป", text: "ฝึกฝน" },
            { label: "กลับเมนู", text: "เมนู" },
        ]
    );
}

async function handleDashboard(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({
        where: { lineUserId: userId },
        include: {
            submissions: true,
            vocabularyProgress: true,
        },
    });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
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

async function handleProfile(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
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

async function handleHelp(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    const helpMessage = user?.isRegistered
        ? `สวัสดีครับ คุณ${user.thaiName}! 👋

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
• "อันดับ" - ดู Leaderboard
• "หมุนวงล้อ" - หมุนวงล้อลุ้นรางวัล`
        : `ยินดีต้อนรับสู่ ProficienThAI! 👋

📌 คำสั่งสำหรับผู้ใช้ใหม่:
• "ลงทะเบียน" - เริ่มลงทะเบียนใช้งาน

เมื่อลงทะเบียนแล้วจะสามารถ:
✅ ส่งงานเขียน
✅ ขอผลป้อนกลับจาก AI
✅ เล่นเกมฝึกภาษา
✅ สะสมแต้มและ Badge`;

    await replyText(replyToken, helpMessage);
}

async function handleGeneralConversation(replyToken: string, userId: string, text: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    const context = user?.isRegistered
        ? `User is registered as ${user.thaiName}, Level ${user.currentLevel}`
        : "User is not registered yet";

    const response = await generateConversationResponse(text, context);

    if (user?.isRegistered) {
        await prisma.user.update({
            where: { id: user.id },
            data: { totalPoints: { increment: POINTS.DAILY_CHAT } },
        });
    }

    await replyText(replyToken, response);
}

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
    const vocabs = await prisma.chineseVocabulary.findMany({
        take: 5,
        orderBy: { id: 'asc' },
    });

    if (vocabs.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำศัพท์ในระบบ");
        return;
    }

    const question = vocabs[0];
    await replyText(replyToken, `🇨🇳 เกมคำศัพท์จีน-ไทย

"${question.chineseWord}" ภาษาไทยว่าอะไร?

💡 เฉลย: ${question.thaiMeaning}

พิมพ์ "คำศัพท์" เพื่อดูคำถัดไป`);
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

    const question = questions[0];
    await replyText(replyToken, `📝 เกมเติมคำในช่องว่าง

${question.sentence}

💡 เฉลย: ${question.answer}

พิมพ์ "เติมคำ" เพื่อดูคำถัดไป`);
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

    const question = questions[0];
    const words = question.shuffledWords as { number: number; word: string }[];
    const wordsDisplay = words.map(w => `${w.number}.${w.word}`).join(' ');

    await replyText(replyToken, `🔤 เกมเรียงคำ

${wordsDisplay}

💡 เฉลย: ${question.correctAnswer}

พิมพ์ "เรียงคำ" เพื่อดูคำถัดไป`);
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

    const pair = pairs[0];
    await replyText(replyToken, `✍️ เกมแต่งประโยค

แต่งประโยคโดยใช้คำว่า:
• "${pair.word1}"
• "${pair.word2}"

พิมพ์ "แต่งประโยค" เพื่อดูคำถัดไป`);
}

async function handleLeaderboard(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
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
🎯 Level: ${user.currentLevel}`;

    await replyText(replyToken, leaderboardMessage);
}

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
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const now = new Date();
    const lastSpin = user.lastSpinAt;
    
    if (lastSpin) {
        const hoursSinceLastSpin = (now.getTime() - lastSpin.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSpin < SPIN_COOLDOWN_HOURS) {
            const hoursRemaining = Math.ceil(SPIN_COOLDOWN_HOURS - hoursSinceLastSpin);
            await replyText(replyToken, `🎡 หมุนวงล้อได้วันละ 1 ครั้ง

⏰ กรุณารออีก ${hoursRemaining} ชั่วโมง`);
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

    if (reward.points > 0) {
        const newTotal = user.totalPoints + reward.points;
        await replyText(replyToken, `🎡 หมุนวงล้อ... ✨

🎉 ยินดีด้วย! คุณได้รับ ${reward.name}!

💰 คะแนนรวม: ${newTotal} pts
⏰ หมุนครั้งต่อไปได้ใน ${SPIN_COOLDOWN_HOURS} ชั่วโมง`);
    } else {
        await replyText(replyToken, `🎡 หมุนวงล้อ... ✨

😅 ${reward.name}

💪 อย่าเพิ่งท้อนะครับ! โชคดีครั้งหน้า!`);
    }
}
