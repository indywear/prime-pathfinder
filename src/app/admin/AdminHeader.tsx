'use client'

export default function AdminHeader() {
    const handleLogout = () => {
        // Clear Basic Auth by redirecting to a URL with invalid credentials
        // This forces the browser to forget cached credentials
        const logoutUrl = window.location.origin + '/admin'
        // Use XMLHttpRequest to send invalid credentials
        const xhr = new XMLHttpRequest()
        xhr.open('GET', logoutUrl, true, 'logout', 'logout')
        xhr.onload = () => {
            window.location.href = '/'
        }
        xhr.onerror = () => {
            window.location.href = '/'
        }
        xhr.send()
    }

    return (
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
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
