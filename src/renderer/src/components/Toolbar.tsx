import React from 'react'
import { Note, NoteColor } from '../types'
import ColorPicker from './ColorPicker'
import Tooltip from './Tooltip'

interface ToolbarProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  onDelete: () => void
  onClose: () => void
  showSearch: boolean
  onToggleSearch: () => void
  showHistory: boolean
  onToggleHistory: () => void
}

export default function Toolbar({
  note, onUpdate, onDelete, onClose,
  showSearch, onToggleSearch,
  showHistory, onToggleHistory,
}: ToolbarProps) {
  const isDark = note.color === 'dark'

  const base = isDark
    ? 'text-white/55 hover:text-white/90 hover:bg-white/10'
    : 'text-black/45 hover:text-black/80 hover:bg-black/8'
  const btn = `no-drag flex items-center justify-center px-1.5 py-1 rounded text-xs font-medium transition-all cursor-pointer select-none ${base}`
  const on  = isDark ? 'bg-white/15 text-white/90' : 'bg-black/10 text-black/80'
  const sep = isDark ? 'border-white/8' : 'border-black/6'

  return (
    <div className={`flex items-center gap-1 px-2 py-1.5 border-t flex-shrink-0 ${sep}`}>

      {/* ── Colour ── */}
      <ColorPicker value={note.color} dark={isDark} onChange={(c: NoteColor) => onUpdate({ color: c })} />

      {/* ── Font size ── */}
      <Tooltip label="Smaller text">
        <button onMouseDown={() => onUpdate({ fontSize: Math.max(10, note.fontSize - 1) })} className={btn}>A−</button>
      </Tooltip>
      <Tooltip label="Larger text">
        <button onMouseDown={() => onUpdate({ fontSize: Math.min(32, note.fontSize + 1) })} className={btn}>A+</button>
      </Tooltip>

      <div className="flex-1" />

      {/* ── Search ── */}
      <Tooltip label="Search notes" shortcut="⌘F">
        <button onMouseDown={onToggleSearch} className={`${btn} ${showSearch ? on : ''}`}>🔍</button>
      </Tooltip>

      {/* ── History ── */}
      <Tooltip label="Note history">
        <button onMouseDown={onToggleHistory} className={`${btn} ${showHistory ? on : ''}`}>🕐</button>
      </Tooltip>

      {/* ── Delete ── */}
      <Tooltip label="Delete this note">
        <button onMouseDown={onDelete} className={`${btn} hover:!text-red-400`}>🗑</button>
      </Tooltip>

      {/* ── Close ── */}
      <Tooltip label="Hide GhostPad" shortcut="⌘⇧H">
        <button onMouseDown={onClose} className={btn}>✕</button>
      </Tooltip>
    </div>
  )
}
