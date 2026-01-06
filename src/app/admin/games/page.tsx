import { prisma } from '@/lib/prisma'
import { GAME_TYPES } from '@/lib/games/engine'

export default async function AdminGames() {
    const gameConfigs = await prisma.gameConfig.findMany({
        orderBy: { pointMultiplier: 'desc' },
    })

    const gameSessions = await prisma.gameSession.findMany({
        take: 50,
        orderBy: { startedAt: 'desc' },
        include: { user: true },
    })

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Game Management</h1>
                <p className="mt-2 text-gray-600">Configure games and monitor sessions</p>
            </div>

            {/* Game Configs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Game Configurations</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Game Type</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Display Name</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Difficulty</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">Multiplier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {Object.entries(GAME_TYPES).map(([key, config]) => (
                                <tr key={key} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{key}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{config.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">Level {config.difficulty}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">x1.0</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Game Sessions</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {gameSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{session.user.thaiName}</p>
                                    <p className="text-sm text-gray-600">Played: {session.gameType}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-600">
                                        {session.pointsEarned > 0 ? `+${session.pointsEarned} XP` : '-'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(session.startedAt).toLocaleString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {gameSessions.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No game sessions yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
