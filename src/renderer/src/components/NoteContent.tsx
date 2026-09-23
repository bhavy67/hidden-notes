import React, { useRef, useEffect, useState } from 'react'
import { Note } from '../types'
import MarkdownPreview from './MarkdownPreview'

interface NoteContentProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  isDark: boolean
}

const MAX_UNDO = 200

export default function NoteContent({ note, onUpdate, isDark }: NoteContentProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [mdView, setMdView] = useState<'edit' | 'preview'>('edit')

  // Per-session undo stack — reset when switching notes
  const undoStack = useRef<string[]>([])
  const undoPos   = useRef<number>(0)

  useEffect(() => {
    undoStack.current = [note.content]
    undoPos.current   = 0
  }, [note.id])

  // Focus textarea when switching notes (text mode) or entering edit view
  useEffect(() => {
    if (note.contentType === 'text' || mdView === 'edit') ref.current?.focus()
  }, [note.id, mdView])

  // Reset to edit view when switching notes
  useEffect(() => { setMdView('edit') }, [note.id])

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    // Trim any "future" states above current position, then push
    undoStack.current = undoStack.current.slice(0, undoPos.current + 1)
    undoStack.current.push(val)
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    else undoPos.current++
    onUpdate({ content: val })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (undoPos.current > 0) {
        undoPos.current--
        onUpdate({ content: undoStack.current[undoPos.current] })
      }
      return
    }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      if (undoPos.current < undoStack.current.length - 1) {
        undoPos.current++
        onUpdate({ content: undoStack.current[undoPos.current] })
      }
      return
    }
  }

  const tabBase     = `text-[10px] font-medium px-3 py-1 transition-colors border-b-2`
  const activeTab   = isDark ? `${tabBase} text-white/80 border-white/50`   : `${tabBase} text-black/70 border-black/40`
  const inactiveTab = isDark ? `${tabBase} text-white/30 border-transparent hover:text-white/60` : `${tabBase} text-black/30 border-transparent hover:text-black/60`

  const textarea = (placeholder: string, mono = false) => (
    <textarea
      ref={ref}
      value={note.content}
      onChange={handleContentChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      className={`
        selectable flex-1 w-full resize-none border-none outline-none bg-transparent
        p-3 leading-relaxed
        ${isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/80 placeholder:text-black/30'}
      `}
      style={{ fontSize: note.fontSize, fontFamily: mono ? 'ui-monospace, monospace' : 'inherit' }}
    />
  )

  if (note.contentType === 'markdown') {
    const sep = isDark ? 'border-white/8 bg-black/10' : 'border-black/6 bg-black/3'
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex items-center border-b flex-shrink-0 px-1 ${sep}`}>
          <button onMouseDown={() => setMdView('edit')}    className={mdView === 'edit'    ? activeTab : inactiveTab}>Edit</button>
          <button onMouseDown={() => setMdView('preview')} className={mdView === 'preview' ? activeTab : inactiveTab}>Preview</button>
        </div>
        {mdView === 'edit'
          ? textarea('Type Markdown here…', true)
          : <MarkdownPreview content={note.content} fontSize={note.fontSize} isDark={isDark} />
        }
      </div>
    )
  }

  return textarea('Start typing… (invisible to screen sharing)')
}
