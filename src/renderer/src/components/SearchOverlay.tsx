import React, { useState, useEffect, useRef } from 'react'
import { Note, NOTE_COLORS } from '../types'

interface SearchOverlayProps {
  notes: Note[]
  onSelect: (id: string) => void
  onClose: () => void
  isDark: boolean
}

function highlight(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

function snippet(content: string, query: string, maxLen = 80): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, maxLen)
  const start = Math.max(0, idx - 20)
  return (start > 0 ? '…' : '') + content.slice(start, start + maxLen) + (start + maxLen < content.length ? '…' : '')
}

export default function SearchOverlay({ notes, onSelect, onClose, isDark }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = query.trim().length < 1
    ? notes
    : notes.filter((n) => {
        const q = query.toLowerCase()
        return n.content.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)
      })

  const bg = isDark ? 'bg-black/30 border-white/10' : 'bg-white/40 border-black/8'
  const inputBg = isDark ? 'bg-white/10 text-white placeholder:text-white/40' : 'bg-black/5 text-black/80 placeholder:text-black/35'
  const rowHover = isDark ? 'hover:bg-white/10' : 'hover:bg-black/6'
  const rowText = isDark ? 'text-white/80' : 'text-black/70'
  const snippetText = isDark ? 'text-white/40' : 'text-black/40'

  return (
    <div className={`flex flex-col border-b backdrop-blur-sm ${bg}`} style={{ maxHeight: 200 }}>
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`text-sm opacity-50 ${rowText}`}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          className={`selectable flex-1 bg-transparent outline-none text-xs ${inputBg.split(' ').slice(1).join(' ')}`}
          style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }}
        />
        <button
          onMouseDown={onClose}
          className={`text-xs opacity-40 hover:opacity-80 ${rowText}`}
        >✕</button>
      </div>

      {/* Results */}
      {query.trim().length > 0 && (
        <div className="overflow-y-auto">
          {filtered.length === 0 ? (
            <p className={`px-3 pb-2 text-xs ${snippetText}`}>No results</p>
          ) : (
            filtered.map((note) => {
              const colorConf = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow
              const dot = `rgb(${colorConf.tint})`
              const text = note.content
              return (
                <button
                  key={note.id}
                  onMouseDown={() => { onSelect(note.id); onClose() }}
                  className={`w-full text-left flex items-start gap-2 px-3 py-1.5 ${rowHover} transition-colors`}
                >
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0 border border-black/10" style={{ background: dot }} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${rowText}`}
                      dangerouslySetInnerHTML={{ __html: highlight(note.title || 'Untitled', query) }}
                    />
                    <p className={`text-[10px] truncate ${snippetText}`}
                      dangerouslySetInnerHTML={{ __html: highlight(snippet(text, query), query) }}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
