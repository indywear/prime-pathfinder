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
import { addPoints, getLevelInfo, LEVEL_CONFIG, checkAndAwardTitle, getDisplayTitle } from "@/lib/gamification";
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
import { recordQuestionAnswered, getUserLevel } from "@/lib/games/questionHistory";
import { evaluateSentence, getRandomSentencePairs } from "@/lib/games/sentenceConstruction";
import { checkFillBlankAnswer } from "@/lib/games/fillBlank";
import { p, np, kp, sp } from "@/lib/utils/particle";
import { BOT_NAME, getTimeGreeting, getEncouragement } from "@/lib/line/botCharacter";
import {
    GAME_TYPES,
    createSessionData,
    parseSessionData,
    getCurrentQuestionId,
    advanceSession,
    isSessionComplete,
    getSessionProgress,
    formatSessionSummary,
    getDailyRoundCount,
    calculatePointMultiplier,
    getDailyLimitMessage,
    checkLevelGate,
    getCorrectMessage,
    getWrongMessage,
    GameSessionState,
} from "@/lib/games/engine";

const NEXT_QUESTION_CMD = "__next__";
const HINT_CMD = "__hint__";

const REGISTRATION_STEPS = [
    { field: "chineseName", question: "ชื่อ-นามสกุล (ภาษาจีน) ของคุณคืออะไรครับ?", type: "text" },
    { field: "thaiName", question: "ชื่อภาษาไทยที่ต้องการให้เรียกคืออะไรครับ?", type: "text" },
    { field: "studentId", question: "รหัสนักศึกษาของคุณคืออะไรครับ? (หากไม่มี พิมพ์ '-')", type: "text" },
    { field: "university", question: "คุณเรียนมหาวิทยาลัยอะไรครับ? (กรอกเป็นภาษาอังกฤษ)", type: "text" },
    { field: "email", question: "อีเมลของคุณคืออะไรครับ?", type: "text" },
    { field: "nationality", question: "สัญชาติของคุณคืออะไรครับ?", type: "text" },
    {
        field: "gender",
        question: "คุณเป็นเพศอะไรครับ? (เพื่อปรับภาษาให้เหมาะสม ครับ/ค่ะ)",
        type: "quickReply",
        options: [
            { label: "ชาย 👦", text: "male" },
            { label: "หญิง 👧", text: "female" },
        ],
    },
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
    SUBMIT: ["ส่งงาน", "submit", "submit task"],

    // === Game Category Menus (ต้องอยู่ก่อน PRACTICE เพราะมีคำ "เกม" ซ้ำกัน) ===
    VOCAB_GAMES: ["เกมคำศัพท์", "vocab games"],
    GRAMMAR_GAMES: ["เกมไวยากรณ์", "grammar games"],
    READING_GAMES: ["เกมอ่าน", "เกมอ่านเขียน", "reading games"],
    FUN_GAMES: ["เกมสนุก", "fun games"],

    PRACTICE: ["ฝึกฝน", "practice", "ฝึก", "เล่นเกม"],
    DASHBOARD: ["แดชบอร์ด", "dashboard", "ความก้าวหน้า", "ดูความก้าวหน้า"],
    PROFILE: ["ข้อมูลส่วนตัว", "profile", "โปรไฟล์"],
    EDIT_PROFILE: ["แก้ไขข้อมูล", "แก้ไขชื่อ", "เปลี่ยนชื่อ", "edit profile", "แก้ไข"],
    HELP: ["ช่วยเหลือ", "help", "วิธีใช้", "เมนู", "menu", "รายการ"],
    LEADERBOARD: ["leaderboard", "อันดับ", "ลีดเดอร์บอร์ด", "ranking"],
    SPIN_WHEEL: ["spin wheel", "สปินวงล้อ", "วงล้อ", "spin", "หมุนวงล้อ"],
    MY_TASK: ["ภาระงาน", "task", "การบ้าน", "งานประจำสัปดาห์", "งานอาจารย์"],

    // === Vocabulary Games (4 เกม) — ต้องอยู่ก่อน SKIP/SHOW_ANSWER เพราะ "ตรงข้าม" มี "ข้าม" เป็น substring ===
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

    // === Culture Games (2 เกม) ===
    CULTURE_GAMES: ["เกมวัฒนธรรม", "culture games"],
    THAI_IDIOM_GAME: ["สำนวนไทย", "สำนวน", "thai idiom", "idiom"],
    THAI_CULTURE_GAME: ["วัฒนธรรมไทย", "วัฒนธรรม", "มารยาท", "thai culture", "culture"],

    // === Lessons (สอนก่อนเล่น) ===
    LESSON: ["บทเรียน", "เรียน", "lesson", "เรียนรู้", "สอน"],

    // Legacy support
    MULTIPLE_CHOICE_GAME: ["เลือกตอบ", "multiple choice", "เลือก"],

    // === Short keywords ต้องอยู่หลังสุดเพราะเป็น substring ของคำอื่น ===
    SHOW_ANSWER: ["เฉลย", "ดูเฉลย", "คำตอบ", "answer"],
    SKIP_QUESTION: ["ข้าม", "skip"],
    CANCEL: ["ยกเลิก", "cancel", "หยุด", "ออก", "ออกจากเกม"],
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

    // Build a flat list of (keyword, action) pairs sorted by keyword length DESC
    // This ensures longer/more specific keywords match before shorter ones
    // e.g., "เขียนต่อ" matches CONTINUE_STORY before "เขียน" matches SENTENCE
    const allPairs: { keyword: string; action: string }[] = [];
    for (const [action, keywords] of Object.entries(MENU_KEYWORDS)) {
        for (const kw of keywords) {
            allPairs.push({ keyword: kw.toLowerCase(), action });
        }
    }
    allPairs.sort((a, b) => b.keyword.length - a.keyword.length);

    for (const { keyword, action } of allPairs) {
        if (lowerText.includes(keyword)) {
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

        // Reject extremely long messages to prevent abuse
        if (text.length > 5000) {
            await replyText(event.replyToken, "ข้อความยาวเกินไปครับ กรุณาส่งข้อความไม่เกิน 5,000 ตัวอักษร");
            return;
        }

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

        // === Active state checks FIRST (before menu detection) ===
        // This prevents menu keywords in game answers from being intercepted
        // e.g., "หยุดเรียน" in a summary matching CANCEL keyword "หยุด"

        // Check if user is submitting a task
        if (user?.currentGameType === "SUBMITTING_TASK") {
            if (text === "ยกเลิก" || text === "cancel" || text.toLowerCase() === "cancel") {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentGameType: null, currentQuestionId: null, gameData: null },
                });
                await replyText(event.replyToken, `ยกเลิกการส่งงานแล้ว${p(user?.gender)}\n\nพิมพ์ "เมนู" เพื่อดูตัวเลือก`);
            } else {
                await handleSubmitWriting(event.replyToken, user, text);
            }
            return;
        }

        // Check if user is in editing mode
        if (user?.currentGameType?.startsWith("editing:")) {
            await handleEditFieldSubmit(event.replyToken, user, text);
            return;
        }

        // Check for session "next question" command
        if (text === NEXT_QUESTION_CMD && user?.currentGameType) {
            await handleSessionNext(event.replyToken, userId);
            return;
        }

        // Check for session "hint" command
        if (text === HINT_CMD && user?.currentGameType) {
            await handleHint(event.replyToken, userId);
            return;
        }

        // Check if user is in a game
        if (user?.currentGameType && user?.currentQuestionId) {
            const lowerText = text.toLowerCase().trim();
            const exactCancelCommands = ["ยกเลิก", "cancel", "ออกจากเกม"];
            const exactSkipCommands = ["ข้าม", "skip"];
            const exactAnswerCommands = ["เฉลย", "ดูเฉลย", "answer"];

            // Exact-match commands always work regardless of game type
            if (exactCancelCommands.includes(lowerText)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentGameType: null, currentQuestionId: null, gameData: null },
                });
                await replyText(event.replyToken, `ออกจากเกมแล้ว${p(user?.gender)}\n\nพิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`);
                return;
            }
            if (exactSkipCommands.includes(lowerText)) {
                await handleSkipQuestion(event.replyToken, userId);
                return;
            }
            if (exactAnswerCommands.includes(lowerText)) {
                await handleShowAnswer(event.replyToken, userId);
                return;
            }

            // Free-text answer games: ALL other text is a game answer (no menu detection)
            // These games require typed answers (not ก/ข/ค/ง choices), so user input
            // may accidentally contain menu keywords (e.g., "ความหมาย" in VOCAB_MEANING)
            const FREE_TEXT_GAMES = [
                "VOCAB_MEANING", "FILL_BLANK",
                "COMPOSE_SENTENCE", "SENTENCE_WRITING", "SENTENCE_CONSTRUCTION",
                "ARRANGE_SENTENCE", "FIX_SENTENCE",
                "SUMMARIZE", "CONTINUE_STORY",
            ];
            if (FREE_TEXT_GAMES.includes(user.currentGameType)) {
                await handleGameAnswer(event.replyToken, user, text);
                return;
            }

            // Multiple-choice games: allow menu navigation (user can switch games)
            // Short answers (ก/ข/ค/ง) won't match any menu keyword
            // Longer text like "เกมคำศัพท์" falls through to menu detection below
            const menuAction = detectMenuAction(text);
            if (menuAction) {
                // Clear current game before processing menu action
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentGameType: null, currentQuestionId: null, gameData: null },
                });
                // Fall through to menu processing below
            } else {
                // No menu match = game answer
                await handleGameAnswer(event.replyToken, user, text);
                return;
            }
        }

        // Check if user wants to edit a specific field (must be before menu detection
        // because "แก้ไข:ชื่อไทย" contains "แก้ไข" which matches EDIT_PROFILE keyword)
        if (text.startsWith("แก้ไข:")) {
            const fieldToEdit = text.replace("แก้ไข:", "").trim();
            await handleEditFieldStart(event.replyToken, userId, fieldToEdit);
            return;
        }

        // === Menu detection (only when user is NOT in any active state) ===
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
                case "LESSON":
                    await handleLessonMenu(event.replyToken, userId);
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
                case "CULTURE_GAMES":
                    await handleCultureGamesMenu(event.replyToken, userId);
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

                // Culture Games
                case "THAI_IDIOM_GAME":
                    await handleThaiIdiomGameStart(event.replyToken, userId);
                    break;
                case "THAI_CULTURE_GAME":
                    await handleThaiCultureGameStart(event.replyToken, userId);
                    break;

                // Legacy
                case "MULTIPLE_CHOICE_GAME":
                    await handleMultipleChoiceGameStart(event.replyToken, userId);
                    break;
            }
            return;
        }

        // Check lesson sub-commands (e.g., "บทเรียน:vocabulary", "ดูบทเรียน:lessonId")
        if (text.startsWith("บทเรียน:")) {
            const category = text.replace("บทเรียน:", "").trim();
            await handleLessonCategory(event.replyToken, userId, category);
            return;
        }
        if (text.startsWith("ดูบทเรียน:")) {
            const lessonId = text.replace("ดูบทเรียน:", "").trim();
            await handleLessonView(event.replyToken, userId, lessonId);
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
            `สวัสดี${p(existingUser.gender)} คุณ${existingUser.thaiName}! คุณลงทะเบียนแล้ว\n\nพิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้า\nหรือ "ข้อมูลส่วนตัว" เพื่อดูข้อมูลของคุณ`
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
    } else if (currentStep.field === "gender") {
        const lowerAnswer = answer.toLowerCase().trim();
        if (lowerAnswer === "male" || lowerAnswer === "ชาย") {
            value = "male";
        } else if (lowerAnswer === "female" || lowerAnswer === "หญิง") {
            value = "female";
        } else {
            value = "male"; // default
        }
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
            `🎉 ลงทะเบียนเรียบร้อยแล้ว${p(user.gender)}!\n\nยินดีต้อนรับ คุณ${user.thaiName}\n\nตอนนี้คุณสามารถ:\n• พิมพ์ "ส่งงาน" - ส่งภาระงาน\n• พิมพ์ "ขอผลป้อนกลับ" - ขอให้ AI ตรวจงาน\n• พิมพ์ "เกม" - เล่นเกมสะสมแต้ม\n• พิมพ์ "แดชบอร์ด" - ดูความก้าวหน้า\n\nหรือพิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด`
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
        `สวัสดี${p(user.gender)} คุณ${user.thaiName}!\n\n📝 ส่งข้อความภาษาไทยที่ต้องการให้ตรวจมาได้เลย${p(user.gender)}\n\nจะช่วยตรวจและให้คำแนะนำ${p(user.gender)}`
    );
}

async function handleSubmitStart(replyToken: string, userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

        if (!user?.isRegistered) {
            await replyText(replyToken, "กรุณาลงทะเบียนก่อนนะครับ\n\nพิมพ์ \"ลงทะเบียน\" เพื่อเริ่มต้น");
            return;
        }

        // Progressive Task System: หา Task ที่ User ยังไม่ได้ส่ง (ตามลำดับ Week)
        let currentWeek = user.currentTaskWeek || 1;

        // Auto-advance: ข้าม Week ที่ส่งไปแล้ว (กรณี User เก่าก่อนระบบนี้)
        let advancedWeek = false;
        for (let i = 0; i < 50; i++) { // ป้องกัน infinite loop
            const alreadySubmitted = await prisma.submission.findFirst({
                where: {
                    userId: user.id,
                    task: { weekNumber: currentWeek },
                },
            });
            if (!alreadySubmitted) break;
            currentWeek++;
            advancedWeek = true;
        }

        // อัปเดต currentTaskWeek ถ้ามีการ advance
        if (advancedWeek) {
            await prisma.user.update({
                where: { id: user.id },
                data: { currentTaskWeek: currentWeek },
            });
        }

        // หา Task ตาม Week ของ User (ไม่สนใจ isActive ก่อน เพื่อแยก case)
        const task = await prisma.task.findFirst({
            where: { weekNumber: currentWeek },
        });

        if (!task) {
            // ไม่มี Task สำหรับ Week นี้ = ทำครบทุก Week แล้ว
            await replyText(
                replyToken,
                `คุณทำครบทุกสัปดาห์แล้ว${p(user.gender)}! เก่งมาก!\n\nรอภาระงานใหม่จากอาจารย์${np(user.gender)}\n\nพิมพ์ "แดชบอร์ด" เพื่อดูความก้าวหน้า`
            );
            return;
        }

        if (!task.isActive) {
            // Task มีแต่ยังไม่เปิด
            await replyText(
                replyToken,
                `ภาระงานสัปดาห์ที่ ${currentWeek} ยังไม่เปิดรับ${p(user.gender)}\n\nกรุณารอประกาศจากอาจารย์${np(user.gender)}`
            );
            return;
        }

        // Task มีและเปิดอยู่ → เข้าสู่โหมดส่งงาน
        await prisma.user.update({
            where: { id: user.id },
            data: {
                currentGameType: "SUBMITTING_TASK",
                currentQuestionId: task.id,
                gameData: JSON.stringify({
                    taskId: task.id,
                    weekNumber: task.weekNumber,
                    minWords: task.minWords,
                    maxWords: task.maxWords,
                    title: task.title,
                    startTime: Date.now(),
                }),
            },
        });

        const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString("th-TH") : "ไม่ระบุ";
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://proficienthai.vercel.app').trim().replace(/\/+$/, '');
        const taskUrl = `${baseUrl}/task/${task.slug}`;

        await replyWithQuickReply(
            replyToken,
            `📌 ภาระงานสัปดาห์ที่ ${task.weekNumber}\n\n${task.title}\n\n${task.description}\n\n📖 อ่านเนื้อหา:\n${taskUrl}\n\n✏️ ความยาว: ${task.minWords}-${task.maxWords} คำ\n📅 กำหนดส่ง: ${deadlineStr}\n\n✍️ พิมพ์งานเขียนของคุณได้เลย${p(user.gender)}\n(พิมพ์ "ยกเลิก" เพื่อยกเลิก)`,
            [{ label: "ยกเลิก", text: "ยกเลิก" }]
        );
    } catch (error) {
        console.error("Submit start error:", error);
        await replyText(replyToken, "เกิดข้อผิดพลาดในการเริ่มส่งงานครับ กรุณาลองใหม่อีกครั้ง\n\nพิมพ์ \"ส่งงาน\" เพื่อลองใหม่");
    }
}

async function handleSubmitWriting(replyToken: string, user: any, text: string) {
    try {
        let gameData: any = {};
        try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }
        const taskId = gameData.taskId || user.currentQuestionId;
        const minWords = gameData.minWords || 80;
        const maxWords = gameData.maxWords || 120;

        // Count words - Thai-aware: split by spaces, then estimate Thai words from continuous text
        // Thai words average ~3 characters, so continuous Thai segments are estimated
        const segments = text.split(/\s+/).filter((w: string) => w.length > 0);
        let wordCount = 0;
        for (const seg of segments) {
            const thaiChars = (seg.match(/[\u0E00-\u0E7F]/g) || []).length;
            if (thaiChars > 3) {
                // Estimate Thai words: ~3 chars per word on average
                wordCount += Math.ceil(thaiChars / 3);
            } else {
                wordCount += 1; // Non-Thai or very short segment = 1 word
            }
        }

        if (wordCount < Math.floor(minWords * 0.5)) {
            await replyWithQuickReply(
                replyToken,
                `⚠️ งานเขียนของคุณสั้นเกินไป${p(user?.gender)} (${wordCount} คำ)\n\nความยาวขั้นต่ำ: ${minWords} คำ\n\nกรุณาเขียนเพิ่มเติมแล้วส่งใหม่${p(user?.gender)}`,
                [{ label: "ยกเลิก", text: "ยกเลิก" }]
            );
            return;
        }

        // === Speed Detection ===
        let suspectedFast = false;
        let submissionSpeed: number | null = null;
        if (gameData.startTime) {
            submissionSpeed = Math.round((Date.now() - gameData.startTime) / 1000);
            const speedThreshold = Math.max(30, Math.floor(minWords / 2));
            if (submissionSpeed < speedThreshold) {
                suspectedFast = true;
            }
        }

        // Get the task for deadline check
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            await replyText(replyToken, `ไม่พบภาระงานนี้แล้ว${p(user?.gender)} กรุณาลองใหม่`);
            await prisma.user.update({
                where: { id: user.id },
                data: { currentGameType: null, currentQuestionId: null, gameData: null },
            });
            return;
        }

        const onTime = new Date() <= new Date(task.deadline);
        const earlyBonus = new Date() < new Date(new Date(task.deadline).getTime() - 24 * 60 * 60 * 1000);

        // === Copy Detection (trigram similarity vs examples) ===
        let suspectedCopy = false;
        let copySimilarity = 0;
        const normalizeText = (t: string) => t.replace(/\s+/g, '').toLowerCase();
        const getTrigrams = (t: string) => {
            const n = normalizeText(t);
            const trigrams = new Set<string>();
            for (let i = 0; i <= n.length - 3; i++) trigrams.add(n.substring(i, i + 3));
            return trigrams;
        };
        const calcSimilarity = (a: string, b: string) => {
            if (!a || !b || a.length < 10 || b.length < 10) return 0;
            const triA = getTrigrams(a);
            const triB = getTrigrams(b);
            let overlap = 0;
            triA.forEach(t => { if (triB.has(t)) overlap++; });
            return Math.round((overlap / Math.min(triA.size, triB.size)) * 100);
        };
        const examples = [task.bestPractice, task.generalPractice, task.badPractice].filter(Boolean) as string[];
        for (const example of examples) {
            const sim = calcSimilarity(text, example);
            if (sim > copySimilarity) copySimilarity = sim;
        }
        if (copySimilarity >= 70) suspectedCopy = true;

        // Create submission
        const submission = await prisma.submission.create({
            data: {
                userId: user.id,
                taskId: taskId,
                content: text,
                wordCount: wordCount,
                onTime: onTime,
                earlyBonus: earlyBonus,
                submissionSpeed: submissionSpeed,
                suspectedFast: suspectedFast,
                suspectedCopy: suspectedCopy,
            },
        });

        // Award points
        let pointsEarned = 20; // base points for submission
        if (onTime) pointsEarned += 10;
        if (earlyBonus) pointsEarned += 10;

        // Clear submission state + advance to next week
        await prisma.user.update({
            where: { id: user.id },
            data: {
                currentGameType: null,
                currentQuestionId: null,
                gameData: null,
                currentTaskWeek: { increment: 1 },
            },
        });

        // Award points with level-up detection
        let levelUpMsg = "";
        const pointResult = await addPoints(user.id, pointsEarned, 'SUBMIT_WRITING');
        if (pointResult.leveledUp && pointResult.newLevel) {
            const levelInfo = getLevelInfo(pointResult.newLevel);
            levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${pointResult.newLevel} "${levelInfo.title}"`;
        }

        // Try to generate AI feedback with practice examples
        let feedbackMsg = "";
        let suspectedAI = false;
        try {
            const feedback = await generateWritingFeedback(
                text,
                `${task.title}: ${task.description}`,
                true,
                {
                    bestPractice: task.bestPractice,
                    generalPractice: task.generalPractice,
                    badPractice: task.badPractice,
                }
            );
            if (feedback) {
                suspectedAI = feedback.suspectedAI === true;

                // Scale 1-4 per criterion to 0-14 each (total 0-100 from 7 criteria)
                const scaleScore = (raw: number) => Math.round((raw / 4) * 14);
                const scores = {
                    accuracyScore: scaleScore(feedback.scores.accuracy),
                    contentSelectionScore: scaleScore(feedback.scores.contentSelection),
                    interpretationScore: scaleScore(feedback.scores.interpretation),
                    taskFulfillmentScore: scaleScore(feedback.scores.taskFulfillment),
                    organizationScore: scaleScore(feedback.scores.organization),
                    languageUseScore: scaleScore(feedback.scores.languageUse),
                    mechanicsScore: scaleScore(feedback.scores.mechanics),
                    totalScore: Math.round((feedback.scores.total / 28) * 100),
                    aiFeedback: feedback.feedback + "\n\n" + feedback.encouragement,
                };

                await prisma.submission.update({
                    where: { id: submission.id },
                    data: { ...scores, suspectedAI },
                });

                feedbackMsg = `\n\n📊 คะแนนรวม: ${scores.totalScore}/100\n` +
                    `✅ ความถูกต้อง: ${feedback.scores.accuracy}/4\n` +
                    `📋 การเลือกสาระ: ${feedback.scores.contentSelection}/4\n` +
                    `💡 การตีความ: ${feedback.scores.interpretation}/4\n` +
                    `📌 การทำตามภารกิจ: ${feedback.scores.taskFulfillment}/4\n` +
                    `📝 การเรียบเรียง: ${feedback.scores.organization}/4\n` +
                    `📚 การใช้ภาษา: ${feedback.scores.languageUse}/4\n` +
                    `✍️ อักขระวิธี: ${feedback.scores.mechanics}/4\n` +
                    `\n💬 ${feedback.feedback}`;
            }
        } catch (feedbackError) {
            console.error("AI feedback error:", feedbackError);
            feedbackMsg = "\n\n(AI กำลังประเมินงาน รอสักครู่...)";
        }

        // === Build teasing messages ===
        let teaseMsg = "";
        if (suspectedFast && submissionSpeed != null) {
            teaseMsg += `\n\n⚡ ว้าว! ใช้เวลาแค่ ${submissionSpeed} วินาทีเอง...\nน้องไทยพิมพ์ยังไม่ทันเลย 🤖\nถ้าเขียนเอง เก่งมากจริงๆ! ถ้าไม่ใช่... ลองเขียนใหม่ด้วยตัวเองนะ ✍️`;
        }
        if (suspectedCopy) {
            teaseMsg += `\n\n🔍 อืม... น้องไทยอ่านแล้วคุ้นๆ นะ\nคล้ายตัวอย่างที่ให้ไปเลย ${copySimilarity}%!\nลองเขียนด้วยสำนวนของตัวเองดูนะ จะได้ฝึกจริงๆ ✏️`;
        }
        if (suspectedAI) {
            teaseMsg += `\n\n🤖 น้องไทยสังเกตว่า...\nเขียนดีเกินไปหน่อยนะ! สวยจนสงสัยว่า AI ตัวไหนมาช่วย 🧐\nถ้าเขียนเองจริงก็เก่งมาก! แต่ถ้าไม่... จำไว้ว่าเราฝึกเพื่อตัวเองนะ 💪`;
        }

        await prisma.submission.update({
            where: { id: submission.id },
            data: { pointsEarned },
        });

        const nextWeek = (gameData.weekNumber || 1) + 1;
        await replyWithQuickReply(
            replyToken,
            `✅ ส่งงานสัปดาห์ที่ ${gameData.weekNumber} เรียบร้อยแล้ว${p(user?.gender)}!\n\n📝 จำนวนคำ: ${wordCount}\n${onTime ? "⏰ ส่งตรงเวลา" : "⚠️ ส่งเลยกำหนด"}\n${earlyBonus ? "🌟 โบนัสส่งก่อนเวลา!" : ""}\n💰 +${pointsEarned} คะแนน${levelUpMsg}${feedbackMsg}${teaseMsg}\n\n🔓 ปลดล็อคสัปดาห์ที่ ${nextWeek} แล้ว!\nพิมพ์ "ส่งงาน" เพื่อดูภาระงานถัดไป`,
            [
                { label: "ส่งงานต่อ", text: "ส่งงาน" },
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
        await replyText(replyToken, `เกิดข้อผิดพลาดในการส่งงาน${p(user?.gender)} กรุณาลองใหม่อีกครั้ง\n\nพิมพ์ "ส่งงาน" เพื่อลองใหม่`);
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

    const levelInfo = getLevelInfo(user.currentLevel);
    const displayTitle = getDisplayTitle(user);
    const dashboardFlex = createDashboardFlex({
        thaiName: user.thaiName || "ผู้ใช้",
        level: user.currentLevel,
        points: user.totalPoints,
        submissionCount: user.submissions.length,
        totalTasks,
        vocabularyCount: user.vocabularyProgress.length,
        nextLevelPoints: getPointsForNextLevel(user.currentLevel),
        title: displayTitle,
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

    const profileDisplayTitle = getDisplayTitle(user);
    const profileFlex = createProfileFlex({
        chineseName: user.chineseName || "-",
        thaiName: user.thaiName || "-",
        university: user.university || "-",
        email: user.email || "-",
        nationality: user.nationality || "-",
        thaiLevel: user.thaiLevel,
        level: user.currentLevel,
        title: profileDisplayTitle,
        totalPoints: user.totalPoints,
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
        await replyText(replyToken, `${getTimeGreeting()} ยินดีต้อนรับสู่ ProficienThAI! 👋

ฉันคือ "${BOT_NAME}" ผู้ช่วยเรียนภาษาไทยของคุณ 📚

📌 คำสั่งสำหรับผู้ใช้ใหม่:
• พิมพ์ "ลงทะเบียน" เพื่อเริ่มต้นใช้งาน

เมื่อลงทะเบียนแล้วจะสามารถ:
✅ เล่นเกมฝึกภาษาไทย 15+ เกม
✅ ส่งงานเขียนและขอ feedback จาก AI
✅ สะสมแต้มและเลเวลอัป
✅ แข่งกับเพื่อนใน Leaderboard`);
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
            ? `You are "${BOT_NAME}", a friendly Thai language tutor. User: ${user.thaiName}, Level ${user.currentLevel}. Keep response SHORT (1-2 sentences max). Be warm and encouraging.`
            : `You are "${BOT_NAME}", a friendly Thai language tutor. User not registered. Keep response SHORT. Suggest typing "ลงทะเบียน" to start.`;

        console.log("[handleGeneralConversation] Calling AI with context:", context);
        let response = await generateConversationResponse(text, context);
        console.log("[handleGeneralConversation] AI response received:", response.substring(0, 50));

        if (user?.isRegistered) {
            // Limit daily chat points to once per day
            const todayKey = `daily_chat_${user.id}_${new Date().toISOString().split('T')[0]}`;
            const alreadyAwarded = await prisma.systemConfig.findUnique({ where: { key: todayKey } });
            if (!alreadyAwarded) {
                await prisma.systemConfig.upsert({
                    where: { key: todayKey },
                    update: { value: '1' },
                    create: { key: todayKey, value: '1' },
                });
                const result = await addPoints(user.id, POINTS.DAILY_CHAT, 'DAILY_CHAT');
                if (result.leveledUp && result.newLevel) {
                    const levelInfo = getLevelInfo(result.newLevel);
                    response += `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                }
            }
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
        await replyText(replyToken, `ยกเลิกการแก้ไขแล้ว${p(user?.gender)}`);
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
        `อัพเดท${fieldLabel}เป็น "${newValue}" เรียบร้อยแล้ว${p(user?.gender)}`,
        [
            { label: "แก้ไขเพิ่ม", text: "แก้ไข" },
            { label: "ดูข้อมูล", text: "ข้อมูลส่วนตัว" },
        ]
    );
}

async function handleFillBlankGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("FILL_BLANK", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.FILL_BLANK.questionsPerRound;

    // Load N random questions by shuffling IDs
    const allIds = await prisma.fillBlankQuestion.findMany({ select: { id: true } });
    if (allIds.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, numQ).map(q => q.id);
    const questions = await prisma.fillBlankQuestion.findMany({ where: { id: { in: selectedIds } } });

    if (questions.length === 0) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "FILL_BLANK");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("FILL_BLANK", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "FILL_BLANK",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session }),
        },
    });

    const fillBlankFlex = createFillBlankGameFlex({
        sentence: question.sentence,
        questionNumber: 1,
    });

    const messages: any[] = [];
    if (question.imageUrl) {
        messages.push({ type: "image", originalContentUrl: question.imageUrl, previewImageUrl: question.imageUrl });
    }
    if (multiplier < 1) {
        messages.push(createTextMessage(getDailyLimitMessage(roundCount, "เติมคำ")));
    }
    messages.push(fillBlankFlex);
    await lineClient.replyMessage({ replyToken, messages });
}

async function handleMultipleChoiceGameStart(replyToken: string, userId: string) {
    const numQ = 5; // Default 5 questions per round for legacy multiple choice

    const allIds = await prisma.multipleChoiceQuestion.findMany({ select: { id: true } });
    if (allIds.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ หรือลองเกมอื่น");
        return;
    }

    const shuffled = allIds.sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, numQ).map(q => q.id);
    const questions = await prisma.multipleChoiceQuestion.findMany({ where: { id: { in: selectedIds } } });

    if (questions.length === 0) {
        await replyText(replyToken, "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "MULTIPLE_CHOICE");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("MULTIPLE_CHOICE", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "MULTIPLE_CHOICE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session }),
        },
    });

    const multipleChoiceFlex = createMultipleChoiceGameFlex({
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        questionNumber: 1,
        totalQuestions: questions.length,
    });

    const messages: any[] = [];
    if (multiplier < 1) {
        messages.push(createTextMessage(getDailyLimitMessage(roundCount, "เลือกตอบ")));
    }
    messages.push(multipleChoiceFlex);
    await lineClient.replyMessage({ replyToken, messages });
}

async function handleSentenceGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("COMPOSE_SENTENCE", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.COMPOSE_SENTENCE.questionsPerRound;
    const pairs = await getRandomSentencePairs(userId, numQ);

    if (pairs.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ หรือลองเกมอื่น");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "SENTENCE_WRITING");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("SENTENCE_WRITING", pairs.map(p => p.id), multiplier);

    const pair = pairs[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "SENTENCE_WRITING",
            currentQuestionId: pair.id,
            gameData: JSON.stringify({ session }),
        },
    });

    const sentenceFlex = createSentenceGameFlex({
        word1: pair.word1,
        word2: pair.word2,
        questionNumber: 1,
    });

    const messages: any[] = [];
    if (multiplier < 1) {
        messages.push(createTextMessage(getDailyLimitMessage(roundCount, "แต่งประโยค")));
    }
    messages.push(sentenceFlex);
    await lineClient.replyMessage({ replyToken, messages });
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
            title: true,
        },
    });

    if (topUsers.length === 0) {
        await replyText(replyToken, `ยังไม่มีข้อมูลผู้ใช้ในระบบ${p(user?.gender)}`);
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
            title: getDisplayTitle(u),
        })),
        myRank,
        myPoints: user.totalPoints,
        myLevel: user.currentLevel,
        myTitle: getDisplayTitle(user),
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

    // Update last spin time
    await prisma.user.update({
        where: { id: user.id },
        data: { lastSpinAt: now },
    });

    // Award points with level-up detection
    let levelUpMsg = "";
    if (reward.value > 0) {
        const result = await addPoints(user.id, reward.value, 'SPIN_WHEEL');
        if (result.leveledUp && result.newLevel) {
            const levelInfo = getLevelInfo(result.newLevel);
            levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
        }
    }

    const newTotal = user.totalPoints + reward.value;

    const spinFlex = createSpinWheelResultFlex({
        reward: reward.name + (levelUpMsg ? levelUpMsg : ""),
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
        await replyText(replyToken, `กรุณาเริ่มเล่นเกมก่อน${p(user?.gender)} พิมพ์ "ฝึกฝน" เพื่อเลือกเกม`);
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
            answerText = `✍️ เกมเขียนประโยคไม่มีคำตอบตายตัว\n\nลองแต่งประโยคที่มีคำว่า "${pair.word1}" และ "${pair.word2}" ได้เลย${p(user?.gender)}`;
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

    // Check for session
    const session: GameSessionState | null = gameData.session || null;
    const wasPendingWrong = gameData.pendingWrong === true;

    // Record question history (showed answer = wrong) — skip if already recorded via pendingWrong
    if (!wasPendingWrong && user.currentQuestionId && gameType) {
        try {
            await recordQuestionAnswered(user.lineUserId, user.currentQuestionId, gameType, false);
        } catch (e) {
            console.error("Failed to record question history:", e);
        }
    }

    if (session) {
        // ===== SESSION MODE: show answer, advance session =====
        // Clear pending state before advancing
        delete gameData.pendingWrong;
        delete gameData.hintUsedForCurrent;
        const updatedSession = advanceSession(session, false);

        if (isSessionComplete(updatedSession)) {
            // Session complete
            await prisma.user.update({
                where: { lineUserId: userId },
                data: { currentGameType: null, currentQuestionId: null, gameData: null },
            });

            try {
                await prisma.languageGameSession.create({
                    data: {
                        odUserId: user.lineUserId,
                        gameType: gameType as any,
                        questions: updatedSession.questionIds,
                        answers: updatedSession.answers.map(a => a.correct ? "correct" : "wrong"),
                        currentIndex: updatedSession.totalQuestions,
                        isCompleted: true,
                        correctCount: updatedSession.correctCount,
                        totalCount: updatedSession.totalQuestions,
                        pointsEarned: updatedSession.pointsEarned,
                        completedAt: new Date(),
                    },
                });
            } catch (e) {
                console.error("Failed to create game session record:", e);
            }

            let levelUpMsg = "";
            if (updatedSession.pointsEarned > 0) {
                const result = await addPoints(user.id, updatedSession.pointsEarned, 'GAME_CORRECT');
                if (result.leveledUp && result.newLevel) {
                    const levelInfo = getLevelInfo(result.newLevel);
                    levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                }
            }

            // Check for achievement title
            let titleMsg = "";
            try {
                const titleResult = await checkAndAwardTitle(user.lineUserId, gameType);
                if (titleResult) {
                    titleMsg = `\n\n🏅 ได้รับฉายา "${titleResult.emoji} ${titleResult.newTitle}"!`;
                }
            } catch (e) {
                console.error("Failed to check title:", e);
            }

            const summaryMsg = formatSessionSummary(updatedSession);
            await replyWithQuickReply(
                replyToken,
                `${answerText || "ไม่พบคำตอบ"}\n\n${summaryMsg}${levelUpMsg}${titleMsg}`,
                [
                    { label: "เล่นใหม่", text: getGameStartCommand(gameType) },
                    { label: "เกมอื่น", text: "ฝึกฝน" },
                    { label: "เมนู", text: "เมนู" },
                ]
            );
        } else {
            // Save updated session, show answer + "ข้อต่อไป"
            await prisma.user.update({
                where: { lineUserId: userId },
                data: {
                    gameData: JSON.stringify({ ...gameData, session: updatedSession }),
                },
            });

            const progressMsg = `📊 ${getSessionProgress(updatedSession)} | ถูก ${updatedSession.correctCount}/${updatedSession.currentIndex}`;
            await replyWithQuickReply(
                replyToken,
                `${answerText || "ไม่พบคำตอบ"}\n\n${progressMsg}`,
                [
                    { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
                    { label: "ออก", text: "ฝึกฝน" },
                ]
            );
        }
    } else {
        // ===== LEGACY MODE: reset game state after showing answer =====
        await prisma.user.update({
            where: { lineUserId: userId },
            data: { currentGameType: null, currentQuestionId: null, gameData: null },
        });

        await replyWithQuickReply(
            replyToken,
            answerText || "ไม่พบคำตอบ",
            [
                { label: "เล่นต่อ", text: getGameStartCommand(gameType) },
                { label: "เกมอื่น", text: "ฝึกฝน" },
                { label: "เมนู", text: "เมนู" },
            ]
        );
    }
}

async function handleSkipQuestion(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.currentGameType || !user?.currentQuestionId) {
        await replyText(replyToken, `ไม่มีคำถามให้ข้าม${p(user?.gender)} พิมพ์ "ฝึกฝน" เพื่อเริ่มเล่น`);
        return;
    }

    const gameType = user.currentGameType;
    let gameData: any = {};
    try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }
    const wasPendingWrong = gameData.pendingWrong === true;
    const session: GameSessionState | null = gameData.session || null;

    if (session) {
        // ===== SESSION MODE: skip = mark as wrong, advance =====
        // Clear pending state before advancing
        delete gameData.pendingWrong;
        delete gameData.hintUsedForCurrent;
        const updatedSession = advanceSession(session, false);

        // Record question history (skipped = wrong) — skip if already recorded via pendingWrong
        if (!wasPendingWrong) {
            try {
                await recordQuestionAnswered(user.lineUserId, user.currentQuestionId, gameType, false);
            } catch (e) {
                console.error("Failed to record question history:", e);
            }
        }

        if (isSessionComplete(updatedSession)) {
            // Session complete
            await prisma.user.update({
                where: { id: user.id },
                data: { currentGameType: null, currentQuestionId: null, gameData: null },
            });

            try {
                await prisma.languageGameSession.create({
                    data: {
                        odUserId: user.lineUserId,
                        gameType: gameType as any,
                        questions: updatedSession.questionIds,
                        answers: updatedSession.answers.map(a => a.correct ? "correct" : "wrong"),
                        currentIndex: updatedSession.totalQuestions,
                        isCompleted: true,
                        correctCount: updatedSession.correctCount,
                        totalCount: updatedSession.totalQuestions,
                        pointsEarned: updatedSession.pointsEarned,
                        completedAt: new Date(),
                    },
                });
            } catch (e) {
                console.error("Failed to create game session record:", e);
            }

            let levelUpMsg = "";
            if (updatedSession.pointsEarned > 0) {
                const result = await addPoints(user.id, updatedSession.pointsEarned, 'GAME_CORRECT');
                if (result.leveledUp && result.newLevel) {
                    const levelInfo = getLevelInfo(result.newLevel);
                    levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                }
            }

            // Check for achievement title
            let titleMsg = "";
            try {
                const titleResult = await checkAndAwardTitle(user.lineUserId, gameType);
                if (titleResult) {
                    titleMsg = `\n\n🏅 ได้รับฉายา "${titleResult.emoji} ${titleResult.newTitle}"!`;
                }
            } catch (e) {
                console.error("Failed to check title:", e);
            }

            const summaryMsg = formatSessionSummary(updatedSession);
            await replyWithQuickReply(
                replyToken,
                `⏭️ ข้ามข้อนี้\n\n${summaryMsg}${levelUpMsg}${titleMsg}`,
                [
                    { label: "เล่นใหม่", text: getGameStartCommand(gameType) },
                    { label: "เกมอื่น", text: "ฝึกฝน" },
                    { label: "เมนู", text: "เมนู" },
                ]
            );
        } else {
            // Save updated session, show "ข้อต่อไป"
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    gameData: JSON.stringify({ ...gameData, session: updatedSession }),
                },
            });

            const progressMsg = `📊 ${getSessionProgress(updatedSession)} | ถูก ${updatedSession.correctCount}/${updatedSession.currentIndex}`;
            await replyWithQuickReply(
                replyToken,
                `⏭️ ข้ามข้อนี้\n\n${progressMsg}`,
                [
                    { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
                    { label: "ออก", text: "ฝึกฝน" },
                ]
            );
        }
    } else {
        // ===== LEGACY MODE: reset and start new question =====
        await prisma.user.update({
            where: { lineUserId: userId },
            data: { currentGameType: null, currentQuestionId: null, gameData: null },
        });

        const gameHandlers: Record<string, () => Promise<void>> = {
            "VOCAB_MATCH": () => handleVocabMatchGameStart(replyToken, userId),
            "VOCAB_MEANING": () => handleVocabMeaningGameStart(replyToken, userId),
            "VOCAB_OPPOSITE": () => handleVocabOppositeGameStart(replyToken, userId),
            "VOCAB_SYNONYM": () => handleVocabSynonymGameStart(replyToken, userId),
            "FILL_BLANK": () => handleFillBlankGameStart(replyToken, userId),
            "FIX_SENTENCE": () => handleFixSentenceGameStart(replyToken, userId),
            "ARRANGE_SENTENCE": () => handleArrangeSentenceGameStart(replyToken, userId),
            "SPEED_GRAMMAR": () => handleSpeedGrammarGameStart(replyToken, userId),
            "READ_ANSWER": () => handleReadAnswerGameStart(replyToken, userId),
            "SENTENCE_WRITING": () => handleSentenceGameStart(replyToken, userId),
            "SUMMARIZE": () => handleSummarizeGameStart(replyToken, userId),
            "CONTINUE_STORY": () => handleContinueStoryGameStart(replyToken, userId),
            "RACE_CLOCK": () => handleRaceClockGameStart(replyToken, userId),
            "MULTIPLE_CHOICE": () => handleMultipleChoiceGameStart(replyToken, userId),
        };

        const handler = gameHandlers[gameType];
        if (handler) {
            await handler();
        } else {
            await replyText(replyToken, `ข้ามคำถามแล้ว${p(user?.gender)} พิมพ์ "ฝึกฝน" เพื่อเลือกเกม`);
        }
    }
}

// =====================
// Hint Handler — Show hint for current question
// =====================

async function handleHint(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.currentGameType || !user?.currentQuestionId) {
        await replyText(replyToken, `ไม่มีคำถามที่กำลังเล่นอยู่${p(user?.gender)}`);
        return;
    }

    const gameType = user.currentGameType;
    const questionId = user.currentQuestionId;
    let gameData: any = {};
    try { gameData = user.gameData ? JSON.parse(user.gameData) : {}; } catch { gameData = {}; }

    // Look up hint from DB based on game type
    let hintText: string | null = null;

    if (gameType === "VOCAB_MATCH" || gameType === "VOCAB_MEANING") {
        const q = await prisma.vocabMatchQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "VOCAB_OPPOSITE") {
        const q = await prisma.vocabOppositeQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "VOCAB_SYNONYM") {
        const q = await prisma.vocabSynonymQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "FILL_BLANK") {
        const q = await prisma.fillBlankQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "FIX_SENTENCE") {
        const q = await prisma.fixSentenceQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "ARRANGE_SENTENCE") {
        const q = await prisma.arrangeSentenceQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "READ_ANSWER") {
        const q = await prisma.readAnswerQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "THAI_IDIOM") {
        const q = await prisma.thaiIdiomQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "THAI_CULTURE") {
        const q = await prisma.thaiCultureQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "SPEED_GRAMMAR") {
        const q = await prisma.speedGrammarQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "SUMMARIZE") {
        const q = await prisma.summarizeQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    } else if (gameType === "CONTINUE_STORY") {
        const q = await prisma.continueStoryQuestion.findUnique({ where: { id: questionId } });
        hintText = q?.hint || null;
    }

    // Mark hint as used in gameData
    gameData.hintUsedForCurrent = true;
    await prisma.user.update({
        where: { id: user.id },
        data: { gameData: JSON.stringify(gameData) },
    });

    const displayHint = hintText
        ? `💡 คำใบ้: ${hintText}`
        : `💡 ไม่มีคำใบ้สำหรับข้อนี้${p(user?.gender)}`;
    const hintNote = hintText ? "\n\n⚠️ ถ้าตอบถูกหลังใช้คำใบ้ คะแนนจะลด 50%" : "";

    await replyWithQuickReply(
        replyToken,
        `${displayHint}${hintNote}\n\nพิมพ์คำตอบใหม่ได้เลย${p(user?.gender)}`,
        [
            { label: "เฉลย", text: "เฉลย" },
            { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
            { label: "ออก", text: "ฝึกฝน" },
        ]
    );
}

// =====================
// Session Next Question Handler
// =====================

async function handleSessionNext(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.currentGameType || !user?.gameData) {
        await replyText(replyToken, `ไม่มีเกมที่กำลังเล่นอยู่${p(user?.gender)}\n\nพิมพ์ "ฝึกฝน" เพื่อเริ่มเล่น`);
        return;
    }

    let gameData: any = {};
    try { gameData = JSON.parse(user.gameData); } catch { gameData = {}; }

    let session: GameSessionState | null = gameData.session || null;

    // Handle pendingWrong: advance session marking as wrong, then proceed to next question
    if (session && gameData.pendingWrong) {
        const gameType = user.currentGameType;
        session = advanceSession(session, false);
        delete gameData.pendingWrong;
        delete gameData.hintUsedForCurrent;
        gameData.session = session;

        if (isSessionComplete(session)) {
            // Session complete after this skipped wrong answer
            await prisma.user.update({
                where: { id: user.id },
                data: { currentGameType: null, currentQuestionId: null, gameData: null },
            });

            try {
                await prisma.languageGameSession.create({
                    data: {
                        odUserId: user.lineUserId,
                        gameType: gameType as any,
                        questions: session.questionIds,
                        answers: session.answers.map((a: any) => a.correct ? "correct" : "wrong"),
                        currentIndex: session.totalQuestions,
                        isCompleted: true,
                        correctCount: session.correctCount,
                        totalCount: session.totalQuestions,
                        pointsEarned: session.pointsEarned,
                        completedAt: new Date(),
                    },
                });
            } catch (e) {
                console.error("Failed to create game session record:", e);
            }

            let levelUpMsg = "";
            if (session.pointsEarned > 0) {
                const result = await addPoints(user.id, session.pointsEarned, 'GAME_CORRECT');
                if (result.leveledUp && result.newLevel) {
                    const levelInfo = getLevelInfo(result.newLevel);
                    levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                }
            }

            // Check for achievement title
            let titleMsg = "";
            try {
                const titleResult = await checkAndAwardTitle(user.lineUserId, gameType);
                if (titleResult) {
                    titleMsg = `\n\n🏅 ได้รับฉายา "${titleResult.emoji} ${titleResult.newTitle}"!`;
                }
            } catch (e) {
                console.error("Failed to check title:", e);
            }

            const summaryMsg = formatSessionSummary(session);
            await replyWithQuickReply(
                replyToken,
                `${summaryMsg}${levelUpMsg}${titleMsg}`,
                [
                    { label: "เล่นใหม่", text: getGameStartCommand(gameType) },
                    { label: "เกมอื่น", text: "ฝึกฝน" },
                    { label: "เมนู", text: "เมนู" },
                ]
            );
            return;
        }
        // Not complete — session has been advanced, continue to load next question below
    }

    if (!session || isSessionComplete(session)) {
        await prisma.user.update({
            where: { id: user.id },
            data: { currentGameType: null, currentQuestionId: null, gameData: null },
        });
        await replyText(replyToken, `จบเกมแล้ว${p(user?.gender)}\n\nพิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`);
        return;
    }

    const questionId = getCurrentQuestionId(session);
    if (!questionId) {
        await replyText(replyToken, `จบเกมแล้ว${p(user?.gender)}\n\nพิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`);
        return;
    }

    const gameType = user.currentGameType;
    const idx = session.currentIndex;
    const total = session.totalQuestions;

    try {
        // Present question based on game type
        if (gameType === "VOCAB_MATCH") {
            const q = await prisma.vocabMatchQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            const options = getVocabMatchOptions(q as any);
            const correctIndex = options.indexOf(q.meaning);
            const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, options, correctAnswer }) },
            });
            await replyWithQuickReply(replyToken, formatVocabMatchQuestion(q as any, options, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], q.imageUrl);
        }
        else if (gameType === "VOCAB_MEANING") {
            const q = await prisma.vocabMatchQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctAnswer: q.meaning }) },
            });
            await replyWithQuickReply(replyToken, formatVocabMeaningQuestion(q as any, idx, total), [
                { label: "ข้าม", text: "ข้าม" }, { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "VOCAB_OPPOSITE") {
            const q = await prisma.vocabOppositeQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            const options = getVocabOppositeOptions(q as any);
            const correctIndex = options.indexOf(q.opposite);
            const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, options, correctAnswer, correctText: q.opposite }) },
            });
            await replyWithQuickReply(replyToken, formatVocabOppositeQuestion(q as any, options, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], q.imageUrl);
        }
        else if (gameType === "VOCAB_SYNONYM") {
            const q = await prisma.vocabSynonymQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            const options = getVocabSynonymOptions(q as any);
            const correctIndex = options.indexOf(q.synonym);
            const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, options, correctAnswer, correctText: q.synonym }) },
            });
            await replyWithQuickReply(replyToken, formatVocabSynonymQuestion(q as any, options, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], q.imageUrl);
        }
        else if (gameType === "FILL_BLANK") {
            const q = await prisma.fillBlankQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session }) },
            });
            const fillBlankFlex = createFillBlankGameFlex({ sentence: q.sentence, questionNumber: idx + 1 });
            const msgs: any[] = [];
            if (q.imageUrl) { msgs.push({ type: "image", originalContentUrl: q.imageUrl, previewImageUrl: q.imageUrl }); }
            msgs.push(fillBlankFlex);
            await lineClient.replyMessage({ replyToken, messages: msgs });
        }
        else if (gameType === "FIX_SENTENCE") {
            const q = await prisma.fixSentenceQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctSentence: q.correctSentence }) },
            });
            await replyWithQuickReply(replyToken, formatFixSentenceQuestion(q as any, idx, total), [
                { label: "เฉลย", text: "เฉลย" }, { label: "ข้าม", text: "ข้าม" }, { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "ARRANGE_SENTENCE") {
            const q = await prisma.arrangeSentenceQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctSentence: q.correctSentence }) },
            });
            await replyWithQuickReply(replyToken, formatArrangeSentenceQuestion(q as any, idx, total), [
                { label: "เฉลย", text: "เฉลย" }, { label: "ข้าม", text: "ข้าม" }, { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "SPEED_GRAMMAR") {
            const q = await prisma.speedGrammarQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctAnswer: q.correctAnswer, startTime: Date.now(), timeLimit: q.timeLimit }) },
            });
            await replyWithQuickReply(replyToken, formatSpeedGrammarQuestion(q as any, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], q.imageUrl);
        }
        else if (gameType === "READ_ANSWER") {
            const q = await prisma.readAnswerQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctAnswer: q.correctAnswer }) },
            });
            await replyWithQuickReply(replyToken, formatReadAnswerQuestion(q as any, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], q.imageUrl);
        }
        else if (gameType === "SENTENCE_WRITING") {
            const q = await prisma.sentenceConstructionPair.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session }) },
            });
            const sentenceFlex = createSentenceGameFlex({ word1: q.word1, word2: q.word2, questionNumber: idx + 1 });
            await lineClient.replyMessage({ replyToken, messages: [sentenceFlex] as any });
        }
        else if (gameType === "SUMMARIZE") {
            const q = await prisma.summarizeQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, passage: q.passage, keywords: q.keywords, sampleSummary: q.sampleSummary }) },
            });
            await replyWithQuickReply(replyToken, formatSummarizeQuestion(q as any, idx, total), [
                { label: "ข้าม", text: "ข้าม" }, { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "CONTINUE_STORY") {
            const q = await prisma.continueStoryQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, keywords: q.keywords, minLength: q.minLength, storyStart: q.storyStart }) },
            });
            await replyWithQuickReply(replyToken, formatContinueStoryQuestion(q as any, idx, total), [
                { label: "ข้าม", text: "ข้าม" }, { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "THAI_IDIOM") {
            const q = await prisma.thaiIdiomQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            const { getThaiIdiomOptions, formatThaiIdiomQuestion } = await import("@/lib/games/thaiIdiom");
            const options = getThaiIdiomOptions(q as any);
            (session as any).currentOptions = options;
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session }) },
            });
            await replyWithQuickReply(replyToken, formatThaiIdiomQuestion(q as any, options, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
                { label: "Hint 💡", text: HINT_CMD },
                { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "THAI_CULTURE") {
            const q = await prisma.thaiCultureQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            const { getThaiCultureOptions, formatThaiCultureQuestion } = await import("@/lib/games/thaiCulture");
            const options = getThaiCultureOptions(q as any);
            (session as any).currentOptions = options;
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session }) },
            });
            await replyWithQuickReply(replyToken, formatThaiCultureQuestion(q as any, options, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
                { label: "Hint 💡", text: HINT_CMD },
                { label: "ออก", text: "ฝึกฝน" },
            ], q.imageUrl);
        }
        else if (gameType === "RACE_CLOCK") {
            const q = await prisma.multipleChoiceQuestion.findFirst({ where: { id: questionId } })
                || await prisma.speedGrammarQuestion.findFirst({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session, correctAnswer: (q as any).correctAnswer, startTime: Date.now() }) },
            });
            await replyWithQuickReply(replyToken, formatRaceClockQuestion(q as any, idx, total), [
                { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
                { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            ], (q as any).imageUrl);
        }
        else if (gameType === "MULTIPLE_CHOICE") {
            const q = await prisma.multipleChoiceQuestion.findUnique({ where: { id: questionId } });
            if (!q) { await replyText(replyToken, "ไม่พบคำถาม กรุณาลองใหม่"); return; }
            await prisma.user.update({
                where: { id: user.id },
                data: { currentQuestionId: questionId, gameData: JSON.stringify({ session }) },
            });
            const mcFlex = createMultipleChoiceGameFlex({
                question: q.question, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, questionNumber: idx + 1, totalQuestions: total,
            });
            await lineClient.replyMessage({ replyToken, messages: [mcFlex] as any });
        }
        else {
            await replyText(replyToken, "ไม่รองรับเกมนี้ พิมพ์ \"ฝึกฝน\" เพื่อเลือกเกมใหม่");
        }
    } catch (error) {
        console.error("handleSessionNext error:", error);
        await replyText(replyToken, `เกิดข้อผิดพลาด กรุณาลองใหม่${p(user?.gender)}`);
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
            if (checkFillBlankAnswer(text, question.answer)) {
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
        // Culture Games
        // ==================
        else if (gameType === "THAI_IDIOM") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            // Find correct answer from options
            const question = await prisma.thaiIdiomQuestion.findUnique({ where: { id: user.currentQuestionId } });
            if (!question) {
                await replyText(replyToken, "เกิดข้อผิดพลาด ไม่พบคำถาม");
                return;
            }
            const options = gameData.session?.currentOptions || gameData.currentOptions || [];
            const answerIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[normalizedAnswer] ?? -1;
            const selectedOption = answerIdx >= 0 ? options[answerIdx] : text.trim();
            isCorrect = selectedOption === question.meaning;
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                const correctIdx = options.indexOf(question.meaning);
                const correctLabel = correctIdx >= 0 ? ['ก', 'ข', 'ค', 'ง'][correctIdx] : '';
                message = `คำตอบที่ถูกคือ ${correctLabel}. ${question.meaning}`;
            }
            if (question.example) {
                message = (message ? message + "\n\n" : "") + `📝 ตัวอย่าง: ${question.example}`;
            }
        }
        else if (gameType === "THAI_CULTURE") {
            const normalizedAnswer = answerMap[text.trim()] || text.trim().toUpperCase();
            const question = await prisma.thaiCultureQuestion.findUnique({ where: { id: user.currentQuestionId } });
            if (!question) {
                await replyText(replyToken, "เกิดข้อผิดพลาด ไม่พบคำถาม");
                return;
            }
            const options = gameData.session?.currentOptions || gameData.currentOptions || [];
            const answerIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[normalizedAnswer] ?? -1;
            const selectedOption = answerIdx >= 0 ? options[answerIdx] : text.trim();
            isCorrect = selectedOption === question.correct;
            points = isCorrect ? 10 : 0;
            if (!isCorrect) {
                const correctIdx = options.indexOf(question.correct);
                const correctLabel = correctIdx >= 0 ? ['ก', 'ข', 'ค', 'ง'][correctIdx] : '';
                message = `คำตอบที่ถูกคือ ${correctLabel}. ${question.correct}`;
            }
            if (question.explanation) {
                message = (message ? message + "\n\n" : "") + `💡 เพิ่มเติม: ${question.explanation}`;
            }
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
        // Handle Result (Session-aware)
        // ==================

        // Record question history for all games (so questions don't repeat within 24h)
        if (user.currentQuestionId && gameType) {
            try {
                await recordQuestionAnswered(user.lineUserId, user.currentQuestionId, gameType, isCorrect);
            } catch (e) {
                console.error("Failed to record question history:", e);
            }
        }

        // Parse session from gameData
        const session: GameSessionState | null = gameData.session || null;

        if (session) {
            // ===== SESSION MODE: advance session and handle multi-question flow =====
            const isPendingWrong = gameData.pendingWrong === true;
            const wasHintUsed = gameData.hintUsedForCurrent === true;

            if (isCorrect) {
                // Correct answer (possibly after retry with hint)
                const hintUsed = isPendingWrong && wasHintUsed;
                const updatedSession = advanceSession(session, true, hintUsed);
                const earnedThisQ = updatedSession.pointsEarned - session.pointsEarned;
                const hintNote = hintUsed ? " (ใช้คำใบ้ -50%)" : "";

                // Clear pending state
                delete gameData.pendingWrong;
                delete gameData.hintUsedForCurrent;

                if (isSessionComplete(updatedSession)) {
                    // Session complete — award total points + show summary
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { currentGameType: null, currentQuestionId: null, gameData: null },
                    });

                    // Record completed session for daily round tracking
                    try {
                        await prisma.languageGameSession.create({
                            data: {
                                odUserId: user.lineUserId,
                                gameType: gameType as any,
                                questions: updatedSession.questionIds,
                                answers: updatedSession.answers.map(a => a.correct ? "correct" : "wrong"),
                                currentIndex: updatedSession.totalQuestions,
                                isCompleted: true,
                                correctCount: updatedSession.correctCount,
                                totalCount: updatedSession.totalQuestions,
                                pointsEarned: updatedSession.pointsEarned,
                                completedAt: new Date(),
                            },
                        });
                    } catch (e) {
                        console.error("Failed to create game session record:", e);
                    }

                    // Award total points
                    let levelUpMsg = "";
                    if (updatedSession.pointsEarned > 0) {
                        const result = await addPoints(user.id, updatedSession.pointsEarned, 'GAME_CORRECT');
                        if (result.leveledUp && result.newLevel) {
                            const levelInfo = getLevelInfo(result.newLevel);
                            levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                        }
                    }

                    // Check for achievement title
                    let titleMsg = "";
                    try {
                        const titleResult = await checkAndAwardTitle(user.lineUserId, gameType);
                        if (titleResult) {
                            titleMsg = `\n\n🏅 ได้รับฉายา "${titleResult.emoji} ${titleResult.newTitle}"!`;
                        }
                    } catch (e) {
                        console.error("Failed to check title:", e);
                    }

                    const summaryMsg = formatSessionSummary(updatedSession);
                    await replyWithQuickReply(
                        replyToken,
                        `✅ ${getCorrectMessage(message)} (+${earnedThisQ}${hintNote})\n\n${summaryMsg}${levelUpMsg}${titleMsg}`,
                        [
                            { label: "เล่นใหม่", text: getGameStartCommand(gameType) },
                            { label: "เกมอื่น", text: "ฝึกฝน" },
                            { label: "เมนู", text: "เมนู" },
                        ]
                    );
                } else {
                    // Session not complete — save updated session, show result + "ข้อต่อไป"
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            gameData: JSON.stringify({ ...gameData, session: updatedSession }),
                        },
                    });

                    const progressMsg = `\n\n📊 ${getSessionProgress(updatedSession)} | ถูก ${updatedSession.correctCount}/${updatedSession.currentIndex}`;
                    await replyWithQuickReply(
                        replyToken,
                        `✅ ${getCorrectMessage(message)} (+${earnedThisQ}${hintNote})${progressMsg}`,
                        [
                            { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
                            { label: "ออก", text: "ฝึกฝน" },
                        ]
                    );
                }
            } else {
                // Wrong answer — enter/stay in pendingWrong state (don't advance yet)
                // User can: retry, use hint, see answer, or skip to next
                gameData.pendingWrong = true;
                await prisma.user.update({
                    where: { id: user.id },
                    data: { gameData: JSON.stringify(gameData) },
                });

                const progressMsg = `📊 ${getSessionProgress(session)} | ถูก ${session.correctCount}/${session.currentIndex}`;
                const retryMsg = getWrongMessage(message, isPendingWrong);

                // Don't show Hint button if already used
                const buttons = wasHintUsed
                    ? [
                        { label: "เฉลย", text: "เฉลย" },
                        { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
                        { label: "ออก", text: "ฝึกฝน" },
                    ]
                    : [
                        { label: "Hint 💡", text: HINT_CMD },
                        { label: "เฉลย", text: "เฉลย" },
                        { label: "ข้อต่อไป ▶", text: NEXT_QUESTION_CMD },
                        { label: "ออก", text: "ฝึกฝน" },
                    ];

                await replyWithQuickReply(
                    replyToken,
                    `❌ ${retryMsg}\n\n${progressMsg}`,
                    buttons
                );
            }
        } else {
            // ===== LEGACY MODE: single-question flow (no session) =====
            if (isCorrect || ((gameType === "SUMMARIZE" || gameType === "CONTINUE_STORY") && points > 0)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentGameType: null, currentQuestionId: null, gameData: null },
                });

                let levelUpMsg = "";
                if (points > 0) {
                    const reason = isCorrect ? 'GAME_CORRECT' : 'GAME_PARTIAL';
                    const result = await addPoints(user.id, points, reason);
                    if (result.leveledUp && result.newLevel) {
                        const levelInfo = getLevelInfo(result.newLevel);
                        levelUpMsg = `\n\n🎉 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
                    }
                }

                const emoji = isCorrect ? "✅" : "📝";
                await replyWithQuickReply(
                    replyToken,
                    `${emoji} ${getCorrectMessage(message)}\n\n+${points} คะแนน${levelUpMsg}`,
                    [
                        { label: "ข้อต่อไป", text: getGameStartCommand(gameType) },
                        { label: "เกมอื่น", text: "ฝึกฝน" },
                        { label: "เมนู", text: "เมนู" },
                    ]
                );
            } else {
                await replyWithQuickReply(
                    replyToken,
                    `❌ ${getWrongMessage(message)}\n\nลองใหม่ หรือพิมพ์ "เฉลย"`,
                    [
                        { label: "เฉลย", text: "เฉลย" },
                        { label: "ข้าม", text: "ข้าม" },
                        { label: "ออก", text: "ฝึกฝน" },
                    ]
                );
            }
        }
    } catch (error) {
        console.error("handleGameAnswer error:", error);
        await replyText(replyToken, `เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง${p(user?.gender)}`);
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
        await replyText(replyToken, `ขณะนี้ยังไม่มีภาระงานที่เปิดรับ${p(user?.gender)}\n\nกรุณารอประกาศจากอาจารย์`);
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
// Culture Games Menu + Handlers
// =====================

async function handleCultureGamesMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });

    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    await replyWithQuickReply(
        replyToken,
        `🇹🇭 หมวดวัฒนธรรมไทย${p(user.gender)}\n\nเรียนรู้สำนวน มารยาท และวัฒนธรรมไทย\nเลือกเกมด้านล่าง:`,
        [
            { label: "🏮 สำนวนไทย", text: "สำนวนไทย" },
            { label: "🙏 วัฒนธรรมไทย", text: "วัฒนธรรมไทย" },
            { label: "🔙 กลับ", text: "ฝึกฝน" },
        ]
    );
}

async function handleThaiIdiomGameStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    // Level gate check
    const gameConfig = GAME_TYPES.THAI_IDIOM;
    if (user.currentLevel < gameConfig.requiredLevel) {
        await replyText(replyToken, `🔒 ต้อง Level ${gameConfig.requiredLevel} ขึ้นไป${p(user.gender)}\nตอนนี้คุณ Level ${user.currentLevel}\n\nเล่นเกมอื่นเพื่อเก็บคะแนนเลเวลอัป!`);
        return;
    }

    // Daily round limit
    const { getDailyRoundCount, calculatePointMultiplier, getDailyLimitMessage } = await import("@/lib/games/engine");
    const roundCount = await getDailyRoundCount(user.lineUserId, "THAI_IDIOM");
    const multiplier = calculatePointMultiplier(roundCount);

    const { getRandomThaiIdiomQuestions, getThaiIdiomOptions, formatThaiIdiomQuestion } = await import("@/lib/games/thaiIdiom");
    const questions = await getRandomThaiIdiomQuestions(userId, gameConfig.questionsPerRound);

    if (questions.length === 0) {
        await replyText(replyToken, `ยังไม่มีคำถามสำนวนไทยในระบบ${p(user.gender)} กำลังเพิ่มเร็วๆ นี้`);
        return;
    }

    const question = questions[0];
    const options = getThaiIdiomOptions(question);
    const session = createSessionData("THAI_IDIOM", questions.map(q => q.id), multiplier);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            currentGameType: "THAI_IDIOM",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, currentOptions: options }),
        },
    });

    const questionText = formatThaiIdiomQuestion(question, options, 0, questions.length);

    let msgPrefix = "";
    if (multiplier < 1) {
        msgPrefix = getDailyLimitMessage(roundCount, "สำนวนไทย") + "\n\n";
    }

    await replyWithQuickReply(
        replyToken,
        msgPrefix + questionText,
        [
            { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
            { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            { label: "Hint 💡", text: HINT_CMD },
            { label: "ออก", text: "ฝึกฝน" },
        ],
        (question as any).imageUrl
    );
}

async function handleThaiCultureGameStart(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    // Level gate check
    const gameConfig = GAME_TYPES.THAI_CULTURE;
    if (user.currentLevel < gameConfig.requiredLevel) {
        await replyText(replyToken, `🔒 ต้อง Level ${gameConfig.requiredLevel} ขึ้นไป${p(user.gender)}\nตอนนี้คุณ Level ${user.currentLevel}\n\nเล่นเกมอื่นเพื่อเก็บคะแนนเลเวลอัป!`);
        return;
    }

    // Daily round limit
    const { getDailyRoundCount, calculatePointMultiplier, getDailyLimitMessage } = await import("@/lib/games/engine");
    const roundCount = await getDailyRoundCount(user.lineUserId, "THAI_CULTURE");
    const multiplier = calculatePointMultiplier(roundCount);

    const { getRandomThaiCultureQuestions, getThaiCultureOptions, formatThaiCultureQuestion } = await import("@/lib/games/thaiCulture");
    const questions = await getRandomThaiCultureQuestions(userId, gameConfig.questionsPerRound);

    if (questions.length === 0) {
        await replyText(replyToken, `ยังไม่มีคำถามวัฒนธรรมไทยในระบบ${p(user.gender)} กำลังเพิ่มเร็วๆ นี้`);
        return;
    }

    const question = questions[0];
    const options = getThaiCultureOptions(question);
    const session = createSessionData("THAI_CULTURE", questions.map(q => q.id), multiplier);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            currentGameType: "THAI_CULTURE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, currentOptions: options }),
        },
    });

    const questionText = formatThaiCultureQuestion(question, options, 0, questions.length);

    let msgPrefix = "";
    if (multiplier < 1) {
        msgPrefix = getDailyLimitMessage(roundCount, "วัฒนธรรมไทย") + "\n\n";
    }

    await replyWithQuickReply(
        replyToken,
        msgPrefix + questionText,
        [
            { label: "ก", text: "ก" }, { label: "ข", text: "ข" },
            { label: "ค", text: "ค" }, { label: "ง", text: "ง" },
            { label: "Hint 💡", text: HINT_CMD },
            { label: "ออก", text: "ฝึกฝน" },
        ],
        (question as any).imageUrl
    );
}

// =====================
// Lesson Handlers (สอนก่อนเล่น)
// =====================

const LESSON_CATEGORIES = [
    { key: "vocabulary", emoji: "📝", label: "คำศัพท์", description: "เรียนรู้คำศัพท์พื้นฐาน" },
    { key: "grammar", emoji: "✏️", label: "ไวยากรณ์", description: "เรียนรู้โครงสร้างประโยค" },
    { key: "reading", emoji: "📖", label: "อ่าน-เขียน", description: "เรียนรู้การอ่านและเขียน" },
];

async function handleLessonMenu(replyToken: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    // Count lessons per category and user progress
    const allLessons = await prisma.lesson.findMany({
        where: { isActive: true },
        select: { id: true, category: true },
    });
    const completedLessons = await prisma.lessonProgress.findMany({
        where: { userId: user.id, isCompleted: true },
        select: { lessonId: true },
    });
    const completedSet = new Set(completedLessons.map(l => l.lessonId));

    if (allLessons.length === 0) {
        await replyText(replyToken, `📚 ยังไม่มีบทเรียนในระบบ${np(user.gender)}\n\nลองเล่นเกมฝึกฝนไปก่อน พิมพ์ "ฝึกฝน"`);
        return;
    }

    let menuText = `📚 บทเรียน — เลือกหมวดที่ต้องการเรียนรู้${np(user.gender)}\n\n`;
    const quickReplyItems: Array<{ label: string; text: string }> = [];

    for (const cat of LESSON_CATEGORIES) {
        const total = allLessons.filter(l => l.category === cat.key).length;
        if (total === 0) continue;
        const done = allLessons.filter(l => l.category === cat.key && completedSet.has(l.id)).length;
        menuText += `${cat.emoji} ${cat.label}: ${done}/${total} บทเรียน\n`;
        quickReplyItems.push({ label: `${cat.emoji} ${cat.label}`, text: `บทเรียน:${cat.key}` });
    }

    menuText += `\nเลือกหมวดด้านล่างเพื่อดูบทเรียน`;
    quickReplyItems.push({ label: "🎮 ฝึกฝน", text: "ฝึกฝน" });

    await replyWithQuickReply(replyToken, menuText, quickReplyItems);
}

async function handleLessonCategory(replyToken: string, userId: string, category: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    const lessons = await prisma.lesson.findMany({
        where: { isActive: true, category },
        orderBy: [{ difficulty: "asc" }, { orderIndex: "asc" }],
    });

    if (lessons.length === 0) {
        await replyText(replyToken, `ยังไม่มีบทเรียนในหมวดนี้${np(user.gender)}`);
        return;
    }

    const completedLessons = await prisma.lessonProgress.findMany({
        where: { userId: user.id, isCompleted: true },
        select: { lessonId: true },
    });
    const completedSet = new Set(completedLessons.map(l => l.lessonId));

    const catInfo = LESSON_CATEGORIES.find(c => c.key === category);
    let text = `${catInfo?.emoji || "📚"} บทเรียน: ${catInfo?.label || category}\n\n`;

    const quickReplyItems: Array<{ label: string; text: string }> = [];
    for (let i = 0; i < lessons.length && i < 10; i++) {
        const lesson = lessons[i];
        const done = completedSet.has(lesson.id);
        const icon = done ? "✅" : "📘";
        const diffLabel = lesson.difficulty === "EASY" ? "ง่าย" : lesson.difficulty === "MEDIUM" ? "กลาง" : "ยาก";
        text += `${icon} ${i + 1}. ${lesson.title} [${diffLabel}]\n`;
        quickReplyItems.push({ label: `${i + 1}. ${lesson.title.slice(0, 15)}`, text: `ดูบทเรียน:${lesson.id}` });
    }

    text += `\nเลือกบทเรียนด้านล่าง`;
    quickReplyItems.push({ label: "🔙 กลับ", text: "บทเรียน" });

    await replyWithQuickReply(replyToken, text, quickReplyItems.slice(0, 13));
}

async function handleLessonView(replyToken: string, userId: string, lessonId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
    if (!user?.isRegistered) {
        await replyText(replyToken, `กรุณาลงทะเบียนก่อน${p(user?.gender)} พิมพ์ "ลงทะเบียน"`);
        return;
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
        await replyText(replyToken, `ไม่พบบทเรียนนี้${p(user.gender)}`);
        return;
    }

    // Build lesson content message
    let text = `📚 ${lesson.title}\n`;
    text += `━━━━━━━━━━━━━━━\n\n`;
    text += lesson.content;

    if (lesson.examples) {
        text += `\n\n💡 ตัวอย่าง:\n${lesson.examples}`;
    }

    if (lesson.tips) {
        text += `\n\n🔑 เคล็ดลับ:\n${lesson.tips}`;
    }

    // Mark as completed
    await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        update: { isCompleted: true, completedAt: new Date() },
        create: { userId: user.id, lessonId: lesson.id, isCompleted: true, completedAt: new Date() },
    });

    // Give bonus points for first time
    const existingProgress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    });
    // If this is a newly completed lesson, award 5 points
    let pointsMsg = "";
    if (existingProgress?.completedAt && (new Date().getTime() - existingProgress.completedAt.getTime()) < 5000) {
        const result = await addPoints(user.id, 5, 'GAME_CORRECT');
        pointsMsg = `\n\n🎉 +5 คะแนน สำหรับการเรียนบทเรียนนี้!`;
        if (result.leveledUp && result.newLevel) {
            const levelInfo = getLevelInfo(result.newLevel);
            pointsMsg += `\n🎊 เลเวลอัป! Lv.${result.newLevel} "${levelInfo.title}"`;
        }
    }

    // Determine which game category relates to this lesson
    const catInfo = LESSON_CATEGORIES.find(c => c.key === lesson.category);
    const gameKeyword = lesson.category === "vocabulary" ? "เกมคำศัพท์"
        : lesson.category === "grammar" ? "เกมไวยากรณ์"
        : "เกมอ่าน";

    text += `${pointsMsg}\n\n✅ บทเรียนนี้เสร็จแล้ว${np(user.gender)}`;

    // Send image if available, then text
    if (lesson.imageUrl) {
        await lineClient.replyMessage({
            replyToken,
            messages: [
                { type: "image", originalContentUrl: lesson.imageUrl, previewImageUrl: lesson.imageUrl } as any,
                createTextMessage(text, createQuickReply([
                    { label: `🎮 ${gameKeyword}`, text: gameKeyword },
                    { label: "📚 บทเรียนอื่น", text: `บทเรียน:${lesson.category}` },
                    { label: "🏠 เมนู", text: "เมนู" },
                ])),
            ],
        });
    } else {
        await replyWithQuickReply(replyToken, text, [
            { label: `🎮 ${gameKeyword}`, text: gameKeyword },
            { label: "📚 บทเรียนอื่น", text: `บทเรียน:${lesson.category}` },
            { label: "🏠 เมนู", text: "เมนู" },
        ]);
    }
}

// =====================
// Vocabulary Game Handlers
// =====================

async function handleVocabMatchGameStart(replyToken: string, userId: string) {
    const numQ = GAME_TYPES.VOCAB_MATCH.questionsPerRound;
    const questions = await getRandomVocabMatchQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "VOCAB_MATCH");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("VOCAB_MATCH", questions.map(q => q.id), multiplier);

    const question = questions[0];
    const options = getVocabMatchOptions(question);
    const correctIndex = options.indexOf(question.meaning);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_MATCH",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, options, correctAnswer }),
        },
    });

    let questionText = formatVocabMatchQuestion(question, options, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "จับคู่คำ") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ], (question as any).imageUrl);
}

async function handleVocabMeaningGameStart(replyToken: string, userId: string) {
    const numQ = GAME_TYPES.VOCAB_MEANING.questionsPerRound;
    const questions = await getRandomVocabMeaningQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "VOCAB_MEANING");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("VOCAB_MEANING", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_MEANING",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, correctAnswer: question.meaning }),
        },
    });

    let questionText = formatVocabMeaningQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "ความหมายคำศัพท์") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ], (question as any).imageUrl);
}

async function handleVocabOppositeGameStart(replyToken: string, userId: string) {
    const numQ = GAME_TYPES.VOCAB_OPPOSITE.questionsPerRound;
    const questions = await getRandomVocabOppositeQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "VOCAB_OPPOSITE");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("VOCAB_OPPOSITE", questions.map(q => q.id), multiplier);

    const question = questions[0];
    const options = getVocabOppositeOptions(question);
    const correctIndex = options.indexOf(question.opposite);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_OPPOSITE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, options, correctAnswer, correctText: question.opposite }),
        },
    });

    let questionText = formatVocabOppositeQuestion(question, options, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "คำตรงข้าม") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ], (question as any).imageUrl);
}

async function handleVocabSynonymGameStart(replyToken: string, userId: string) {
    const numQ = GAME_TYPES.VOCAB_SYNONYM.questionsPerRound;
    const questions = await getRandomVocabSynonymQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "VOCAB_SYNONYM");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("VOCAB_SYNONYM", questions.map(q => q.id), multiplier);

    const question = questions[0];
    const options = getVocabSynonymOptions(question);
    const correctIndex = options.indexOf(question.synonym);
    const correctAnswer = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "VOCAB_SYNONYM",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, options, correctAnswer, correctText: question.synonym }),
        },
    });

    let questionText = formatVocabSynonymQuestion(question, options, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "คำพ้องความหมาย") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ], (question as any).imageUrl);
}

// =====================
// Grammar Game Handlers
// =====================

async function handleFixSentenceGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("FIX_SENTENCE", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.FIX_SENTENCE.questionsPerRound;
    const questions = await getRandomFixSentenceQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "FIX_SENTENCE");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("FIX_SENTENCE", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "FIX_SENTENCE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, correctSentence: question.correctSentence }),
        },
    });

    let questionText = formatFixSentenceQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "แก้ประโยค") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "เฉลย", text: "เฉลย" },
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ], (question as any).imageUrl);
}

async function handleArrangeSentenceGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("ARRANGE_SENTENCE", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.ARRANGE_SENTENCE.questionsPerRound;
    const questions = await getRandomArrangeSentenceQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "ARRANGE_SENTENCE");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("ARRANGE_SENTENCE", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "ARRANGE_SENTENCE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, correctSentence: question.correctSentence }),
        },
    });

    let questionText = formatArrangeSentenceQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "เรียงประโยค") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "เฉลย", text: "เฉลย" },
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ], (question as any).imageUrl);
}

async function handleSpeedGrammarGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("SPEED_GRAMMAR", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.SPEED_GRAMMAR.questionsPerRound;
    const questions = await getRandomSpeedGrammarQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "SPEED_GRAMMAR");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("SPEED_GRAMMAR", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "SPEED_GRAMMAR",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                session,
                correctAnswer: question.correctAnswer,
                startTime: Date.now(),
                timeLimit: question.timeLimit,
            }),
        },
    });

    let questionText = formatSpeedGrammarQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "Speed Grammar") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ], (question as any).imageUrl);
}

// =====================
// Reading & Writing Game Handlers
// =====================

async function handleReadAnswerGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("READ_ANSWER", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.READ_ANSWER.questionsPerRound;
    const questions = await getRandomReadAnswerQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "READ_ANSWER");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("READ_ANSWER", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "READ_ANSWER",
            currentQuestionId: question.id,
            gameData: JSON.stringify({ session, correctAnswer: question.correctAnswer }),
        },
    });

    let questionText = formatReadAnswerQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "อ่านตอบ") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ก", text: "ก" },
        { label: "ข", text: "ข" },
        { label: "ค", text: "ค" },
        { label: "ง", text: "ง" },
    ], (question as any).imageUrl);
}

async function handleSummarizeGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("SUMMARIZE", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.SUMMARIZE.questionsPerRound;
    const questions = await getRandomSummarizeQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "SUMMARIZE");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("SUMMARIZE", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "SUMMARIZE",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                session,
                passage: question.passage,
                keywords: question.keywords,
                sampleSummary: question.sampleSummary,
            }),
        },
    });

    let questionText = formatSummarizeQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "สรุปเรื่อง") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ], (question as any).imageUrl);
}

async function handleContinueStoryGameStart(replyToken: string, userId: string) {
    // Level Gate check
    const userLevel = await getUserLevel(userId);
    const lockMsg = checkLevelGate("CONTINUE_STORY", userLevel);
    if (lockMsg) { await replyText(replyToken, lockMsg); return; }

    const numQ = GAME_TYPES.CONTINUE_STORY.questionsPerRound;
    const questions = await getRandomContinueStoryQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "CONTINUE_STORY");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("CONTINUE_STORY", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "CONTINUE_STORY",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                session,
                keywords: question.keywords,
                minLength: question.minLength,
                storyStart: question.storyStart,
            }),
        },
    });

    let questionText = formatContinueStoryQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "เขียนต่อเรื่อง") + "\n\n" + questionText;
    await replyWithQuickReply(replyToken, questionText, [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออก", text: "ฝึกฝน" },
    ], (question as any).imageUrl);
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
            `คุณได้เรียนคำศัพท์วันนี้แล้ว!\n\n📖 "${todayVocab.word}"\n💡 ${todayVocab.meaning}\n📝 ${todayVocab.example}\n\nกลับมาพรุ่งนี้เพื่อเรียนคำใหม่${np(user?.gender)}`
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
    const numQ = GAME_TYPES.RACE_CLOCK.questionsPerRound;
    const questions = await getRandomRaceClockQuestions(userId, numQ);

    if (questions.length === 0) {
        await replyText(replyToken, "ขออภัย ยังไม่มีคำถามในระบบ\n\nกรุณาติดต่อผู้ดูแลระบบ");
        return;
    }

    const roundCount = await getDailyRoundCount(userId, "RACE_CLOCK");
    const multiplier = calculatePointMultiplier(roundCount);
    const session = createSessionData("RACE_CLOCK", questions.map(q => q.id), multiplier);

    const question = questions[0];

    await prisma.user.update({
        where: { lineUserId: userId },
        data: {
            currentGameType: "RACE_CLOCK",
            currentQuestionId: question.id,
            gameData: JSON.stringify({
                session,
                correctAnswer: question.correctAnswer,
                startTime: Date.now(),
            }),
        },
    });

    let questionText = formatRaceClockQuestion(question, 0, questions.length);
    if (multiplier < 1) questionText = getDailyLimitMessage(roundCount, "แข่งเวลา") + "\n\n" + questionText;
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
        await replyText(replyToken, `🎰 หมดโควต้าสุ่มวันนี้แล้ว!\n\nสุ่มได้ 3 ครั้งต่อวัน\nกลับมาพรุ่งนี้${np(user?.gender)}`);
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
        // Culture Games
        case "THAI_IDIOM": return "สำนวนไทย";
        case "THAI_CULTURE": return "วัฒนธรรมไทย";
        // Legacy
        case "MULTIPLE_CHOICE": return "เลือกตอบ";
        default: return "ฝึกฝน";
    }
}
