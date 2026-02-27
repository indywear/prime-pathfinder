import Link from 'next/link'
import AdminHeader from './AdminHeader'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader />

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r min-h-screen sticky top-16">
                    <nav className="p-4 space-y-1">
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📊</span>
                            <span className="font-medium">Overview</span>
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">👥</span>
                            <span className="font-medium">Users</span>
                        </Link>
                        <Link
                            href="/admin/tasks"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📝</span>
                            <span className="font-medium">Tasks</span>
                        </Link>
                        <Link
                            href="/admin/analytics"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📈</span>
                            <span className="font-medium">Analytics</span>
                        </Link>
                        <Link
                            href="/admin/games"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">🎮</span>
                            <span className="font-medium">Games</span>
                        </Link>
                        <Link
                            href="/admin/export"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">💾</span>
                            <span className="font-medium">Export Data</span>
                        </Link>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
