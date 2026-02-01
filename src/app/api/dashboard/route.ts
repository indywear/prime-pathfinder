import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getPointsForNextLevel, getProgressToNextLevel } from "@/lib/gamification/points";
import { updateStreak, getDailyChallenge } from "@/lib/gamification";

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic';

// GET /api/dashboard?userId=xxx
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lineUserId = searchParams.get("userId");

    if (!lineUserId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { lineUserId },
            include: {
                submissions: {
                    orderBy: { submittedAt: "desc" },
                    include: { task: true },
                },
                feedbackRequests: {
                    orderBy: { requestedAt: "desc" },
                    take: 5,
                },
                practiceSessions: {
                    orderBy: { completedAt: "desc" },
                    take: 10,
                },
                badges: {
                    include: { badge: true },
                },
                vocabularyProgress: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const totalTasks = await prisma.task.count();
        const activeTasks = await prisma.task.findMany({
            where: { isActive: true },
            orderBy: { weekNumber: "desc" },
        });

        // Calculate statistics
        const totalSubmissions = user.submissions.length;
        const onTimeSubmissions = user.submissions.filter((s) => s.onTime).length;
        const averageScore =
            totalSubmissions > 0
                ? Math.round(
                    user.submissions.reduce((sum, s) => sum + s.totalScore, 0) /
                    totalSubmissions
                )
                : 0;

        // Practice statistics
        const totalPractice = user.practiceSessions.length;
        const practiceCorrect = user.practiceSessions.reduce(
            (sum, p) => sum + p.correctCount,
            0
        );
        const practiceTotal = user.practiceSessions.reduce(
            (sum, p) => sum + p.totalCount,
            0
        );
        const practiceAccuracy =
            practiceTotal > 0 ? Math.round((practiceCorrect / practiceTotal) * 100) : 0;

        // Get streak and daily challenge
        const streakData = await updateStreak(user.id);
        const dailyChallenge = await getDailyChallenge(user.id);

        // Prepare response
        const dashboardData = {
            user: {
                id: user.id,
                thaiName: user.thaiName,
                chineseName: user.chineseName,
                level: user.currentLevel,
                totalPoints: user.totalPoints,
                progressToNextLevel: getProgressToNextLevel(
                    user.totalPoints,
                    user.currentLevel
                ),
                pointsToNextLevel:
                    getPointsForNextLevel(user.currentLevel) - user.totalPoints,
            },
            tasks: {
                total: totalTasks,
                completed: totalSubmissions,
                pending: totalTasks - totalSubmissions,
                activeTasks: activeTasks.map((t) => ({
                    id: t.id,
                    weekNumber: t.weekNumber,
                    title: t.title,
                    deadline: t.deadline,
                })),
            },
            submissions: {
                total: totalSubmissions,
                onTime: onTimeSubmissions,
                averageScore,
                recent: user.submissions.slice(0, 5).map((s) => ({
                    id: s.id,
                    taskTitle: s.task.title,
                    weekNumber: s.task.weekNumber,
                    score: s.totalScore,
                    onTime: s.onTime,
                    submittedAt: s.submittedAt,
                })),
            },
            practice: {
                totalSessions: totalPractice,
                accuracy: practiceAccuracy,
                vocabularyLearned: user.vocabularyProgress.length,
            },
            badges: user.badges.map((ub) => ({
                type: ub.badge.badgeType,
                name: ub.badge.name,
                nameThai: ub.badge.nameThai,
                earnedAt: ub.earnedAt,
            })),
            feedbackRequests: user.feedbackRequests.length,
            streak: streakData.streak,
            dailyChallenge: {
                id: dailyChallenge.challenge.id,
                title: dailyChallenge.challenge.title,
                description: dailyChallenge.challenge.description,
                target: dailyChallenge.challenge.target,
                progress: dailyChallenge.progress,
                reward: dailyChallenge.challenge.reward,
                completed: dailyChallenge.completed,
            },
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
