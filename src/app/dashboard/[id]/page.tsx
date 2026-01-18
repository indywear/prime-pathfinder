import prisma from '@/lib/db/prisma'
import { LEVEL_CONFIG, getLevelInfo, calculateProgress } from '@/lib/gamification'
import { notFound } from 'next/navigation'

interface DashboardProps {
    params: Promise<{ id: string }>
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
            practiceSessions: { select: { id: true } },
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
        where: {
            userId: id,
            submittedAt: { gte: thirtyDaysAgo },
        },
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
    })

    const recentPractice = await prisma.practiceSession.findMany({
        where: {
            userId: id,
            completedAt: { gte: thirtyDaysAgo },
        },
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
        where: {
            userId: id,
            submittedAt: { gte: thirtyDaysAgo },
        },
        select: { submittedAt: true },
        distinct: ['submittedAt'],
    })

    const activeDates = new Set(
        activityDays.map((a) => a.submittedAt.toISOString().split('T')[0])
    )

    const submissionCount = user.submissions.length
    const practiceCount = user.practiceSessions.length
    const badgeCount = user.badges.length

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold">{user.thaiName}</h1>
                    <p className="text-indigo-200 mt-1">{user.chineseName}</p>
                    <div className="flex items-center gap-4 mt-4">
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="text-2xl font-bold">Lv.{user.currentLevel}</span>
                            <span className="ml-2 text-sm">{levelInfo.title}</span>
                        </div>
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="text-2xl font-bold">{user.totalPoints}</span>
                            <span className="ml-2 text-sm">points</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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

                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">🏅 Badges</h2>
                    {user.badges.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                            {user.badges.map((userBadge) => (
                                <div
                                    key={`${userBadge.userId}-${userBadge.badgeId}`}
                                    className="flex flex-col items-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg"
                                >
                                    <span className="text-3xl">🏅</span>
                                    <p className="text-sm font-medium text-center mt-2">
                                        {userBadge.badge.nameThai}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {userBadge.badge.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            ยังไม่มี Badge เก็บสะสม Badge ด้วยการทำกิจกรรมต่างๆ นะ!
                        </p>
                    )}
                </div>

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
                                    <span
                                        className={`font-bold ${activity.points > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}
                                    >
                                        {activity.points > 0 ? '+' : ''}
                                        {activity.points} Points
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
