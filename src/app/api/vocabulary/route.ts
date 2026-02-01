import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyAdminAuth, unauthorizedResponse } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/vocabulary - Get vocabulary list
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const difficulty = searchParams.get("difficulty");
    const limit = parseInt(searchParams.get("limit") || "50");
    const random = searchParams.get("random") === "true";

    try {
        const where = difficulty
            ? { difficulty: difficulty as "EASY" | "MEDIUM" | "HARD" }
            : undefined;

        if (random) {
            // Get random vocabulary
            const count = await prisma.vocabulary.count({ where });
            const skip = Math.floor(Math.random() * Math.max(0, count - limit));

            const vocabulary = await prisma.vocabulary.findMany({
                where,
                take: limit,
                skip,
            });

            return NextResponse.json(vocabulary);
        }

        const vocabulary = await prisma.vocabulary.findMany({
            where,
            take: limit,
            orderBy: { word: "asc" },
        });

        return NextResponse.json(vocabulary);
    } catch (error) {
        console.error("Vocabulary API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/vocabulary - Add vocabulary (admin only)
export async function POST(request: NextRequest) {
    if (!verifyAdminAuth(request)) {
        return unauthorizedResponse();
    }

    try {
        const body = await request.json();

        // Support single or batch insert
        if (Array.isArray(body)) {
            const vocabulary = await prisma.vocabulary.createMany({
                data: body.map((v) => ({
                    word: v.word,
                    meaning: v.meaning,
                    meaningChinese: v.meaningChinese,
                    exampleSentence: v.exampleSentence,
                    difficulty: v.difficulty || "MEDIUM",
                })),
                skipDuplicates: true,
            });

            return NextResponse.json({ count: vocabulary.count }, { status: 201 });
        }

        const { word, meaning, meaningChinese, exampleSentence, difficulty } = body;

        if (!word || !meaning) {
            return NextResponse.json(
                { error: "word and meaning are required" },
                { status: 400 }
            );
        }

        const vocabulary = await prisma.vocabulary.create({
            data: {
                word,
                meaning,
                meaningChinese,
                exampleSentence,
                difficulty: difficulty || "MEDIUM",
            },
        });

        return NextResponse.json(vocabulary, { status: 201 });
    } catch (error) {
        console.error("Create Vocabulary Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
