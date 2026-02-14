import { WebhookEvent } from "@line/bot-sdk";
import prisma from "@/lib/db/prisma";
import {
    replyText,
    replyWithQuickReply,
    createDashboardFlex,
    createProfileFlex,
    createMenuFlex,
    createPracticeMenuFlex,
    createLeaderboardFlex,
    createFillBlankGameFlex,
    createMultipleChoiceGameFlex,
    createSentenceGameFlex,
    createSpinWheelResultFlex,
    createWelcomeFlex,
    createEditProfileFlex,
    createGameResultFlex,
    createQuickReply,
    createTextMessage,
    lineClient,
    // New Flex Messages for Game Categories
    createGameCategoryMenuFlex,
    createVocabGamesMenuFlex,
    createGrammarGamesMenuFlex,
    createReadingGamesMenuFlex,
    createFunGamesMenuFlex,
    createVocabMatchGameFlex,
    createVocabMeaningGameFlex,
    createVocabOppositeGameFlex,
    createVocabSynonymGameFlex,
    createFixSentenceGameFlex,
    createArrangeSentenceGameFlex,
    createSpeedGrammarGameFlex,
    createReadAnswerGameFlex,
    createSummarizeGameFlex,
    createContinueStoryGameFlex,
    createDailyVocabFlex,
    createRaceClockGameFlex,
    createGachaResultFlex,
    createMyTaskFlex,
} from "@/lib/line/client";
import { generateWritingFeedback, generateConversationResponse, generateSimpleFeedback } from "@/lib/ai/feedback";
import {
    POINTS,
    calculateLevel,
    getPointsForNextLevel,
    formatPointsMessage,
} from "@/lib/gamification/points";
import { SPIN_WHEEL_PRIZES } from "@/lib/gamification/rewards";

// Game Logic Imports
import {
    getRandomVocabMatchQuestions,
    getVocabMatchOptions,
    checkVocabMatchAnswer,
    formatVocabMatchQuestion,
} from "@/lib/games/vocabMatch";
import {
    getRandomVocabMeaningQuestions,
    checkVocabMeaningAnswer,
    formatVocabMeaningQuestion,
} from "@/lib/games/vocabMeaning";
import {
    getRandomVocabOppositeQuestions,
    getVocabOppositeOptions,
    checkVocabOppositeAnswer,
    formatVocabOppositeQuestion,
} from "@/lib/games/vocabOpposite";
import {
    getRandomVocabSynonymQuestions,
    getVocabSynonymOptions,
    checkVocabSynonymAnswer,
    formatVocabSynonymQuestion,
} from "@/lib/games/vocabSynonym";
import {
    getRandomFixSentenceQuestions,
    checkFixSentenceAnswer,
    formatFixSentenceQuestion,
} from "@/lib/games/fixSentence";
import {
    getRandomArrangeSentenceQuestions,
    checkArrangeSentenceAnswer,
    formatArrangeSentenceQuestion,
} from "@/lib/games/arrangeSentence";
import {
    getRandomSpeedGrammarQuestions,
    checkSpeedGrammarAnswer,
    formatSpeedGrammarQuestion,
    getSpeedGrammarCorrectOption,
} from "@/lib/games/speedGrammar";
import {
    getRandomReadAnswerQuestions,
    checkReadAnswerAnswer,
    formatReadAnswerQuestion,
    getReadAnswerCorrectOption,
} from "@/lib/games/readAnswer";
import {
    getRandomSummarizeQuestions,
    evaluateSummary,
    formatSummarizeQuestion,
} from "@/lib/games/summarize";
import {
    getRandomContinueStoryQuestions,
    evaluateContinuation,
    formatContinueStoryQuestion,
} from "@/lib/games/continueStory";
import {
    getTodayVocab,
    hasLearnedToday,
    recordDailyVocabLearned,
    formatDailyVocab,
} from "@/lib/games/dailyVocab";
import {
    getRandomRaceClockQuestions,
    checkRaceClockAnswer,
    calculateRaceClockPoints,
    formatRaceClockQuestion,
    getRaceClockCorrectOption,
} from "@/lib/games/raceClock";
import {
    pullGacha,
    canPullGacha,
    recordGachaPull,
    formatGachaResult,
} from "@/lib/games/vocabGacha";
import { recordQuestionAnswered } from "@/lib/games/questionHistory";
import { evaluateSentence } from "@/lib/games/sentenceConstruction";

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

    // === Game Category Menus (ต้องอยู่ก่อน PRACTICE เพราะมีคำ "เกม" ซ้ำกัน) ===
    VOCAB_GAMES: ["เกมคำศัพท์", "vocab games"],
    GRAMMAR_GAMES: ["เกมไวยากรณ์", "grammar games"],
    READING_GAMES: ["เกมอ่าน", "เกมอ่านเขียน", "reading games"],
    FUN_GAMES: ["เกมสนุก", "fun games"],

    PRACTICE: ["ฝึกฝน", "practice", "ฝึก", "เล่นเกม"],
    DASHBOARD: ["แดชบอร์ด", "dashboard", "ความก้าวหน้า", "ดูความก้าวหน้า"],
    PROFILE: ["ข้อมูลส่วนตัว", "profile", "โปรไฟล์"],
    EDIT_PROFILE: ["แก้ไขข้อมูล", "แก้ไขชื่อ", "เปลี่ยนชื่อ", "edit profile", "แก้ไข"],
    CANCEL: ["ยกเลิก", "cancel", "หยุด", "ออก", "ออกจากเกม"],
    HELP: ["ช่วยเหลือ", "help", "วิธีใช้", "เมนู", "menu", "รายการ"],
    LEADERBOARD: ["leaderboard", "อันดับ", "ลีดเดอร์บอร์ด", "ranking"],
    SPIN_WHEEL: ["spin wheel", "สปินวงล้อ", "วงล้อ", "spin", "หมุนวงล้อ"],
    MY_TASK: ["ภาระงาน", "task", "การบ้าน", "งานประจำสัปดาห์", "งานอาจารย์"],
    SHOW_ANSWER: ["เฉลย", "ดูเฉลย", "คำตอบ", "answer"],
    SKIP_QUESTION: ["ข้าม", "skip"],

    // === Vocabulary Games (4 เกม) ===
    VOCAB_MATCH_GAME: ["จับคู่คำ", "vocab match", "จับคู่"],
    VOCAB_MEANING_GAME: ["ความหมาย", "vocab meaning", "แปลคำ"],
    VOCAB_OPPOSITE_GAME: ["คำตรงข้าม", "opposite", "ตรงข้าม"],
    VOCAB_SYNONYM_GAME: ["คำพ้อง", "synonym", "พ้องความหมาย"],

    // === Grammar Games (4 เกม) ===
    FILL_BLANK_GAME: ["เติมคำ", "fill blank", "fillblank"],
    FIX_SENTENCE_GAME: ["แก้ประโยค", "fix sentence", "ประโยคผิด"],
    ARRANGE_SENTENCE_GAME: ["เรียงประโยค", "arrange", "เรียงคำ"],
    SPEED_GRAMMAR_GAME: ["speed grammar", "สปีดแกรมม่า", "ไวยากรณ์เร็ว"],

    // === Reading & Writing Games (4 เกม) ===
    READ_ANSWER_GAME: ["อ่านตอบ", "read answer", "อ่านแล้วตอบ"],
    SENTENCE_GAME: ["เขียนประโยค", "แต่งประโยค", "sentence", "เขียน"],
    SUMMARIZE_GAME: ["สรุปเรื่อง", "summarize", "สรุป"],
    CONTINUE_STORY_GAME: ["เขียนต่อ", "continue story", "ต่อเรื่อง"],

    // === Fun Games (3 เกม) ===
    DAILY_VOCAB_GAME: ["คำศัพท์วันนี้", "daily vocab", "คำวันนี้"],
    RACE_CLOCK_GAME: ["แข่งเวลา", "race clock", "แข่งกับเวลา"],
    VOCAB_GACHA_GAME: ["กาชา", "gacha", "สุ่มคำ"],

    // Legacy support
    MULTIPLE_CHOICE_GAME: ["เลือกตอบ", "multiple choice", "เลือก"],
};

// Fields that can be edited
const EDITABLE_FIELDS = [
    { key: "thaiName", label: "ชื่อไทย", question: "พิมพ์ชื่อไทยใหม่ของคุณ:" },
    { key: "chineseName", label: "ชื่อจีน", question: "พิมพ์ชื่อจีนใหม่ของคุณ:" },
    { key: "email", label: "อีเมล", question: "พิมพ์อีเมลใหม่ของคุณ:" },
    { key: "university", label: "มหาวิทยาลัย", question: "พิมพ์ชื่อมหาวิทยาลัยใหม่:" },
];

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
    console.log(`[handleTextMessage] Start processing for user: ${event.source.userId}, text: ${event.message.text}`);
    try {
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
                case "EDIT_PROFILE":
                    await handleEditProfileMenu(event.replyToken, userId);
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
                case "MY_TASK":
                    await handleMyTask(event.replyToken, userId);
                    break;
                case "SHOW_ANSWER":
                    await handleShowAnswer(event.replyToken, userId);
                    break;
                case "SKIP_QUESTION":
                    await handleSkipQuestion(event.replyToken, userId);
                    break;

                // Game Category Menus
                case "VOCAB_GAMES":
                    await handleVocabGamesMenu(event.replyToken, userId);
                    break;
                case "GRAMMAR_GAMES":
                    await handleGrammarGamesMenu(event.replyToken, userId);
                    break;
                case "READING_GAMES":
                    await handleReadingGamesMenu(event.replyToken, userId);
                    break;
                case "FUN_GAMES":
                    await handleFunGamesMenu(event.replyToken, userId);
                    break;

                // Vocabulary Games
                case "VOCAB_MATCH_GAME":
                    await handleVocabMatchGameStart(event.replyToken, userId);
                    break;
                case "VOCAB_MEANING_GAME":
                    await handleVocabMeaningGameStart(event.replyToken, userId);
                    break;
                case "VOCAB_OPPOSITE_GAME":
                    await handleVocabOppositeGameStart(event.replyToken, userId);
                    break;
                case "VOCAB_SYNONYM_GAME":
                    await handleVocabSynonymGameStart(event.replyToken, userId);
                    break;

                // Grammar Games
                case "FILL_BLANK_GAME":
                    await handleFillBlankGameStart(event.replyToken, userId);
                    break;
                case "FIX_SENTENCE_GAME":
                    await handleFixSentenceGameStart(event.replyToken, userId);
                    break;
                case "ARRANGE_SENTENCE_GAME":
                    await handleArrangeSentenceGameStart(event.replyToken, userId);
                    break;
                case "SPEED_GRAMMAR_GAME":
                    await handleSpeedGrammarGameStart(event.replyToken, userId);
                    break;

                // Reading & Writing Games
                case "READ_ANSWER_GAME":
                    await handleReadAnswerGameStart(event.replyToken, userId);
                    break;
                case "SENTENCE_GAME":
                    await handleSentenceGameStart(event.replyToken, userId);
                    break;
                case "SUMMARIZE_GAME":
                    await handleSummarizeGameStart(event.replyToken, userId);
                    break;
                case "CONTINUE_STORY_GAME":
                    await handleContinueStoryGameStart(event.replyToken, userId);
                    break;

                // Fun Games
                case "DAILY_VOCAB_GAME":
                    await handleDailyVocabGameStart(event.replyToken, userId);
                    break;
                case "RACE_CLOCK_GAME":
                    await handleRaceClockGameStart(event.replyToken, userId);
                    break;
                case "VOCAB_GACHA_GAME":
                    await handleVocabGachaGameStart(event.replyToken, userId);
                    break;

                // Legacy
                case "MULTIPLE_CHOICE_GAME":
                    await handleMultipleChoiceGameStart(event.replyToken, userId);
                    break;
            }
            return;
        }

        // Check if user wants to edit a specific field (e.g., "แก้ไข:ชื่อไทย")
        if (text.startsWith("แก้ไข:")) {
            const fieldToEdit = text.replace("แก้ไข:", "").trim();
            await handleEditFieldStart(event.replyToken, userId, fieldToEdit);
            return;
        }

        // Check if user is in editing mode
        if (user?.currentGameType?.startsWith("editing:")) {
            await handleEditFieldSubmit(event.replyToken, user, text);
            return;
        }

        // Check if user is submitting a task
        if (user?.currentGameType === "SUBMITTING_TASK") {
            if (text === "ยกเลิก" || text === "cancel") {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentGameType: null, currentQuestionId: null, gameData: null },
                });
                await replyText(event.replyToken, "ยกเลิกการส่งงานแล้วครับ\n\nพิมพ์ \"เมนู\" เพื่อดูตัวเลือก");
            } else {
                await handleSubmitWriting(event.replyToken, user, text);
            }
            return;
        }

        // Check if user is in a game
        if (user?.currentGameType && user?.currentQuestionId) {
            await handleGameAnswer(event.replyToken, user, text);
            return;
        }

        await handleGeneralConversation(event.replyToken, userId, text);
    } catch (error) {
        console.error(`[handleTextMessage] Error for user ${event.source.userId}:`, error);
        await replyText(event.replyToken, "ขออภัยครับ ระบบขัดข้องในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือพิมพ์ 'เมนู' เพื่อเริ่มใหม่");
    }
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

    // Check if already submitted
    const existingSubmission = await prisma.submission.findFirst({
        where: { userId: user.id, taskId: activeTask.id },
    });

    if (existingSubmission) {
        await replyText(
            replyToken,
            `คุณส่งงานสัปดาห์ที่ ${activeTask.weekNumber} แล้วครับ\n\n📊 คะแนน: ${existingSubmission.totalScore}/100\n\nพิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้า`
        );
        return;
    }

    // Set state to SUBMITTING_TASK so next message is treated as a submission
    await prisma.user.update({
        where: { id: user.id },
        data: {
            currentGameType: "SUBMITTING_TASK",
            currentQuestionId: activeTask.id,
            gameData: JSON.stringify({
                taskId: activeTask.id,
                weekNumber: activeTask.weekNumber,
                minWords: activeTask.minWords,
                maxWords: activeTask.maxWords,
                title: activeTask.title,
            }),
        },
    });

    await replyWithQuickReply(
        replyToken,
        `📌 ภาระงานสัปดาห์ที่ ${activeTask.weekNumber}\n\n${activeTask.title}\n\n${activeTask.description}\n\n📖 อ่านเนื้อหา: ${activeTask.contentUrl}\n\n✏️ ความยาว: ${activeTask.minWords}-${activeTask.maxWords} คำ\n📅 กำหนดส่ง: ${activeTask.deadline.toLocaleDateString("th-TH")}\n\n✍️ พิมพ์งานเขียนของคุณได้เลยครับ\n(พิมพ์ "ยกเลิก" เพื่อยกเลิก)`,
        [{ label: "ยกเลิก", text: "ยกเลิก" }]
    );
}

async function handleSubmitWriting(replyToken: string, user: any, text: string) {
    try {
        let gameData: any = {};
        try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }
        const taskId = gameData.taskId || user.currentQuestionId;
        const minWords = gameData.minWords || 80;
        const maxWords = gameData.maxWords || 120;

        // Count words (Thai: split by spaces and common delimiters)
        const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

        if (wordCount < Math.floor(minWords * 0.5)) {
            await replyWithQuickReply(
                replyToken,
                `⚠️ งานเขียนของคุณสั้นเกินไปครับ (${wordCount} คำ)\n\nความยาวขั้นต่ำ: ${minWords} คำ\n\nกรุณาเขียนเพิ่มเติมแล้วส่งใหม่ครับ`,
                [{ label: "ยกเลิก", text: "ยกเลิก" }]
            );
            return;
        }

        // Get the task for deadline check
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            await replyText(replyToken, "ไม่พบภาระงานนี้แล้วครับ กรุณาลองใหม่");
            await prisma.user.update({
                where: { id: user.id },
                data: { currentGameType: null, currentQuestionId: null, gameData: null },
            });
            return;
        }

        const onTime = new Date() <= new Date(task.deadline);
        const earlyBonus = new Date() < new Date(new Date(task.deadline).getTime() - 24 * 60 * 60 * 1000);

        // Create submission
        const submission = await prisma.submission.create({
            data: {
                userId: user.id,
                taskId: taskId,
                content: text,
                wordCount: wordCount,
                onTime: onTime,
                earlyBonus: earlyBonus,
            },
        });

        // Award points
        let pointsEarned = 20; // base points for submission
        if (onTime) pointsEarned += 10;
        if (earlyBonus) pointsEarned += 10;

        // Clear submission state + award points in single update
        await prisma.user.update({
            where: { id: user.id },
            data: {
                currentGameType: null,
                currentQuestionId: null,
                gameData: null,
                totalPoints: { increment: pointsEarned },
            },
        });

        // Try to generate AI feedback
        let feedbackMsg = "";
        try {
            const feedback = await generateWritingFeedback(text, `${task.title}: ${task.description}`, true);
            if (feedback) {
                const scores = {
                    grammarScore: Math.round(feedback.scores.grammar * 6.25), // scale 1-4 to 0-25
                    vocabularyScore: Math.round(feedback.scores.vocabulary * 6.25),
                    organizationScore: Math.round(feedback.scores.organization * 6.25),
                    taskFulfillmentScore: Math.round(feedback.scores.content * 6.25),
                    totalScore: Math.round(feedback.scores.total * 5), // scale 1-20 to 0-100
                    aiFeedback: feedback.feedback + "\n\n" + feedback.encouragement,
                };

                await prisma.submission.update({
                    where: { id: submission.id },
                    data: scores,
                });

                feedbackMsg = `\n\n📊 คะแนน: ${scores.totalScore}/100\n` +
                    `📝 ไวยากรณ์: ${scores.grammarScore}/25\n` +
                    `📚 คำศัพท์: ${scores.vocabularyScore}/25\n` +
                    `📋 โครงสร้าง: ${scores.organizationScore}/25\n` +
                    `✅ เนื้อหา: ${scores.taskFulfillmentScore}/25\n` +
                    `\n💬 ${feedback.feedback}`;
            }
        } catch (feedbackError) {
            console.error("AI feedback error:", feedbackError);
            feedbackMsg = "\n\n(AI กำลังประเมินงาน รอสักครู่...)";
        }

        await prisma.submission.update({
            where: { id: submission.id },
            data: { pointsEarned },
        });

        await replyWithQuickReply(
            replyToken,
            `✅ ส่งงานสัปดาห์ที่ ${gameData.weekNumber} เรียบร้อยแล้วครับ!\n\n📝 จำนวนคำ: ${wordCount}\n${onTime ? "⏰ ส่งตรงเวลา" : "⚠️ ส่งเลยกำหนด"}\n${earlyBonus ? "🌟 โบนัสส่งก่อนเวลา!" : ""}\n💰 +${pointsEarned} คะแนน${feedbackMsg}`,
            [
                { label: "แดชบอร์ด", text: "แดชบอร์ด" },
                { label: "เมนู", text: "เมนู" },
            ]
        );
    } catch (error) {
        console.error("Submit writing error:", error);
        await prisma.user.update({
            where: { id: user.id },
            data: { currentGameType: null, currentQuestionId: null, gameData: null },
        });
        await replyText(replyToken, "เกิดข้อผิดพลาดในการส่งงานครับ กรุณาลองใหม่อีกครั้ง\n\nพิมพ์ \"ส่งงาน\" เพื่อลองใหม่");
    }
}

async function handlePracticeStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    // Show practice menu with 3 game types
    const practiceMenuFlex = createPracticeMenuFlex();
    await lineClient.replyMessage({
        replyToken,
        messages: [practiceMenuFlex] as any,
    });
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

    if (user?.isRegistered) {
        const menuFlex = createMenuFlex();
        await lineClient.replyMessage({
            replyToken,
            messages: [menuFlex] as any,
        });
    } else {
        await replyText(replyToken, `ยินดีต้อนรับสู่ ProficienThAI! 👋

📌 คำสั่งสำหรับผู้ใช้ใหม่:
• "ลงทะเบียน" - เริ่มลงทะเบียนใช้งาน

เมื่อลงทะเบียนแล้วจะสามารถ:
✅ ส่งงานเขียน
✅ ขอผลป้อนกลับจาก AI
✅ เล่นเกมฝึกภาษา
✅ สะสมแต้มและ Badge`);
    }
}

// Greeting patterns to detect
const GREETING_PATTERNS = ["สวัสดี", "หวัดดี", "ดีครับ", "ดีค่ะ", "hello", "hi", "hey", "ไง"];

function isGreeting(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    return GREETING_PATTERNS.some(pattern => lowerText.includes(pattern.toLowerCase()));
}

async function handleGeneralConversation(replyToken: string, userId: string, text: string) {
    console.log("[handleGeneralConversation] Starting for user:", userId, "text:", text.substring(0, 50));

    try {
        const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
        console.log("[handleGeneralConversation] User found:", !!user, "isRegistered:", user?.isRegistered);

        // For greetings, show Welcome Flex Message (cleaner UI)
        if (isGreeting(text) && user?.isRegistered) {
            const welcomeFlex = createWelcomeFlex(user.thaiName || undefined);
            await lineClient.replyMessage({
                replyToken,
                messages: [welcomeFlex] as any,
            });
            return;
        }

        // For non-greetings, use AI with Quick Reply buttons
        const context = user?.isRegistered
            ? `User: ${user.thaiName}, Level ${user.currentLevel}. Keep response SHORT (1-2 sentences max). No emoji.`
            : "User not registered. Keep response SHORT. No emoji.";

        console.log("[handleGeneralConversation] Calling AI with context:", context);
        const response = await generateConversationResponse(text, context);
        console.log("[handleGeneralConversation] AI response received:", response.substring(0, 50));

        if (user?.isRegistered) {
            await prisma.user.update({
                where: { id: user.id },
                data: { totalPoints: { increment: POINTS.DAILY_CHAT } },
            });
        }

        // Reply with Quick Reply buttons for easy navigation
        const quickReplyOptions = [
            { label: "เล่นเกม", text: "เกม" },
            { label: "เมนู", text: "เมนู" },
            { label: "แดชบอร์ด", text: "แดชบอร์ด" },
        ];
        await replyWithQuickReply(replyToken, response, quickReplyOptions);
        console.log("[handleGeneralConversation] Reply sent successfully");
    } catch (error) {
        console.error("[handleGeneralConversation] Error:", error);
        await replyText(replyToken, "ขอโทษครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
    }
}

// =====================
// Edit Profile Handlers
// =====================

async function handleEditProfileMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ พิมพ์ 'ลงทะเบียน' เพื่อเริ่มต้น");
        return;
    }

    const editFlex = createEditProfileFlex({
        thaiName: user.thaiName || "-",
        chineseName: user.chineseName || "-",
        email: user.email || "-",
        university: user.university || "-",
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [editFlex] as any,
    });
}

const FIELD_MAP: Record<string, { dbField: string; label: string }> = {
    "ชื่อไทย": { dbField: "thaiName", label: "ชื่อไทย" },
    "ชื่อจีน": { dbField: "chineseName", label: "ชื่อจีน" },
    "อีเมล": { dbField: "email", label: "อีเมล" },
    "มหาวิทยาลัย": { dbField: "university", label: "มหาวิทยาลัย" },
};

async function handleEditFieldStart(replyToken: string, userId: string, fieldName: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ");
        return;
    }

    const fieldInfo = FIELD_MAP[fieldName];
    if (!fieldInfo) {
        await replyText(replyToken, "ไม่พบข้อมูลที่ต้องการแก้ไข พิมพ์ 'แก้ไข' เพื่อดูตัวเลือก");
        return;
    }

    // Store editing state
    await prisma.user.update({
        where: { id: user.id },
        data: { currentGameType: `editing:${fieldInfo.dbField}` },
    });

    await replyWithQuickReply(
        replyToken,
        `พิมพ์${fieldInfo.label}ใหม่ของคุณ:`,
        [{ label: "ยกเลิก", text: "ยกเลิกแก้ไข" }]
    );
}

async function handleEditFieldSubmit(replyToken: string, user: any, newValue: string) {
    // Check for cancel
    if (newValue === "ยกเลิกแก้ไข" || newValue === "ยกเลิก") {
        await prisma.user.update({
            where: { id: user.id },
            data: { currentGameType: null },
        });
        await replyText(replyToken, "ยกเลิกการแก้ไขแล้วครับ");
        return;
    }

    const editingField = user.currentGameType.replace("editing:", "");

    // Find the label for confirmation message
    const fieldEntry = Object.entries(FIELD_MAP).find(([, v]) => v.dbField === editingField);
    const fieldLabel = fieldEntry ? fieldEntry[1].label : editingField;

    // Update the field
    await prisma.user.update({
        where: { id: user.id },
        data: {
            [editingField]: newValue,
            currentGameType: null,
        },
    });

    await replyWithQuickReply(
        replyToken,
        `อัพเดท${fieldLabel}เป็น "${newValue}" เรียบร้อยแล้วครับ`,
        [
            { label: "แก้ไขเพิ่ม", text: "แก้ไข" },
            { label: "ดูข้อมูล", text: "ข้อมูลส่วนตัว" },
        ]
    );
}

async function handleFillBlankGameStart(replyToken: string, userId: string) {
    const count = await prisma.fillBlankQuestion.count();

    if (count === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await prisma.fillBlankQuestion.findFirst({
        skip: randomIndex,
    });

    if (!question) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    await prisma.user.update({
        where: { lineUserId: userId },
        data: { currentGameType: "FILL_BLANK", currentQuestionId: question.id },
    });

    const fillBlankFlex = createFillBlankGameFlex({
        sentence: question.sentence,
        questionNumber: randomIndex + 1,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [fillBlankFlex] as any,
    });
}

async function handleMultipleChoiceGameStart(replyToken: string, userId: string) {
    const count = await prisma.multipleChoiceQuestion.count();

    if (count === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ หรือลองเกมอื่น");
        return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await prisma.multipleChoiceQuestion.findFirst({
        skip: randomIndex,
    });

    if (!question) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    await prisma.user.update({
        where: { lineUserId: userId },
        data: { currentGameType: "MULTIPLE_CHOICE", currentQuestionId: question.id },
    });

    const multipleChoiceFlex = createMultipleChoiceGameFlex({
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        questionNumber: randomIndex + 1,
        totalQuestions: count,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [multipleChoiceFlex] as any,
    });
}

async function handleSentenceGameStart(replyToken: string, userId: string) {
    const count = await prisma.sentenceConstructionPair.count();

    if (count === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ หรือลองเกมอื่น");
        return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const pair = await prisma.sentenceConstructionPair.findFirst({
        skip: randomIndex,
    });

    if (!pair) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    await prisma.user.update({
        where: { lineUserId: userId },
        data: { currentGameType: "SENTENCE_WRITING", currentQuestionId: pair.id },
    });

    const sentenceFlex = createSentenceGameFlex({
        word1: pair.word1,
        word2: pair.word2,
        questionNumber: randomIndex + 1,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [sentenceFlex] as any,
    });
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

    const leaderboardFlex = createLeaderboardFlex({
        topUsers: topUsers.map(u => ({
            thaiName: u.thaiName || "Unknown",
            totalPoints: u.totalPoints,
            currentLevel: u.currentLevel,
        })),
        myRank,
        myPoints: user.totalPoints,
        myLevel: user.currentLevel,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [leaderboardFlex] as any,
    });
}

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
            await replyText(replyToken, `🎡 หมุนวงล้อได้วันละ 1 ครั้ง\n\n⏰ กรุณารออีก ${hoursRemaining} ชั่วโมง`);
            return;
        }
    }

    const random = Math.random();
    let cumulativeProbability = 0;
    let reward = SPIN_WHEEL_PRIZES[SPIN_WHEEL_PRIZES.length - 1];

    for (const r of SPIN_WHEEL_PRIZES) {
        cumulativeProbability += r.probability;
        if (random < cumulativeProbability) {
            reward = r;
            break;
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            totalPoints: { increment: reward.value },
            lastSpinAt: now,
        },
    });

    const newTotal = user.totalPoints + reward.value;

    const spinFlex = createSpinWheelResultFlex({
        reward: reward.name,
        points: reward.value,
        totalPoints: newTotal,
        isWin: reward.value > 0,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [spinFlex] as any,
    });
}

async function handleShowAnswer(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.currentGameType || !user?.currentQuestionId) {
        await replyText(replyToken, "กรุณาเริ่มเล่นเกมก่อนครับ พิมพ์ \"ฝึกฝน\" เพื่อเลือกเกม");
        return;
    }

    let answerText = "";
    const gameType = user.currentGameType;
    let gameData: any = {};
    try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }
    const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

    // Vocabulary Games
    if (gameType === "VOCAB_MATCH") {
        const correctIdx = ['A', 'B', 'C', 'D'].indexOf(gameData.correctAnswer);
        answerText = `📖 เฉลย: ${answerLabel[gameData.correctAnswer]}. ${gameData.options[correctIdx]}`;
    }
    else if (gameType === "VOCAB_MEANING") {
        answerText = `📖 เฉลย: ${gameData.correctAnswer}`;
    }
    else if (gameType === "VOCAB_OPPOSITE" || gameType === "VOCAB_SYNONYM") {
        answerText = `📖 เฉลย: ${answerLabel[gameData.correctAnswer]}. ${gameData.correctText}`;
    }
    // Grammar Games
    else if (gameType === "FILL_BLANK") {
        const fillBlank = await prisma.fillBlankQuestion.findUnique({
            where: { id: user.currentQuestionId },
        });
        if (fillBlank) {
            answerText = `📝 เฉลย: ${fillBlank.answer}`;
        }
    }
    else if (gameType === "FIX_SENTENCE" || gameType === "ARRANGE_SENTENCE") {
        answerText = `📝 เฉลย:\n"${gameData.correctSentence}"`;
    }
    else if (gameType === "SPEED_GRAMMAR") {
        const question = await prisma.speedGrammarQuestion.findUnique({
            where: { id: user.currentQuestionId },
        });
        if (question) {
            const correctOption = getSpeedGrammarCorrectOption(question);
            answerText = `⚡ เฉลย: ${answerLabel[gameData.correctAnswer]}. ${correctOption}`;
        }
    }
    // Reading & Writing Games
    else if (gameType === "READ_ANSWER") {
        const question = await prisma.readAnswerQuestion.findUnique({
            where: { id: user.currentQuestionId },
        });
        if (question) {
            const correctOption = getReadAnswerCorrectOption(question);
            answerText = `📖 เฉลย: ${answerLabel[gameData.correctAnswer]}. ${correctOption}`;
        }
    }
    else if (gameType === "SENTENCE_WRITING") {
        const pair = await prisma.sentenceConstructionPair.findUnique({
            where: { id: user.currentQuestionId },
        });
        if (pair) {
            answerText = `✍️ เกมเขียนประโยคไม่มีคำตอบตายตัว\n\nลองแต่งประโยคที่มีคำว่า "${pair.word1}" และ "${pair.word2}" ได้เลยครับ`;
        }
    }
    else if (gameType === "SUMMARIZE") {
        answerText = `📝 ตัวอย่างการสรุป:\n"${gameData.sampleSummary}"`;
    }
    else if (gameType === "CONTINUE_STORY") {
        answerText = `📖 เรื่องนี้ไม่มีคำตอบตายตัว\n\nคำสำคัญที่ควรมี: ${gameData.keywords.replace(/\|/g, ', ')}`;
    }
    // Fun Games
    else if (gameType === "RACE_CLOCK") {
        answerText = `🏎️ เฉลย: ${answerLabel[gameData.correctAnswer]}`;
    }
    // Legacy
    else if (gameType === "MULTIPLE_CHOICE") {
        const question = await prisma.multipleChoiceQuestion.findUnique({
            where: { id: user.currentQuestionId },
        });
        if (question) {
            const correctOption = question.correctAnswer === 'A' ? question.optionA :
                                  question.correctAnswer === 'B' ? question.optionB :
                                  question.correctAnswer === 'C' ? question.optionC : question.optionD;
            answerText = `📋 เฉลย: ${answerLabel[question.correctAnswer]}. ${correctOption}`;
        }
    }

    // Reset game state after showing answer
    await prisma.user.update({
        where: { lineUserId: userId },
        data: { currentGameType: null, currentQuestionId: null, gameData: null },
    });

    await replyWithQuickReply(
        replyToken,
        answerText || "ไม่พบคำตอบครับ",
        [
            { label: "เล่นต่อ", text: getGameStartCommand(gameType) },
            { label: "เกมอื่น", text: "ฝึกฝน" },
            { label: "เมนู", text: "เมนู" },
        ]
    );
}

async function handleSkipQuestion(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.currentGameType || !user?.currentQuestionId) {
        await replyText(replyToken, "ไม่มีคำถามให้ข้ามครับ พิมพ์ \"ฝึกฝน\" เพื่อเริ่มเล่น");
        return;
    }

    const gameType = user.currentGameType;

    // Reset current question and start a new one
    await prisma.user.update({
        where: { lineUserId: userId },
        data: { currentGameType: null, currentQuestionId: null, gameData: null },
    });

    // Redirect to the same game type to get a new question
    const gameHandlers: Record<string, () => Promise<void>> = {
        // Vocabulary Games
        "VOCAB_MATCH": () => handleVocabMatchGameStart(replyToken, userId),
        "VOCAB_MEANING": () => handleVocabMeaningGameStart(replyToken, userId),
        "VOCAB_OPPOSITE": () => handleVocabOppositeGameStart(replyToken, userId),
        "VOCAB_SYNONYM": () => handleVocabSynonymGameStart(replyToken, userId),
        // Grammar Games
        "FILL_BLANK": () => handleFillBlankGameStart(replyToken, userId),
        "FIX_SENTENCE": () => handleFixSentenceGameStart(replyToken, userId),
        "ARRANGE_SENTENCE": () => handleArrangeSentenceGameStart(replyToken, userId),
        "SPEED_GRAMMAR": () => handleSpeedGrammarGameStart(replyToken, userId),
        // Reading & Writing Games
        "READ_ANSWER": () => handleReadAnswerGameStart(replyToken, userId),
        "SENTENCE_WRITING": () => handleSentenceGameStart(replyToken, userId),
        "SUMMARIZE": () => handleSummarizeGameStart(replyToken, userId),
        "CONTINUE_STORY": () => handleContinueStoryGameStart(replyToken, userId),
        // Fun Games
        "RACE_CLOCK": () => handleRaceClockGameStart(replyToken, userId),
        // Legacy
        "MULTIPLE_CHOICE": () => handleMultipleChoiceGameStart(replyToken, userId),
    };

    const handler = gameHandlers[gameType];
    if (handler) {
        await handler();
    } else {
        await replyText(replyToken, "ข้ามคำถามแล้วครับ พิมพ์ \"ฝึกฝน\" เพื่อเลือกเกม");
    }
}

async function handleGameAnswer(replyToken: string, user: any, text: string) {
    try {
        let isCorrect = false;
        let points = 0;
        let correctAnswer = "";
        let message = "";
        const gameType = user.currentGameType;
        let gameData: any = {};
        try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }

        // Answer map for multiple choice games
        const answerMap: Record<string, string> = {
            'ก': 'A', 'a': 'A', '1': 'A',
            'ข': 'B', 'b': 'B', '2': 'B',
            'ค': 'C', 'c': 'C', '3': 'C',
            'ง': 'D', 'd': 'D', '4': 'D',
        };
        const answerLabel: Record<string, string> = { 'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง' };

        // ==================
        // Vocabulary Games
        // ==================
        if (gameType === "VOCAB_MATCH") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                const correctIdx = ['A', 'B', 'C', 'D'].indexOf(gameData.correctAnswer);
                message = `คำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${gameData.options[correctIdx]}`;
            }
        }
        else if (gameType === "VOCAB_MEANING") {
            isCorrect = checkVocabMeaningAnswer(text, gameData.correctAnswer);
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                message = `คำตอบที่ถูกคือ: ${gameData.correctAnswer}`;
            }
        }
        else if (gameType === "VOCAB_OPPOSITE") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                message = `คำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${gameData.correctText}`;
            }
        }
        else if (gameType === "VOCAB_SYNONYM") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                message = `คำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${gameData.correctText}`;
            }
        }

        // ==================
        // Grammar Games
        // ==================
        else if (gameType === "FILL_BLANK") {
            const question = await prisma.fillBlankQuestion.findUnique({ where: { id: user.currentQuestionId } });
            if (!question) {
                await replyText(replyToken, "เกิดข้อผิดพลาด ไม่พบคำถาม");
                return;
            }
            correctAnswer = question.answer;
            if (text.trim().toLowerCase() === question.answer.trim().toLowerCase()) {
                isCorrect = true;
                points = 10;
            } else {
                message = `คำตอบที่ถูกคือ: ${question.answer}`;
            }
        }
        else if (gameType === "FIX_SENTENCE") {
            isCorrect = checkFixSentenceAnswer(text, gameData.correctSentence);
            points = isCorrect ? 12 : 0;
            if (!isCorrect) {
                message = `ประโยคที่ถูกคือ:\n"${gameData.correctSentence}"`;
            }
        }
        else if (gameType === "ARRANGE_SENTENCE") {
            isCorrect = checkArrangeSentenceAnswer(text, gameData.correctSentence);
            points = isCorrect ? 12 : 0;
            if (!isCorrect) {
                message = `ประโยคที่ถูกคือ:\n"${gameData.correctSentence}"`;
            }
        }
        else if (gameType === "SPEED_GRAMMAR") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;

            // Calculate time bonus
            const timeUsed = (Date.now() - gameData.startTime) / 1000;
            if (isCorrect) {
                const timeLimit = gameData.timeLimit || 30;
                if (timeUsed <= timeLimit) {
                    const timeBonus = Math.round(5 * (1 - timeUsed / timeLimit));
                    points = 15 + timeBonus;
                    message = `ใช้เวลา ${Math.round(timeUsed)} วินาที`;
                } else {
                    points = 10;
                    message = `หมดเวลา แต่ตอบถูก!`;
                }
            } else {
                const question = await prisma.speedGrammarQuestion.findUnique({ where: { id: user.currentQuestionId } });
                if (question) {
                    const correctOption = getSpeedGrammarCorrectOption(question);
                    message = `คำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${correctOption}`;
                }
            }
        }

        // ==================
        // Reading & Writing Games
        // ==================
        else if (gameType === "READ_ANSWER") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;
            points = isCorrect ? 15 : 0;
            if (!isCorrect) {
                const question = await prisma.readAnswerQuestion.findUnique({ where: { id: user.currentQuestionId } });
                if (question) {
                    const correctOption = getReadAnswerCorrectOption(question);
                    message = `คำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${correctOption}`;
                }
            }
        }
        else if (gameType === "SENTENCE_WRITING") {
            const question = await prisma.sentenceConstructionPair.findUnique({ where: { id: user.currentQuestionId } });
            if (!question) {
                await replyText(replyToken, "เกิดข้อผิดพลาด ไม่พบคำถาม");
                return;
            }
            const evaluation = await evaluateSentence(text, question.word1, question.word2);
            isCorrect = evaluation.correct;
            points = isCorrect ? 15 : 0;
            message = evaluation.feedback;
        }
        else if (gameType === "SUMMARIZE") {
            const keywordsArray = (gameData.keywords || '').split('|').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
            const evaluation = await evaluateSummary(text, gameData.passage || '', gameData.sampleSummary || '', keywordsArray);
            isCorrect = evaluation.correct;
            points = isCorrect ? 20 : (evaluation.hasKeywords ? 10 : 0);
            message = evaluation.feedback;
        }
        else if (gameType === "CONTINUE_STORY") {
            const keywordsArray = (gameData.keywords || '').split('|').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
            const evaluation = await evaluateContinuation(
                text,
                gameData.storyStart || '',
                keywordsArray,
                gameData.minLength
            );
            isCorrect = evaluation.correct;
            points = isCorrect ? 20 : (evaluation.hasKeywords && evaluation.isLongEnough ? 10 : 0);
            message = evaluation.feedback;
        }

        // ==================
        // Fun Games
        // ==================
        else if (gameType === "RACE_CLOCK") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            isCorrect = normalizedAnswer === gameData.correctAnswer;

            const timeUsed = Math.round((Date.now() - gameData.startTime) / 1000);
            points = calculateRaceClockPoints(isCorrect, timeUsed);

            if (isCorrect) {
                message = `ใช้เวลา ${timeUsed} วินาที`;
            } else {
                const question = await prisma.multipleChoiceQuestion.findFirst({ where: { id: user.currentQuestionId } }) ||
                                 await prisma.speedGrammarQuestion.findFirst({ where: { id: user.currentQuestionId } });
                if (question) {
                    const correctOption = getRaceClockCorrectOption(question as any);
                    message = `หมดเวลา ${timeUsed} วินาที\nคำตอบที่ถูกคือ ${answerLabel[gameData.correctAnswer]}. ${correctOption}`;
                }
            }
        }

        // ==================
        // Multiple Choice (Legacy)
        // ==================
        else if (gameType === "MULTIPLE_CHOICE") {
            const question = await prisma.multipleChoiceQuestion.findUnique({ where: { id: user.currentQuestionId } });
            if (!question) {
                await replyText(replyToken, "เกิดข้อผิดพลาด ไม่พบคำถาม");
                return;
            }

            const normalizedAnswer = (answerMap[text.trim()] || text.trim().toUpperCase());
            correctAnswer = question.correctAnswer;

            if (normalizedAnswer === question.correctAnswer) {
                isCorrect = true;
                points = 10;
                const correctOption = question.correctAnswer === 'A' ? question.optionA :
                                     question.correctAnswer === 'B' ? question.optionB :
                                     question.correctAnswer === 'C' ? question.optionC : question.optionD;
                message = `ถูกต้อง! คำตอบคือ ${correctOption}`;
            } else {
                const correctOption = question.correctAnswer === 'A' ? question.optionA :
                                     question.correctAnswer === 'B' ? question.optionB :
                                     question.correctAnswer === 'C' ? question.optionC : question.optionD;
                message = `คำตอบที่ถูกคือ ${answerLabel[question.correctAnswer]}. ${correctOption}`;
            }
        }

        // ==================
        // Handle Result
        // ==================

        // Record question history for all games (so questions don't repeat within 24h)
        if (user.currentQuestionId && gameType) {
            try {
                await recordQuestionAnswered(user.lineUserId, user.currentQuestionId, gameType, isCorrect);
            } catch (e) {
                console.error("Failed to record question history:", e);
            }
        }

        if (isCorrect) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    totalPoints: { increment: points },
                    currentGameType: null,
                    currentQuestionId: null,
                    gameData: null,
                }
            });

            const successMsg = `✅ ${message || "ถูกต้อง!"}\n\n+${points} คะแนน`;

            await replyWithQuickReply(
                replyToken,
                successMsg,
                [
                    { label: "ข้อต่อไป", text: getGameStartCommand(gameType) },
                    { label: "เกมอื่น", text: "ฝึกฝน" },
                    { label: "เมนู", text: "เมนู" }
                ]
            );
        } else {
            // For AI-evaluated games (SUMMARIZE, CONTINUE_STORY), give partial credit
            if ((gameType === "SUMMARIZE" || gameType === "CONTINUE_STORY") && points > 0) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        totalPoints: { increment: points },
                        currentGameType: null,
                        currentQuestionId: null,
                        gameData: null,
                    }
                });

                await replyWithQuickReply(
                    replyToken,
                    `📝 ${message}\n\n+${points} คะแนน`,
                    [
                        { label: "ข้อต่อไป", text: getGameStartCommand(gameType) },
                        { label: "เกมอื่น", text: "ฝึกฝน" },
                        { label: "เมนู", text: "เมนู" }
                    ]
                );
            } else {
                await replyWithQuickReply(
                    replyToken,
                    `❌ ${message || "ยังไม่ถูก"}\n\nลองใหม่ หรือพิมพ์ "เฉลย"`,
                    [
                        { label: "เฉลย", text: "เฉลย" },
                        { label: "ข้าม", text: "ข้าม" },
                        { label: "ออก", text: "ฝึกฝน" }
                    ]
                );
            }
        }
    } catch (error) {
        console.error("handleGameAnswer error:", error);
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งครับ");
    }
}

// =====================
// My Task Handler (Task ที่อาจารย์สร้าง)
// =====================

async function handleMyTask(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    // Get active tasks
    const activeTasks = await prisma.task.findMany({
        where: { isActive: true },
        orderBy: { weekNumber: "desc" },
        take: 5,
    });

    if (activeTasks.length === 0) {
        await replyText(replyToken, "ขณะนี้ยังไม่มีภาระงานที่เปิดรับครับ\n\nกรุณารอประกาศจากอาจารย์");
        return;
    }

    // Check user's submissions
    const submissions = await prisma.submission.findMany({
        where: { userId: user.id },
        select: { taskId: true },
    });
    const submittedTaskIds = new Set(submissions.map(s => s.taskId));

    const myTaskFlex = createMyTaskFlex({
        tasks: activeTasks.map(task => ({
            id: task.id,
            weekNumber: task.weekNumber,
            title: task.title,
            description: task.description,
            deadline: task.deadline,
            isSubmitted: submittedTaskIds.has(task.id),
        })),
        userName: user.thaiName || "นักเรียน",
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [myTaskFlex] as any,
    });
}

// =====================
// Game Category Menu Handlers
// =====================

async function handleVocabGamesMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const vocabMenuFlex = createVocabGamesMenuFlex();
    await lineClient.replyMessage({
        replyToken,
        messages: [vocabMenuFlex] as any,
    });
}

async function handleGrammarGamesMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const grammarMenuFlex = createGrammarGamesMenuFlex();
    await lineClient.replyMessage({
        replyToken,
        messages: [grammarMenuFlex] as any,
    });
}

async function handleReadingGamesMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const readingMenuFlex = createReadingGamesMenuFlex();
    await lineClient.replyMessage({
        replyToken,
        messages: [readingMenuFlex] as any,
    });
}

async function handleFunGamesMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const funMenuFlex = createFunGamesMenuFlex();
    await lineClient.replyMessage({
        replyToken,
        messages: [funMenuFlex] as any,
    });
}

// =====================
// Vocabulary Game Handlers
// =====================

async function handleVocabMatchGameStart(replyToken: string, userId: string) {
    const questions = await getRandomVocabMatchQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];
    const options = getVocabMatchOptions(question);
    const correctIndex = options.indexOf(question.meaning);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_MATCH",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ options, correctAnswer }),
        },
    });

    const questionText = formatVocabMatchQuestion(question, options, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

async function handleVocabMeaningGameStart(replyToken: string, userId: string) {
    const questions = await getRandomVocabMeaningQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_MEANING",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ correctAnswer: question.meaning }),
        },
    });

    const questionText = formatVocabMeaningQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ]);
}

async function handleVocabOppositeGameStart(replyToken: string, userId: string) {
    const questions = await getRandomVocabOppositeQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];
    const options = getVocabOppositeOptions(question);
    const correctIndex = options.indexOf(question.opposite);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_OPPOSITE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ options, correctAnswer, correctText: question.opposite }),
        },
    });

    const questionText = formatVocabOppositeQuestion(question, options, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

async function handleVocabSynonymGameStart(replyToken: string, userId: string) {
    const questions = await getRandomVocabSynonymQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];
    const options = getVocabSynonymOptions(question);
    const correctIndex = options.indexOf(question.synonym);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_SYNONYM",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ options, correctAnswer, correctText: question.synonym }),
        },
    });

    const questionText = formatVocabSynonymQuestion(question, options, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

// =====================
// Grammar Game Handlers
// =====================

async function handleFixSentenceGameStart(replyToken: string, userId: string) {
    const questions = await getRandomFixSentenceQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "FIX_SENTENCE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ correctSentence: question.correctSentence }),
        },
    });

    const questionText = formatFixSentenceQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "เฉลย", text: "เฉลย" },
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ]);
}

async function handleArrangeSentenceGameStart(replyToken: string, userId: string) {
    const questions = await getRandomArrangeSentenceQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "ARRANGE_SENTENCE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ correctSentence: question.correctSentence }),
        },
    });

    const questionText = formatArrangeSentenceQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "เฉลย", text: "เฉลย" },
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ]);
}

async function handleSpeedGrammarGameStart(replyToken: string, userId: string) {
    const questions = await getRandomSpeedGrammarQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "SPEED_GRAMMAR",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                correctAnswer: question.correctAnswer,
                startTime: Date.now(),
                timeLimit: question.timeLimit,
            }),
        },
    });

    const questionText = formatSpeedGrammarQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

// =====================
// Reading & Writing Game Handlers
// =====================

async function handleReadAnswerGameStart(replyToken: string, userId: string) {
    const questions = await getRandomReadAnswerQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "READ_ANSWER",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ correctAnswer: question.correctAnswer }),
        },
    });

    const questionText = formatReadAnswerQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

async function handleSummarizeGameStart(replyToken: string, userId: string) {
    const questions = await getRandomSummarizeQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "SUMMARIZE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                passage: question.passage,
                keywords: question.keywords,
                sampleSummary: question.sampleSummary,
            }),
        },
    });

    const questionText = formatSummarizeQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ]);
}

async function handleContinueStoryGameStart(replyToken: string, userId: string) {
    const questions = await getRandomContinueStoryQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "CONTINUE_STORY",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                keywords: question.keywords,
                minLength: question.minLength,
                storyStart: question.storyStart,
            }),
        },
    });

    const questionText = formatContinueStoryQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ]);
}

// =====================
// Fun Game Handlers
// =====================

async function handleDailyVocabGameStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const todayVocab = await getTodayVocab();

    if (!todayVocab) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำศัพท์วันนี้\n\nกรุณาลองใหม่ภายหลัง");
        return;
    }

    const alreadyLearned = await hasLearnedToday(user.id);

    if (alreadyLearned) {
        await replyText(
            replyToken,
            `คุณได้เรียนคำศัพท์วันนี้แล้ว!\n\n📖 "${todayVocab.word}"\n💡 ${todayVocab.meaning}\n📝 ${todayVocab.example}\n\nกลับมาพรุ่งนี้เพื่อเรียนคำใหม่นะครับ`
        );
        return;
    }

    // Mark as learned (this function also gives points)
    await recordDailyVocabLearned(user.id);

    const vocabMessage = formatDailyVocab(todayVocab);
    await replyWithQuickReply(replyToken, vocabMessage, [
        { label: "เล่นเกมอื่น", text: "ฝึกฝน" },
        { label: "แดชบอร์ด", text: "แดชบอร์ด" },
    ]);
}

async function handleRaceClockGameStart(replyToken: string, userId: string) {
    const questions = await getRandomRaceClockQuestions(userId, 1);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "RACE_CLOCK",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                correctAnswer: question.correctAnswer,
                startTime: Date.now(),
            }),
        },
    });

    const questionText = formatRaceClockQuestion(question, 0, 1);
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ]);
}

async function handleVocabGachaGameStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, "กรุณาลงทะเบียนก่อนครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
        return;
    }

    const canPull = await canPullGacha(user.id);

    if (!canPull) {
        await replyText(replyToken, "🎰 หมดโควต้าสุ่มวันนี้แล้ว!\n\nสุ่มได้ 3 ครั้งต่อวัน\nกลับมาพรุ่งนี้นะครับ");
        return;
    }

    const result = await pullGacha(user.id);

    if (!result) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    // Record the pull for daily limit tracking
    await recordGachaPull(user.id, result.vocab, result.points);

    // Points already given by pullGacha(), use result.points
    const gachaFlex = createGachaResultFlex({
        word: result.vocab.word,
        meaning: result.vocab.meaning,
        rarity: result.vocab.rarity,
        isNew: result.isNew,
        points: result.points,
    });

    await lineClient.replyMessage({
        replyToken,
        messages: [gachaFlex] as any,
    });
}

function getGameStartCommand(gameType: string): string {
    switch (gameType) {
        // Vocabulary Games
        case "VOCAB_MATCH": return "จับคู่คำ";
        case "VOCAB_MEANING": return "ความหมาย";
        case "VOCAB_OPPOSITE": return "คำตรงข้าม";
        case "VOCAB_SYNONYM": return "คำพ้อง";
        // Grammar Games
        case "FILL_BLANK": return "เติมคำ";
        case "FIX_SENTENCE": return "แก้ประโยค";
        case "ARRANGE_SENTENCE": return "เรียงประโยค";
        case "SPEED_GRAMMAR": return "speed grammar";
        // Reading Games
        case "READ_ANSWER": return "อ่านตอบ";
        case "SENTENCE_WRITING": return "เขียนประโยค";
        case "SUMMARIZE": return "สรุปเรื่อง";
        case "CONTINUE_STORY": return "เขียนต่อ";
        // Fun Games
        case "DAILY_VOCAB": return "คำศัพท์วันนี้";
        case "RACE_CLOCK": return "แข่งเวลา";
        case "VOCAB_GACHA": return "กาชา";
        // Legacy
        case "MULTIPLE_CHOICE": return "เลือกตอบ";
        default: return "ฝึกฝน";
    }
}
