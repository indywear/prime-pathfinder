import prisma from '@/lib/db/prisma'
import { LEVEL_CONFIG, getLevelInfo, calculateProgress, ACHIEVEMENT_TITLES } from '@/lib/gamification'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DashboardProps {
    params: Promise<{ id: string }>
}

const BADGE_EMOJI_MAP: Record<string, string> = {
    FIRST_GAME: '🌟',
    GAME_10: '🎮',
    GAME_50: '🏅',
    PERFECT_ROUND: '✨',
    FIRE_STREAK: '🔥',
    GRADUATE: '🎓',
    ANSWER_100: '💯',
}

const BADGE_REQUIREMENT: Record<string, number> = {
    FIRST_GAME: 1,
    GAME_10: 10,
    GAME_50: 50,
    PERFECT_ROUND: 1,
    FIRE_STREAK: 7,
    GRADUATE: 10,
    ANSWER_100: 100,
}

const BADGE_DESCRIPTION: Record<string, string> = {
    FIRST_GAME: 'เล่นเกมครบ 1 รอบ',
    GAME_10: 'เล่นเกมครบ 10 รอบ',
    GAME_50: 'เล่นเกมครบ 50 รอบ',
    PERFECT_ROUND: 'ตอบถูกทุกข้อใน 1 รอบ',
    FIRE_STREAK: 'เล่นต่อเนื่อง 7 วัน',
    GRADUATE: 'ส่งงาน 10 ชิ้น',
    ANSWER_100: 'ตอบถูก 100 ข้อ',
}

export default async function UserDashboard({ params }: DashboardProps) {
    const { id } = await params

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            badges: {
                include: { badge: true },
                orderBy: { earnedAt: 'desc' },
            },
            submissions: { select: { id: true } },
            practiceSessions: { select: { id: true, correctCount: true, totalCount: true } },
        },
    })

    if (!user) {
        notFound()
    }

    const levelInfo = getLevelInfo(user.currentLevel)
    const nextLevel = LEVEL_CONFIG.find((l) => l.level === user.currentLevel + 1)
    const progress = calculateProgress(user.totalPoints, user.currentLevel)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSubmissions = await prisma.submission.findMany({
        where: { userId: id, submittedAt: { gte: thirtyDaysAgo } },
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
    })

    const recentPractice = await prisma.practiceSession.findMany({
        where: { userId: id, completedAt: { gte: thirtyDaysAgo } },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 10,
    })

    const recentActivity = [
        ...recentSubmissions.map(s => ({
            id: `sub-${s.submittedAt.getTime()}`,
            description: 'ส่งงานเขียน',
            source: 'submission',
            earnedAt: s.submittedAt,
            points: 10,
        })),
        ...recentPractice.map(p => ({
            id: `prac-${p.completedAt?.getTime()}`,
            description: 'ฝึกฝนภาษา',
            source: 'practice',
            earnedAt: p.completedAt || new Date(),
            points: 5,
        })),
    ]
        .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())
        .slice(0, 10)

    const activityDays = await prisma.submission.findMany({
        where: { userId: id, submittedAt: { gte: thirtyDaysAgo } },
        select: { submittedAt: true },
        distinct: ['submittedAt'],
    })

    const activeDates = new Set(
        activityDays.map((a) => a.submittedAt.toISOString().split('T')[0])
    )

    const submissionCount = user.submissions.length
    const practiceCount = user.practiceSessions.length
    const badgeCount = user.badges.length

    // Total correct answers across all practice sessions
    const totalCorrect = user.practiceSessions.reduce((sum, s) => sum + (s.correctCount || 0), 0)

    // Earned badge types set
    const earnedBadgeTypes = new Set(user.badges.map(ub => ub.badge.badgeType))

    // Badge progress for unearned badges
    const badgeProgress = [
        { type: 'FIRST_GAME', current: practiceCount },
        { type: 'GAME_10', current: practiceCount },
        { type: 'GAME_50', current: practiceCount },
        { type: 'ANSWER_100', current: totalCorrect },
        { type: 'GRADUATE', current: submissionCount },
    ]
        .filter(b => !earnedBadgeTypes.has(b.type))
        .map(b => ({
            type: b.type,
            emoji: BADGE_EMOJI_MAP[b.type] || '🏅',
            description: BADGE_DESCRIPTION[b.type] || '',
            current: b.current,
            required: BADGE_REQUIREMENT[b.type] || 1,
        }))
        .filter(b => b.current < b.required)
        .slice(0, 3)

    // Achievement title from gameplay (ฉายา)
    const achievementTitle = user.title
        ? ACHIEVEMENT_TITLES.find(t => t.title === user.title)
        : null

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold">{user.thaiName}</h1>
                    <p className="text-indigo-200 mt-1">{user.chineseName}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="text-2xl font-bold">Lv.{user.currentLevel}</span>
                            <span className="ml-2 text-sm">{levelInfo.title}</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="text-2xl font-bold">{user.totalPoints}</span>
                            <span className="ml-2 text-sm">points</span>
                        </div>
                        {achievementTitle && (
                            <div className="bg-yellow-400/30 border border-yellow-300/50 rounded-lg px-4 py-2">
                                <span className="text-lg">{achievementTitle.emoji}</span>
                                <span className="ml-2 text-sm font-semibold">ฉายา: {achievementTitle.title}</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Level Progress */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Progress to Level {user.currentLevel + 1}</span>
                        <span className="text-sm text-gray-500">
                            {user.totalPoints} / {nextLevel?.xpRequired || 'MAX'} Points
                        </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        {nextLevel ? `${nextLevel.xpRequired - user.totalPoints} Points until ${nextLevel.title}` : 'Max Level Reached! 🎉'}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-indigo-600">{user.totalPoints}</p>
                        <p className="text-sm text-gray-500">Total Points</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-green-600">{submissionCount}</p>
                        <p className="text-sm text-gray-500">Submissions</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-purple-600">{practiceCount}</p>
                        <p className="text-sm text-gray-500">Practice Sessions</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-orange-600">{badgeCount}</p>
                        <p className="text-sm text-gray-500">Badges</p>
                    </div>
                </div>

                {/* Achievement Title Section */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">🏅 ฉายา (Achievement Title)</h2>
                    {achievementTitle ? (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                            <span className="text-5xl">{achievementTitle.emoji}</span>
                            <div>
                                <p className="text-xl font-bold text-orange-800">{achievementTitle.title}</p>
                                <p className="text-sm text-orange-600 mt-1">{achievementTitle.description}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400">
                            <p className="text-4xl mb-2">🎮</p>
                            <p className="font-medium text-gray-600">ยังไม่มีฉายา</p>
                            <p className="text-sm mt-1">เล่นเกมสะสมรอบเพื่อรับฉายาพิเศษ!</p>
                        </div>
                    )}
                </div>

                {/* Badges Section */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">🎖️ Badges</h2>
                    {user.badges.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                            {user.badges.map((userBadge) => (
                                <div
                                    key={`${userBadge.userId}-${userBadge.badgeId}`}
                                    className="flex flex-col items-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-100"
                                >
                                    <span className="text-3xl">{BADGE_EMOJI_MAP[userBadge.badge.badgeType] || '🏅'}</span>
                                    <p className="text-sm font-medium text-center mt-2 text-orange-800">
                                        {userBadge.badge.nameThai}
                                    </p>
                                    <p className="text-xs text-gray-400 text-center mt-1">
                                        {userBadge.badge.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4 mb-4">
                            ยังไม่มี Badge — เก็บสะสมด้วยการทำกิจกรรมต่างๆ!
                        </p>
                    )}

                    {/* Badge Progress */}
                    {badgeProgress.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-gray-600 mb-3">🎯 Badge ที่กำลังสะสม</p>
                            <div className="space-y-3">
                                {badgeProgress.map(b => {
                                    const pct = Math.min(100, Math.round((b.current / b.required) * 100))
                                    return (
                                        <div key={b.type}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm text-gray-700">
                                                    {b.emoji} {b.description}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {b.current}/{b.required}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity Calendar */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">📅 Activity Calendar (30 days)</h2>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 30 }).map((_, i) => {
                            const date = new Date()
                            date.setDate(date.getDate() - (29 - i))
                            const dateStr = date.toISOString().split('T')[0]
                            const isActive = activeDates.has(dateStr)

                            return (
                                <div
                                    key={i}
                                    className={`aspect-square rounded-md flex items-center justify-center text-xs ${isActive
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-400'
                                        }`}
                                    title={dateStr}
                                >
                                    {date.getDate()}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">⚡ Recent Activity</h2>
                    <div className="space-y-3">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                                >
                                    <div>
                                        <p className="font-medium">{activity.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(activity.earnedAt).toLocaleDateString('th-TH', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <span className={`font-bold ${activity.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {activity.points > 0 ? '+' : ''}{activity.points} Points
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">ยังไม่มีกิจกรรม</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
