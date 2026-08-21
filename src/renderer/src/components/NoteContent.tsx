import React, { useRef, useEffect, KeyboardEvent } from 'react'
import { Note, ChecklistItem } from '../types'

interface NoteContentProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  isDark: boolean
}

// ── Plain text ────────────────────────────────────────────────────────

function TextNote({ note, onUpdate, isDark }: NoteContentProps) {
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

// ── Checklist ─────────────────────────────────────────────────────────

function generateItemId() {
  return 'item-' + Math.random().toString(36).slice(2, 8)
}

function ChecklistNote({ note, onUpdate, isDark }: NoteContentProps) {
  const items: ChecklistItem[] = note.checklistItems.length > 0
    ? note.checklistItems
    : [{ id: generateItemId(), text: '', checked: false }]

  function setItems(next: ChecklistItem[]) {
    onUpdate({ checklistItems: next })
  }

  function toggle(id: string) {
    setItems(items.map((it) => it.id === id ? { ...it, checked: !it.checked } : it))
  }

  function setText(id: string, text: string) {
    setItems(items.map((it) => it.id === id ? { ...it, text } : it))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const newItem: ChecklistItem = { id: generateItemId(), text: '', checked: false }
      const next = [...items.slice(0, index + 1), newItem, ...items.slice(index + 1)]
      setItems(next)
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.checklist-input')
        inputs[index + 1]?.focus()
      }, 20)
    } else if (e.key === 'Backspace' && items[index].text === '' && items.length > 1) {
      e.preventDefault()
      const next = items.filter((_, i) => i !== index)
      setItems(next)
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.checklist-input')
        inputs[Math.max(0, index - 1)]?.focus()
      }, 20)
    }
  }

  const textColor = isDark ? 'text-white/80' : 'text-black/75'
  const borderColor = isDark ? 'border-white/10' : 'border-black/8'
  const checkedText = isDark ? 'text-white/30 line-through' : 'text-black/30 line-through'

  return (
    <div className="flex-1 overflow-y-auto p-2" style={{ fontSize: note.fontSize }}>
      {items.map((item, idx) => (
        <div key={item.id} className={`checklist-item flex items-start gap-2 py-1 px-1 rounded group`}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggle(item.id)}
            className="mt-0.5"
          />
          <input
            type="text"
            value={item.text}
            onChange={(e) => setText(item.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder={idx === 0 ? 'Add item…' : ''}
            className={`
              checklist-input selectable flex-1 bg-transparent border-none outline-none
              ${item.checked ? checkedText : textColor}
              placeholder:text-black/25
            `}
            style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Markdown ──────────────────────────────────────────────────────────

function MarkdownNote({ note, onUpdate, isDark }: NoteContentProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [note.id])

  return (
    <textarea
      ref={ref}
      value={note.content}
      onChange={(e) => onUpdate({ content: e.target.value })}
      placeholder={`# Heading\n**bold**, *italic*, - list item…\n(Markdown preview coming in Phase 1B)`}
      spellCheck={false}
      className={`
        selectable flex-1 w-full resize-none border-none outline-none bg-transparent
        p-3 leading-relaxed font-mono
        ${isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/80 placeholder:text-black/30'}
      `}
      style={{ fontSize: note.fontSize }}
    />
  )
}

// ── Router ────────────────────────────────────────────────────────────

export default function NoteContent(props: NoteContentProps) {
  switch (props.note.contentType) {
    case 'checklist': return <ChecklistNote {...props} />
    case 'markdown':  return <MarkdownNote {...props} />
    default:          return <TextNote {...props} />
  }
}
