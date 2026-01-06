'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLookup() {
    const [query, setQuery] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Call API to lookup user
            const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(query)}`)
            const data = await res.json()

            if (data.userId) {
                router.push(`/dashboard/${data.userId}`)
            } else {
                setError('ไม่พบผู้ใช้ กรุณาตรวจสอบรหัสนักศึกษาหรืออีเมลอีกครั้ง')
            }
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        ProficienThAI
                    </h1>
                    <p className="text-gray-600 mt-2">ดู Dashboard ความก้าวหน้าของคุณ</p>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                รหัสนักศึกษา หรือ อีเมล
                            </label>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="เช่น 66xxxxxxxx หรือ student@uni.edu"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                        >
                            {loading ? 'กำลังค้นหา...' : 'ดู Dashboard'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>ยังไม่ได้ลงทะเบียน?</p>
                        <a
                            href="https://line.me/R/ti/p/@proficienthai"
                            className="text-indigo-600 font-medium hover:underline"
                        >
                            แอดไลน์ @proficienthai เพื่อเริ่มต้น
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-sm mt-8">
                    © 2024 ProficienThAI - AI Companion for Thai Learning
                </p>
            </div>
        </div>
    )
}
