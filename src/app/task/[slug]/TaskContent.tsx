'use client'

import { useEffect, useRef, useCallback } from 'react'

interface TaskContentProps {
    taskId: string
    content: string
    title: string
}

// Simple HTML sanitizer - removes script tags and dangerous attributes
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/<iframe\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<form\b[^>]*>/gi, '')
}

export default function TaskContent({ taskId, content, title }: TaskContentProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const trackingRef = useRef({
        startTime: Date.now(),
        scrollDepth: 0,
        focusLostCount: 0,
        tabSwitchCount: 0,
    })

    const sendTrackingData = useCallback(() => {
        const tracking = trackingRef.current
        const timeSpent = Math.floor((Date.now() - tracking.startTime) / 1000)

        fetch('/api/reading-tracker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taskId,
                timeSpentSec: timeSpent,
                scrollDepth: tracking.scrollDepth,
                focusLostCount: tracking.focusLostCount,
                tabSwitchCount: tracking.tabSwitchCount,
            }),
            keepalive: true,
        })
    }, [taskId])

    useEffect(() => {
        trackingRef.current.startTime = Date.now()

        const handleVisibilityChange = () => {
            if (document.hidden) {
                trackingRef.current.tabSwitchCount++
            }
        }

        const handleBlur = () => {
            trackingRef.current.focusLostCount++
        }

        const handleScroll = () => {
            if (!contentRef.current) return

            const windowHeight = window.innerHeight
            const documentHeight = document.documentElement.scrollHeight
            const scrollTop = window.scrollY

            const scrollPercent = Math.round(
                ((scrollTop + windowHeight) / documentHeight) * 100
            )

            trackingRef.current.scrollDepth = Math.max(
                trackingRef.current.scrollDepth,
                scrollPercent
            )
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('blur', handleBlur)
        window.addEventListener('scroll', handleScroll)
        window.addEventListener('beforeunload', sendTrackingData)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('blur', handleBlur)
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('beforeunload', sendTrackingData)
            sendTrackingData()
        }
    }, [taskId, sendTrackingData])

    const sanitizedContent = sanitizeHtml(content)

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 overflow-hidden">
            {/* Reading Progress Indicator */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(trackingRef.current.scrollDepth, 100)}%` }}
                />
            </div>

            {/* Content */}
            <article
                ref={contentRef}
                className="prose prose-lg max-w-none break-words overflow-hidden"
                style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
        </div>
    )
}
