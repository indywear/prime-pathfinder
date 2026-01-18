import prisma from '@/lib/db/prisma'

export default async function AdminDashboard() {
    const [userCount, taskCount, submissionCount, avgScore, activeToday] = await Promise.all([
        prisma.user.count(),
        prisma.task.count({ where: { isActive: true } }),
        prisma.submission.count(),
        prisma.submission.aggregate({ _avg: { totalScore: true } }),
        prisma.user.count({
            where: {
                updatedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
        }),
    ])

    const recentSubmissions = await prisma.submission.findMany({
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: {
            user: { select: { thaiName: true, nationality: true } },
            task: { select: { title: true } },
        },
    })

    const levelDistribution = await prisma.user.groupBy({
        by: ['currentLevel'],
        _count: { currentLevel: true },
        orderBy: { currentLevel: 'asc' },
    })

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="mt-2 text-gray-600">Research metrics and system status</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{userCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">👥</span>
                        </div>
                    </div>
                    <p className="text-sm text-green-600 mt-4">+{activeToday} active today</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{taskCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">📝</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{submissionCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Avg Score</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {avgScore._avg.totalScore?.toFixed(1) || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-between">
                            <span className="text-2xl">⭐</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {recentSubmissions.map((submission) => (
                            <div key={submission.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{submission.user.thaiName}</p>
                                    <p className="text-sm text-gray-600">{submission.task.title}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-indigo-600">{submission.totalScore}/100</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(submission.submittedAt).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Level Distribution</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-3">
                        {levelDistribution.map((level) => (
                            <div key={level.currentLevel} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-16">Level {level.currentLevel}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full flex items-center justify-end px-3 text-white text-sm font-medium"
                                        style={{
                                            width: `${(level._count.currentLevel / userCount) * 100}%`,
                                        }}
                                    >
                                        {level._count.currentLevel}
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 w-12 text-right">
                                    {((level._count.currentLevel / userCount) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
