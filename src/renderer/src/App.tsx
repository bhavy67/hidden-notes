import React, { useState, useEffect, useRef } from 'react'
import { Note, NOTE_COLORS, NotePatch } from './types'
import TabBar from './components/TabBar'
import NoteContent from './components/NoteContent'
import Toolbar from './components/Toolbar'
import SearchOverlay from './components/SearchOverlay'
import HistoryPanel from './components/HistoryPanel'

export default function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const pendingUpdates = useRef<Map<string, NotePatch>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0] ?? null

  // Reset UI panels when switching tabs
  useEffect(() => {
    setShowHistory(false)
  }, [activeId])

  // Load on mount
  useEffect(() => {
    window.ghostpad.getAllNotes().then((all) => {
      setNotes(all)
      if (all.length > 0) setActiveId(all[0].id)
    })
  }, [])

  // Subscribe to main-process changes
  useEffect(() => {
    return window.ghostpad.onNotesChanged((all) => {
      setNotes(all)
      setActiveId((prev) => {
        if (prev && all.some((n) => n.id === prev)) return prev
        return all[0]?.id ?? null
      })
    })
  }, [])

  // Keyboard: Cmd+F → search, Escape → close panels
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch((s) => !s)
        setShowHistory(false)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowHistory(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Batched updates: accumulate patches, flush after 220ms idle
  function scheduleUpdate(id: string, patch: NotePatch) {
    const prev = pendingUpdates.current.get(id) ?? {}
    pendingUpdates.current.set(id, { ...prev, ...patch })
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => {
      pendingUpdates.current.forEach((p, nid) => window.ghostpad.updateNote(nid, p))
      pendingUpdates.current.clear()
      flushTimer.current = null
    }, 220)
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
      await window.ghostpad.deleteNote(id)
      const fresh = await window.ghostpad.createNote()
      setActiveId(fresh.id)
      return
    }
    const idx = notes.findIndex((n) => n.id === id)
    setActiveId(remaining[Math.max(0, idx - 1)]?.id ?? null)
    await window.ghostpad.deleteNote(id)
  }

  function handleUpdate(patch: NotePatch) {
    if (!activeNote) return
    scheduleUpdate(activeNote.id, patch)
  }

  async function handleRestore(snapshotId: number) {
    if (!activeNote) return
    await window.ghostpad.restoreSnapshot(activeNote.id, snapshotId)
  }

  async function handleDelete() {
    if (!activeNote) return
    if (notes.length === 1) {
      scheduleUpdate(activeNote.id, { content: '', title: '' })
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
      }}
    >
      {/* Tab strip */}
      <div className="drag-handle flex-shrink-0" style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)' }}>
        <TabBar
          notes={notes} activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onClose={handleClose}
          onRename={(id, title) => scheduleUpdate(id, { title })}
        />
      </div>

      {/* Search overlay */}
      {showSearch && (
        <SearchOverlay
          notes={notes}
          onSelect={(id) => setActiveId(id)}
          onClose={() => setShowSearch(false)}
          isDark={isDark}
        />
      )}

      {/* History panel */}
      {showHistory && (
        <HistoryPanel
          noteId={activeNote.id}
          onRestore={handleRestore}
          onClose={() => setShowHistory(false)}
          isDark={isDark}
        />
      )}

      {/* Note content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <NoteContent
          note={activeNote}
          onUpdate={handleUpdate}
          isDark={isDark}
        />
      </div>

      {/* Bottom toolbar */}
      <Toolbar
        note={activeNote} onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClose={() => window.ghostpad.closeWindow()}
        showSearch={showSearch} onToggleSearch={() => { setShowSearch((s) => !s); setShowHistory(false) }}
        showHistory={showHistory} onToggleHistory={() => { setShowHistory((h) => !h); setShowSearch(false) }}
      />
    </div>
  )
}
