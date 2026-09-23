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
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Reset selection when the query changes
  useEffect(() => { setSelectedIdx(-1) }, [query])

  // Scroll the highlighted result into view
  useEffect(() => {
    if (selectedIdx >= 0) resultRefs.current[selectedIdx]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const filtered = query.trim().length < 1
    ? notes
    : notes.filter((n) => {
        const q = query.toLowerCase()
        return n.content.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)
      })

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!filtered.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const target = selectedIdx >= 0 ? filtered[selectedIdx] : filtered[0]
      if (target) { onSelect(target.id); onClose() }
    }
  }

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
          onKeyDown={handleInputKey}
          placeholder="Search notes…"
          className={`selectable flex-1 bg-transparent outline-none text-xs ${inputBg.split(' ').slice(1).join(' ')}`}
          style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }}
        />
        {query.trim() && filtered.length > 1 && (
          <span className={`text-[9px] opacity-30 select-none ${rowText}`}>↑↓</span>
        )}
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
            filtered.map((note, i) => {
              const colorConf = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow
              const dot = `rgb(${colorConf.tint})`
              const text = note.content
              const isSelected = i === selectedIdx
              return (
                <button
                  key={note.id}
                  ref={el => { resultRefs.current[i] = el }}
                  onMouseDown={() => { onSelect(note.id); onClose() }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-1.5 transition-colors ${
                    isSelected
                      ? (isDark ? 'bg-white/15' : 'bg-black/8')
                      : rowHover
                  }`}
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
