import React from 'react'
import { Note, NoteColor } from '../types'
import ColorPicker from './ColorPicker'
import Tooltip from './Tooltip'

interface ToolbarProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  onDelete: () => void
  onClose: () => void
  onTogglePin: () => void
  onTogglePopout?: () => void
  showSearch: boolean
  onToggleSearch: () => void
  showHistory: boolean
  onToggleHistory: () => void
  showTags: boolean
  onToggleTags: () => void
}

export default function Toolbar({
  note, onUpdate, onDelete, onClose, onTogglePin, onTogglePopout,
  showSearch, onToggleSearch,
  showHistory, onToggleHistory,
  showTags, onToggleTags,
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
      <Tooltip label="Smaller text" shortcut="−2px">
        <button onMouseDown={() => onUpdate({ fontSize: Math.max(10, note.fontSize - 2) })} className={btn}>A−</button>
      </Tooltip>
      <span
        className={`text-[10px] tabular-nums font-medium select-none px-0.5 ${isDark ? 'text-white/30' : 'text-black/30'}`}
      >{note.fontSize}</span>
      <Tooltip label="Larger text" shortcut="+2px">
        <button onMouseDown={() => onUpdate({ fontSize: Math.min(32, note.fontSize + 2) })} className={btn}>A+</button>
      </Tooltip>

      {/* ── Markdown mode ── */}
      <Tooltip label={note.contentType === 'markdown' ? 'Plain text mode' : 'Markdown mode'}>
        <button
          onMouseDown={() => onUpdate({ contentType: note.contentType === 'markdown' ? 'text' : 'markdown' })}
          className={`${btn} ${note.contentType === 'markdown' ? on : ''} font-mono text-[10px]`}
        >MD</button>
      </Tooltip>

      <div className="flex-1" />

      {/* ── Pin ── */}
      <Tooltip label={note.pinned ? 'Unpin tab' : 'Pin tab to front'}>
        <button onMouseDown={onTogglePin} className={`${btn} ${note.pinned ? on : ''}`}>📌</button>
      </Tooltip>

      {/* ── Tags ── */}
      <Tooltip label="Tags">
        <button onMouseDown={onToggleTags} className={`${btn} ${showTags ? on : ''}`}>#</button>
      </Tooltip>

      {/* ── Search ── */}
      <Tooltip label="Search notes" shortcut="⌘F">
        <button onMouseDown={onToggleSearch} className={`${btn} ${showSearch ? on : ''}`}>🔍</button>
      </Tooltip>

      {/* ── History ── */}
      <Tooltip label="Note history">
        <button onMouseDown={onToggleHistory} className={`${btn} ${showHistory ? on : ''}`}>🕐</button>
      </Tooltip>

      {/* ── Pop-out / merge-back ── */}
      {onTogglePopout && (
        <Tooltip label={note.poppedOut ? 'Merge back to main window' : 'Pop out into own window'}>
          <button onMouseDown={onTogglePopout} className={btn}>
            {note.poppedOut ? '↙' : '↗'}
          </button>
        </Tooltip>
      )}

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
