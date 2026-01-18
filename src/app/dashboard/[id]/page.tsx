import { prisma } from '@/lib/prisma'
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
            achievements: {
                include: { badge: true },
                orderBy: { earnedAt: 'desc' },
            },
            _count: {
                select: {
                    submissions: true,
                    feedbackRequests: true,
                    practiceSessions: true,
                },
            },
        },
    })

    if (!user) {
        notFound()
    }

    const levelInfo = getLevelInfo(user.currentLevel)
    const nextLevel = LEVEL_CONFIG.find((l) => l.level === user.currentLevel + 1)
    const progress = calculateProgress(user.currentXP, user.currentLevel)

    // Get recent activity
    const recentActivity = await prisma.pointLog.findMany({
        where: { userId: id },
        orderBy: { earnedAt: 'desc' },
        take: 10,
    })

    // Get streak calendar data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activityDays = await prisma.pointLog.findMany({
        where: {
            userId: id,
            earnedAt: { gte: thirtyDaysAgo },
        },
        select: { earnedAt: true },
        distinct: ['earnedAt'],
    })

    const activeDates = new Set(
        activityDays.map((a) => a.earnedAt.toISOString().split('T')[0])
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            {/* Header */}
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
                            <span className="text-2xl font-bold">🔥 {user.streak}</span>
                            <span className="ml-2 text-sm">day streak</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* XP Progress */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Progress to Level {user.currentLevel + 1}</span>
                        <span className="text-sm text-gray-500">
                            {user.currentXP} / {nextLevel?.xpRequired || 'MAX'} XP
                        </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        {nextLevel ? `${nextLevel.xpRequired - user.currentXP} XP until ${nextLevel.title}` : 'Max Level Reached! 🎉'}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-indigo-600">{user.totalPoints}</p>
                        <p className="text-sm text-gray-500">Total Points</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-green-600">{user._count.submissions}</p>
                        <p className="text-sm text-gray-500">Submissions</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-purple-600">{user._count.practiceSessions}</p>
                        <p className="text-sm text-gray-500">Practice Sessions</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-orange-600">{user.achievements.length}</p>
                        <p className="text-sm text-gray-500">Badges</p>
                    </div>
                </div>

                {/* Badges Showcase */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">🏅 Badges</h2>
                    {user.achievements.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                            {user.achievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className="flex flex-col items-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg"
                                >
                                    <span className="text-3xl">🏅</span>
                                    <p className="text-sm font-medium text-center mt-2">
                                        {achievement.badge.nameThai}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        +{achievement.badge.bonusXP} XP
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

                {/* Streak Calendar */}
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
                        {recentActivity.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                                <div>
                                    <p className="font-medium">{activity.description || activity.source}</p>
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
                                    {activity.points} XP
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
