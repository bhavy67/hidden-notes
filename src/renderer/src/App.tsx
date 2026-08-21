import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Note, NOTE_COLORS, NotePatch } from './types'
import TabBar from './components/TabBar'
import NoteContent from './components/NoteContent'
import Toolbar from './components/Toolbar'

// Debounce helper — batches rapid note updates before sending to main process
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Popout mode: single note in a floating window ────────────────────

function PopoutApp({ noteId }: { noteId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const note = notes.find((n) => n.id === noteId) ?? null

  useEffect(() => {
    window.ghostpad.getAllNotes().then(setNotes)
    return window.ghostpad.onNotesChanged(setNotes)
  }, [])

  const update = useCallback((patch: NotePatch) => {
    window.ghostpad.updateNote(noteId, patch)
  }, [noteId])

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
        boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        outline: note.ghost ? '2px dashed rgba(0,0,0,0.22)' : undefined,
        outlineOffset: '-2px',
        fontSize: note.fontSize
      }}
    >
      {/* Minimal drag handle */}
      <div className="drag-handle h-6 flex-shrink-0 flex items-center px-3">
        <span className={`text-[10px] font-medium truncate ${isDark ? 'text-white/40' : 'text-black/35'}`}>
          {note.title || 'GhostPad'}
        </span>
        <div className="flex-1" />
        <button
          onMouseDown={() => window.ghostpad.closeWindow()}
          className={`no-drag text-xs px-1 rounded ${isDark ? 'text-white/30 hover:text-white/70' : 'text-black/30 hover:text-black/60'}`}
        >✕</button>
      </div>

      <NoteContent note={note} onUpdate={update} isDark={isDark} />

      <Toolbar
        note={note}
        onUpdate={update}
        onPopOut={() => {}}
        onDelete={async () => { await window.ghostpad.deleteNote(noteId); window.ghostpad.closeWindow() }}
        onClose={() => window.ghostpad.closeWindow()}
      />
    </div>
  )
}

// ── Main tabbed panel ────────────────────────────────────────────────

export default function App() {
  const params = window.ghostpad.getQueryParams()
  const isPopout = params.mode === 'popout'
  const popoutNoteId = params.noteId

  if (isPopout && popoutNoteId) {
    return <PopoutApp noteId={popoutNoteId} />
  }

  return <MainPanel />
}

function MainPanel() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const pendingUpdates = useRef<Map<string, NotePatch>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0] ?? null

  // Load notes on mount
  useEffect(() => {
    window.ghostpad.getAllNotes().then((all) => {
      setNotes(all)
      if (all.length > 0) setActiveId(all[0].id)
    })
  }, [])

  // Subscribe to changes from main process
  useEffect(() => {
    return window.ghostpad.onNotesChanged((all) => {
      setNotes(all)
      setActiveId((prev) => {
        if (prev && all.some((n) => n.id === prev)) return prev
        return all[0]?.id ?? null
      })
    })
  }, [])

  // Ghost toggle shortcut
  useEffect(() => {
    return window.ghostpad.onToggleGhost(() => {
      if (!activeNote) return
      window.ghostpad.updateNote(activeNote.id, { ghost: !activeNote.ghost })
    })
  }, [activeNote])

  // Batched update: accumulate patches and flush after 220ms idle
  function scheduleUpdate(id: string, patch: NotePatch) {
    const existing = pendingUpdates.current.get(id) ?? {}
    pendingUpdates.current.set(id, { ...existing, ...patch })
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => {
      pendingUpdates.current.forEach((p, nid) => {
        window.ghostpad.updateNote(nid, p)
      })
      pendingUpdates.current.clear()
      flushTimer.current = null
    }, 220)

    // Apply locally immediately for snappy UI
    setNotes((prev) =>
      prev.map((n) => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)
    )
  }

  async function handleCreate() {
    const note = await window.ghostpad.createNote({ color: activeNote?.color ?? 'yellow' })
    setActiveId(note.id)
  }

  async function handleClose(id: string) {
    const remaining = notes.filter((n) => n.id !== id)
    if (remaining.length === 0) {
      // Last tab: create a new blank note instead of leaving empty state
      await window.ghostpad.deleteNote(id)
      const fresh = await window.ghostpad.createNote()
      setActiveId(fresh.id)
      return
    }
    const currentIdx = notes.findIndex((n) => n.id === id)
    const nextNote = remaining[Math.max(0, currentIdx - 1)]
    setActiveId(nextNote?.id ?? null)
    await window.ghostpad.deleteNote(id)
  }

  function handleRename(id: string, title: string) {
    scheduleUpdate(id, { title })
  }

  function handleUpdate(patch: NotePatch) {
    if (!activeNote) return
    scheduleUpdate(activeNote.id, patch)
  }

  function handlePopOut() {
    if (!activeNote) return
    window.ghostpad.popOutNote(activeNote.id)
  }

  async function handleDelete() {
    if (!activeNote) return
    if (notes.length === 1) {
      // Don't delete the last note — just clear it
      scheduleUpdate(activeNote.id, { content: '', checklistItems: [], title: '' })
      return
    }
    await handleClose(activeNote.id)
  }

  if (!activeNote) return null

  const colorConf = NOTE_COLORS[activeNote.color] ?? NOTE_COLORS.yellow
  const isDark = colorConf.dark

  return (
    <div
      className="w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: `rgba(${colorConf.tint}, ${activeNote.opacity})`,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        outline: activeNote.ghost ? '2px dashed rgba(0,0,0,0.25)' : undefined,
        outlineOffset: '-2px'
      }}
    >
      {/* Tab strip + drag handle */}
      <div
        className="drag-handle flex-shrink-0"
        style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)' }}
      >
        <TabBar
          notes={notes}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onClose={handleClose}
          onRename={handleRename}
        />
      </div>

      {/* Note content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <NoteContent note={activeNote} onUpdate={handleUpdate} isDark={isDark} />
      </div>

      {/* Bottom toolbar */}
      <Toolbar
        note={activeNote}
        onUpdate={handleUpdate}
        onPopOut={handlePopOut}
        onDelete={handleDelete}
        onClose={() => window.ghostpad.closeWindow()}
      />
    </div>
  )
}
