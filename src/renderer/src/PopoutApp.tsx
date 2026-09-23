import React, { useState, useEffect, useRef } from 'react'
import { Note, NOTE_COLORS, NotePatch } from './types'
import NoteContent from './components/NoteContent'
import Toolbar from './components/Toolbar'
import TagInput from './components/TagInput'
import HistoryPanel from './components/HistoryPanel'
import SearchOverlay from './components/SearchOverlay'

export default function PopoutApp({ noteId }: { noteId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showTags, setShowTags] = useState(false)

  const pendingUpdates = useRef<Map<string, NotePatch>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const note = notes.find((n) => n.id === noteId) ?? null

  useEffect(() => {
    window.ghostpad.getAllNotes().then(setNotes).catch(console.error)
  }, [])

  useEffect(() => {
    return window.ghostpad.onNotesChanged(setNotes)
  }, [])

  useEffect(() => {
    return window.ghostpad.onPanicPre(() => {
      if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null }
      pendingUpdates.current.forEach((p, nid) => window.ghostpad.updateNote(nid, p))
      pendingUpdates.current.clear()
      window.ghostpad.panicFlushDone()
    })
  }, [])

  function scheduleUpdate(patch: NotePatch) {
    if (!note) return
    const prev = pendingUpdates.current.get(note.id) ?? {}
    pendingUpdates.current.set(note.id, { ...prev, ...patch })
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => {
      pendingUpdates.current.forEach((p, nid) => window.ghostpad.updateNote(nid, p))
      pendingUpdates.current.clear()
      flushTimer.current = null
    }, 220)
    setNotes((prev) =>
      prev.map((n) => n.id === note.id ? { ...n, ...patch, updatedAt: Date.now() } : n)
    )
  }

  async function handleRestore(snapshotId: number) {
    if (!note) return
    await window.ghostpad.restoreSnapshot(note.id, snapshotId)
  }

  if (!note) return null

  const colorConf = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow
  const isDark = colorConf.dark

  return (
    <div
      className="w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: `rgba(${colorConf.tint}, ${note.opacity})`,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
    >
      {/* Drag handle + title + merge-back */}
      <div
        className="drag-handle flex-shrink-0 flex items-center justify-between px-3 py-1.5"
        style={{ background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.06)' }}
      >
        <span className={`text-[11px] font-medium truncate ${isDark ? 'text-white/50' : 'text-black/45'}`}>
          {note.title || 'Untitled'}
        </span>
        <button
          onMouseDown={() => window.ghostpad.popinNote(noteId)}
          className={`no-drag text-[10px] px-2 py-0.5 rounded transition-colors flex-shrink-0 ${
            isDark ? 'text-white/40 hover:text-white/80 hover:bg-white/10' : 'text-black/35 hover:text-black/70 hover:bg-black/8'
          }`}
          title="Merge back into main window"
        >
          ↙ Merge back
        </button>
      </div>

      {showSearch && (
        <SearchOverlay notes={notes} onSelect={() => {}} onClose={() => setShowSearch(false)} isDark={isDark} />
      )}

      {showHistory && (
        <HistoryPanel noteId={note.id} onRestore={handleRestore} onClose={() => setShowHistory(false)} isDark={isDark} />
      )}

      {showTags && (
        <TagInput tags={note.tags} onChange={(tags) => scheduleUpdate({ tags })} isDark={isDark} />
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <NoteContent note={note} onUpdate={scheduleUpdate} isDark={isDark} />
      </div>

      <Toolbar
        note={note}
        onUpdate={scheduleUpdate}
        onDelete={() => {/* no delete in pop-out */}}
        onClose={() => window.ghostpad.popinNote(noteId)}
        onTogglePin={() => scheduleUpdate({ pinned: !note.pinned })}
        onTogglePopout={() => window.ghostpad.popinNote(noteId)}
        showSearch={showSearch} onToggleSearch={() => setShowSearch((s) => !s)}
        showHistory={showHistory} onToggleHistory={() => setShowHistory((h) => !h)}
        showTags={showTags} onToggleTags={() => setShowTags((t) => !t)}
      />
    </div>
  )
}
