import React, { useRef, useEffect } from 'react'
import { Note } from '../types'

interface NoteContentProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  isDark: boolean
}

export default function NoteContent({ note, onUpdate, isDark }: NoteContentProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [note.id])

  return (
    <textarea
      ref={ref}
      value={note.content}
      onChange={(e) => onUpdate({ content: e.target.value })}
      placeholder="Start typing… (invisible to screen sharing)"
      spellCheck={false}
      className={`
        selectable flex-1 w-full resize-none border-none outline-none bg-transparent
        p-3 leading-relaxed
        ${isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/80 placeholder:text-black/30'}
      `}
      style={{ fontSize: note.fontSize, fontFamily: 'inherit' }}
    />
  )
}
