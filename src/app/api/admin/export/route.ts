import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyAdminAuth, unauthorizedResponse } from "@/lib/auth";

export const dynamic = 'force-dynamic';

function anonymizeId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `USER_${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`;
}

export async function GET(request: NextRequest) {
    if (!verifyAdminAuth(request)) {
        return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get("type") || "users";
    const format = searchParams.get("format") || "json";

    try {
        let data: unknown;
        let filename: string;

        switch (dataType) {
            case "users":
                const users = await prisma.user.findMany({
                    select: {
                        id: true,
                        nationality: true,
                        thaiLevel: true,
                        totalPoints: true,
                        currentLevel: true,
                        isRegistered: true,
                        createdAt: true,
                        updatedAt: true,
                        _count: {
                            select: {
                                submissions: true,
                                feedbackRequests: true,
                                practiceSessions: true,
                                badges: true,
                            }
                        }
                    }
                });
                data = users.map(u => ({
                    anonymousId: anonymizeId(u.id),
                    nationality: u.nationality || 'Unknown',
                    thaiLevel: u.thaiLevel,
                    totalPoints: u.totalPoints,
                    currentLevel: u.currentLevel,
                    isRegistered: u.isRegistered,
                    submissionCount: u._count.submissions,
                    feedbackCount: u._count.feedbackRequests,
                    practiceCount: u._count.practiceSessions,
                    badgeCount: u._count.badges,
                    registeredAt: u.createdAt,
                    lastActiveAt: u.updatedAt,
                }));
                filename = `users_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case "submissions":
                const submissions = await prisma.submission.findMany({
                    include: {
                        task: { select: { weekNumber: true, title: true } },
                    },
                    orderBy: { submittedAt: 'desc' }
                });
                data = submissions.map(s => ({
                    anonymousUserId: anonymizeId(s.userId),
                    taskWeek: s.task.weekNumber,
                    taskTitle: s.task.title,
                    content: s.content,
                    wordCount: s.wordCount,
                    grammarScore: s.grammarScore,
                    vocabularyScore: s.vocabularyScore,
                    organizationScore: s.organizationScore,
                    taskFulfillmentScore: s.taskFulfillmentScore,
                    totalScore: s.totalScore,
                    aiFeedback: s.aiFeedback,
                    pointsEarned: s.pointsEarned,
                    onTime: s.onTime,
                    earlyBonus: s.earlyBonus,
                    submittedAt: s.submittedAt,
                }));
                filename = `submissions_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case "feedback":
                const feedbackRequests = await prisma.feedbackRequest.findMany({
                    include: {
                        task: { select: { weekNumber: true, title: true } },
                    },
                    orderBy: { requestedAt: 'desc' }
                });
                data = feedbackRequests.map(f => ({
                    anonymousUserId: anonymizeId(f.userId),
                    taskWeek: f.task?.weekNumber || null,
                    taskTitle: f.task?.title || 'Free Practice',
                    draftContent: f.draftContent,
                    aiFeedback: f.aiFeedback,
                    pointsEarned: f.pointsEarned,
                    isRevision: f.isRevision,
                    requestedAt: f.requestedAt,
                }));
                filename = `feedback_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case "practice":
                const practiceSessions = await prisma.practiceSession.findMany({
                    orderBy: { completedAt: 'desc' }
                });
                data = practiceSessions.map(p => ({
                    anonymousUserId: anonymizeId(p.userId),
                    activityType: p.activityType,
                    correctCount: p.correctCount,
                    totalCount: p.totalCount,
                    accuracy: p.totalCount > 0 ? Math.round((p.correctCount / p.totalCount) * 100) : 0,
                    pointsEarned: p.pointsEarned,
                    completedAt: p.completedAt,
                }));
                filename = `practice_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case "complete":
                const [allUsers, allSubmissions, allFeedback, allPractice] = await Promise.all([
                    prisma.user.findMany({
                        select: {
                            id: true,
                            nationality: true,
                            thaiLevel: true,
                            totalPoints: true,
                            currentLevel: true,
                            isRegistered: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    }),
                    prisma.submission.findMany({
                        include: { task: { select: { weekNumber: true, title: true } } }
                    }),
                    prisma.feedbackRequest.findMany({
                        include: { task: { select: { weekNumber: true, title: true } } }
                    }),
                    prisma.practiceSession.findMany(),
                ]);

                data = {
                    exportedAt: new Date().toISOString(),
                    users: allUsers.map(u => ({
                        anonymousId: anonymizeId(u.id),
                        nationality: u.nationality || 'Unknown',
                        thaiLevel: u.thaiLevel,
                        totalPoints: u.totalPoints,
                        currentLevel: u.currentLevel,
                        isRegistered: u.isRegistered,
                        registeredAt: u.createdAt,
                        lastActiveAt: u.updatedAt,
                    })),
                    submissions: allSubmissions.map(s => ({
                        anonymousUserId: anonymizeId(s.userId),
                        taskWeek: s.task.weekNumber,
                        content: s.content,
                        wordCount: s.wordCount,
                        grammarScore: s.grammarScore,
                        vocabularyScore: s.vocabularyScore,
                        organizationScore: s.organizationScore,
                        taskFulfillmentScore: s.taskFulfillmentScore,
                        totalScore: s.totalScore,
                        aiFeedback: s.aiFeedback,
                        onTime: s.onTime,
                        submittedAt: s.submittedAt,
                    })),
                    feedbackRequests: allFeedback.map(f => ({
                        anonymousUserId: anonymizeId(f.userId),
                        taskWeek: f.task?.weekNumber || null,
                        draftContent: f.draftContent,
                        aiFeedback: f.aiFeedback,
                        isRevision: f.isRevision,
                        requestedAt: f.requestedAt,
                    })),
                    practiceSessions: allPractice.map(p => ({
                        anonymousUserId: anonymizeId(p.userId),
                        activityType: p.activityType,
                        correctCount: p.correctCount,
                        totalCount: p.totalCount,
                        completedAt: p.completedAt,
                    })),
                };
                filename = `complete_dataset_${new Date().toISOString().split('T')[0]}`;
                break;

            default:
                return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
        }

        if (format === "csv" && Array.isArray(data)) {
            const csvContent = convertToCSV(data as Record<string, unknown>[]);
            return new NextResponse(csvContent, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}.csv"`,
                },
            });
        }

        return new NextResponse(JSON.stringify(data, null, 2), {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}.json"`,
            },
        });

    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}

function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "string") {
                return `"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
            }
            if (value instanceof Date) {
                return `"${value.toISOString()}"`;
            }
            return String(value);
        });
        csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
}
