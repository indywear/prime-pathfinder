import prisma from '@/lib/db/prisma'

export default async function AnalyticsPage() {
    const [
        totalUsers,
        activeUsers7days,
        totalSubmissions,
        avgScore,
        nationalityDistribution,
        levelDistribution,
        thaiLevelDistribution,
        recentSubmissions,
        topPerformers,
        feedbackCount,
        practiceCount,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: {
                updatedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        }),
        prisma.submission.count(),
        prisma.submission.aggregate({ _avg: { totalScore: true } }),
        prisma.user.groupBy({
            by: ['nationality'],
            _count: { nationality: true },
            orderBy: { _count: { nationality: 'desc' } },
        }),
        prisma.user.groupBy({
            by: ['currentLevel'],
            _count: { currentLevel: true },
            orderBy: { currentLevel: 'asc' },
        }),
        prisma.user.groupBy({
            by: ['thaiLevel'],
            _count: { thaiLevel: true },
        }),
        prisma.submission.findMany({
            take: 10,
            orderBy: { submittedAt: 'desc' },
            include: {
                user: { select: { thaiName: true } },
                task: { select: { title: true } },
            },
        }),
        prisma.user.findMany({
            take: 10,
            orderBy: { totalPoints: 'desc' },
            select: {
                id: true,
                thaiName: true,
                currentLevel: true,
                totalPoints: true,
                nationality: true,
                _count: { select: { submissions: true } },
            },
        }),
        prisma.feedbackRequest.count(),
        prisma.practiceSession.count(),
    ])

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Research Analytics</h1>
                <p className="mt-2 text-gray-600">Comprehensive learning metrics for research</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalUsers}</p>
                    <p className="text-sm text-green-600 mt-2">
                        {activeUsers7days} active (7 days)
                    </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Submissions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalSubmissions}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {(totalSubmissions / (totalUsers || 1)).toFixed(1)} per user
                    </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Avg Score</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {avgScore._avg.totalScore?.toFixed(1) || 0}/100
                    </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Engagement</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{feedbackCount}</p>
                    <p className="text-sm text-gray-500 mt-2">feedback requests</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Nationality Distribution</h2>
                    <div className="space-y-3">
                        {nationalityDistribution.map((item: { nationality: string | null; _count: { nationality: number } }) => (
                            <div key={item.nationality || 'unknown'} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-24">
                                    {item.nationality || 'Unknown'}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-full flex items-center justify-end px-3 text-white text-sm font-medium"
                                        style={{
                                            width: `${(item._count.nationality / totalUsers) * 100}%`,
                                        }}
                                    >
                                        {item._count.nationality}
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 w-12 text-right">
                                    {((item._count.nationality / totalUsers) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Level Distribution</h2>
                    <div className="space-y-3">
                        {levelDistribution.map((item: { currentLevel: number; _count: { currentLevel: number } }) => (
                            <div key={item.currentLevel} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-16">
                                    Level {item.currentLevel}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                                    <div
                                        className="bg-purple-600 h-full flex items-center justify-end px-3 text-white text-sm font-medium"
                                        style={{
                                            width: `${(item._count.currentLevel / totalUsers) * 100}%`,
                                        }}
                                    >
                                        {item._count.currentLevel}
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 w-12 text-right">
                                    {((item._count.currentLevel / totalUsers) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Initial Thai Level</h2>
                    <div className="space-y-3">
                        {thaiLevelDistribution.map((item: { thaiLevel: string; _count: { thaiLevel: number } }) => (
                            <div key={item.thaiLevel} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-32">
                                    {item.thaiLevel}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                                    <div
                                        className="bg-green-600 h-full flex items-center justify-end px-3 text-white text-sm font-medium"
                                        style={{
                                            width: `${(item._count.thaiLevel / totalUsers) * 100}%`,
                                        }}
                                    >
                                        {item._count.thaiLevel}
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 w-12 text-right">
                                    {((item._count.thaiLevel / totalUsers) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performers</h2>
                    <div className="space-y-3">
                        {topPerformers.map((user: { id: string; thaiName: string | null; nationality: string | null; currentLevel: number; totalPoints: number; _count: { submissions: number } }, index: number) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                    <div>
                                        <p className="font-medium text-gray-900">{user.thaiName}</p>
                                        <p className="text-xs text-gray-500">
                                            {user.nationality} - Level {user.currentLevel}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-600">{user.totalPoints}</p>
                                    <p className="text-xs text-gray-500">{user._count.submissions} submissions</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Submissions</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Student
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Task
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Score
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Submitted
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentSubmissions.map((submission: { id: string; user: { thaiName: string | null }; task: { title: string }; totalScore: number; submittedAt: Date }) => (
                                <tr key={submission.id}>
                                    <td className="px-4 py-3 text-sm">{submission.user.thaiName}</td>
                                    <td className="px-4 py-3 text-sm">{submission.task.title}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-indigo-600">{submission.totalScore}/100</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {new Date(submission.submittedAt).toLocaleDateString('th-TH')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
