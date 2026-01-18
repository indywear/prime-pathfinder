import prisma from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import TaskContent from './TaskContent'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function TaskPage({ params }: PageProps) {
    const { slug } = await params

    const task = await prisma.task.findFirst({
        where: { 
            title: { contains: slug },
            isActive: true 
        },
    })

    if (!task || !task.isActive) {
        notFound()
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm mb-2">
                        <span>📚 ProficienThAI</span>
                        {task.weekNumber && (
                            <>
                                <span>•</span>
                                <span>สัปดาห์ที่ {task.weekNumber}</span>
                            </>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
                    <p className="text-indigo-100">{task.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <span className="bg-white/20 px-3 py-1 rounded-full">
                            📏 {task.minWords}-{task.maxWords} คำ
                        </span>
                        <span className="bg-white/20 px-3 py-1 rounded-full">
                            ⏰ {new Date(task.deadline).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    </div>
                </div>
            </header>

            {/* Content with reading tracker */}
            <TaskContent
                taskId={task.id}
                content={task.contentUrl || ''}
                title={task.title}
            />

            {/* Footer */}
            <footer className="bg-gray-50 border-t py-8 px-4 mt-12">
                <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
                    <p>📱 กลับไปที่ LINE เพื่อส่งงาน</p>
                    <p className="mt-2">© 2026 ProficienThAI - Thai Language Learning Innovation</p>
                </div>
            </footer>
        </main>
    )
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params

    const task = await prisma.task.findFirst({
        where: { 
            title: { contains: slug },
            isActive: true 
        },
        select: { title: true, description: true },
    })

    return {
        title: task ? `${task.title} | ProficienThAI` : 'Task Not Found',
        description: task?.description || 'Thai language learning task',
    }
}
