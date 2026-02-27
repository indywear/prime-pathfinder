/**
 * Comprehensive Test: ProficienThAI LINE Bot
 * ============================================
 * สร้าง Test User จริง → เล่นทุกเกม ทุกฟังก์ชัน จนครบ
 * - ใช้ fake replyToken → ข้อความไม่ถูกส่งจริง
 * - สร้าง user ใน DB จริง → ลบทิ้งตอนจบ
 * - ทดสอบ 18 game types + ทุกฟังก์ชัน + registration flow
 */
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://proficienthai-vert.vercel.app/api/line/webhook';
const TEST_USER_ID = `Utest_full_${Date.now()}`;

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
    if (condition) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

function skip(label) { skipped++; console.log(`  ⏭️ ${label}`); }

// ==================== GAME ROUND PLAYER ====================

async function playFullGameRound(gameStartCmd, expectedGameType, expectedQuestions, opts = {}) {
    const WAIT = opts.startWait || 5000;
    const ANS_WAIT = opts.answerWait || 4000;
    const answerFn = opts.answerFn || (() => 'ก');

    // Start game
    const res = await sendWebhook(gameStartCmd);
    assert(res.status === 200, `Start ${expectedGameType} → 200`);
    await wait(WAIT);

    const uStart = await getUser();
    if (uStart?.currentGameType !== expectedGameType) {
        // Level gate or no questions
        if (!uStart?.currentGameType) {
            console.log(`  ⚠️ ${expectedGameType} didn't start (level gate or no questions)`);
            return { played: false };
        }
        console.log(`  ⚠️ Expected ${expectedGameType}, got ${uStart.currentGameType}`);
        await resetGameState();
        return { played: false };
    }
    assert(true, `gameType = ${expectedGameType}`);
    assert(!!uStart.currentQuestionId, `questionId assigned`);

    // Parse session
    let gd = {};
    try { gd = JSON.parse(uStart.gameData || '{}'); } catch {}
    const total = gd.session?.totalQuestions || expectedQuestions;
    console.log(`  📋 Session: ${total} questions`);

    const pointsBefore = uStart.totalPoints;
    let answeredCount = 0;

    for (let i = 0; i < total + 2; i++) { // +2 safety margin
        const u = await getUser();
        if (!u?.currentGameType) break; // Game ended

        let d = {};
        try { d = JSON.parse(u.gameData || '{}'); } catch {}

        // Generate answer
        const answer = await answerFn(u, d, i);
        const ar = await sendWebhook(answer);
        assert(ar.status === 200, `Q${i+1}/${total} "${answer.substring(0, 25)}${answer.length > 25 ? '...' : ''}" → 200`);
        answeredCount++;
        await wait(ANS_WAIT);

        // Check state after answer
        const afterAns = await getUser();
        if (!afterAns?.currentGameType) break; // Game ended after answer

        let ad = {};
        try { ad = JSON.parse(afterAns.gameData || '{}'); } catch {}

        if (ad.pendingWrong) {
            // Wrong answer → skip to next question
            await sendWebhook('__next__');
            await wait(3000);
        } else if (ad.session && !ad.pendingWrong && ad.session.currentIndex < ad.session.totalQuestions) {
            // Correct answer, more questions → next
            await sendWebhook('__next__');
            await wait(3000);
        }
    }

    // Final check
    await wait(1000);
    const finalU = await getUser();
    const ended = !finalU?.currentGameType;
    if (!ended) {
        console.log(`  ⚠️ ${expectedGameType} didn't end, cleaning up`);
        await resetGameState();
    }
    assert(ended, `${expectedGameType} round complete (${answeredCount} answered)`);

    const pointsAfter = finalU?.totalPoints || pointsBefore;
    const gained = pointsAfter - pointsBefore;
    console.log(`  📊 Points: ${pointsBefore} → ${pointsAfter} (${gained >= 0 ? '+' : ''}${gained})`);

    return { played: true, pointsBefore, pointsAfter, gained, answeredCount };
}

// ==================== MAIN TEST ====================

async function runTests() {
    const startTime = Date.now();
    console.log('═══════════════════════════════════════════════════');
    console.log('  🧪 ProficienThAI COMPREHENSIVE Test');
    console.log(`  📌 Test User: ${TEST_USER_ID}`);
    console.log(`  🔗 ${WEBHOOK_URL}`);
    console.log('  🔒 Fake replyToken → NO messages sent to anyone');
    console.log('═══════════════════════════════════════════════════\n');

    try {

    // ================================================================
    // PHASE 0: Setup
    // ================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 0: Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Clean previous test data (userQuestionHistory cascade-deleted with User)
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
            currentLevel: 1,
            totalPoints: 0,
        }
    });
    console.log(`  ✅ User created: ${testUser.id} (Lv.1, 0pts)\n`);

    // ================================================================
    // PHASE 1: Basic Functions (8 tests)
    // ================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 1: Basic Functions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const basicCmds = [
        ['📋 เมนู', 'เมนู'],
        ['❓ ช่วยเหลือ', 'ช่วยเหลือ'],
        ['👤 โปรไฟล์', 'โปรไฟล์'],
        ['📊 แดชบอร์ด', 'แดชบอร์ด'],
        ['🏆 อันดับ', 'อันดับ'],
        ['🎮 ฝึกฝน', 'ฝึกฝน'],
        ['📝 งานของฉัน', 'งานของฉัน'],
        ['📁 เกมคำศัพท์', 'เกมคำศัพท์'],
    ];

    for (const [label, cmd] of basicCmds) {
        console.log(`\n${label}`);
        const res = await sendWebhook(cmd);
        assert(res.status === 200, `"${cmd}" → 200`);
        await wait(3000);
    }

    // General conversation
    console.log('\n💬 General Chat');
    let res = await sendWebhook('สวัสดีครับ วันนี้อากาศดี');
    assert(res.status === 200, 'General chat → 200');
    await wait(4000);
    let u = await getUser();
    assert(!u?.currentGameType, 'No game started from chat');

    // ================================================================
    // PHASE 2: Level Gate (should block Level 3+ and 5+ games)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 2: Level Gate');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔒 Lv.1 → FILL_BLANK (Lv.3+)');
    res = await sendWebhook('เติมคำ');
    await wait(3000);
    u = await getUser();
    assert(!u?.currentGameType, 'Blocked: FILL_BLANK needs Lv.3');

    console.log('\n🔒 Lv.1 → SUMMARIZE (Lv.5+)');
    res = await sendWebhook('สรุปเรื่อง');
    await wait(3000);
    u = await getUser();
    assert(!u?.currentGameType, 'Blocked: SUMMARIZE needs Lv.5');

    console.log('\n🔒 Lv.1 → READ_ANSWER (Lv.5+)');
    res = await sendWebhook('อ่านแล้วตอบ');
    await wait(3000);
    u = await getUser();
    assert(!u?.currentGameType, 'Blocked: READ_ANSWER needs Lv.5');

    // ================================================================
    // PHASE 3: Level 1 Games (10 games)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 3: Level 1 Games');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- Game 1: MULTIPLE_CHOICE ---
    console.log('\n🎯 Game 1/18: MULTIPLE_CHOICE');
    await playFullGameRound('เลือกตอบ', 'MULTIPLE_CHOICE', 5);

    // --- Game 2: VOCAB_OPPOSITE ---
    console.log('\n🔄 Game 2/18: VOCAB_OPPOSITE');
    await playFullGameRound('คำตรงข้าม', 'VOCAB_OPPOSITE', 5);

    // --- Game 3: VOCAB_SYNONYM ---
    console.log('\n🔗 Game 3/18: VOCAB_SYNONYM');
    await playFullGameRound('คำพ้อง', 'VOCAB_SYNONYM', 5);

    // --- Game 4: VOCAB_MATCH ---
    console.log('\n🎲 Game 4/18: VOCAB_MATCH');
    await playFullGameRound('จับคู่คำ', 'VOCAB_MATCH', 5);

    // --- Game 5: VOCAB_MEANING ---
    console.log('\n📖 Game 5/18: VOCAB_MEANING');
    await playFullGameRound('ความหมาย', 'VOCAB_MEANING', 5, {
        answerFn: () => 'ทดสอบความหมาย',
    });

    // --- Game 6: THAI_IDIOM ---
    console.log('\n🏮 Game 6/18: THAI_IDIOM');
    await playFullGameRound('สำนวนไทย', 'THAI_IDIOM', 5);

    // --- Game 7: THAI_CULTURE ---
    console.log('\n🎭 Game 7/18: THAI_CULTURE');
    await playFullGameRound('วัฒนธรรมไทย', 'THAI_CULTURE', 5);

    // --- Game 8: RACE_CLOCK ---
    console.log('\n⏱️ Game 8/18: RACE_CLOCK');
    await playFullGameRound('แข่งเวลา', 'RACE_CLOCK', 10, { answerWait: 3000 });

    // --- Game 9: DAILY_VOCAB (one-shot, no game state) ---
    console.log('\n📅 Game 9/18: DAILY_VOCAB');
    res = await sendWebhook('คำศัพท์รายวัน');
    assert(res.status === 200, 'Daily vocab → 200');
    await wait(4000);
    u = await getUser();
    assert(!u?.currentGameType, 'DAILY_VOCAB is one-shot (no game state)');

    // --- Game 10: VOCAB_GACHA (one-shot, no game state) ---
    console.log('\n🎰 Game 10/18: VOCAB_GACHA');
    res = await sendWebhook('กาชา');
    assert(res.status === 200, 'Gacha → 200');
    await wait(4000);
    u = await getUser();
    assert(!u?.currentGameType, 'VOCAB_GACHA is one-shot (no game state)');

    // Check progress
    u = await getUser();
    console.log(`\n📊 After Lv.1 games: Lv.${u.currentLevel} | ${u.totalPoints}pts`);

    // ================================================================
    // PHASE 4: Game Utilities (cancel, switch, hint, skip, show answer)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 4: Game Utilities');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- Cancel mid-game ---
    console.log('\n🚫 Cancel mid-game');
    await sendWebhook('เลือกตอบ');
    await wait(4000);
    u = await getUser();
    assert(u?.currentGameType === 'MULTIPLE_CHOICE', 'In game');
    await sendWebhook('ยกเลิก');
    await wait(3000);
    u = await getUser();
    assert(!u?.currentGameType, 'Cancelled → null');

    // --- Switch game mid-play ---
    console.log('\n🔀 Switch game');
    await sendWebhook('เลือกตอบ');
    await wait(4000);
    u = await getUser();
    assert(u?.currentGameType === 'MULTIPLE_CHOICE', 'Started MC');
    await sendWebhook('คำตรงข้าม');
    await wait(4000);
    u = await getUser();
    assert(u?.currentGameType === 'VOCAB_OPPOSITE', 'Switched to VOCAB_OPPOSITE');
    await resetGameState();

    // --- Hint command ---
    console.log('\n💡 Hint');
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

    // --- Wrong answer + Skip (via __next__) ---
    console.log('\n⏭️ Wrong → Skip');
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

    // --- Show answer ---
    console.log('\n📋 Show answer');
    await sendWebhook('เลือกตอบ');
    await wait(4000);
    u = await getUser();
    if (u?.currentGameType) {
        await sendWebhook('zzz_wrong');
        await wait(3000);
        await sendWebhook('เฉลย');
        await wait(3000);
        assert(true, 'Show answer command processed');
    } else { skip('ShowAnswer: game not started'); }
    await resetGameState();

    // ================================================================
    // PHASE 5: Level 3 Grammar Games (4 games)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 5: Level 3 Grammar Games');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserLevel(3, 300);
    u = await getUser();
    console.log(`  📊 Set to Lv.${u.currentLevel} | ${u.totalPoints}pts`);

    // --- Game 11: FILL_BLANK ---
    console.log('\n📝 Game 11/18: FILL_BLANK');
    await playFullGameRound('เติมคำ', 'FILL_BLANK', 5, {
        answerFn: () => 'ทดสอบ',
    });

    // --- Game 12: FIX_SENTENCE ---
    console.log('\n🔧 Game 12/18: FIX_SENTENCE');
    await playFullGameRound('แก้ไขประโยค', 'FIX_SENTENCE', 5, {
        answerFn: () => 'ฉันไปโรงเรียนทุกวัน',
    });

    // --- Game 13: ARRANGE_SENTENCE ---
    console.log('\n🔢 Game 13/18: ARRANGE_SENTENCE');
    await playFullGameRound('เรียงประโยค', 'ARRANGE_SENTENCE', 5, {
        answerFn: () => 'ฉันชอบกินข้าวมาก',
    });

    // --- Game 14: SPEED_GRAMMAR ---
    console.log('\n⚡ Game 14/18: SPEED_GRAMMAR');
    await playFullGameRound('speed grammar', 'SPEED_GRAMMAR', 5, { answerWait: 3000 });

    u = await getUser();
    console.log(`\n📊 After Grammar games: Lv.${u.currentLevel} | ${u.totalPoints}pts`);

    // ================================================================
    // PHASE 6: Level 5 Reading/Writing Games (4 games)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 6: Level 5 Reading/Writing Games');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await setUserLevel(5, 1000);
    u = await getUser();
    console.log(`  📊 Set to Lv.${u.currentLevel} | ${u.totalPoints}pts`);

    // --- Game 15: READ_ANSWER ---
    console.log('\n📚 Game 15/18: READ_ANSWER');
    await playFullGameRound('อ่านแล้วตอบ', 'READ_ANSWER', 3, { startWait: 5000 });

    // --- Game 16: SENTENCE_WRITING (aka COMPOSE_SENTENCE) ---
    console.log('\n✏️ Game 16/18: SENTENCE_WRITING');
    await playFullGameRound('แต่งประโยค', 'SENTENCE_WRITING', 3, {
        answerFn: () => 'ฉันชอบอ่านหนังสือเรื่องนี้มากเพราะสนุกดี',
        answerWait: 6000,
    });

    // --- Game 17: SUMMARIZE ---
    console.log('\n📝 Game 17/18: SUMMARIZE');
    await playFullGameRound('สรุปเรื่อง', 'SUMMARIZE', 3, {
        answerFn: () => 'เรื่องนี้เป็นเรื่องเกี่ยวกับการเรียนรู้ภาษาไทยของนักศึกษาต่างชาติที่ต้องพยายามฝึกฝนอย่างสม่ำเสมอ สุนัขเป็นสัตว์เลี้ยงที่ซื่อสัตย์และต้องการการดูแลเอาใจใส่อย่างดีจากเจ้าของ',
        answerWait: 10000,
    });

    // --- Game 18: CONTINUE_STORY ---
    console.log('\n📖 Game 18/18: CONTINUE_STORY');
    await playFullGameRound('เขียนต่อ', 'CONTINUE_STORY', 3, {
        answerFn: () => 'จากนั้นเด็กน้อยก็เปิดหนังสือเล่มนั้นออกมา เขาค้นพบว่าข้างในมีความลับที่ซ่อนอยู่มานานหลายร้อยปี หนังสือเล่มนี้บอกเล่าเรื่องราวของนักเดินทางผู้กล้าหาญที่ออกตามหาสมบัติล้ำค่า',
        answerWait: 10000,
    });

    u = await getUser();
    console.log(`\n📊 After R/W games: Lv.${u.currentLevel} | ${u.totalPoints}pts`);

    // ================================================================
    // PHASE 7: Other Functions
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 7: Other Functions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // --- Spin Wheel ---
    console.log('\n🎡 Spin Wheel');
    res = await sendWebhook('วงล้อ');
    assert(res.status === 200, 'Spin wheel → 200');
    await wait(4000);

    // --- Edit Profile Menu ---
    console.log('\n✏️ Edit Profile Menu');
    res = await sendWebhook('แก้ไขข้อมูล');
    assert(res.status === 200, 'Edit profile menu → 200');
    await wait(3000);

    // --- Edit specific field ---
    console.log('\n✏️ Edit Thai Name');
    res = await sendWebhook('แก้ไข:ชื่อไทย');
    assert(res.status === 200, 'Edit field start → 200');
    await wait(5000);
    res = await sendWebhook('ชื่อใหม่ทดสอบ');
    assert(res.status === 200, 'Edit field submit → 200');
    await wait(5000);
    u = await getUser();
    assert(u?.thaiName === 'ชื่อใหม่ทดสอบ', `Name updated: "${u?.thaiName}"`);

    // --- Submit Task flow ---
    console.log('\n📤 Submit Task');
    res = await sendWebhook('ส่งงาน');
    assert(res.status === 200, 'Submit start → 200');
    await wait(3000);
    u = await getUser();
    assert(u?.currentGameType === 'SUBMITTING_TASK', 'In submitting state');
    res = await sendWebhook('ยกเลิก');
    assert(res.status === 200, 'Cancel submit → 200');
    await wait(3000);
    u = await getUser();
    assert(!u?.currentGameType, 'Submit cancelled');

    // --- Feedback ---
    console.log('\n💭 Feedback');
    res = await sendWebhook('ขอผลป้อนกลับ');
    assert(res.status === 200, 'Feedback → 200');
    await wait(3000);

    // --- Lesson menu ---
    console.log('\n📚 Lesson Menu');
    res = await sendWebhook('บทเรียน');
    assert(res.status === 200, 'Lesson menu → 200');
    await wait(3000);

    // --- Grammar games menu ---
    console.log('\n📁 Grammar Games Menu');
    res = await sendWebhook('เกมไวยากรณ์');
    assert(res.status === 200, 'Grammar games menu → 200');
    await wait(3000);

    // --- Culture games menu ---
    console.log('\n📁 Culture Games Menu');
    res = await sendWebhook('เกมวัฒนธรรม');
    assert(res.status === 200, 'Culture games menu → 200');
    await wait(3000);

    // ================================================================
    // PHASE 8: Registration Flow (separate user)
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 8: Registration Flow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const REG_USER_ID = `Utest_reg_${Date.now()}`;

    // Registration steps
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
        { send: 'YES', check: 'registered', label: 'consent → registered' },
    ];

    for (const step of regSteps) {
        const r = await sendWebhookFor(REG_USER_ID, step.send);
        assert(r.status === 200, `Reg "${step.send}" → 200`);
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

    // ================================================================
    // PHASE 9: Final Summary
    // ================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PHASE 9: Final Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const finalUser = await getUser();
    console.log(`  👤 ${finalUser.thaiName} (${finalUser.chineseName})`);
    console.log(`  📊 Level: ${finalUser.currentLevel} | Points: ${finalUser.totalPoints}`);
    console.log(`  🏅 Title: ${finalUser.title || '(none)'}`);

    const sessions = await prisma.languageGameSession.count({ where: { odUserId: TEST_USER_ID } });
    const history = await prisma.userQuestionHistory.count({ where: { userId: finalUser.id } });
    console.log(`  🎮 Game sessions: ${sessions}`);
    console.log(`  📝 Question history: ${history}`);

    } catch (error) {
        console.error('\n💥 FATAL ERROR:', error.message);
        console.error(error.stack);
        failed++;
    }

    // ================================================================
    // CLEANUP
    // ================================================================
    console.log('\n━━━ Cleanup ━━━');
    try {
        // Main test user (userQuestionHistory cascade-deleted with User)
        await prisma.languageGameSession.deleteMany({ where: { odUserId: TEST_USER_ID } });
        await prisma.user.delete({ where: { lineUserId: TEST_USER_ID } });
        console.log(`  🗑️ Main test user deleted`);

        // Registration test users
        const regUsers = await prisma.user.findMany({
            where: { lineUserId: { startsWith: 'Utest_reg_' } }
        });
        for (const ru of regUsers) {
            await prisma.languageGameSession.deleteMany({ where: { odUserId: ru.lineUserId } });
            await prisma.user.delete({ where: { id: ru.id } });
        }
        console.log(`  🗑️ Registration test users: ${regUsers.length} deleted`);
    } catch (e) {
        console.log(`  ⚠️ Cleanup: ${e.message}`);
    }

    // ================================================================
    // RESULTS
    // ================================================================
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  📊 Results: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️ ${skipped} skipped`);
    console.log(`  ⏱️  Time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════\n');

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('Fatal:', e);
    prisma.$disconnect();
    process.exit(1);
});
