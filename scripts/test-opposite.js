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
    const user = await prisma.user.findFirst({ where: { lineUserId: USER_ID } });
    await prisma.user.update({ where: { id: user.id }, data: { currentGameType: null, currentQuestionId: null, gameData: null } });

    const ts = Date.now();
    const res = await httpPost('https://proficienthai-iota.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'opp3-'+ts, text: 'คำตรงข้าม' },
            timestamp: ts, replyToken: 'opp3-token-'+ts,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'opp3-'+ts, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    console.log('Response:', res.status);
    await sleep(4000);

    const after = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, currentQuestionId: true, gameData: true, totalPoints: true } });

    if (after.currentGameType === 'VOCAB_OPPOSITE') {
        const gd = JSON.parse(after.gameData || '{}');
        console.log('VOCAB_OPPOSITE STARTED! correctAnswer:', gd.correctAnswer);

        const thaiAnswer = { A: 'ก', B: 'ข', C: 'ค', D: 'ง' }[gd.correctAnswer];
        const ts2 = Date.now();
        await httpPost('https://proficienthai-iota.vercel.app/api/line/webhook', {
            destination: 'test', events: [{
                type: 'message', message: { type: 'text', id: 'ans3-'+ts2, text: thaiAnswer },
                timestamp: ts2, replyToken: 'ans3-token-'+ts2,
                source: { type: 'user', userId: USER_ID },
                webhookEventId: 'ans3-'+ts2, deliveryContext: { isRedelivery: false }, mode: 'active',
            }]
        });
        await sleep(3000);

        const final = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
            select: { currentGameType: true, totalPoints: true, currentLevel: true } });
        const earned = final.totalPoints - after.totalPoints;
        console.log('Points:', after.totalPoints, '->', final.totalPoints, '(+' + earned + ')');
        console.log('Level:', final.currentLevel);
        console.log('Game cleared:', final.currentGameType === null);
    } else {
        console.log('FAILED - Game state:', JSON.stringify(after));
    }

    await prisma.$disconnect();
}
main();
