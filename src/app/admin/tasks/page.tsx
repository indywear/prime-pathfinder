'use client'

import { useState, useEffect } from 'react'

interface Task {
    id: string
    weekNumber: number
    slug: string
    title: string
    description: string
    contentUrl: string | null
    contentHtml: string | null
    minWords: number
    maxWords: number
    deadline: string
    isActive: boolean
    _count: {
        submissions: number
    }
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks')
            const data = await res.json()
            // Handle both array response and {tasks: []} response
            setTasks(Array.isArray(data) ? data : data.tasks || [])
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
            setTasks([])
        }
        setLoading(false)
    }

    const toggleTaskStatus = async (id: string, isActive: boolean) => {
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !isActive }),
        })
        fetchTasks()
    }

    if (loading) {
        return <div className="p-8">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
                    <p className="mt-2 text-gray-600">Manage weekly learning tasks</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    + Create New Task
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-xl font-bold mb-4">Create New Task</h2>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const weekNum = parseInt(formData.get('weekNumber') as string)
                            const res = await fetch('/api/tasks', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    weekNumber: weekNum,
                                    title: formData.get('title'),
                                    description: formData.get('description'),
                                    contentHtml: formData.get('contentHtml'),
                                    bestPractice: formData.get('bestPractice'),
                                    generalPractice: formData.get('generalPractice'),
                                    badPractice: formData.get('badPractice'),
                                    minWords: parseInt(formData.get('minWords') as string),
                                    maxWords: parseInt(formData.get('maxWords') as string),
                                    deadline: formData.get('deadline'),
                                }),
                            })
                            if (res.ok) {
                                setShowCreateForm(false)
                                fetchTasks()
                            }
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                                <input
                                    type="number"
                                    name="weekNumber"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                                <input
                                    type="datetime-local"
                                    name="deadline"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                name="title"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (คำอธิบายสั้นๆ ของงาน)</label>
                            <textarea
                                name="description"
                                required
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reading Content (เนื้อหาบทอ่านสำหรับนักเรียน)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                พิมพ์เนื้อหาบทอ่านที่นี่ ระบบจะสร้างหน้าเว็บให้อัตโนมัติ รองรับ HTML (เช่น &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;)
                            </p>
                            <textarea
                                name="contentHtml"
                                rows={10}
                                placeholder={"<h2>หัวข้อบทอ่าน</h2>\n<p>เนื้อหาย่อหน้าแรก...</p>\n<p>เนื้อหาย่อหน้าที่สอง...</p>"}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            />
                        </div>
                        {/* Practice Examples for AI Grading */}
                        <div className="border-t border-gray-200 pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">Practice Examples (ตัวอย่างคำตอบสำหรับ AI ใช้อ้างอิงตอนตรวจ)</h3>
                            <p className="text-xs text-gray-500 mb-3">ใส่ตัวอย่างคำตอบ 3 ระดับ เพื่อให้ AI ประเมินงานนักเรียนได้แม่นยำขึ้น</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-green-700 mb-1">Best Practice (ตัวอย่างคำตอบที่ดี)</label>
                                    <textarea name="bestPractice" rows={4} className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm" placeholder="วางตัวอย่างคำตอบที่ดีที่สุดที่นี่..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-yellow-700 mb-1">General Practice (ตัวอย่างคำตอบระดับกลาง)</label>
                                    <textarea name="generalPractice" rows={4} className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm" placeholder="วางตัวอย่างคำตอบระดับกลางที่นี่..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-700 mb-1">Bad Practice (ตัวอย่างคำตอบที่ต้องปรับปรุง)</label>
                                    <textarea name="badPractice" rows={4} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm" placeholder="วางตัวอย่างคำตอบที่ไม่ดีที่นี่..." />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Words</label>
                                <input
                                    type="number"
                                    name="minWords"
                                    defaultValue={80}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Words</label>
                                <input
                                    type="number"
                                    name="maxWords"
                                    defaultValue={120}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Create Task
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tasks List */}
            <div className="bg-white rounded-xl border border-gray-200">
                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No tasks yet. Click "Create New Task" to add your first task.</p>
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tasks.map((task) => (
                                <tr key={task.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        Week {task.weekNumber}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                        <div className="text-xs text-gray-500 line-clamp-2">{task.description}</div>
                                        {task.slug && (
                                            <a
                                                href={`/task/${task.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-indigo-600 mt-1 hover:underline block"
                                            >
                                                /task/{task.slug}
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(task.deadline).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div>📝 {task._count?.submissions || 0} submissions</div>
                                        <div className="text-xs text-gray-400">{task.minWords}-{task.maxWords} words</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${task.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {task.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                        <a
                                            href={`/admin/tasks/${task.id}`}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            View
                                        </a>
                                        <button
                                            onClick={() => toggleTaskStatus(task.id, task.isActive)}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            {task.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    )
}
