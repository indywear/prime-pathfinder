'use client'

import { useState, useEffect, use } from 'react'

interface Submission {
    id: string
    content: string
    wordCount: number
    accuracyScore: number
    contentSelectionScore: number
    interpretationScore: number
    taskFulfillmentScore: number
    organizationScore: number
    languageUseScore: number
    mechanicsScore: number
    totalScore: number
    aiFeedback: string | null
    pointsEarned: number
    onTime: boolean
    earlyBonus: boolean
    submittedAt: string
    user: {
        id: string
        lineUserId: string
        thaiName: string | null
        chineseName: string | null
        currentLevel: number
    }
}

interface TaskInfo {
    id: string
    title: string
    weekNumber: number
    minWords: number
    maxWords: number
    deadline: string
}

export default function TaskSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [task, setTask] = useState<TaskInfo | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

    useEffect(() => {
        fetchSubmissions()
    }, [id])

    const fetchSubmissions = async () => {
        try {
            const res = await fetch(`/api/tasks/${id}/submissions`)
            const data = await res.json()
            setTask(data.task)
            setSubmissions(data.submissions || [])
        } catch (error) {
            console.error('Failed to fetch submissions:', error)
        }
        setLoading(false)
    }

    if (loading) {
        return <div className="p-8">Loading...</div>
    }

    if (!task) {
        return <div className="p-8 text-red-600">Task not found</div>
    }

    const avgScore = submissions.length > 0
        ? Math.round(submissions.reduce((sum, s) => sum + s.totalScore, 0) / submissions.length)
        : 0

    const onTimeCount = submissions.filter(s => s.onTime).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <a
                    href="/admin/tasks"
                    className="text-gray-500 hover:text-gray-700 text-sm"
                >
                    &larr; Back to Tasks
                </a>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    Week {task.weekNumber}: {task.title}
                </h1>
                <p className="mt-1 text-gray-600">
                    {task.minWords}-{task.maxWords} words | Deadline: {new Date(task.deadline).toLocaleDateString('th-TH')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-indigo-600">{submissions.length}</div>
                    <div className="text-sm text-gray-500">Total Submissions</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-green-600">{avgScore}</div>
                    <div className="text-sm text-gray-500">Avg Score (out of 100)</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-blue-600">{onTimeCount}</div>
                    <div className="text-sm text-gray-500">On Time</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-2xl font-bold text-orange-600">{submissions.length - onTimeCount}</div>
                    <div className="text-sm text-gray-500">Late</div>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-xl border">
                {submissions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No submissions yet for this task.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Words</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {submissions.map((sub, idx) => (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-3 text-sm text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {sub.user.thaiName || sub.user.chineseName || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-400">Lv.{sub.user.currentLevel}</div>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-gray-600">{sub.wordCount}</td>
                                        <td className="px-3 py-3">
                                            <span className={`text-sm font-bold ${sub.totalScore >= 75 ? 'text-green-600' : sub.totalScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {sub.totalScore}/100
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${sub.onTime ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {sub.onTime ? 'On Time' : 'Late'}
                                            </span>
                                            {sub.earlyBonus && (
                                                <span className="ml-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                    Early
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-gray-500">
                                            {new Date(sub.submittedAt).toLocaleString('th-TH')}
                                        </td>
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() => setSelectedSubmission(sub)}
                                                className="text-indigo-600 hover:text-indigo-800 text-sm"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Submission Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">
                                Submission by {selectedSubmission.user.thaiName || selectedSubmission.user.chineseName || 'Unknown'}
                            </h2>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Scores - 7 Criteria */}
                        <div className="mb-4">
                            <div className="bg-indigo-50 rounded-lg p-3 text-center mb-3">
                                <div className="text-2xl font-bold text-indigo-600">{selectedSubmission.totalScore}/100</div>
                                <div className="text-xs text-gray-500">Total Score</div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'Accuracy', th: 'ความถูกต้อง', score: selectedSubmission.accuracyScore, max: 14 },
                                    { label: 'Content', th: 'การเลือกสาระ', score: selectedSubmission.contentSelectionScore, max: 14 },
                                    { label: 'Interpret', th: 'การตีความ', score: selectedSubmission.interpretationScore, max: 14 },
                                    { label: 'Task', th: 'ตามภารกิจ', score: selectedSubmission.taskFulfillmentScore, max: 14 },
                                    { label: 'Organize', th: 'การเรียบเรียง', score: selectedSubmission.organizationScore, max: 14 },
                                    { label: 'Language', th: 'การใช้ภาษา', score: selectedSubmission.languageUseScore, max: 14 },
                                    { label: 'Mechanics', th: 'อักขระวิธี', score: selectedSubmission.mechanicsScore, max: 14 },
                                ].map(({ label, th, score, max }) => (
                                    <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                                        <div className="text-sm font-bold text-indigo-600">{score}/{max}</div>
                                        <div className="text-xs text-gray-500">{th}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">
                                Student Writing ({selectedSubmission.wordCount} words)
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                                {selectedSubmission.content}
                            </div>
                        </div>

                        {/* AI Feedback */}
                        {selectedSubmission.aiFeedback && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">AI Feedback</h3>
                                <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                                    {selectedSubmission.aiFeedback}
                                </div>
                            </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Points earned: +{selectedSubmission.pointsEarned}</span>
                            <span>{selectedSubmission.onTime ? 'On Time' : 'Late'}</span>
                            {selectedSubmission.earlyBonus && <span>Early Bonus</span>}
                            <span>Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString('th-TH')}</span>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
