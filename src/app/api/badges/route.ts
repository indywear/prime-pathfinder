import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { BADGE_TYPES } from "@/lib/gamification/points";
import { verifyAdminAuth, unauthorizedResponse } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/badges - Get all badge types
export async function GET() {
    try {
        const badges = await prisma.badge.findMany({
            orderBy: { requirement: "asc" },
        });

        return NextResponse.json(badges);
    } catch (error) {
        console.error("Badges API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/badges/seed - Seed default badges (admin only)
export async function POST(request: NextRequest) {
    if (!verifyAdminAuth(request)) {
        return unauthorizedResponse();
    }

    try {
        const badges = Object.values(BADGE_TYPES);

        await prisma.badge.createMany({
            data: badges.map((b) => ({
                badgeType: b.type,
                name: b.name,
                nameThai: b.nameThai,
                description: b.description,
                requirement: b.requirement,
            })),
            skipDuplicates: true,
        });

        const allBadges = await prisma.badge.findMany();
        return NextResponse.json(allBadges);
    } catch (error) {
        console.error("Seed Badges Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
