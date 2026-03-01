import prisma from "@/lib/db/prisma";

/**
 * Mapping gameType → skill category (5 หมวด)
 * vocabulary: คำศัพท์
 * grammar: ไวยากรณ์
 * reading: การอ่าน
 * writing: การเขียน
 * culture: วัฒนธรรม
 */
export const SKILL_CATEGORY_MAP: Record<string, string> = {
    // Vocabulary
    VOCAB_MATCH: "vocabulary",
    VOCAB_MEANING: "vocabulary",
    VOCAB_OPPOSITE: "vocabulary",
    VOCAB_SYNONYM: "vocabulary",
    DAILY_VOCAB: "vocabulary",
    VOCAB_GACHA: "vocabulary",

    // Grammar
    FILL_BLANK: "grammar",
    FIX_SENTENCE: "grammar",
    ARRANGE_SENTENCE: "grammar",
    SPEED_GRAMMAR: "grammar",
    RACE_CLOCK: "grammar",
    MULTIPLE_CHOICE: "grammar",

    // Reading
    READ_ANSWER: "reading",
    SUMMARIZE: "reading",

    // Writing
    COMPOSE_SENTENCE: "writing",
    SENTENCE_WRITING: "writing",
    CONTINUE_STORY: "writing",

    // Culture
    THAI_IDIOM: "culture",
    THAI_CULTURE: "culture",
};

/**
 * ชื่อหมวดภาษาไทย
 */
export const CATEGORY_NAMES: Record<string, string> = {
    vocabulary: "คำศัพท์",
    grammar: "ไวยากรณ์",
    reading: "การอ่าน",
    writing: "การเขียน",
    culture: "วัฒนธรรม",
};

/**
 * อัปเดต skill profile หลังจบเกม
 */
export async function updateSkillProfile(
    userId: string,
    gameType: string,
    correctCount: number,
    totalCount: number
): Promise<void> {
    const category = SKILL_CATEGORY_MAP[gameType];
    if (!category || totalCount === 0) return;

    const existing = await prisma.userSkillProfile.findUnique({
        where: { userId_category: { userId, category } },
    });

    if (existing) {
        const newTotal = existing.totalAttempts + totalCount;
        const newCorrect = existing.correctAttempts + correctCount;
        const newAccuracy = newTotal > 0 ? newCorrect / newTotal : 0;

        await prisma.userSkillProfile.update({
            where: { userId_category: { userId, category } },
            data: {
                totalAttempts: newTotal,
                correctAttempts: newCorrect,
                accuracy: newAccuracy,
                lastPracticedAt: new Date(),
            },
        });
    } else {
        const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
        await prisma.userSkillProfile.create({
            data: {
                userId,
                category,
                totalAttempts: totalCount,
                correctAttempts: correctCount,
                accuracy,
            },
        });
    }
}

/**
 * ดึง skill profile ทั้ง 5 หมวด
 */
export async function getSkillProfile(userId: string): Promise<{
    category: string;
    categoryName: string;
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    lastPracticedAt: Date | null;
}[]> {
    const profiles = await prisma.userSkillProfile.findMany({
        where: { userId },
        orderBy: { category: "asc" },
    });

    // สร้าง result ครบ 5 หมวด (รวมหมวดที่ยังไม่เคยเล่น)
    const allCategories = ["vocabulary", "grammar", "reading", "writing", "culture"];
    return allCategories.map((cat) => {
        const profile = profiles.find((p) => p.category === cat);
        return {
            category: cat,
            categoryName: CATEGORY_NAMES[cat] || cat,
            totalAttempts: profile?.totalAttempts ?? 0,
            correctAttempts: profile?.correctAttempts ?? 0,
            accuracy: profile?.accuracy ?? 0,
            lastPracticedAt: profile?.lastPracticedAt ?? null,
        };
    });
}

/**
 * หาหมวดที่อ่อนที่สุด (accuracy ต่ำสุด + เคยเล่นอย่างน้อย 5 ข้อ)
 */
export async function getWeakestCategory(userId: string): Promise<{
    category: string;
    categoryName: string;
    accuracy: number;
} | null> {
    const profiles = await prisma.userSkillProfile.findMany({
        where: { userId, totalAttempts: { gte: 5 } },
        orderBy: { accuracy: "asc" },
        take: 1,
    });

    if (profiles.length === 0) return null;

    const weakest = profiles[0];
    return {
        category: weakest.category,
        categoryName: CATEGORY_NAMES[weakest.category] || weakest.category,
        accuracy: weakest.accuracy,
    };
}
