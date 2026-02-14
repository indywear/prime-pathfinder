'use client'

import { useState, useEffect } from 'react'

interface GameConfig {
    id: string
    gameType: string
    displayName: string
    category: string
    isEnabled: boolean
    difficulty: number
    pointMultiplier: number
}

export default function AdminGamesClient() {
    const [games, setGames] = useState<GameConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        fetchGames()
    }, [])

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/admin/games')
            const data = await res.json()
            setGames(data.games || [])
        } catch (error) {
            console.error('Failed to fetch games:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleGame = async (gameType: string, currentState: boolean) => {
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch('/api/admin/games', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameType, isEnabled: !currentState })
            })

            if (res.ok) {
                setGames(games.map(g =>
                    g.gameType === gameType ? { ...g, isEnabled: !currentState } : g
                ))
                const game = games.find(g => g.gameType === gameType)
                setSuccess(`${game?.displayName || gameType} ${!currentState ? 'เปิด' : 'ปิด'}แล้ว`)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError('ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่')
                setTimeout(() => setError(null), 5000)
            }
        } catch (err) {
            console.error('Failed to toggle game:', err)
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่')
            setTimeout(() => setError(null), 5000)
        }
    }

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading...</div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Game Management</h1>
                <p className="mt-2 text-gray-600">เปิด/ปิดเกมแต่ละประเภท</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Game Configs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">เกมทั้งหมด</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">ชื่อเกม</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">ประเภท</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">ระดับความยาก</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">คูณแต้ม</th>
                                <th className="px-6 py-3 text-sm font-semibold text-gray-900">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {games.map((game) => (
                                <tr key={game.gameType} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                        {game.displayName}
                                        <div className="text-xs text-gray-400 font-mono">{game.gameType}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            game.category === 'คำศัพท์' ? 'bg-blue-100 text-blue-800' :
                                            game.category === 'ไวยากรณ์' ? 'bg-purple-100 text-purple-800' :
                                            game.category === 'อ่าน-เขียน' ? 'bg-orange-100 text-orange-800' :
                                            'bg-pink-100 text-pink-800'
                                        }`}>
                                            {game.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${game.difficulty === 1 ? 'bg-green-100 text-green-800' :
                                                game.difficulty === 2 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {game.difficulty === 1 ? 'ง่าย' : game.difficulty === 2 ? 'กลาง' : 'ยาก'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">x{game.pointMultiplier}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleGame(game.gameType, game.isEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${game.isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${game.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                        <span className={`ml-3 text-sm font-medium ${game.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                                            {game.isEnabled ? 'เปิด' : 'ปิด'}
                                        </span>
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
