/**
 * Feature Test: ProficienThAI LINE Bot (Non-Game Features)
 * ========================================================
 * ทดสอบทุกฟีเจอร์ที่ไม่ใช่เกม:
 * - Task Submission (ปกติ, สั้นเกิน, เร็วเกิน, ก๊อปตัวอย่าง, ซ้ำ)
 * - Spin Wheel (หมุน + cooldown)
 * - Gacha (สุ่ม + limit)
 * - Daily Vocab
 * - Profile Edit (4 fields)
 * - Leaderboard
 * - General Chat (AI ตอบ)
 */
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://proficienthai-iota.vercel.app/api/line/webhook';
const TEST_USER_ID = `Utest_feat_${Date.now()}`;

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
    } catch { }
}

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}`);
        failed++;
    }
}

function skip(label) {
    console.log(`  ⏭️ ${label} (skipped)`);
    skipped++;
}

// ==================== SETUP ====================

async function setup() {
    console.log('\n🔧 Setting up test user...');
    console.log(`   User ID: ${TEST_USER_ID}`);
    console.log(`   Webhook: ${WEBHOOK_URL}`);

    // Register via webhook
    // Steps: chineseName → thaiName → studentId → university → email → nationality → gender → thaiLevel
    const res1 = await sendWebhook('ลงทะเบียน');
    await wait(2000);
    assert(res1.status === 200, 'Registration start → 200');

    // Step 0: ชื่อจีน
    const res2 = await sendWebhook('测试功能');
    await wait(2000);
    assert(res2.status === 200, 'Chinese name → 200');

    // Step 1: ชื่อไทย
    const res3 = await sendWebhook('ทดสอบฟีเจอร์');
    await wait(2000);
    assert(res3.status === 200, 'Thai name → 200');

    // Step 2: รหัสนักศึกษา
    const res4 = await sendWebhook('F99999');
    await wait(2000);
    assert(res4.status === 200, 'Student ID → 200');

    // Step 3: มหาวิทยาลัย
    const res5 = await sendWebhook('北京大学');
    await wait(2000);
    assert(res5.status === 200, 'University → 200');

    // Step 4: อีเมล
    const res6 = await sendWebhook('feat-test@test.com');
    await wait(2000);
    assert(res6.status === 200, 'Email → 200');

    // Step 5: สัญชาติ
    const res7 = await sendWebhook('Chinese');
    await wait(2000);
    assert(res7.status === 200, 'Nationality → 200');

    // Step 6: เพศ
    const res8 = await sendWebhook('male');
    await wait(2000);
    assert(res8.status === 200, 'Gender → 200');

    // Step 7: ระดับภาษาไทย
    const res9 = await sendWebhook('INTERMEDIATE');
    await wait(2000);
    assert(res9.status === 200, 'Thai level → 200');

    // Step 8: ยินยอม (last step → isRegistered = true)
    const res10 = await sendWebhook('YES');
    await wait(4000);
    assert(res10.status === 200, 'Consent → 200');

    const user = await getUser();
    assert(user?.isRegistered === true, 'User is registered');
    console.log(`   ✅ User registered: ${user?.thaiName}`);
}

// ==================== TEST GROUPS ====================

// A. Task Submission
async function testTaskSubmission() {
    console.log('\n📝 A. Task Submission Tests');

    // Check if tasks exist
    const taskCount = await prisma.task.count();
    if (taskCount === 0) {
        skip('No tasks in DB — skip all task tests');
        return;
    }

    const firstTask = await prisma.task.findFirst({
        where: { isActive: true },
        orderBy: { weekNumber: 'asc' },
    });
    if (!firstTask) {
        skip('No active tasks — skip task tests');
        return;
    }

    // Set user's currentTaskWeek to match the task
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { currentTaskWeek: firstTask.weekNumber },
    });

    const existingUser = await getUser();

    // A1: Start task submission via webhook
    console.log('  --- A1: Start task submission ---');
    const r1 = await sendWebhook('ส่งงาน');
    await wait(4000);
    assert(r1.status === 200, 'ส่งงาน → 200');

    let user = await getUser();
    assert(user?.currentGameType === 'SUBMITTING_TASK', 'State = SUBMITTING_TASK');

    // A2: Submit too short text → reject (note: fake replyToken causes reply error → catch clears state)
    console.log('  --- A2: Too short text ---');
    const shortText = 'สั้นเกินไป';
    const r2 = await sendWebhook(shortText);
    await wait(3000);
    assert(r2.status === 200, 'Short text → 200 (rejected as too short)');

    // A3: Speed detection — set state directly via DB to control timing
    console.log('  --- A3: Speed detection (immediate submit) ---');
    // Delete any previous submission for this task
    try {
        await prisma.submission.deleteMany({
            where: { userId: existingUser.id, taskId: firstTask.id },
        });
    } catch { }

    // Set SUBMITTING_TASK state with startTime 5 seconds ago (simulates fast submit)
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: {
            currentTaskWeek: firstTask.weekNumber,
            currentGameType: 'SUBMITTING_TASK',
            currentQuestionId: firstTask.id,
            gameData: JSON.stringify({
                taskId: firstTask.id,
                weekNumber: firstTask.weekNumber,
                minWords: firstTask.minWords,
                maxWords: firstTask.maxWords,
                title: firstTask.title,
                startTime: Date.now() - 5000, // 5 seconds ago → should be flagged
            }),
        },
    });

    const fastText = 'ฉันชอบเรียนภาษาไทยมาก ภาษาไทยเป็นภาษาที่สวยงามและมีความหมายลึกซึ้ง ฉันอยากเรียนรู้คำศัพท์ใหม่ทุกวัน การฝึกเขียนภาษาไทยทำให้ฉันมีความสุขมาก ฉันจะพยายามเขียนให้ดีขึ้นทุกวัน ภาษาไทยมีหลายสำนวนที่น่าสนใจ ฉันชอบอ่านหนังสือภาษาไทย และฉันก็ชอบดูละครไทยด้วย การเรียนภาษาไทยทำให้ฉันเข้าใจวัฒนธรรมไทยมากขึ้น';
    const r3b = await sendWebhook(fastText);
    await wait(10000); // Wait for AI feedback

    // Check submission in DB
    const submission = await prisma.submission.findFirst({
        where: { userId: existingUser.id, taskId: firstTask.id },
        orderBy: { submittedAt: 'desc' },
    });
    assert(submission !== null, 'Submission created');
    if (submission) {
        assert(submission.suspectedFast === true, `Speed flagged: suspectedFast=${submission.suspectedFast}, speed=${submission.submissionSpeed}s`);
        assert(submission.submissionSpeed !== null && submission.submissionSpeed < 30, `Speed recorded: ${submission.submissionSpeed}s`);
        assert(submission.totalScore >= 0, `AI scored: totalScore=${submission.totalScore}`);
    }

    // A4: Submit duplicate → reject (unique constraint)
    console.log('  --- A4: Duplicate submission ---');
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: {
            currentTaskWeek: firstTask.weekNumber,
            currentGameType: 'SUBMITTING_TASK',
            currentQuestionId: firstTask.id,
            gameData: JSON.stringify({
                taskId: firstTask.id,
                weekNumber: firstTask.weekNumber,
                minWords: firstTask.minWords,
                maxWords: firstTask.maxWords,
                title: firstTask.title,
                startTime: Date.now(),
            }),
        },
    });

    const dupText = 'ฉันชอบประเทศไทยมาก อาหารไทยอร่อยมาก คนไทยใจดี ฉันอยากอยู่ที่ประเทศไทยนานๆ ภาษาไทยเป็นภาษาที่สวยงาม ฉันพยายามเรียนภาษาไทยทุกวัน วัฒนธรรมไทยน่าสนใจมาก ฉันชอบเทศกาลของไทย ทุกคนเป็นมิตรกับฉัน ฉันจะกลับมาเที่ยวไทยอีกแน่นอน';
    const r4 = await sendWebhook(dupText);
    await wait(5000);
    assert(r4.status === 200, 'Duplicate submit → 200 (but should show error)');

    // Check that no new submission was created (unique constraint)
    const subCount = await prisma.submission.count({
        where: { userId: existingUser.id, taskId: firstTask.id },
    });
    assert(subCount === 1, `Only 1 submission exists for this task (got ${subCount})`);

    // A5: Copy detection — set state directly via DB
    console.log('  --- A5: Copy detection ---');

    // Find next task with bestPractice
    const nextTask = await prisma.task.findFirst({
        where: { isActive: true, weekNumber: { gt: firstTask.weekNumber }, bestPractice: { not: null } },
        orderBy: { weekNumber: 'asc' },
    });

    if (nextTask && nextTask.bestPractice) {
        // Delete any existing submission
        try {
            await prisma.submission.deleteMany({
                where: { userId: existingUser.id, taskId: nextTask.id },
            });
        } catch { }

        // Set state directly in DB for copy detection test
        await prisma.user.update({
            where: { lineUserId: TEST_USER_ID },
            data: {
                currentTaskWeek: nextTask.weekNumber,
                currentGameType: 'SUBMITTING_TASK',
                currentQuestionId: nextTask.id,
                gameData: JSON.stringify({
                    taskId: nextTask.id,
                    weekNumber: nextTask.weekNumber,
                    minWords: nextTask.minWords,
                    maxWords: nextTask.maxWords,
                    title: nextTask.title,
                    startTime: Date.now() - 300000, // 5 minutes ago (not fast)
                }),
            },
        });

        // Submit text that is the bestPractice verbatim
        const copyText = nextTask.bestPractice;
        const r5b = await sendWebhook(copyText);
        await wait(10000);

        const copySubmission = await prisma.submission.findFirst({
            where: { userId: existingUser.id, taskId: nextTask.id },
        });
        if (copySubmission) {
            assert(copySubmission.suspectedCopy === true, `Copy flagged: suspectedCopy=${copySubmission.suspectedCopy}`);
        } else {
            skip('Copy submission not created (might be too short)');
        }
    } else {
        skip('No next task with bestPractice — skip copy detection test');
    }

    await resetGameState();
}

// B. Spin Wheel
async function testSpinWheel() {
    console.log('\n🎡 B. Spin Wheel Tests');

    // Reset lastSpinAt to allow spin
    await prisma.user.update({
        where: { lineUserId: TEST_USER_ID },
        data: { lastSpinAt: null },
    });
    await resetGameState();

    const userBefore = await getUser();
    const pointsBefore = userBefore?.totalPoints || 0;

    // B1: Spin
    console.log('  --- B1: Spin wheel ---');
    const r1 = await sendWebhook('หมุนวงล้อ');
    await wait(3000);
    assert(r1.status === 200, 'Spin wheel → 200');

    const userAfter = await getUser();
    assert(userAfter?.lastSpinAt !== null, 'lastSpinAt updated');
    // Points might or might not increase (could land on "nothing")
    console.log(`    Points: ${pointsBefore} → ${userAfter?.totalPoints}`);

    // B2: Spin again → should be rejected (cooldown)
    console.log('  --- B2: Spin cooldown ---');
    const r2 = await sendWebhook('หมุนวงล้อ');
    await wait(3000);
    assert(r2.status === 200, 'Spin cooldown → 200');

    const userAfter2 = await getUser();
    // Points should NOT increase again (cooldown prevents spin)
    assert(userAfter2?.totalPoints === userAfter?.totalPoints, `Points unchanged during cooldown: ${userAfter2?.totalPoints}`);
}

// C. Gacha
async function testGacha() {
    console.log('\n🎰 C. Gacha Tests');
    await resetGameState();

    // Reset gacha pulls for today (gacha uses practiceSession with activityType='VOCAB_GACHA')
    const user = await getUser();
    try {
        await prisma.practiceSession.deleteMany({
            where: {
                userId: user.id,
                activityType: 'VOCAB_GACHA',
                completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
        });
    } catch { }

    // C1: Pull gacha
    console.log('  --- C1: Pull gacha ---');
    const r1 = await sendWebhook('กาชา');
    await wait(4000);
    assert(r1.status === 200, 'Gacha pull → 200');

    // Check collection (gacha records in practiceSession)
    const pullCount = await prisma.practiceSession.count({
        where: { userId: user.id, activityType: 'VOCAB_GACHA' },
    });
    assert(pullCount >= 1, `Gacha pulls recorded: ${pullCount}`);
}

// D. Daily Vocab
async function testDailyVocab() {
    console.log('\n📖 D. Daily Vocab Tests');
    await resetGameState();

    // Reset daily vocab for today (uses practiceSession with activityType='DAILY_VOCAB')
    const user = await getUser();
    try {
        await prisma.practiceSession.deleteMany({
            where: {
                userId: user.id,
                activityType: 'DAILY_VOCAB',
                completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
        });
    } catch { }

    const vocabCount = await prisma.dailyVocab.count();
    if (vocabCount === 0) {
        skip('No vocab in DB — skip daily vocab test');
        return;
    }

    // D1: Learn daily vocab
    console.log('  --- D1: Daily vocab ---');
    const r1 = await sendWebhook('คำศัพท์วันนี้');
    await wait(3000);
    assert(r1.status === 200, 'Daily vocab → 200');

    // D2: Try again → should say already learned
    console.log('  --- D2: Already learned ---');
    const r2 = await sendWebhook('คำศัพท์วันนี้');
    await wait(3000);
    assert(r2.status === 200, 'Daily vocab repeat → 200');
}

// E. Profile Edit
async function testProfileEdit() {
    console.log('\n👤 E. Profile Edit Tests');
    await resetGameState();

    // E1: Edit Thai name
    console.log('  --- E1: Edit Thai name ---');
    const r1 = await sendWebhook('แก้ไข:ชื่อไทย');
    await wait(3000);
    assert(r1.status === 200, 'Edit Thai name start → 200');

    let user = await getUser();
    assert(user?.currentGameType === 'editing:thaiName', `State = editing:thaiName (got: ${user?.currentGameType})`);

    const r1b = await sendWebhook('ทดสอบชื่อใหม่');
    await wait(5000);
    user = await getUser();
    assert(user?.thaiName === 'ทดสอบชื่อใหม่', `Thai name updated: "${user?.thaiName}"`);
    assert(user?.currentGameType === null, 'State cleared after edit');

    // E2: Edit Chinese name
    console.log('  --- E2: Edit Chinese name ---');
    const r2 = await sendWebhook('แก้ไข:ชื่อจีน');
    await wait(3000);
    const r2b = await sendWebhook('新测试名');
    await wait(5000);
    user = await getUser();
    assert(user?.chineseName === '新测试名', `Chinese name updated: "${user?.chineseName}"`);

    // E3: Edit email
    console.log('  --- E3: Edit email ---');
    const r3 = await sendWebhook('แก้ไข:อีเมล');
    await wait(3000);
    const r3b = await sendWebhook('newemail@test.com');
    await wait(5000);
    user = await getUser();
    assert(user?.email === 'newemail@test.com', `Email updated: "${user?.email}"`);

    // E4: Edit university
    console.log('  --- E4: Edit university ---');
    const r4 = await sendWebhook('แก้ไข:มหาวิทยาลัย');
    await wait(3000);
    const r4b = await sendWebhook('清华大学');
    await wait(5000);
    user = await getUser();
    assert(user?.university === '清华大学', `University updated: "${user?.university}"`);
}

// F. Leaderboard
async function testLeaderboard() {
    console.log('\n🏆 F. Leaderboard Tests');
    await resetGameState();

    // F1: View leaderboard
    console.log('  --- F1: View leaderboard ---');
    const r1 = await sendWebhook('อันดับ');
    await wait(3000);
    assert(r1.status === 200, 'Leaderboard → 200');

    // Check that user has points (from registration + spin + gacha)
    const user = await getUser();
    assert(user?.totalPoints >= 0, `User has points: ${user?.totalPoints}`);
}

// G. General Chat
async function testGeneralChat() {
    console.log('\n💬 G. General Chat Tests');
    await resetGameState();

    // G1: Send general message (should trigger AI response)
    console.log('  --- G1: General conversation ---');
    const r1 = await sendWebhook('สวัสดีครับ วันนี้อากาศดีไหม');
    await wait(8000); // AI takes time
    assert(r1.status === 200, 'General chat → 200');

    // Verify user state is still clear (no game started)
    const user = await getUser();
    assert(user?.currentGameType === null, 'No game started from general chat');
}

// H. Dashboard
async function testDashboard() {
    console.log('\n📊 H. Dashboard Tests');
    await resetGameState();

    // H1: View dashboard
    console.log('  --- H1: View dashboard ---');
    const r1 = await sendWebhook('แดชบอร์ด');
    await wait(3000);
    assert(r1.status === 200, 'Dashboard → 200');
}

// I. Menu
async function testMenu() {
    console.log('\n📋 I. Menu Tests');
    await resetGameState();

    // I1: View menu
    console.log('  --- I1: View menu ---');
    const r1 = await sendWebhook('เมนู');
    await wait(3000);
    assert(r1.status === 200, 'Menu → 200');
}

// ==================== CLEANUP ====================

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    try {
        const user = await getUser();
        if (user) {
            // Delete user (cascade will delete submissions, gacha pulls, etc.)
            await prisma.user.delete({ where: { id: user.id } });
            console.log('   ✅ Test user deleted');
        }
    } catch (err) {
        console.error('   ⚠️ Cleanup error:', err.message);
    }
}

// ==================== MAIN ====================

async function main() {
    console.log('='.repeat(60));
    console.log('  ProficienThAI Feature Test');
    console.log('  (Non-Game Features)');
    console.log('='.repeat(60));

    const startTime = Date.now();

    try {
        await setup();
        await testTaskSubmission();
        await testSpinWheel();
        await testGacha();
        await testDailyVocab();
        await testProfileEdit();
        await testLeaderboard();
        await testGeneralChat();
        await testDashboard();
        await testMenu();
    } catch (err) {
        console.error('\n💥 Fatal error:', err);
    } finally {
        await cleanup();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`  Time: ${elapsed}s`);
    console.log('='.repeat(60));

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main();
