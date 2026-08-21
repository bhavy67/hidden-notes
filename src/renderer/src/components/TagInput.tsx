import React, { useState, useRef, KeyboardEvent } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  isDark: boolean
}

export default function TagInput({ tags, onChange, isDark }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const textColor = isDark ? 'text-white/70' : 'text-black/60'
  const chipBg = isDark ? 'bg-white/12 text-white/80' : 'bg-black/8 text-black/65'
  const inputBg = isDark ? 'bg-white/8 text-white/80 placeholder:text-white/30' : 'bg-black/5 text-black/70 placeholder:text-black/25'

  function commit() {
    const cleaned = draft.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 24)
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned])
    }
    setDraft('')
    setEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); return }
    if (e.key === 'Escape') { setDraft(''); setEditing(false); return }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className={`no-drag flex items-center flex-wrap gap-1 px-3 py-1 min-h-[28px]`}>
      {tags.map((tag) => (
        <span key={tag} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${chipBg}`}>
          #{tag}
          <button
            onMouseDown={(e) => { e.stopPropagation(); remove(tag) }}
            className="opacity-50 hover:opacity-100 ml-0.5 leading-none"
          >×</button>
        </span>
      ))}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="tag name"
          className={`selectable text-[10px] rounded px-1.5 py-0.5 outline-none w-20 ${inputBg}`}
          autoFocus
        />
      ) : (
        <button
          onMouseDown={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className={`text-[10px] px-1.5 py-0.5 rounded opacity-40 hover:opacity-80 transition-opacity ${textColor}`}
          title="Add tag"
        >
          + tag
        </button>
      )}
    </div>
  )
}
