import prisma from '@/lib/db/prisma'
import { notFound } from 'next/navigation'

export default async function AdminUserDetail({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            submissions: { orderBy: { submittedAt: 'desc' }, take: 10, include: { task: true } },
            badges: { include: { badge: true } },
            feedbackRequests: { orderBy: { requestedAt: 'desc' }, take: 10 },
        },
    })

    if (!user) {
        notFound()
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{user.thaiName || 'Unnamed User'}</h1>
                    <p className="mt-1 text-gray-600">Line ID: {user.lineUserId}</p>
                </div>
                <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-medium">
                    Level {user.currentLevel}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">Personal Info</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Chinese Name</span>
                            <span className="font-medium">{user.chineseName || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Student ID</span>
                            <span className="font-medium">{user.studentId || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">University</span>
                            <span className="font-medium">{user.university || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Email</span>
                            <span className="font-medium">{user.email || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Nationality</span>
                            <span className="font-medium">{user.nationality || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">Performance</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Points</span>
                            <span className="font-medium text-green-600">{user.totalPoints} pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Current Level</span>
                            <span className="font-medium">Lvl {user.currentLevel}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Thai Level</span>
                            <span className="font-medium">{user.thaiLevel}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Registered</span>
                            <span className="font-medium">{user.isRegistered ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">Badges ({user.badges.length})</h3>
                    <div className="flex flex-wrap gap-2">
                        {user.badges.map((ub) => (
                            <span
                                key={ub.badgeId}
                                className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-200"
                                title={ub.badge.description}
                            >
                                {ub.badge.nameThai}
                            </span>
                        ))}
                        {user.badges.length === 0 && (
                            <span className="text-gray-400 text-sm">No badges yet</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Task</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Submitted</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Score</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {user.submissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {sub.task.title}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(sub.submittedAt).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                                        {sub.totalScore}/100
                                    </td>
                                    <td className="px-6 py-4">
                                        {sub.onTime ? (
                                            <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded">On Time</span>
                                        ) : (
                                            <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded">Late</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {user.submissions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No submissions yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Feedback Requests</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {user.feedbackRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                                        {req.draftContent.substring(0, 100)}...
                                    </p>
                                    <p className="text-xs text-gray-500">{new Date(req.requestedAt).toLocaleString('th-TH')}</p>
                                </div>
                                <span className="font-medium text-green-600">
                                    +{req.pointsEarned} pts
                                </span>
                            </div>
                        ))}
                        {user.feedbackRequests.length === 0 && (
                            <p className="text-gray-500 text-center">No feedback requests yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
