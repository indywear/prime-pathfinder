export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-40">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                P
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">ProficienThAI Admin</h1>
                                <p className="text-sm text-gray-500">Research Management Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">Admin</span>
                            <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r min-h-screen sticky top-16">
                    <nav className="p-4 space-y-1">
                        <a
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📊</span>
                            <span className="font-medium">Overview</span>
                        </a>
                        <a
                            href="/admin/users"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">👥</span>
                            <span className="font-medium">Users</span>
                        </a>
                        <a
                            href="/admin/tasks"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📝</span>
                            <span className="font-medium">Tasks</span>
                        </a>
                        <a
                            href="/admin/analytics"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">📈</span>
                            <span className="font-medium">Analytics</span>
                        </a>
                        <a
                            href="/admin/games"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">🎮</span>
                            <span className="font-medium">Games</span>
                        </a>
                        <a
                            href="/admin/export"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <span className="text-xl">💾</span>
                            <span className="font-medium">Export Data</span>
                        </a>
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
