'use client'

import { useEffect, useRef, useState } from 'react'

interface TaskContentProps {
    taskId: string
    content: string
    title: string
}

export default function TaskContent({ taskId, content, title }: TaskContentProps) {
    const [readingSession, setReadingSession] = useState<{
        startTime: number
        scrollDepth: number
        focusLostCount: number
        tabSwitchCount: number
    }>({
        startTime: Date.now(),
        scrollDepth: 0,
        focusLostCount: 0,
        tabSwitchCount: 0,
    })

    const contentRef = useRef<HTMLDivElement>(null)
    const hasStartedRef = useRef(false)

    useEffect(() => {
        if (!hasStartedRef.current) {
            hasStartedRef.current = true
            // Track page visibility changes (tab switching)
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    setReadingSession((prev) => ({
                        ...prev,
                        tabSwitchCount: prev.tabSwitchCount + 1,
                    }))
                }
            }

            // Track blur events (focus lost)
            const handleBlur = () => {
                setReadingSession((prev) => ({
                    ...prev,
                    focusLostCount: prev.focusLostCount + 1,
                }))
            }

            // Track scroll depth
            const handleScroll = () => {
                if (!contentRef.current) return

                const windowHeight = window.innerHeight
                const documentHeight = document.documentElement.scrollHeight
                const scrollTop = window.scrollY

                const scrollPercent = Math.round(
                    ((scrollTop + windowHeight) / documentHeight) * 100
                )

                setReadingSession((prev) => ({
                    ...prev,
                    scrollDepth: Math.max(prev.scrollDepth, scrollPercent),
                }))
            }

            document.addEventListener('visibilitychange', handleVisibilityChange)
            window.addEventListener('blur', handleBlur)
            window.addEventListener('scroll', handleScroll)

            // Send tracking data when leaving page
            const sendTrackingData = () => {
                const timeSpent = Math.floor((Date.now() - readingSession.startTime) / 1000)

                // Send to API
                fetch('/api/reading-tracker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        taskId,
                        timeSpentSec: timeSpent,
                        scrollDepth: readingSession.scrollDepth,
                        focusLostCount: readingSession.focusLostCount,
                        tabSwitchCount: readingSession.tabSwitchCount,
                    }),
                    keepalive: true,
                })
            }

            // Send on page unload
            window.addEventListener('beforeunload', sendTrackingData)

            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                window.removeEventListener('blur', handleBlur)
                window.removeEventListener('scroll', handleScroll)
                window.removeEventListener('beforeunload', sendTrackingData)
                sendTrackingData()
            }
        }
    }, [taskId, readingSession.startTime, readingSession.scrollDepth, readingSession.focusLostCount, readingSession.tabSwitchCount])

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Reading Progress Indicator */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${readingSession.scrollDepth}%` }}
                />
            </div>

            {/* Content */}
            <article
                ref={contentRef}
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Reading Stats (for debugging - remove in production) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
                    <h3 className="font-bold mb-2">📊 Reading Stats (Dev Only)</h3>
                    <p>Time: {Math.floor((Date.now() - readingSession.startTime) / 1000)}s</p>
                    <p>Scroll Depth: {readingSession.scrollDepth}%</p>
                    <p>Focus Lost: {readingSession.focusLostCount}x</p>
                    <p>Tab Switch: {readingSession.tabSwitchCount}x</p>
                </div>
            )}
        </div>
    )
}
