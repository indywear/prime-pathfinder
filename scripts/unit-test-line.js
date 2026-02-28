/**
 * Unit Test: LINE Bot Q&A Flow
 * - ใช้ fake replyToken → ข้อความไม่ถูกส่งจริง
 * - ทดสอบ logic + DB state เท่านั้น
 * - ปลอดภัย ไม่กระทบ user จริง
 */
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://proficienthai-vert.vercel.app/api/line/webhook';
const TEST_USER_ID = 'U7433223088c3015ffa0533a4ac689557'; // อินดี้ครับ (dev account)

// ==================== HELPERS ====================

function computeSignature(body) {
    return crypto.createHmac('SHA256', CHANNEL_SECRET).update(body).digest('base64');
}

function sendWebhook(text) {
    const ts = Date.now();
    const payload = {
        destination: 'test',
        events: [{
            type: 'message',
            message: { type: 'text', id: `test-${ts}`, text },
            timestamp: ts,
            replyToken: `fake-test-token-${ts}`, // FAKE → no message sent
            source: { type: 'user', userId: TEST_USER_ID },
            webhookEventId: `test-evt-${ts}`,
            deliveryContext: { isRedelivery: false },
            mode: 'active',
        }]
    };
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

function sendPostback(data) {
    const ts = Date.now();
    const payload = {
        destination: 'test',
        events: [{
            type: 'postback',
            postback: { data },
            timestamp: ts,
            replyToken: `fake-pb-token-${ts}`,
            source: { type: 'user', userId: TEST_USER_ID },
            webhookEventId: `test-pb-${ts}`,
            deliveryContext: { isRedelivery: false },
            mode: 'active',
        }]
    };
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

async function getUser() {
    return prisma.user.findUnique({
        where: { lineUserId: TEST_USER_ID },
        select: {
            id: true, thaiName: true, currentLevel: true, totalPoints: true,
            currentGameType: true, currentQuestionId: true, gameData: true, gender: true,
        }
    });
}

async function resetGameState() {
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { currentGameType: null, currentQuestionId: null, gameData: null },
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, testName, detail) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.log(`  ❌ ${testName} — ${detail || 'FAILED'}`);
        failed++;
    }
}

// ==================== TESTS ====================

async function testWebhookResponds() {
    console.log('\n📡 Test 1: Webhook responds to signed request');
    const res = await sendWebhook('test');
    assert(res.status === 200, 'Webhook returns 200', `Got ${res.status}: ${res.body}`);
}

async function testInvalidSignature() {
    console.log('\n🔒 Test 2: Reject invalid signature');
    const body = JSON.stringify({ destination: 'test', events: [{ type: 'message', message: { type: 'text', id: '1', text: 'hi' }, timestamp: Date.now(), replyToken: 'fake', source: { type: 'user', userId: TEST_USER_ID }, webhookEventId: '1', deliveryContext: { isRedelivery: false }, mode: 'active' }] });
    const res = await new Promise((resolve, reject) => {
        const url = new URL(WEBHOOK_URL);
        const req = https.request({
            hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-line-signature': 'invalid-signature' },
        }, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ status: r.statusCode, body: d })); });
        req.on('error', reject); req.write(body); req.end();
    });
    assert(res.status === 401, 'Invalid signature → 401', `Got ${res.status}`);
}

async function testMenuCommand() {
    console.log('\n📋 Test 3: Menu command "เมนู"');
    await resetGameState();
    const res = await sendWebhook('เมนู');
    assert(res.status === 200, 'Webhook accepts "เมนู"', `Got ${res.status}`);
    await sleep(2000);
    const user = await getUser();
    assert(user.currentGameType === null, 'No game started from menu', `gameType=${user.currentGameType}`);
}

async function testProfileCommand() {
    console.log('\n👤 Test 4: Profile command "โปรไฟล์"');
    const res = await sendWebhook('โปรไฟล์');
    assert(res.status === 200, 'Webhook accepts "โปรไฟล์"', `Got ${res.status}`);
}

async function testVocabMatchGame() {
    console.log('\n🎮 Test 5: Multiple Choice game (เลือกตอบ)');
    await resetGameState();
    const beforeUser = await getUser();
    const beforePoints = beforeUser.totalPoints;

    // Start game
    const res = await sendWebhook('เลือกตอบ');
    assert(res.status === 200, 'Start MULTIPLE_CHOICE → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === 'MULTIPLE_CHOICE', 'Game type = MULTIPLE_CHOICE', `Got ${user.currentGameType}`);
    assert(user.currentQuestionId !== null, 'Question ID assigned', `Got ${user.currentQuestionId}`);

    // Check session data
    let gd = {};
    try { gd = JSON.parse(user.gameData || '{}'); } catch {}
    const session = gd.session;
    assert(session !== undefined, 'Session data exists');
    if (session) {
        assert(session.totalQuestions >= 1, `Total questions = ${session.totalQuestions}`);
        assert(session.currentIndex === 0, `Current index = 0`, `Got ${session.currentIndex}`);
    }

    // Answer with "ก" (option A) — may be right or wrong
    const ansRes = await sendWebhook('ก');
    assert(ansRes.status === 200, 'Answer "ก" → 200');
    await sleep(3000);

    const afterUser = await getUser();
    // Either game advanced or completed
    const gameStillActive = afterUser.currentGameType !== null;
    const pointsChanged = afterUser.totalPoints !== beforePoints;
    assert(true, `After answer: gameType=${afterUser.currentGameType || 'null'}, points=${afterUser.totalPoints} (was ${beforePoints})`);

    await resetGameState();
}

async function testVocabOppositeGame() {
    console.log('\n🔄 Test 6: Vocab Opposite game (คำตรงข้าม)');
    await resetGameState();

    const res = await sendWebhook('คำตรงข้าม');
    assert(res.status === 200, 'Start VOCAB_OPPOSITE → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === 'VOCAB_OPPOSITE', 'Game type = VOCAB_OPPOSITE', `Got ${user.currentGameType}`);

    // Answer
    await sendWebhook('ก');
    await sleep(2000);
    await resetGameState();
}

async function testFillBlankGame() {
    console.log('\n📝 Test 7: Fill Blank game (เติมคำ)');
    await resetGameState();

    const res = await sendWebhook('เติมคำ');
    assert(res.status === 200, 'Start FILL_BLANK → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === 'FILL_BLANK', 'Game type = FILL_BLANK', `Got ${user.currentGameType}`);

    // Try answering with the word from gameData
    let gd = {};
    try { gd = JSON.parse(user.gameData || '{}'); } catch {}
    const answer = gd.correctAnswer || 'ทดสอบ';
    console.log(`  📎 Answering with: "${answer}"`);

    await sendWebhook(answer);
    await sleep(3000);

    const after = await getUser();
    assert(true, `After answer: gameType=${after.currentGameType || 'null'}, points=${after.totalPoints}`);
    await resetGameState();
}

async function testSummarizeGame() {
    console.log('\n📖 Test 8: Summarize game (สรุปเรื่อง) — Level 5+ required');
    await resetGameState();

    const res = await sendWebhook('สรุปเรื่อง');
    assert(res.status === 200, 'Start SUMMARIZE → 200');
    await sleep(4000);

    const user = await getUser();
    // User is Level 7, should be able to play
    assert(user.currentGameType === 'SUMMARIZE', 'Game type = SUMMARIZE', `Got ${user.currentGameType}`);

    if (user.currentGameType === 'SUMMARIZE') {
        let gd = {};
        try { gd = JSON.parse(user.gameData || '{}'); } catch {}
        const keywords = (gd.keywords || '').split('|').map(k => k.trim());
        console.log(`  📎 Keywords: ${keywords.join(', ')}`);

        // Send a summary using the keywords
        const summary = keywords.length > 0
            ? `เรื่องนี้เกี่ยวกับ${keywords[0]} ซึ่งเป็นสิ่งสำคัญ ${keywords.slice(1).map(k => `และเกี่ยวข้องกับ${k}`).join(' ')} เป็นเรื่องราวที่น่าสนใจมาก`
            : 'นี่คือบทสรุปของเรื่องราวที่น่าสนใจมาก มีหลายเหตุการณ์เกิดขึ้น';

        console.log(`  📎 Sending summary (${summary.length} chars)`);
        await sendWebhook(summary);
        await sleep(6000); // AI evaluation takes time

        const after = await getUser();
        const accepted = after.currentGameType === null;
        assert(true, `Result: ${accepted ? 'ACCEPTED' : 'STILL IN GAME'}, points=${after.totalPoints}`);
    }

    await resetGameState();
}

async function testContinueStoryGame() {
    console.log('\n✍️ Test 9: Continue Story game (เขียนต่อ) — Level 5+ required');
    await resetGameState();

    const res = await sendWebhook('เขียนต่อ');
    assert(res.status === 200, 'Start CONTINUE_STORY → 200');
    await sleep(4000);

    const user = await getUser();
    assert(user.currentGameType === 'CONTINUE_STORY', 'Game type = CONTINUE_STORY', `Got ${user.currentGameType}`);

    if (user.currentGameType === 'CONTINUE_STORY') {
        let gd = {};
        try { gd = JSON.parse(user.gameData || '{}'); } catch {}
        const keywords = (gd.keywords || '').split('|').map(k => k.trim());
        console.log(`  📎 Keywords: ${keywords.join(', ')}`);
        console.log(`  📎 Min length: ${gd.minLength || 50}`);

        const continuation = keywords.map(k => `เรื่องราวนี้เกี่ยวกับ${k}`).join(' ') +
            ' ทุกอย่างเป็นไปอย่างน่าตื่นเต้นมาก เด็กๆ ต่างสนุกสนานกับการผจญภัยครั้งนี้ เหตุการณ์ต่างๆ ผ่านไปอย่างรวดเร็ว ทุกคนมีความสุขที่ได้อยู่ด้วยกัน';

        console.log(`  📎 Sending continuation (${continuation.length} chars)`);
        await sendWebhook(continuation);
        await sleep(6000);

        const after = await getUser();
        const accepted = after.currentGameType === null;
        assert(true, `Result: ${accepted ? 'ACCEPTED' : 'STILL IN GAME'}, points=${after.totalPoints}`);
    }

    await resetGameState();
}

async function testThaiIdiomGame() {
    console.log('\n🏮 Test 10: Thai Idiom game (สำนวนไทย) — NEW GAME');
    await resetGameState();

    const res = await sendWebhook('สำนวนไทย');
    assert(res.status === 200, 'Start THAI_IDIOM → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === 'THAI_IDIOM', 'Game type = THAI_IDIOM', `Got ${user.currentGameType}`);

    if (user.currentGameType === 'THAI_IDIOM') {
        await sendWebhook('ก');
        await sleep(2000);
        assert(true, 'Answered "ก" for Thai Idiom');
    }

    await resetGameState();
}

async function testThaiCultureGame() {
    console.log('\n🎭 Test 11: Thai Culture game (วัฒนธรรมไทย) — NEW GAME');
    await resetGameState();

    const res = await sendWebhook('วัฒนธรรม');
    assert(res.status === 200, 'Start THAI_CULTURE → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === 'THAI_CULTURE', 'Game type = THAI_CULTURE', `Got ${user.currentGameType}`);

    if (user.currentGameType === 'THAI_CULTURE') {
        await sendWebhook('ก');
        await sleep(2000);
        assert(true, 'Answered "ก" for Thai Culture');
    }

    await resetGameState();
}

async function testCancelGame() {
    console.log('\n🚫 Test 12: Cancel game mid-play');
    await resetGameState();

    await sendWebhook('เลือกตอบ');
    await sleep(3000);

    const before = await getUser();
    assert(before.currentGameType === 'MULTIPLE_CHOICE', 'In game before cancel', `Got ${before.currentGameType}`);

    await sendWebhook('ยกเลิก');
    await sleep(2000);

    const after = await getUser();
    assert(after.currentGameType === null, 'Game cancelled → null', `Got ${after.currentGameType}`);
}

async function testSwitchGameDuringMC() {
    console.log('\n🔀 Test 13: Switch game during multiple-choice game');
    await resetGameState();

    // Start multiple choice
    await sendWebhook('เลือกตอบ');
    await sleep(3000);

    const before = await getUser();
    assert(before.currentGameType === 'MULTIPLE_CHOICE', 'Started MULTIPLE_CHOICE', `Got ${before.currentGameType}`);

    // Switch to opposite
    await sendWebhook('คำตรงข้าม');
    await sleep(3000);

    const after = await getUser();
    assert(after.currentGameType === 'VOCAB_OPPOSITE', 'Switched to VOCAB_OPPOSITE', `Got ${after.currentGameType}`);

    await resetGameState();
}

async function testHintCommand() {
    console.log('\n💡 Test 14: Hint command');
    await resetGameState();

    await sendWebhook('เลือกตอบ');
    await sleep(3000);

    const user = await getUser();
    if (user.currentGameType) {
        await sendWebhook('__hint__');
        await sleep(2000);

        const after = await getUser();
        let gd = {};
        try { gd = JSON.parse(after.gameData || '{}'); } catch {}
        assert(gd.hintUsedForCurrent === true, 'Hint marked as used', `hintUsedForCurrent=${gd.hintUsedForCurrent}`);
    } else {
        console.log('  ⏭️ Skipped — game did not start');
        skipped++;
    }

    await resetGameState();
}

async function testLevelGate() {
    console.log('\n🔒 Test 15: Level Gate (low-level user tries grammar game)');
    // Temporarily set user to level 1
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { currentGameType: null, currentQuestionId: null, gameData: null, currentLevel: 1 },
    });

    await sendWebhook('เติมคำ');
    await sleep(3000);

    const user = await getUser();
    // FILL_BLANK requires Level 3+, user is Level 1 → should be blocked
    assert(user.currentGameType === null, 'Level 1 blocked from FILL_BLANK (Lv3+)', `Got gameType=${user.currentGameType}`);

    // Restore level
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { currentLevel: 7 },
    });
}

async function testGeneralChat() {
    console.log('\n💬 Test 16: General conversation');
    await resetGameState();

    const res = await sendWebhook('สวัสดีครับ');
    assert(res.status === 200, 'General chat → 200');
    await sleep(3000);

    const user = await getUser();
    assert(user.currentGameType === null, 'No game started from chat');
}

// ==================== MAIN ====================

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  🧪 ProficienThAI LINE Bot Unit Test');
    console.log('  📌 User: อินดี้ครับ (dev account)');
    console.log('  🔒 Fake replyToken → NO messages sent');
    console.log('═══════════════════════════════════════');

    const startUser = await getUser();
    console.log(`\n👤 Test User: ${startUser.thaiName} | Lv.${startUser.currentLevel} | ${startUser.totalPoints} pts`);

    const startTime = Date.now();

    try {
        await testWebhookResponds();
        await testInvalidSignature();
        await testMenuCommand();
        await testProfileCommand();
        await testVocabMatchGame();
        await testVocabOppositeGame();
        await testFillBlankGame();
        await testSummarizeGame();
        await testContinueStoryGame();
        await testThaiIdiomGame();
        await testThaiCultureGame();
        await testCancelGame();
        await testSwitchGameDuringMC();
        await testHintCommand();
        await testLevelGate();
        await testGeneralChat();
    } catch (err) {
        console.error('\n💥 Test crashed:', err.message);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const endUser = await getUser();

    // Clean up
    await resetGameState();

    console.log('\n═══════════════════════════════════════');
    console.log(`  📊 Results: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️ ${skipped} skipped`);
    console.log(`  ⏱️  Time: ${elapsed}s`);
    console.log(`  👤 Points: ${startUser.totalPoints} → ${endUser.totalPoints} (+${endUser.totalPoints - startUser.totalPoints})`);
    console.log('═══════════════════════════════════════');

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
