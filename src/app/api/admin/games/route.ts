import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

// All 15 games with their Thai names and categories
const ALL_GAMES = [
    // Vocabulary Games (4)
    { gameType: 'VOCAB_MATCH', displayName: 'จับคู่คำ', category: 'คำศัพท์', difficulty: 1, pointMultiplier: 1.0 },
    { gameType: 'VOCAB_MEANING', displayName: 'ความหมายคำศัพท์', category: 'คำศัพท์', difficulty: 1, pointMultiplier: 1.0 },
    { gameType: 'VOCAB_OPPOSITE', displayName: 'คำตรงข้าม', category: 'คำศัพท์', difficulty: 1, pointMultiplier: 1.0 },
    { gameType: 'VOCAB_SYNONYM', displayName: 'คำพ้องความหมาย', category: 'คำศัพท์', difficulty: 1, pointMultiplier: 1.0 },
    // Grammar Games (4)
    { gameType: 'FILL_BLANK', displayName: 'เติมคำในช่องว่าง', category: 'ไวยากรณ์', difficulty: 1, pointMultiplier: 1.0 },
    { gameType: 'FIX_SENTENCE', displayName: 'แก้ไขประโยค', category: 'ไวยากรณ์', difficulty: 2, pointMultiplier: 1.2 },
    { gameType: 'ARRANGE_SENTENCE', displayName: 'เรียงประโยค', category: 'ไวยากรณ์', difficulty: 2, pointMultiplier: 1.2 },
    { gameType: 'SPEED_GRAMMAR', displayName: 'Speed Grammar', category: 'ไวยากรณ์', difficulty: 2, pointMultiplier: 1.5 },
    // Reading & Writing Games (4)
    { gameType: 'READ_ANSWER', displayName: 'อ่านแล้วตอบ', category: 'อ่าน-เขียน', difficulty: 2, pointMultiplier: 1.5 },
    { gameType: 'COMPOSE_SENTENCE', displayName: 'แต่งประโยค', category: 'อ่าน-เขียน', difficulty: 2, pointMultiplier: 1.5 },
    { gameType: 'SUMMARIZE', displayName: 'สรุปเรื่อง', category: 'อ่าน-เขียน', difficulty: 3, pointMultiplier: 2.0 },
    { gameType: 'CONTINUE_STORY', displayName: 'เขียนต่อเรื่อง', category: 'อ่าน-เขียน', difficulty: 3, pointMultiplier: 2.0 },
    // Fun Games (3)
    { gameType: 'DAILY_VOCAB', displayName: 'คำศัพท์รายวัน', category: 'Fun Games', difficulty: 1, pointMultiplier: 0.5 },
    { gameType: 'RACE_CLOCK', displayName: 'แข่งกับเวลา', category: 'Fun Games', difficulty: 2, pointMultiplier: 1.0 },
    { gameType: 'VOCAB_GACHA', displayName: 'กาชาคำศัพท์', category: 'Fun Games', difficulty: 1, pointMultiplier: 0.5 },
]

export async function GET() {
    try {
        // Get game configs from database or use defaults
        const dbConfigs = await prisma.systemConfig.findMany({
            where: {
                key: {
                    startsWith: 'game_enabled_'
                }
            }
        })

        // Create a map of enabled states from DB
        const enabledMap: Record<string, boolean> = {}
        dbConfigs.forEach(config => {
            const gameType = config.key.replace('game_enabled_', '')
            enabledMap[gameType] = config.value === 'true'
        })

        // Build response with all games
        const games = ALL_GAMES.map((game, index) => ({
            id: `game_${index + 1}`,
            gameType: game.gameType,
            displayName: game.displayName,
            category: game.category,
            isEnabled: enabledMap[game.gameType] !== undefined ? enabledMap[game.gameType] : true,
            difficulty: game.difficulty,
            pointMultiplier: game.pointMultiplier,
        }))

        return NextResponse.json({ games })
    } catch (error) {
        console.error('Games API Error:', error)
        // Return default games on error
        const games = ALL_GAMES.map((game, index) => ({
            id: `game_${index + 1}`,
            gameType: game.gameType,
            displayName: game.displayName,
            category: game.category,
            isEnabled: true,
            difficulty: game.difficulty,
            pointMultiplier: game.pointMultiplier,
        }))
        return NextResponse.json({ games })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { gameType, isEnabled } = body

        if (!gameType) {
            return NextResponse.json({ error: 'gameType is required' }, { status: 400 })
        }

        // Save to database
        await prisma.systemConfig.upsert({
            where: { key: `game_enabled_${gameType}` },
            update: { value: String(isEnabled) },
            create: { key: `game_enabled_${gameType}`, value: String(isEnabled) },
        })

        return NextResponse.json({ success: true, gameType, isEnabled })
    } catch (error) {
        console.error('Games PATCH Error:', error)
        return NextResponse.json({ error: 'Failed to update game config' }, { status: 500 })
    }
}
