const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const questions = await prisma.summarizeQuestion.findMany({ select: { id: true, keywords: true, passage: true, difficulty: true } });
    console.log('=== SummarizeQuestion (' + questions.length + ' total) ===');
    questions.forEach((q,i) => {
        console.log('#' + (i+1) + ' [' + q.difficulty + '] keywords:', JSON.stringify(q.keywords));
        console.log('   passage:', q.passage.substring(0, 80));
    });
    const user = await prisma.user.findFirst({ where: { lineUserId: 'U7433223088c3015ffa0533a4ac689557' }, select: { currentGameType: true, currentQuestionId: true, gameData: true, totalPoints: true, currentLevel: true } });
    console.log('\n=== User state ===');
    console.log(JSON.stringify(user, null, 2));
    if (user.gameData) {
        const gd = JSON.parse(user.gameData);
        console.log('gameData.keywords:', JSON.stringify(gd.keywords));
        console.log('gameData.passage:', (gd.passage || '').substring(0, 80));
    }

    // Also check ContinueStoryQuestion
    const storyQuestions = await prisma.continueStoryQuestion.findMany({ select: { id: true, keywords: true, storyStart: true, minLength: true, difficulty: true } });
    console.log('\n=== ContinueStoryQuestion (' + storyQuestions.length + ' total) ===');
    storyQuestions.forEach((q,i) => {
        console.log('#' + (i+1) + ' [' + q.difficulty + '] keywords:', JSON.stringify(q.keywords), 'minLength:', q.minLength);
        console.log('   storyStart:', q.storyStart.substring(0, 80));
    });

    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
