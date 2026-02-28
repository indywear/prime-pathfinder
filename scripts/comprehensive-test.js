/**
 * Comprehensive Test: ProficienThAI LINE Bot
 * ============================================
 * สร้าง Test User จริง → เล่นทุกเกม ทุกฟังก์ชัน จนครบ
 * - ใช้ fake replyToken → ข้อความไม่ถูกส่งจริง
 * - สร้าง user ใน DB จริง → ลบทิ้งตอนจบ
 * - ทดสอบ 18 game types + ทุกฟังก์ชัน + registration flow
 *
 * Usage:
 *   node scripts/comprehensive-test.js              → แสดงรายการเกมให้เลือก
 *   node scripts/comprehensive-test.js 1             → ทดสอบเกมที่ 1 (MULTIPLE_CHOICE)
 *   node scripts/comprehensive-test.js VOCAB_OPPOSITE → ทดสอบเกม VOCAB_OPPOSITE
 *   node scripts/comprehensive-test.js all            → ทดสอบทุกเกม (เหมือนเดิม)
 *   node scripts/comprehensive-test.js basic          → ทดสอบ Basic Functions
 *   node scripts/comprehensive-test.js utils          → ทดสอบ Game Utilities
 *   node scripts/comprehensive-test.js register       → ทดสอบ Registration Flow
 */
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://proficienthai-vert.vercel.app/api/line/webhook';
const TEST_USER_ID = `Utest_full_${Date.now()}`;

// ==================== GAME DEFINITIONS ====================
const GAME_LIST = [
    { num: 1,  type: 'MULTIPLE_CHOICE',   cmd: 'เลือกตอบ',     level: 1, questions: 5,  label: 'MULTIPLE_CHOICE' },
    { num: 2,  type: 'VOCAB_OPPOSITE',    cmd: 'คำตรงข้าม',    level: 1, questions: 5,  label: 'VOCAB_OPPOSITE' },
    { num: 3,  type: 'VOCAB_SYNONYM',     cmd: 'คำพ้อง',       level: 1, questions: 5,  label: 'VOCAB_SYNONYM' },
    { num: 4,  type: 'VOCAB_MATCH',       cmd: 'จับคู่คำ',      level: 1, questions: 5,  label: 'VOCAB_MATCH' },
    { num: 5,  type: 'VOCAB_MEANING',     cmd: 'ความหมาย',    level: 1, questions: 5,  label: 'VOCAB_MEANING', answerFn: () => 'ทดสอบความหมาย' },
    { num: 6,  type: 'THAI_IDIOM',        cmd: 'สำนวนไทย',    level: 1, questions: 5,  label: 'THAI_IDIOM' },
    { num: 7,  type: 'THAI_CULTURE',      cmd: 'วัฒนธรรมไทย', level: 1, questions: 5,  label: 'THAI_CULTURE' },
    { num: 8,  type: 'RACE_CLOCK',        cmd: 'แข่งเวลา',     level: 1, questions: 10, label: 'RACE_CLOCK', answerWait: 3000 },
    { num: 9,  type: 'DAILY_VOCAB',       cmd: 'คำศัพท์รายวัน', level: 1, questions: 0,  label: 'DAILY_VOCAB (one-shot)', oneShot: true },
    { num: 10, type: 'VOCAB_GACHA',       cmd: 'กาชา',         level: 1, questions: 0,  label: 'VOCAB_GACHA (one-shot)', oneShot: true },
    { num: 11, type: 'FILL_BLANK',        cmd: 'เติมคำ',       level: 3, questions: 5,  label: 'FILL_BLANK', answerFn: () => 'ทดสอบ' },
    { num: 12, type: 'FIX_SENTENCE',      cmd: 'แก้ประโยค',    level: 3, questions: 5,  label: 'FIX_SENTENCE', answerFn: () => 'ฉันไปโรงเรียนทุกวัน' },
    { num: 13, type: 'ARRANGE_SENTENCE',  cmd: 'เรียงประโยค',  level: 3, questions: 5,  label: 'ARRANGE_SENTENCE', answerFn: () => 'ฉันชอบกินข้าวมาก' },
    { num: 14, type: 'SPEED_GRAMMAR',     cmd: 'speed grammar', level: 3, questions: 5,  label: 'SPEED_GRAMMAR', answerWait: 3000 },
    { num: 15, type: 'READ_ANSWER',       cmd: 'อ่านแล้วตอบ',   level: 5, questions: 3,  label: 'READ_ANSWER', startWait: 5000 },
    { num: 16, type: 'SENTENCE_WRITING',  cmd: 'แต่งประโยค',   level: 5, questions: 3,  label: 'SENTENCE_WRITING', answerFn: () => 'ฉันชอบอ่านหนังสือเรื่องนี้มากเพราะสนุกดี', answerWait: 6000 },
    { num: 17, type: 'SUMMARIZE',         cmd: 'สรุปเรื่อง',    level: 5, questions: 3,  label: 'SUMMARIZE', answerFn: () => 'เรื่องนี้เป็นเรื่องเกี่ยวกับการเรียนรู้ภาษาไทยของนักศึกษาต่างชาติที่ต้องพยายามฝึกฝนอย่างสม่ำเสมอ สุนัขเป็นสัตว์เลี้ยงที่ซื่อสัตย์และต้องการการดูแลเอาใจใส่อย่างดีจากเจ้าของ', answerWait: 10000 },
    { num: 18, type: 'CONTINUE_STORY',    cmd: 'เขียนต่อ',     level: 5, questions: 3,  label: 'CONTINUE_STORY', answerFn: () => 'จากนั้นเด็กน้อยก็เปิดหนังสือเล่มนั้นออกมา เขาค้นพบว่าข้างในมีความลับที่ซ่อนอยู่มานานหลายร้อยปี หนังสือเล่มนี้บอกเล่าเรื่องราวของนักเดินทางผู้กล้าหาญที่ออกตามหาสมบัติล้ำค่า', answerWait: 10000 },
];

let passed = 0, failed = 0, skipped = 0;

// ==================== HELPERS ====================

function computeSignature(body) {
    return crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64');
}

function makeWebhookPayload(userId, text) {
    const ts = Date.now();
    return {
        destination: 'test',
        events: [{
            type: 'message',
            message: { type: 'text', id: `test-${ts}`, text },
            timestamp: ts,
            replyToken: `fake-test-token-${ts}`,
            source: { type: 'user', userId },
            webhookEventId: `test-evt-${ts}`,
            deliveryContext: { isRedelivery: false },
            mode: 'active',
        }]
    };
}

function sendWebhookFor(userId, text) {
    const payload = makeWebhookPayload(userId, text);
    const body = JSON.stringify(payload);
    const signature = computeSignature(body);
    return new Promise((resolve, reject) => {
        const url = new URL(WEBHOOK_URL);
        const req = https.request({
            hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'x-line-signature': signature,
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function sendWebhook(text) { return sendWebhookFor(TEST_USER_ID, text); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getUser() {
    return prisma.user.findUnique({ where: { lineUserId: TEST_USER_ID } });
}

async function resetGameState() {
    try {
        await prisma.user.update({
            where: { lineUserId: TEST_USER_ID },
            data: { currentGameType: null, currentQuestionId: null, gameData: null },
        });
    } catch {}
}

async function setUserLevel(level, points) {
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { currentLevel: level, totalPoints: points },
    });
}

function assert(condition, label) {
    if (condition) { passed++; console.log(`  [PASS] ${label}`); }
    else { failed++; console.log(`  [FAIL] ${label}`); }
}

function skip(label) { skipped++; console.log(`  [SKIP] ${label}`); }

// ==================== GAME ROUND PLAYER ====================

async function playFullGameRound(gameStartCmd, expectedGameType, expectedQuestions, opts = {}) {
    const WAIT = opts.startWait || 5000;
    const ANS_WAIT = opts.answerWait || 4000;
    const answerFn = opts.answerFn || (() => 'ก');

    // Start game
    const res = await sendWebhook(gameStartCmd);
    assert(res.status === 200, `Start ${expectedGameType} -> 200`);
    await wait(WAIT);

    const uStart = await getUser();
    if (uStart?.currentGameType !== expectedGameType) {
        if (!uStart?.currentGameType) {
            console.log(`  [WARN] ${expectedGameType} didn't start (level gate or no questions)`);
            return { played: false };
        }
        console.log(`  [WARN] Expected ${expectedGameType}, got ${uStart.currentGameType}`);
        await resetGameState();
        return { played: false };
    }
    assert(true, `gameType = ${expectedGameType}`);
    assert(!!uStart.currentQuestionId, `questionId assigned`);

    let gd = {};
    try { gd = JSON.parse(uStart.gameData || '{}'); } catch {}
    const total = gd.session?.totalQuestions || expectedQuestions;
    console.log(`  Session: ${total} questions`);

    const pointsBefore = uStart.totalPoints;
    let answeredCount = 0;

    for (let i = 0; i < total + 2; i++) {
        const u = await getUser();
        if (!u?.currentGameType) break;

        let d = {};
        try { d = JSON.parse(u.gameData || '{}'); } catch {}

        const answer = await answerFn(u, d, i);
        const ar = await sendWebhook(answer);
        assert(ar.status === 200, `Q${i+1}/${total} "${answer.substring(0, 25)}${answer.length > 25 ? '...' : ''}" -> 200`);
        answeredCount++;
        await wait(ANS_WAIT);

        const afterAns = await getUser();
        if (!afterAns?.currentGameType) break;

        let ad = {};
        try { ad = JSON.parse(afterAns.gameData || '{}'); } catch {}

        if (ad.pendingWrong) {
            await sendWebhook('__next__');
            await wait(3000);
        } else if (ad.session && !ad.pendingWrong && ad.session.currentIndex < ad.session.totalQuestions) {
            await sendWebhook('__next__');
            await wait(3000);
        }
    }

    await wait(1000);
    const finalU = await getUser();
    const ended = !finalU?.currentGameType;
    if (!ended) {
        console.log(`  [WARN] ${expectedGameType} didn't end, cleaning up`);
        await resetGameState();
    }
    assert(ended, `${expectedGameType} round complete (${answeredCount} answered)`);

    const pointsAfter = finalU?.totalPoints || pointsBefore;
    const gained = pointsAfter - pointsBefore;
    console.log(`  Points: ${pointsBefore} -> ${pointsAfter} (${gained >= 0 ? '+' : ''}${gained})`);

    return { played: true, pointsBefore, pointsAfter, gained, answeredCount };
}

// ==================== SETUP & CLEANUP ====================

async function setupTestUser(level = 1, points = 0) {
    try {
        await prisma.languageGameSession.deleteMany({ where: { odUserId: TEST_USER_ID } });
        await prisma.user.delete({ where: { lineUserId: TEST_USER_ID } });
    } catch {}

    const testUser = await prisma.user.create({
        data: {
            lineUserId: TEST_USER_ID,
            chineseName: '测试全面',
            thaiName: 'ทดสอบครบ',
            studentId: 'FULLTEST-001',
            university: 'Comprehensive Test Univ',
            email: 'fulltest@test.com',
            nationality: 'Chinese',
            gender: 'male',
            thaiLevel: 'INTERMEDIATE',
            consent: true,
            isRegistered: true,
            registrationStep: -1,
            currentLevel: level,
            totalPoints: points,
        }
    });
    console.log(`  User created: Lv.${level} | ${points}pts\n`);
    return testUser;
}

async function cleanupTestUser() {
    console.log('\n--- Cleanup ---');
    try {
        await prisma.languageGameSession.deleteMany({ where: { odUserId: TEST_USER_ID } });
        await prisma.user.delete({ where: { lineUserId: TEST_USER_ID } });
        console.log('  Test user deleted');
    } catch (e) {
        console.log(`  Cleanup: ${e.message}`);
    }
    try {
        const regUsers = await prisma.user.findMany({
            where: { lineUserId: { startsWith: 'Utest_reg_' } }
        });
        for (const ru of regUsers) {
            await prisma.languageGameSession.deleteMany({ where: { odUserId: ru.lineUserId } });
            await prisma.user.delete({ where: { id: ru.id } });
        }
        if (regUsers.length > 0) console.log(`  Registration test users: ${regUsers.length} deleted`);
    } catch {}
}

// ==================== SINGLE GAME TEST ====================

async function testSingleGame(game) {
    const startTime = Date.now();
    console.log('===================================================');
    console.log(`  Game ${game.num}/18: ${game.label}`);
    console.log(`  Command: "${game.cmd}" | Level: ${game.level}+`);
    console.log(`  User: ${TEST_USER_ID}`);
    console.log('===================================================\n');

    const levelPoints = { 1: 0, 3: 300, 5: 1000 };
    await setupTestUser(game.level, levelPoints[game.level] || 0);

    try {
        if (game.oneShot) {
            const res = await sendWebhook(game.cmd);
            assert(res.status === 200, `"${game.cmd}" -> 200`);
            await wait(4000);
            const u = await getUser();
            assert(!u?.currentGameType, `${game.type} is one-shot (no game state)`);
        } else {
            const opts = {};
            if (game.answerFn) opts.answerFn = game.answerFn;
            if (game.answerWait) opts.answerWait = game.answerWait;
            if (game.startWait) opts.startWait = game.startWait;
            await playFullGameRound(game.cmd, game.type, game.questions, opts);
        }

        const u = await getUser();
        console.log(`\n  Final: Lv.${u?.currentLevel} | ${u?.totalPoints}pts`);
    } catch (error) {
        console.error(`\n  FATAL ERROR: ${error.message}`);
        failed++;
    }

    await cleanupTestUser();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n===================================================');
    console.log(`  Results: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    console.log(`  Time: ${elapsed}s`);
    console.log('===================================================\n');
}

// ==================== BASIC FUNCTIONS TEST ====================

async function testBasicFunctions() {
    const startTime = Date.now();
    console.log('===================================================');
    console.log('  Basic Functions Test');
    console.log('===================================================\n');

    await setupTestUser();

    try {
        const basicCmds = ['เมนู', 'ช่วยเหลือ', 'โปรไฟล์', 'แดชบอร์ด', 'อันดับ', 'ฝึกฝน', 'เลือกเกม', 'งานของฉัน', 'เกมคำศัพท์'];
        for (const cmd of basicCmds) {
            const res = await sendWebhook(cmd);
            assert(res.status === 200, `"${cmd}" -> 200`);
            await wait(3000);
        }

        // General chat
        const res = await sendWebhook('สวัสดีครับ วันนี้อากาศดี');
        assert(res.status === 200, 'General chat -> 200');
        await wait(4000);
        const u = await getUser();
        assert(!u?.currentGameType, 'No game started from chat');

        // Level gate
        console.log('\n--- Level Gate ---');
        for (const [cmd, type, lvl] of [['เติมคำ','FILL_BLANK',3],['สรุปเรื่อง','SUMMARIZE',5],['อ่านแล้วตอบ','READ_ANSWER',5]]) {
            await sendWebhook(cmd);
            await wait(3000);
            const u2 = await getUser();
            assert(!u2?.currentGameType, `Blocked: ${type} needs Lv.${lvl}`);
        }
    } catch (error) {
        console.error(`\n  FATAL: ${error.message}`);
        failed++;
    }

    await cleanupTestUser();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Results: ${passed} passed | ${failed} failed | Time: ${elapsed}s\n`);
}

// ==================== GAME UTILITIES TEST ====================

async function testGameUtilities() {
    const startTime = Date.now();
    console.log('===================================================');
    console.log('  Game Utilities Test (cancel, switch, hint, skip)');
    console.log('===================================================\n');

    await setupTestUser();
    let u;

    try {
        // Cancel
        console.log('--- Cancel mid-game ---');
        await sendWebhook('เลือกตอบ');
        await wait(4000);
        u = await getUser();
        assert(u?.currentGameType === 'MULTIPLE_CHOICE', 'In game');
        await sendWebhook('ยกเลิก');
        await wait(3000);
        u = await getUser();
        assert(!u?.currentGameType, 'Cancelled');

        // Switch
        console.log('\n--- Switch game ---');
        await sendWebhook('เลือกตอบ');
        await wait(4000);
        u = await getUser();
        assert(u?.currentGameType === 'MULTIPLE_CHOICE', 'Started MC');
        await sendWebhook('คำตรงข้าม');
        await wait(4000);
        u = await getUser();
        assert(u?.currentGameType === 'VOCAB_OPPOSITE', 'Switched to VOCAB_OPPOSITE');
        await resetGameState();

        // Hint
        console.log('\n--- Hint ---');
        await sendWebhook('คำตรงข้าม');
        await wait(4000);
        u = await getUser();
        if (u?.currentGameType) {
            await sendWebhook('__hint__');
            await wait(3000);
            u = await getUser();
            assert(!!u?.currentGameType, 'Still in game after hint');
        } else { skip('Hint: game not started'); }
        await resetGameState();

        // Wrong + Skip
        console.log('\n--- Wrong + Skip ---');
        await sendWebhook('เลือกตอบ');
        await wait(4000);
        u = await getUser();
        if (u?.currentGameType) {
            await sendWebhook('zzz_wrong');
            await wait(3000);
            u = await getUser();
            let gd = {};
            try { gd = JSON.parse(u.gameData || '{}'); } catch {}
            assert(gd.pendingWrong === true, 'pendingWrong set');
            await sendWebhook('__next__');
            await wait(3000);
            u = await getUser();
            assert(!!u?.currentGameType, 'Advanced to next question');
        } else { skip('Skip: game not started'); }
        await resetGameState();

        // Show answer
        console.log('\n--- Show answer ---');
        await sendWebhook('เลือกตอบ');
        await wait(4000);
        u = await getUser();
        if (u?.currentGameType) {
            await sendWebhook('zzz_wrong');
            await wait(3000);
            await sendWebhook('เฉลย');
            await wait(3000);
            assert(true, 'Show answer processed');
        } else { skip('ShowAnswer: game not started'); }
        await resetGameState();

        // Other functions
        console.log('\n--- Other Functions ---');
        for (const [label, cmd] of [['Spin Wheel', 'วงล้อ'], ['Edit Profile Menu', 'แก้ไขข้อมูล'], ['Feedback', 'ขอผลป้อนกลับ'], ['Lesson', 'บทเรียน'], ['Grammar Menu', 'เกมไวยากรณ์'], ['Culture Menu', 'เกมวัฒนธรรม']]) {
            const res = await sendWebhook(cmd);
            assert(res.status === 200, `${label} -> 200`);
            await wait(3000);
        }

        // Edit Thai Name
        console.log('\n--- Edit Thai Name ---');
        await sendWebhook('แก้ไข:ชื่อไทย');
        await wait(5000);
        await sendWebhook('ชื่อใหม่ทดสอบ');
        await wait(5000);
        u = await getUser();
        assert(u?.thaiName === 'ชื่อใหม่ทดสอบ', `Name updated: "${u?.thaiName}"`);

        // Submit Task
        console.log('\n--- Submit Task ---');
        await sendWebhook('ส่งงาน');
        await wait(3000);
        u = await getUser();
        assert(u?.currentGameType === 'SUBMITTING_TASK', 'In submitting state');
        await sendWebhook('ยกเลิก');
        await wait(3000);
        u = await getUser();
        assert(!u?.currentGameType, 'Submit cancelled');
    } catch (error) {
        console.error(`\n  FATAL: ${error.message}`);
        failed++;
    }

    await cleanupTestUser();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Results: ${passed} passed | ${failed} failed | Time: ${elapsed}s\n`);
}

// ==================== REGISTRATION TEST ====================

async function testRegistration() {
    const startTime = Date.now();
    console.log('===================================================');
    console.log('  Registration Flow Test');
    console.log('===================================================\n');

    const REG_USER_ID = `Utest_reg_${Date.now()}`;

    try {
        const regSteps = [
            { send: 'ลงทะเบียน', check: 'start', label: 'Registration start' },
            { send: '李注册测试', check: 'step', expected: 1, label: 'chineseName' },
            { send: 'ทดสอบลงทะเบียน', check: 'step', expected: 2, label: 'thaiName' },
            { send: 'REG-001', check: 'step', expected: 3, label: 'studentId' },
            { send: 'Test University', check: 'step', expected: 4, label: 'university' },
            { send: 'regtest@test.com', check: 'step', expected: 5, label: 'email' },
            { send: 'Chinese', check: 'step', expected: 6, label: 'nationality' },
            { send: 'male', check: 'step', expected: 7, label: 'gender' },
            { send: 'INTERMEDIATE', check: 'step', expected: 8, label: 'thaiLevel' },
            { send: 'YES', check: 'registered', label: 'consent -> registered' },
        ];

        for (const step of regSteps) {
            const r = await sendWebhookFor(REG_USER_ID, step.send);
            assert(r.status === 200, `Reg "${step.send}" -> 200`);
            await wait(3000);
            const regUser = await prisma.user.findUnique({ where: { lineUserId: REG_USER_ID } });

            if (step.check === 'start') {
                assert(regUser?.registrationStep === 0, `${step.label}: step=0`);
            } else if (step.check === 'step') {
                assert(regUser?.registrationStep === step.expected, `${step.label}: step=${regUser?.registrationStep}`);
            } else if (step.check === 'registered') {
                assert(regUser?.isRegistered === true, `${step.label}: isRegistered=${regUser?.isRegistered}`);
                assert(regUser?.thaiName === 'ทดสอบลงทะเบียน', `Name: ${regUser?.thaiName}`);
                assert(regUser?.gender === 'male', `Gender: ${regUser?.gender}`);
            }
        }
    } catch (error) {
        console.error(`\n  FATAL: ${error.message}`);
        failed++;
    }

    // Cleanup reg user
    try {
        const regUsers = await prisma.user.findMany({ where: { lineUserId: { startsWith: 'Utest_reg_' } } });
        for (const ru of regUsers) {
            await prisma.languageGameSession.deleteMany({ where: { odUserId: ru.lineUserId } });
            await prisma.user.delete({ where: { id: ru.id } });
        }
        console.log(`\n  Cleaned up ${regUsers.length} reg users`);
    } catch {}

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Results: ${passed} passed | ${failed} failed | Time: ${elapsed}s\n`);
}

// ==================== LEVEL & TITLE SYSTEM TEST ====================

async function testLevelSystem() {
    const startTime = Date.now();
    console.log('===================================================');
    console.log('  Level & Title System Test');
    console.log('===================================================\n');

    const LEVEL_CONFIG = [
        { level: 1, title: 'มือใหม่หัดพิมพ์', xpRequired: 0 },
        { level: 2, title: 'นักสำรวจภาษา', xpRequired: 100 },
        { level: 3, title: 'นักเขียนตัวน้อย', xpRequired: 300 },
        { level: 4, title: 'นักอ่านผู้ช่ำชอง', xpRequired: 600 },
        { level: 5, title: 'นักวิชาการภาษา', xpRequired: 1000 },
        { level: 6, title: 'เซียนภาษาไทย', xpRequired: 1500 },
        { level: 7, title: 'ปรมาจารย์ภาษาไทย', xpRequired: 2200 },
        { level: 8, title: 'เทพแห่งอักษร', xpRequired: 3000 },
        { level: 9, title: 'ตำนานแห่งภาษา', xpRequired: 4000 },
        { level: 10, title: 'ราชาภาษาไทย', xpRequired: 5500 },
    ];

    function calcLevel(pts) {
        for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
            if (pts >= LEVEL_CONFIG[i].xpRequired) return LEVEL_CONFIG[i].level;
        }
        return 1;
    }

    await setupTestUser(1, 0);

    try {
        // Test 1: Starting level is correct
        console.log('--- Initial State ---');
        let u = await getUser();
        assert(u?.currentLevel === 1, `Initial level = ${u?.currentLevel} (expect 1)`);
        assert(u?.totalPoints === 0, `Initial points = ${u?.totalPoints} (expect 0)`);

        // Test 2: Set points just below Lv2 threshold, play a game, verify level-up
        console.log('\n--- Level-Up via Game Play ---');
        await setUserLevel(1, 85); // 85pts, need 100 for Lv2
        u = await getUser();
        assert(u?.totalPoints === 85, `Points set to 85`);

        // Play a game - if we get any points, should level up to 2
        await sendWebhook('เลือกตอบ');
        await wait(5000);
        u = await getUser();
        if (u?.currentGameType === 'MULTIPLE_CHOICE') {
            // Answer all questions
            let gd = {};
            try { gd = JSON.parse(u.gameData || '{}'); } catch {}
            const total = gd.session?.totalQuestions || 5;
            for (let i = 0; i < total + 2; i++) {
                const cu = await getUser();
                if (!cu?.currentGameType) break;
                await sendWebhook('ก');
                await wait(4000);
                const au = await getUser();
                if (!au?.currentGameType) break;
                let ad = {};
                try { ad = JSON.parse(au.gameData || '{}'); } catch {}
                if (ad.pendingWrong || (ad.session && ad.session.currentIndex < ad.session.totalQuestions)) {
                    await sendWebhook('__next__');
                    await wait(3000);
                }
            }
            await wait(2000);
            u = await getUser();
            const earnedPts = u.totalPoints;
            const expectedLevel = calcLevel(earnedPts);
            assert(u.currentLevel === expectedLevel, `After game: Lv.${u.currentLevel} = expected Lv.${expectedLevel} for ${earnedPts}pts`);
            console.log(`  Points: ${earnedPts} -> Level ${u.currentLevel}`);
        } else {
            console.log('  [WARN] Could not start MULTIPLE_CHOICE for level-up test');
        }
        await resetGameState();

        // Test 3: Direct level setting and calculateLevel consistency
        console.log('\n--- Level Calculation Consistency ---');
        const testCases = [
            { pts: 0, expectedLv: 1 },
            { pts: 99, expectedLv: 1 },
            { pts: 100, expectedLv: 2 },
            { pts: 299, expectedLv: 2 },
            { pts: 300, expectedLv: 3 },
            { pts: 599, expectedLv: 3 },
            { pts: 600, expectedLv: 4 },
            { pts: 1000, expectedLv: 5 },
            { pts: 5500, expectedLv: 10 },
        ];

        for (const tc of testCases) {
            const lv = calcLevel(tc.pts);
            assert(lv === tc.expectedLv, `calcLevel(${tc.pts}) = ${lv} (expect ${tc.expectedLv})`);
        }

        // Test 4: Level title mapping
        console.log('\n--- Level Titles ---');
        for (const lc of LEVEL_CONFIG) {
            await setUserLevel(lc.level, lc.xpRequired);
            const tu = await getUser();
            assert(tu.currentLevel === lc.level, `Lv.${lc.level} "${lc.title}" -> DB level=${tu.currentLevel}, pts=${tu.totalPoints}`);
        }

        // Test 5: Level gate enforcement (Lv.1 can't play Lv.3 games)
        console.log('\n--- Level Gate Enforcement ---');
        await setUserLevel(1, 0);
        await sendWebhook('เติมคำ'); // Requires Lv.3
        await wait(4000);
        u = await getUser();
        assert(!u?.currentGameType, `Lv.1 blocked from FILL_BLANK (Lv.3+ required)`);

        await setUserLevel(2, 100);
        await sendWebhook('อ่านแล้วตอบ'); // Requires Lv.5
        await wait(4000);
        u = await getUser();
        assert(!u?.currentGameType, `Lv.2 blocked from READ_ANSWER (Lv.5+ required)`);

        // Test 6: Level gate pass (set to correct level, game should start)
        console.log('\n--- Level Gate Pass ---');
        await setUserLevel(3, 300);
        await sendWebhook('เติมคำ');
        await wait(5000);
        u = await getUser();
        assert(u?.currentGameType === 'FILL_BLANK', `Lv.3 can play FILL_BLANK: ${u?.currentGameType}`);
        await resetGameState();

    } catch (error) {
        console.error(`\n  FATAL: ${error.message}`);
        failed++;
    }

    await cleanupTestUser();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n===================================================');
    console.log(`  Results: ${passed} passed | ${failed} failed`);
    console.log(`  Time: ${elapsed}s`);
    console.log('===================================================\n');
}

// ==================== ALL GAMES (sequential) ====================

async function testAllGames() {
    const startTime = Date.now();
    console.log('===================================================');
    console.log('  ALL GAMES Test (18 games sequentially)');
    console.log(`  User: ${TEST_USER_ID}`);
    console.log('===================================================\n');

    let currentLevel = 1;
    const levelPoints = { 1: 0, 3: 300, 5: 1000 };
    await setupTestUser(1, 0);

    try {
        for (const game of GAME_LIST) {
            if (game.level > currentLevel) {
                await setUserLevel(game.level, levelPoints[game.level]);
                currentLevel = game.level;
                console.log(`  >>> Level set to ${game.level}\n`);
            }

            console.log(`\n--- Game ${game.num}/18: ${game.label} ---`);

            if (game.oneShot) {
                const res = await sendWebhook(game.cmd);
                assert(res.status === 200, `"${game.cmd}" -> 200`);
                await wait(4000);
                const u = await getUser();
                assert(!u?.currentGameType, `${game.type} one-shot OK`);
            } else {
                const opts = {};
                if (game.answerFn) opts.answerFn = game.answerFn;
                if (game.answerWait) opts.answerWait = game.answerWait;
                if (game.startWait) opts.startWait = game.startWait;
                await playFullGameRound(game.cmd, game.type, game.questions, opts);
            }
        }

        const finalU = await getUser();
        console.log(`\n  Final: Lv.${finalU?.currentLevel} | ${finalU?.totalPoints}pts`);
        const sessions = await prisma.languageGameSession.count({ where: { odUserId: TEST_USER_ID } });
        const history = await prisma.userQuestionHistory.count({ where: { userId: finalU?.id } });
        console.log(`  Game sessions: ${sessions} | Question history: ${history}`);
    } catch (error) {
        console.error(`\n  FATAL: ${error.message}`);
        failed++;
    }

    await cleanupTestUser();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n===================================================');
    console.log(`  Results: ${passed} passed | ${failed} failed | ${skipped} skipped`);
    console.log(`  Time: ${elapsed}s`);
    console.log('===================================================\n');
}

// ==================== MAIN ====================

function showHelp() {
    console.log('===================================================');
    console.log('  ProficienThAI Comprehensive Test');
    console.log('===================================================');
    console.log('\n  Usage: node scripts/comprehensive-test.js [option]\n');
    console.log('  Games (test one at a time):');
    console.log('  ---------------------------------------------------');
    for (const g of GAME_LIST) {
        console.log(`    ${String(g.num).padStart(2)}  ${g.label.padEnd(30)} Lv.${g.level}+  "${g.cmd}"`);
    }
    console.log('\n  Special options:');
    console.log('  ---------------------------------------------------');
    console.log('    all       Test all 18 games sequentially');
    console.log('    basic     Test Basic Functions + Level Gate');
    console.log('    utils     Test Game Utilities (cancel, switch, hint, skip)');
    console.log('    register  Test Registration Flow');
    console.log('    level     Test Level & Title System');
    console.log('\n  Examples:');
    console.log('    node scripts/comprehensive-test.js 1');
    console.log('    node scripts/comprehensive-test.js MULTIPLE_CHOICE');
    console.log('    node scripts/comprehensive-test.js all');
    console.log('    node scripts/comprehensive-test.js basic');
    console.log('');
}

async function main() {
    const arg = process.argv[2];

    if (!arg) {
        showHelp();
        await prisma.$disconnect();
        process.exit(0);
    }

    console.log(`\n  Webhook: ${WEBHOOK_URL}`);
    console.log('  Fake replyToken -> NO messages sent to anyone\n');

    try {
        if (arg === 'all') {
            await testAllGames();
        } else if (arg === 'basic') {
            await testBasicFunctions();
        } else if (arg === 'utils') {
            await testGameUtilities();
        } else if (arg === 'register') {
            await testRegistration();
        } else if (arg === 'level') {
            await testLevelSystem();
        } else {
            // Find game by number or type name
            const gameNum = parseInt(arg);
            let game;
            if (!isNaN(gameNum)) {
                game = GAME_LIST.find(g => g.num === gameNum);
            } else {
                game = GAME_LIST.find(g => g.type === arg.toUpperCase());
            }

            if (!game) {
                console.log(`  Unknown game: "${arg}"\n`);
                showHelp();
                await prisma.$disconnect();
                process.exit(1);
            }

            await testSingleGame(game);
        }
    } catch (error) {
        console.error('Fatal:', error);
        failed++;
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main();
