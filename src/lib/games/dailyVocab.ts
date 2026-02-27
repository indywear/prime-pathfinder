import prisma from "@/lib/db/prisma";
import { addPoints } from "@/lib/gamification";
import { getBangkokStartOfDay } from "@/lib/utils/timezone";

export interface DailyVocabWord {
    id: string;
    word: string;
    meaning: string;
    example: string;
    forDate: Date;
}

/**
 * Get today's vocabulary word
 */
export async function getTodayVocab(): Promise<DailyVocabWord | null> {
    const today = getBangkokStartOfDay();

    const vocab = await prisma.dailyVocab.findFirst({
        where: {
            forDate: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        },
    });

    if (!vocab) {
        // Fallback: get random vocab
        const allVocabs = await prisma.dailyVocab.findMany();
        if (allVocabs.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * allVocabs.length);
        const randomVocab = allVocabs[randomIndex];
        return {
            id: randomVocab.id,
            word: randomVocab.word,
            meaning: randomVocab.meaning,
            example: randomVocab.example,
            forDate: randomVocab.forDate,
        };
    }

    return {
        id: vocab.id,
        word: vocab.word,
        meaning: vocab.meaning,
        example: vocab.example,
        forDate: vocab.forDate,
    };
}

/**
 * Check if user has learned today's vocab
 */
export async function hasLearnedToday(userId: string): Promise<boolean> {
    const today = getBangkokStartOfDay();

    const session = await prisma.practiceSession.findFirst({
        where: {
            userId,
            activityType: "DAILY_VOCAB",
            completedAt: {
                gte: today,
            },
        },
    });

    return session !== null;
}

/**
 * Record that user learned today's vocab
 */
export async function recordDailyVocabLearned(userId: string): Promise<void> {
    await prisma.practiceSession.create({
        data: {
            userId,
            activityType: "DAILY_VOCAB",
            questions: JSON.stringify([]),
            answers: JSON.stringify([]),
            correctCount: 1,
            totalCount: 1,
            pointsEarned: 5,
        },
    });

    // Award points through gamification system (handles level-ups, badges, etc.)
    await addPoints(userId, 5, 'DAILY_VOCAB');
}

/**
 * Format daily vocab for LINE message
 */
export function formatDailyVocab(vocab: DailyVocabWord): string {
    const dateStr = vocab.forDate.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return `📅 คำศัพท์วันนี้ (${dateStr})

📝 คำว่า: "${vocab.word}"

📖 ความหมาย: ${vocab.meaning}

💬 ตัวอย่าง: "${vocab.example}"

━━━━━━━━━━━━━

+5 คะแนน! มาเรียนคำศัพท์ทุกวันนะครับ`;
}

/**
 * Format already learned message
 */
export function formatAlreadyLearned(): string {
    return `📚 คุณได้เรียนคำศัพท์วันนี้แล้ว!

กลับมาเรียนคำใหม่พรุ่งนี้นะครับ

พิมพ์ "ฝึกฝน" เพื่อเล่นเกมอื่น`;
}
