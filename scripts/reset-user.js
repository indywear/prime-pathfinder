const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { lineUserId: 'U7433223088c3015ffa0533a4ac689557' } });
    if (!user) { console.log('User not found'); return; }
    console.log('Before:', { gameType: user.currentGameType, questionId: user.currentQuestionId, points: user.totalPoints, level: user.currentLevel });
    await prisma.user.update({ where: { id: user.id }, data: { currentGameType: null, currentQuestionId: null, gameData: null } });
    console.log('Game state cleared!');
    await prisma.$disconnect();
}
main();
