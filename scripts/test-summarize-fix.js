const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function httpPost(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const urlObj = new URL(url);
        const req = https.request({ hostname: urlObj.hostname, port: 443, path: urlObj.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d})); });
        req.on('error', reject); req.write(body); req.end();
    });
}
async function main() {
    const USER_ID = 'U7433223088c3015ffa0533a4ac689557';

    // Reset user state
    const user = await prisma.user.findFirst({ where: { lineUserId: USER_ID } });
    await prisma.user.update({ where: { id: user.id }, data: { currentGameType: null, currentQuestionId: null, gameData: null } });
    console.log('User reset. Points:', user.totalPoints, 'Level:', user.currentLevel);

    // Start SUMMARIZE game
    const ts = Date.now();
    console.log('\n=== Starting SUMMARIZE game ===');
    await httpPost('https://proficienthai.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'sf-'+ts, text: 'สรุปเรื่อง' },
            timestamp: ts, replyToken: 'sf-token-'+ts,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'sf-'+ts, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    await sleep(4000);

    const state = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, currentQuestionId: true, gameData: true, totalPoints: true } });

    console.log('Game type:', state.currentGameType);
    if (state.currentGameType !== 'SUMMARIZE') {
        console.log('Game did not start!');
        await prisma.$disconnect();
        return;
    }

    const gd = JSON.parse(state.gameData || '{}');
    console.log('Keywords:', gd.keywords);
    console.log('Passage:', (gd.passage || '').substring(0, 80));

    // Build a summary that contains the keywords
    const keywords = gd.keywords.split('|').map(k => k.trim());
    console.log('Keywords array:', keywords);

    // Use the sample summary as base (this should definitely pass)
    const goodSummary = gd.sampleSummary || 'ฝนตกหนักทำให้น้ำท่วมบนถนนหลายสาย ส่งผลให้รถติดและโรงเรียนต้องหยุดเรียน ชาวบ้านต้องขนของหนีน้ำ';
    console.log('\nSending summary:', goodSummary);

    // Check which keywords are in the summary
    for (const kw of keywords) {
        console.log(`  keyword "${kw}":`, goodSummary.includes(kw) ? 'FOUND' : 'MISSING');
    }

    const ts2 = Date.now();
    const res = await httpPost('https://proficienthai.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'asf-'+ts2, text: goodSummary },
            timestamp: ts2, replyToken: 'asf-token-'+ts2,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'asf-'+ts2, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    console.log('Webhook response:', res.status);

    // Wait longer for AI evaluation
    console.log('Waiting 8 seconds for AI evaluation...');
    await sleep(8000);

    const final = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, totalPoints: true, currentLevel: true } });

    const earned = final.totalPoints - state.totalPoints;
    const accepted = final.currentGameType === null;
    console.log('\n=== RESULT ===');
    console.log('Game state cleared:', accepted);
    console.log('Result:', accepted ? 'ACCEPTED' : 'REJECTED (still in game)');
    console.log('Points:', state.totalPoints, '->', final.totalPoints, '(+' + earned + ')');
    console.log('Level:', final.currentLevel);

    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
