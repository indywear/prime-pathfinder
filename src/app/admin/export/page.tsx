'use client'

import { useState } from 'react'

export default function ExportPage() {
    const [exporting, setExporting] = useState<string | null>(null)
    const [format, setFormat] = useState<'csv' | 'json'>('csv')

    const handleExport = async (dataType: string) => {
        setExporting(dataType)
        try {
            const response = await fetch(`/api/admin/export?type=${dataType}&format=${format}`)

            if (!response.ok) {
                throw new Error('Export failed')
            }

            const contentDisposition = response.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch ? filenameMatch[1] : `export_${dataType}.${format}`

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export error:', error)
            alert('Export failed. Please try again.')
        } finally {
            setExporting(null)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Export Research Data</h1>
                <p className="mt-2 text-gray-600">
                    Export anonymized data for research and analysis
                </p>
            </div>

            {/* Format Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Select Export Format</h2>
                <div className="flex gap-4">
                    {(['csv', 'json'] as const).map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => setFormat(fmt)}
                            className={`px-6 py-3 rounded-lg font-medium ${format === fmt
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Users Data */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">👥 Users Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export user profiles (anonymized)
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• Demographics (nationality, level)</li>
                        <li>• Progress metrics (XP, submissions)</li>
                        <li>• Engagement stats</li>
                    </ul>
                    <button
                        onClick={() => handleExport('users')}
                        disabled={exporting !== null}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {exporting === 'users' ? 'Exporting...' : 'Export Users'}
                    </button>
                </div>

                {/* Submissions Data */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">📝 Submissions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export all submissions with scores
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• Content & word count</li>
                        <li>• Rubric scores</li>
                        <li>• AI feedback</li>
                    </ul>
                    <button
                        onClick={() => handleExport('submissions')}
                        disabled={exporting !== null}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {exporting === 'submissions' ? 'Exporting...' : 'Export Submissions'}
                    </button>
                </div>

                {/* Feedback Data */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">💬 Feedback Requests</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export feedback request history
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• Draft content</li>
                        <li>• AI feedback</li>
                        <li>• Score breakdown</li>
                    </ul>
                    <button
                        onClick={() => handleExport('feedback')}
                        disabled={exporting !== null}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {exporting === 'feedback' ? 'Exporting...' : 'Export Feedback'}
                    </button>
                </div>

                {/* Practice Sessions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">🎮 Practice Sessions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export game practice data
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• Game types & results</li>
                        <li>• Correct/incorrect answers</li>
                        <li>• Time spent</li>
                    </ul>
                    <button
                        onClick={() => handleExport('practice')}
                        disabled={exporting !== null}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {exporting === 'practice' ? 'Exporting...' : 'Export Practice'}
                    </button>
                </div>

                {/* Complete Dataset */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">📊 Complete Dataset</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export everything (anonymized)
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• All tables combined</li>
                        <li>• Fully anonymized</li>
                        <li>• Ready for research</li>
                    </ul>
                    <button
                        onClick={() => handleExport('complete')}
                        disabled={exporting !== null}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {exporting === 'complete' ? 'Exporting...' : 'Export Complete Dataset'}
                    </button>
                </div>
            </div>

            {/* Data Privacy Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-yellow-900 mb-2">🔒 Data Privacy</h3>
                <p className="text-sm text-yellow-800">
                    All exported data is anonymized to protect user privacy. Personal identifiable
                    information (PII) such as names, emails, and LINE User IDs are removed or hashed.
                    Exported data should be handled according to your institution&apos;s research ethics
                    guidelines and PDPA regulations.
                </p>
            </div>
        </div>
    )
}
