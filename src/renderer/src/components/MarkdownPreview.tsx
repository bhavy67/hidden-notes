import React, { useMemo } from 'react'
import { marked } from 'marked'

// Configure marked: no raw HTML passthrough (user content only, but good practice)
marked.setOptions({ breaks: true })

interface MarkdownPreviewProps {
  content: string
  fontSize: number
  isDark: boolean
}

export default function MarkdownPreview({ content, fontSize, isDark }: MarkdownPreviewProps) {
  const html = useMemo(() => marked.parse(content || '*Start typing markdown…*') as string, [content])

  return (
    <div
      className={`selectable flex-1 overflow-y-auto px-3 py-2 prose prose-sm max-w-none
        ${isDark ? 'prose-invert text-white/85' : 'text-black/80'}
      `}
      style={{ fontSize, fontFamily: 'inherit' }}
      // Safe: user writes their own notes, no external content
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
