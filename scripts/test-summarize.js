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

    // Start SUMMARIZE
    const ts = Date.now();
    await httpPost('https://proficienthai.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'sum-'+ts, text: 'สรุปเรื่อง' },
            timestamp: ts, replyToken: 'sum-token-'+ts,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'sum-'+ts, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    await sleep(4000);

    const state = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, currentQuestionId: true, gameData: true, totalPoints: true } });

    console.log('Game type:', state.currentGameType);
    if (!state.currentGameType) {
        console.log('Game did not start!');
        await prisma.$disconnect();
        return;
    }

    const gd = JSON.parse(state.gameData || '{}');
    console.log('Keywords:', gd.keywords);
    console.log('Passage preview:', (gd.passage || '').substring(0, 80));

    // Send a GOOD summary that matches the sample
    const goodSummary = 'ฝนตกหนักทำให้น้ำท่วมบนถนนหลายสาย ส่งผลให้รถติดและโรงเรียนต้องหยุดเรียน ชาวบ้านต้องขนของหนีน้ำ';

    console.log('Sending summary:', goodSummary);

    const ts2 = Date.now();
    await httpPost('https://proficienthai.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'ans-sum-'+ts2, text: goodSummary },
            timestamp: ts2, replyToken: 'ans-sum-token-'+ts2,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'ans-sum-'+ts2, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    await sleep(5000);

    const final = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, totalPoints: true, currentLevel: true } });

    const earned = final.totalPoints - state.totalPoints;
    console.log('Result:', final.currentGameType ? 'REJECTED' : 'ACCEPTED');
    console.log('Points:', state.totalPoints, '->', final.totalPoints, '(+' + earned + ')');
    console.log('Level:', final.currentLevel);

    await prisma.$disconnect();
}
main();
