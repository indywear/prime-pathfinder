import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GAME_TYPES } from '@/lib/games/engine'

export async function GET() {
    try {
        // Get all game configs from DB
        const configs = await prisma.gameConfig.findMany()

        // Create a map for quick lookup
        const configMap = new Map(configs.map(c => [c.gameType, c]))

        // Build response with all games from GAME_TYPES
        const games = Object.entries(GAME_TYPES).map(([key, gameInfo]) => {
            const dbConfig = configMap.get(key)

            return {
                id: dbConfig?.id || key,
                gameType: key,
                displayName: gameInfo.name,
                isEnabled: dbConfig?.isEnabled ?? true, // Default to enabled
                difficulty: dbConfig?.difficulty || gameInfo.difficulty,
                pointMultiplier: dbConfig?.pointMultiplier || 1.0
            }
        })

        return NextResponse.json({ games })
    } catch (error) {
        console.error('Admin games GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const { gameType, isEnabled, difficulty, pointMultiplier } = await request.json()

        if (!gameType) {
            return NextResponse.json({ error: 'gameType required' }, { status: 400 })
        }

        // Upsert game config
        const gameInfo = GAME_TYPES[gameType as keyof typeof GAME_TYPES]
        if (!gameInfo) {
            return NextResponse.json({ error: 'Invalid game type' }, { status: 400 })
        }

        const updated = await prisma.gameConfig.upsert({
            where: { gameType },
            update: {
                ...(typeof isEnabled === 'boolean' && { isEnabled }),
                ...(difficulty && { difficulty }),
                ...(pointMultiplier && { pointMultiplier })
            },
            create: {
                gameType,
                displayName: gameInfo.name,
                isEnabled: isEnabled ?? true,
                difficulty: difficulty || gameInfo.difficulty,
                pointMultiplier: pointMultiplier || 1.0
            }
        })

        return NextResponse.json({ success: true, config: updated })
    } catch (error) {
        console.error('Admin games PATCH error:', error)
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
    }
}
