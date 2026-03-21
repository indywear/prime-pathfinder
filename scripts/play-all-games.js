/**
 * Script to simulate playing ALL games through the LINE webhook
 * Sends real webhook events → bot processes → points are awarded
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient();

const WEBHOOK_URL = 'https://proficienthai-iota.vercel.app/api/line/webhook';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const USER_ID = 'U7433223088c3015ffa0533a4ac689557';
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'oo/bmBO2zDzz6xxKRCEvwV+Z5EMbwt39xohAbaTSvSdYciBbnwhxFDXLkQnW1aWbpl7oX3NoT0+lBdFt86De5cgDc611XHmb7oVOi/fNmkwenQGZp/3bXcJA6XxkGMsJ/jA+0e5glBhs+tOPjGHrMwdB04t89/1O/w1cDnyilFU=';

// Results tracker
const results = {};
let startPoints = 0;
let startLevel = 0;

// ==================== HELPERS ====================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpPost(url, data, headers) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers, 'Content-Length': Buffer.byteLength(body) },
        };
        const req = https.request(options, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function sendWebhook(text) {
    const ts = Date.now();
    const res = await httpPost(WEBHOOK_URL, {
        destination: 'test',
        events: [{
            type: 'message',
            message: { type: 'text', id: `sim-${ts}`, text },
            timestamp: ts,
            replyToken: `sim-token-${ts}`,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: `sim-${ts}`,
            deliveryContext: { isRedelivery: false },
            mode: 'active',
        }],
    });
    return res.status;
}

async function getUserState() {
    return prisma.user.findFirst({
        where: { lineUserId: USER_ID },
        select: {
            id: true, currentGameType: true, currentQuestionId: true,
            gameData: true, totalPoints: true, currentLevel: true,
        },
    });
}

async function sendLinePush(text) {
    try {
        await httpPost(LINE_PUSH_URL, {
            to: USER_ID,
            messages: [{ type: 'text', text }],
        }, { Authorization: `Bearer ${LINE_TOKEN}` });
    } catch (e) { console.error('Push failed:', e.message); }
}

function log(msg) { process.stdout.write(msg + '\n'); }

// ==================== GAME PLAYERS ====================

/**
 * Play a multiple-choice game (answer from gameData.correctAnswer)
 */
async function playMultipleChoiceGame(gameName, triggerKeyword, maxRounds) {
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        // Start game
        await sendWebhook(triggerKeyword);
        await sleep(2500);

        const state = await getUserState();
        if (!state.currentGameType) {
            log(`  Round ${i+1}: No game started (maybe no questions left)`);
            break;
        }

        let gameData = {};
        try { gameData = JSON.parse(state.gameData || '{}'); } catch {}

        const answer = gameData.correctAnswer;
        if (!answer) {
            log(`  Round ${i+1}: No correct answer found, skipping`);
            await sendWebhook('ยกเลิก');
            await sleep(1500);
            continue;
        }

        // Send correct answer (use Thai letter)
        const thaiAnswer = { A: 'ก', B: 'ข', C: 'ค', D: 'ง' }[answer] || answer;
        await sendWebhook(thaiAnswer);
        await sleep(2500);

        results[gameName].total++;
        // Check if state was cleared (= correct)
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT (${thaiAnswer})`);
        } else {
            log(`  Round ${i+1}: Still in game, sending reveal`);
            await sendWebhook('เฉลย');
            await sleep(1500);
            // Reset
            const still = await getUserState();
            if (still.currentGameType) {
                await sendWebhook('ยกเลิก');
                await sleep(1500);
            }
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play FILL_BLANK game (read correct answer from DB)
 */
async function playFillBlankGame(maxRounds) {
    const gameName = 'FILL_BLANK';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('เติมคำ');
        await sleep(2500);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        // Get correct answer from DB
        const question = await prisma.fillBlankQuestion.findUnique({
            where: { id: state.currentQuestionId }
        });

        if (!question) {
            log(`  Round ${i+1}: Question not found`);
            await sendWebhook('ยกเลิก');
            await sleep(1500);
            continue;
        }

        await sendWebhook(question.answer);
        await sleep(2500);

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT ("${question.answer}")`);
        } else {
            log(`  Round ${i+1}: Wrong, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play VOCAB_MEANING game (read meaning from DB)
 */
async function playVocabMeaningGame(maxRounds) {
    const gameName = 'VOCAB_MEANING';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('ความหมาย');
        await sleep(2500);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        let gameData = {};
        try { gameData = JSON.parse(state.gameData || '{}'); } catch {}

        const answer = gameData.correctAnswer;
        if (!answer) {
            log(`  Round ${i+1}: No answer found`);
            await sendWebhook('ยกเลิก');
            await sleep(1500);
            continue;
        }

        await sendWebhook(answer);
        await sleep(2500);

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT ("${answer}")`);
        } else {
            log(`  Round ${i+1}: Wrong, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play FIX_SENTENCE or ARRANGE_SENTENCE (answer from gameData.correctSentence)
 */
async function playSentenceGame(gameName, triggerKeyword, maxRounds) {
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook(triggerKeyword);
        await sleep(2500);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        let gameData = {};
        try { gameData = JSON.parse(state.gameData || '{}'); } catch {}

        const answer = gameData.correctSentence;
        if (!answer) {
            log(`  Round ${i+1}: No correct sentence found`);
            await sendWebhook('ยกเลิก');
            await sleep(1500);
            continue;
        }

        await sendWebhook(answer);
        await sleep(2500);

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT`);
        } else {
            log(`  Round ${i+1}: Wrong, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play SENTENCE_WRITING (compose sentence with both keywords)
 */
async function playSentenceWritingGame(maxRounds) {
    const gameName = 'SENTENCE_WRITING';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('เขียนประโยค');
        await sleep(3000);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        // Get the sentence pair
        const pair = await prisma.sentenceConstructionPair.findUnique({
            where: { id: state.currentQuestionId }
        });

        if (!pair) {
            log(`  Round ${i+1}: Pair not found`);
            await sendWebhook('ยกเลิก');
            await sleep(1500);
            continue;
        }

        // Compose a simple Thai sentence using both words
        const sentence = `ฉันชอบ${pair.word1}เพราะสามารถ${pair.word2}ได้ดีมากทุกวัน`;
        await sendWebhook(sentence);
        await sleep(4000); // AI evaluation takes longer

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT ("${sentence.substring(0,40)}...")`);
        } else {
            log(`  Round ${i+1}: AI rejected, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play SUMMARIZE game (include keywords in summary)
 */
async function playSummarizeGame(maxRounds) {
    const gameName = 'SUMMARIZE';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('สรุปเรื่อง');
        await sleep(3000);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        let gameData = {};
        try { gameData = JSON.parse(state.gameData || '{}'); } catch {}

        // Build summary with all keywords
        const keywords = (gameData.keywords || '').split('|').filter(k => k.trim());
        const summary = `เรื่องนี้เกี่ยวกับ${keywords.join('และ')} ซึ่งเป็นเรื่องที่สำคัญมาก สรุปได้ว่า${keywords.join(' ')}เป็นสิ่งที่ต้องให้ความสนใจ`;

        await sendWebhook(summary);
        await sleep(4000);

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT/PARTIAL`);
        } else {
            log(`  Round ${i+1}: Rejected, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play CONTINUE_STORY game (include keywords and min length)
 */
async function playContinueStoryGame(maxRounds) {
    const gameName = 'CONTINUE_STORY';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('เขียนต่อ');
        await sleep(3000);

        const state = await getUserState();
        if (!state.currentGameType) { log(`  Round ${i+1}: No game started`); break; }

        let gameData = {};
        try { gameData = JSON.parse(state.gameData || '{}'); } catch {}

        const keywords = (gameData.keywords || '').split('|').filter(k => k.trim());
        const minLen = gameData.minLength || 50;

        // Write a continuation that's long enough and includes keywords
        let continuation = `หลังจากนั้น `;
        keywords.forEach((kw, idx) => {
            continuation += `${kw}ก็ได้ทำสิ่งที่น่าสนใจ `;
            if (idx < keywords.length - 1) continuation += 'และ';
        });
        continuation += 'ทำให้เรื่องราวดำเนินต่อไปอย่างน่าตื่นเต้น เหตุการณ์ที่เกิดขึ้นทำให้ทุกคนประหลาดใจมาก';

        // Ensure minimum length
        while (continuation.length < minLen + 20) {
            continuation += ' ซึ่งเป็นเรื่องที่น่าจดจำมาก';
        }

        await sendWebhook(continuation);
        await sleep(4000);

        results[gameName].total++;
        const after = await getUserState();
        if (!after.currentGameType) {
            results[gameName].correct++;
            log(`  Round ${i+1}: CORRECT/PARTIAL`);
        } else {
            log(`  Round ${i+1}: Rejected, revealing`);
            await sendWebhook('เฉลย');
            await sleep(1500);
        }
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].correct}/${results[gameName].total} correct, +${results[gameName].points} pts`);
}

/**
 * Play DAILY_VOCAB (auto-completes)
 */
async function playDailyVocab() {
    const gameName = 'DAILY_VOCAB';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    await sendWebhook('คำศัพท์วันนี้');
    await sleep(3000);
    results[gameName].total = 1;
    results[gameName].correct = 1;

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: +${results[gameName].points} pts`);
}

/**
 * Play VOCAB_GACHA (auto-completes)
 */
async function playVocabGacha(maxRounds) {
    const gameName = 'VOCAB_GACHA';
    log(`\n=== ${gameName} ===`);
    results[gameName] = { correct: 0, total: 0, points: 0 };
    const beforePts = (await getUserState()).totalPoints;

    for (let i = 0; i < maxRounds; i++) {
        await sendWebhook('กาชา');
        await sleep(3000);
        results[gameName].total++;
        results[gameName].correct++;
        log(`  Pull ${i+1}: done`);
    }

    const afterPts = (await getUserState()).totalPoints;
    results[gameName].points = afterPts - beforePts;
    log(`  Result: ${results[gameName].total} pulls, +${results[gameName].points} pts`);
}

// ==================== MAIN ====================

async function main() {
    log('============================================');
    log('  ProficienThAI - Play All Games Simulator');
    log('============================================');

    // Get starting state
    const start = await getUserState();
    startPoints = start.totalPoints;
    startLevel = start.currentLevel;
    log(`\nStarting: Level ${startLevel}, ${startPoints} pts`);

    // Clear any existing game state
    await prisma.user.update({
        where: { id: start.id },
        data: { currentGameType: null, currentQuestionId: null, gameData: null },
    });

    // ===== VOCABULARY GAMES =====
    await playMultipleChoiceGame('VOCAB_MATCH', 'จับคู่คำ', 10);
    await playVocabMeaningGame(10);
    await playMultipleChoiceGame('VOCAB_OPPOSITE', 'คำตรงข้าม', 10);
    await playMultipleChoiceGame('VOCAB_SYNONYM', 'คำพ้อง', 10);

    // ===== GRAMMAR GAMES =====
    await playFillBlankGame(10);
    await playSentenceGame('FIX_SENTENCE', 'แก้ประโยค', 10);
    await playSentenceGame('ARRANGE_SENTENCE', 'เรียงประโยค', 10);
    await playMultipleChoiceGame('SPEED_GRAMMAR', 'speed grammar', 10);

    // ===== READING & WRITING GAMES =====
    await playMultipleChoiceGame('READ_ANSWER', 'อ่านตอบ', 10);
    await playSentenceWritingGame(10);
    await playSummarizeGame(10);
    await playContinueStoryGame(10);

    // ===== FUN GAMES =====
    await playMultipleChoiceGame('RACE_CLOCK', 'แข่งเวลา', 10);
    await playDailyVocab();
    await playVocabGacha(5);

    // ===== SUMMARY =====
    const end = await getUserState();
    const totalPointsEarned = end.totalPoints - startPoints;
    const levelsGained = end.currentLevel - startLevel;

    log('\n============================================');
    log('  FINAL RESULTS');
    log('============================================');

    let summaryText = '=== Game Test Results ===\n';
    let totalCorrect = 0, totalQuestions = 0;

    for (const [game, r] of Object.entries(results)) {
        summaryText += `${game}: ${r.correct}/${r.total} (+${r.points}pts)\n`;
        totalCorrect += r.correct;
        totalQuestions += r.total;
    }

    summaryText += `\nTotal: ${totalCorrect}/${totalQuestions}`;
    summaryText += `\nPoints: ${startPoints} -> ${end.totalPoints} (+${totalPointsEarned})`;
    summaryText += `\nLevel: ${startLevel} -> ${end.currentLevel}`;
    if (levelsGained > 0) summaryText += ` (+${levelsGained} levels!)`;

    log(summaryText);

    // Send summary to LINE
    await sendLinePush(summaryText);
    log('\nSummary sent to LINE!');

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('FATAL:', e);
    prisma.$disconnect();
    process.exit(1);
});
