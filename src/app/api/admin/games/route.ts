import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GAME_CONFIGS = [
    { id: 'chinese_vocab', name: 'Chinese-Thai Vocabulary', isEnabled: true, difficulty: 'medium', pointMultiplier: 1.0 },
    { id: 'fill_blank', name: 'Fill in the Blank', isEnabled: true, difficulty: 'medium', pointMultiplier: 1.0 },
    { id: 'word_order', name: 'Word Order', isEnabled: true, difficulty: 'medium', pointMultiplier: 1.0 },
    { id: 'sentence_construction', name: 'Sentence Construction', isEnabled: true, difficulty: 'hard', pointMultiplier: 1.5 },
]

export async function GET() {
    return NextResponse.json({ games: GAME_CONFIGS })
}

export async function PATCH() {
    return NextResponse.json({ success: true, message: 'Game config updated' })
}
