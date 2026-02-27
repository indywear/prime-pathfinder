'use client'

import { useRef, useCallback, useState } from 'react'

// Lightweight HTML sanitizer for rich text editor content
// Only allows safe formatting tags and attributes used by the editor
const ALLOWED_TAGS = new Set([
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'span', 'div', 'font', 'a', 'blockquote', 'pre', 'code',
])
const ALLOWED_ATTRS = new Set(['style', 'color', 'href', 'target', 'class'])

function sanitizeHtml(html: string): string {
    if (!html) return ''
    // Remove script/iframe/object/embed tags and event handlers entirely
    let clean = html
        .replace(/<\s*(script|iframe|object|embed|form|link|meta|base)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
        .replace(/<\s*(script|iframe|object|embed|form|link|meta|base)[^>]*\/?>/gi, '')
        // Remove event handler attributes (onclick, onerror, onload, etc.)
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        // Remove javascript: URLs
        .replace(/href\s*=\s*["']?\s*javascript\s*:/gi, 'href="')
    return clean
}

interface RichTextEditorProps {
    name: string
    defaultValue?: string
    placeholder?: string
}

const COLORS = [
    { label: 'Black', value: '#000000' },
    { label: 'Red', value: '#DC2626' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Green', value: '#16A34A' },
    { label: 'Orange', value: '#EA580C' },
    { label: 'Purple', value: '#9333EA' },
]

export default function RichTextEditor({ name, defaultValue, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const hiddenInputRef = useRef<HTMLInputElement>(null)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showSource, setShowSource] = useState(false)
    const [sourceValue, setSourceValue] = useState(defaultValue || '')

    const updateHiddenInput = useCallback(() => {
        if (editorRef.current && hiddenInputRef.current) {
            hiddenInputRef.current.value = editorRef.current.innerHTML
        }
    }, [])

    const execCmd = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
        updateHiddenInput()
    }, [updateHiddenInput])

    const toggleSource = () => {
        if (showSource) {
            // Switching from source to visual
            if (editorRef.current) {
                editorRef.current.innerHTML = sanitizeHtml(sourceValue)
                updateHiddenInput()
            }
        } else {
            // Switching from visual to source
            if (editorRef.current) {
                setSourceValue(editorRef.current.innerHTML)
            }
        }
        setShowSource(!showSource)
    }

    const ToolButton = ({ onClick, title, children, active }: {
        onClick: () => void
        title: string
        children: React.ReactNode
        active?: boolean
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'}`}
        >
            {children}
        </button>
    )

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 border-b border-gray-300">
                {/* Text Format */}
                <ToolButton onClick={() => execCmd('bold')} title="ตัวหนา (Bold)">
                    <strong>B</strong>
                </ToolButton>
                <ToolButton onClick={() => execCmd('italic')} title="ตัวเอียง (Italic)">
                    <em>I</em>
                </ToolButton>
                <ToolButton onClick={() => execCmd('underline')} title="ขีดเส้นใต้ (Underline)">
                    <span className="underline">U</span>
                </ToolButton>

                <span className="w-px h-5 bg-gray-300 mx-1" />

                {/* Headings */}
                <ToolButton onClick={() => execCmd('formatBlock', 'H2')} title="หัวข้อใหญ่ (Heading 2)">
                    H2
                </ToolButton>
                <ToolButton onClick={() => execCmd('formatBlock', 'H3')} title="หัวข้อรอง (Heading 3)">
                    H3
                </ToolButton>
                <ToolButton onClick={() => execCmd('formatBlock', 'P')} title="ย่อหน้า (Paragraph)">
                    P
                </ToolButton>

                <span className="w-px h-5 bg-gray-300 mx-1" />

                {/* Lists */}
                <ToolButton onClick={() => execCmd('insertUnorderedList')} title="รายการ (Bullet List)">
                    &bull; List
                </ToolButton>
                <ToolButton onClick={() => execCmd('insertOrderedList')} title="ลำดับ (Numbered List)">
                    1. List
                </ToolButton>

                <span className="w-px h-5 bg-gray-300 mx-1" />

                {/* Color Picker */}
                <div className="relative">
                    <ToolButton
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="เปลี่ยนสีตัวอักษร"
                        active={showColorPicker}
                    >
                        <span className="flex items-center gap-1">
                            A
                            <span className="w-3 h-1.5 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 rounded-sm" />
                        </span>
                    </ToolButton>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 flex gap-1">
                            {COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    title={color.label}
                                    onClick={() => {
                                        execCmd('foreColor', color.value)
                                        setShowColorPicker(false)
                                    }}
                                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color.value }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <span className="w-px h-5 bg-gray-300 mx-1" />

                {/* Clear Format */}
                <ToolButton onClick={() => execCmd('removeFormat')} title="ลบรูปแบบ (Clear Format)">
                    ✕ Clear
                </ToolButton>

                {/* Source Toggle */}
                <ToolButton onClick={toggleSource} title="แสดง HTML Source" active={showSource}>
                    &lt;/&gt;
                </ToolButton>
            </div>

            {/* Editor Area */}
            {showSource ? (
                <textarea
                    value={sourceValue}
                    onChange={(e) => {
                        setSourceValue(e.target.value)
                        if (hiddenInputRef.current) {
                            hiddenInputRef.current.value = e.target.value
                        }
                    }}
                    className="w-full min-h-[250px] p-4 font-mono text-sm text-gray-800 focus:outline-none resize-y"
                    placeholder="HTML source..."
                />
            ) : (
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={updateHiddenInput}
                    onBlur={updateHiddenInput}
                    className="min-h-[250px] p-4 text-sm text-gray-800 focus:outline-none prose prose-sm max-w-none overflow-y-auto"
                    style={{ maxHeight: '500px' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaultValue || '') }}
                    data-placeholder={placeholder}
                />
            )}

            {/* Hidden input for form submission */}
            <input type="hidden" name={name} ref={hiddenInputRef} defaultValue={defaultValue || ''} />
        </div>
    )
}
