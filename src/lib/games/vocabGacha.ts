import prisma from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export interface GachaVocab {
    id: string;
    word: string;
    meaning: string;
    rarity: string;  // COMMON, RARE, EPIC, LEGENDARY
}

export interface GachaResult {
    vocab: GachaVocab;
    isNew: boolean;
    points: number;
}

// Rarity configuration
const RARITY_CONFIG = {
    COMMON: { chance: 0.60, points: 3, color: "#9E9E9E", emoji: "⚪" },
    RARE: { chance: 0.25, points: 5, color: "#2196F3", emoji: "🔵" },
    EPIC: { chance: 0.12, points: 10, color: "#9C27B0", emoji: "🟣" },
    LEGENDARY: { chance: 0.03, points: 20, color: "#FFD700", emoji: "🌟" },
};

/**
 * Get rarity based on random chance
 */
function getRandomRarity(): string {
    const rand = Math.random();
    let cumulative = 0;

    for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
        cumulative += config.chance;
        if (rand < cumulative) {
            return rarity;
        }
    }

    return "COMMON";
}

/**
 * Pull a random vocab from gacha
 */
export async function pullGacha(userId: string): Promise<GachaResult | null> {
    // Get random rarity
    const targetRarity = getRandomRarity();

    // Try to find a vocab with that rarity
    // Removed take limit for true randomization
    let vocabs = await prisma.gachaVocab.findMany({
        where: { rarity: targetRarity },
    });

    // Fallback to any rarity if none found
    if (vocabs.length === 0) {
        vocabs = await prisma.gachaVocab.findMany();
    }

    if (vocabs.length === 0) {
        return null;
    }

    // Pick random vocab
    const shuffled = shuffle(vocabs);
    const pulledVocab = shuffled[0];

    // Check if user already has this vocab
    const existing = await prisma.userVocabCollection.findUnique({
        where: {
            odUserId_word: {
                odUserId: userId,
                word: pulledVocab.word,
            },
        },
    });

    const isNew = !existing;
    const rarityConfig = RARITY_CONFIG[pulledVocab.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.COMMON;
    const points = isNew ? rarityConfig.points : Math.ceil(rarityConfig.points / 2);  // Half points for duplicates

    // Add to collection if new
    if (isNew) {
        await prisma.userVocabCollection.create({
            data: {
                odUserId: userId,
                word: pulledVocab.word,
                meaning: pulledVocab.meaning,
                rarity: pulledVocab.rarity,
            },
        });
    }

    // Award points (userId is internal user.id, not lineUserId)
    await prisma.user.update({
        where: { id: userId },
        data: {
            totalPoints: { increment: points },
        },
    });

    return {
        vocab: {
            id: pulledVocab.id,
            word: pulledVocab.word,
            meaning: pulledVocab.meaning,
            rarity: pulledVocab.rarity,
        },
        isNew,
        points,
    };
}

/**
 * Get user's vocab collection
 */
export async function getUserCollection(userId: string): Promise<{
    total: number;
    byRarity: Record<string, number>;
}> {
    const collection = await prisma.userVocabCollection.findMany({
        where: { odUserId: userId },
    });

    const byRarity: Record<string, number> = {
        COMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
    };

    for (const item of collection) {
        if (item.rarity in byRarity) {
            byRarity[item.rarity]++;
        }
    }

    return {
        total: collection.length,
        byRarity,
    };
}

/**
 * Check if user can pull (e.g., daily limit)
 */
export async function canPullGacha(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count pulls today
    const pullsToday = await prisma.practiceSession.count({
        where: {
            userId,
            activityType: "VOCAB_GACHA",
            completedAt: {
                gte: today,
            },
        },
    });

    // Allow 3 pulls per day
    return pullsToday < 3;
}

/**
 * Record gacha pull
 */
export async function recordGachaPull(userId: string, vocab: GachaVocab, points: number): Promise<void> {
    await prisma.practiceSession.create({
        data: {
            userId,
            activityType: "VOCAB_GACHA",
            questions: JSON.stringify([vocab.word]),
            answers: JSON.stringify([vocab.meaning]),
            correctCount: 1,
            totalCount: 1,
            pointsEarned: points,
        },
    });
}

/**
 * Format gacha result for LINE message
 */
export function formatGachaResult(result: GachaResult): string {
    const rarityConfig = RARITY_CONFIG[result.vocab.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.COMMON;
    const newTag = result.isNew ? "🆕 NEW!" : "📦 ซ้ำ";

    return `🎰 กาชาคำศัพท์!

${rarityConfig.emoji} ${result.vocab.rarity}

📝 คำว่า: "${result.vocab.word}"
📖 ความหมาย: ${result.vocab.meaning}

${newTag}
+${result.points} คะแนน!

━━━━━━━━━━━━━

พิมพ์ "กาชา" เพื่อสุ่มอีกครั้ง
พิมพ์ "คอลเลกชัน" เพื่อดูคำศัพท์ที่สะสม`;
}

/**
 * Format collection stats
 */
export function formatCollectionStats(stats: { total: number; byRarity: Record<string, number> }): string {
    return `📚 คอลเลกชันคำศัพท์ของคุณ

รวม: ${stats.total} คำ

${RARITY_CONFIG.LEGENDARY.emoji} Legendary: ${stats.byRarity.LEGENDARY}
${RARITY_CONFIG.EPIC.emoji} Epic: ${stats.byRarity.EPIC}
${RARITY_CONFIG.RARE.emoji} Rare: ${stats.byRarity.RARE}
${RARITY_CONFIG.COMMON.emoji} Common: ${stats.byRarity.COMMON}

พิมพ์ "กาชา" เพื่อสุ่มคำศัพท์ใหม่`;
}

/**
 * Format limit reached message
 */
export function formatLimitReached(): string {
    return `🎰 หมดโควต้ากาชาวันนี้แล้ว!

กลับมาสุ่มใหม่พรุ่งนี้นะครับ
(3 ครั้ง/วัน)

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`;
}
