import React, { useRef, useState } from 'react'
import { Note, NOTE_COLORS } from '../types'

interface TabBarProps {
  notes: Note[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onClose: (id: string) => void
  onRename: (id: string, title: string) => void
}

function TabItem({
  note,
  isActive,
  onSelect,
  onClose,
  onRename
}: {
  note: Note
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const colorConf = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow
  const dotColor = `rgb(${colorConf.tint})`

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(note.title || 'Untitled')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const trimmed = draft.trim().slice(0, 60)
    onRename(trimmed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { commitEdit(); return }
    if (e.key === 'Escape') { setEditing(false); return }
  }

  const label = note.title || 'Untitled'

  return (
    <div
      onMouseDown={onSelect}
      onDoubleClick={startEdit}
      className={`
        no-drag relative flex items-center gap-1.5 px-3 py-1 rounded-t-lg cursor-pointer
        select-none text-xs font-medium max-w-[130px] min-w-[80px] group transition-all
        ${isActive
          ? 'bg-white/30 text-black/80 shadow-sm'
          : 'bg-black/5 text-black/50 hover:bg-black/10 hover:text-black/70'
        }
      `}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 border border-black/10"
        style={{ background: dotColor }}
      />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="selectable w-full bg-transparent outline-none text-xs min-w-0"
          style={{ WebkitUserSelect: 'text' }}
          autoFocus
        />
      ) : (
        <span className="truncate flex-1" title={label}>{label}</span>
      )}
      <button
        onMouseDown={(e) => { e.stopPropagation(); onClose() }}
        className={`
          flex-shrink-0 w-4 h-4 flex items-center justify-center rounded
          text-black/30 hover:text-black/70 hover:bg-black/10
          opacity-0 group-hover:opacity-100 transition-opacity
          ${isActive ? 'opacity-60' : ''}
        `}
        title="Close tab"
      >
        ✕
      </button>
    </div>
  )
}

export default function TabBar({ notes, activeId, onSelect, onCreate, onClose, onRename }: TabBarProps) {
  return (
    <div className="drag-handle flex items-end gap-0.5 px-2 pt-2 overflow-x-auto min-h-[38px]">
      {notes.map((note) => (
        <TabItem
          key={note.id}
          note={note}
          isActive={note.id === activeId}
          onSelect={() => onSelect(note.id)}
          onClose={() => onClose(note.id)}
          onRename={(title) => onRename(note.id, title)}
        />
      ))}
      <button
        onMouseDown={onCreate}
        className="no-drag flex-shrink-0 ml-1 w-7 h-7 flex items-center justify-center rounded-full text-black/40 hover:bg-black/10 hover:text-black/70 transition-colors text-base font-medium"
        title="New note (⌘⇧N)"
      >
        +
      </button>
    </div>
  )
}
