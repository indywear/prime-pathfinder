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

    // Start CONTINUE_STORY game
    const ts = Date.now();
    console.log('\n=== Starting CONTINUE_STORY game ===');
    await httpPost('https://proficienthai-iota.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'cs-'+ts, text: 'เขียนต่อ' },
            timestamp: ts, replyToken: 'cs-token-'+ts,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'cs-'+ts, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });
    await sleep(4000);

    const state = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, currentQuestionId: true, gameData: true, totalPoints: true } });

    console.log('Game type:', state.currentGameType);
    if (state.currentGameType !== 'CONTINUE_STORY') {
        console.log('Game did not start! State:', JSON.stringify(state));
        await prisma.$disconnect();
        return;
    }

    const gd = JSON.parse(state.gameData || '{}');
    console.log('Keywords:', gd.keywords);
    console.log('Story start:', (gd.storyStart || '').substring(0, 80));
    console.log('Min length:', gd.minLength);

    const keywords = gd.keywords.split('|').map(k => k.trim());

    // Build a good continuation using the keywords
    let continuation;
    if (keywords.includes('กระต่าย')) {
        continuation = 'เด็กหญิงวิ่งตามกระต่ายสีขาวเข้าไปในป่าลึก เธอพบถ้ำเล็กๆ ที่เต็มไปด้วยดอกไม้สวยงาม กระต่ายพาเธอผจญภัยไปยังดินแดนมหัศจรรย์ที่ไม่เคยมีใครเห็นมาก่อน';
    } else if (keywords.includes('หนังสือ')) {
        continuation = 'เด็กชายเปิดหนังสือเล่มนั้นอย่างตื่นเต้น เขาค้นพบว่าหนังสือเล่มนี้มีความลับของหมู่บ้าน ทุกหน้ามีแผนที่ลึกลับที่นำไปสู่สมบัติโบราณที่ซ่อนอยู่ในป่า';
    } else {
        continuation = keywords.map(k => `เรื่องนี้เกี่ยวกับ${k}`).join(' ') + ' เป็นเรื่องราวที่น่าสนใจมากเพราะมีเหตุการณ์มากมายเกิดขึ้นในชีวิตประจำวัน';
    }

    console.log('\nSending continuation:', continuation);
    console.log('Length:', continuation.length, '(min:', gd.minLength, ')');
    for (const kw of keywords) {
        console.log(`  keyword "${kw}":`, continuation.includes(kw) ? 'FOUND' : 'MISSING');
    }

    const ts2 = Date.now();
    await httpPost('https://proficienthai-iota.vercel.app/api/line/webhook', {
        destination: 'test', events: [{
            type: 'message', message: { type: 'text', id: 'acs-'+ts2, text: continuation },
            timestamp: ts2, replyToken: 'acs-token-'+ts2,
            source: { type: 'user', userId: USER_ID },
            webhookEventId: 'acs-'+ts2, deliveryContext: { isRedelivery: false }, mode: 'active',
        }]
    });

    console.log('Waiting 8 seconds for AI evaluation...');
    await sleep(8000);

    const final = await prisma.user.findFirst({ where: { lineUserId: USER_ID },
        select: { currentGameType: true, totalPoints: true, currentLevel: true } });

    const earned = final.totalPoints - state.totalPoints;
    const accepted = final.currentGameType === null;
    console.log('\n=== RESULT ===');
    console.log('Game state cleared:', accepted);
    console.log('Result:', accepted ? 'ACCEPTED' : 'REJECTED');
    console.log('Points:', state.totalPoints, '->', final.totalPoints, '(+' + earned + ')');
    console.log('Level:', final.currentLevel);

    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
