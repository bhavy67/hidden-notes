import React from 'react'
import { Note, NoteColor, ContentType } from '../types'
import ColorPicker from './ColorPicker'

interface ToolbarProps {
  note: Note
  onUpdate: (patch: Partial<Note>) => void
  onPopOut: () => void
  onDelete: () => void
  onClose: () => void
}

export default function Toolbar({ note, onUpdate, onPopOut, onDelete, onClose }: ToolbarProps) {
  const isDark = note.color === 'dark'
  const base = isDark ? 'text-white/60 hover:text-white/90 hover:bg-white/12' : 'text-black/50 hover:text-black/80 hover:bg-black/8'
  const btnClass = `no-drag flex items-center justify-center px-1.5 py-1 rounded text-xs font-medium transition-all cursor-pointer select-none ${base}`
  const activeClass = isDark ? 'bg-white/15 text-white/90' : 'bg-black/10 text-black/80'

  return (
    <div className={`flex items-center gap-0.5 px-2 py-1.5 border-t ${isDark ? 'border-white/8' : 'border-black/6'}`}>
      {/* Color picker */}
      <ColorPicker
        value={note.color}
        dark={isDark}
        onChange={(color: NoteColor) => onUpdate({ color })}
      />

      {/* Opacity */}
      <div className="no-drag flex items-center gap-1 ml-1">
        <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-black/35'}`}>opacity</span>
        <input
          type="range"
          min={30}
          max={100}
          value={Math.round(note.opacity * 100)}
          onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
          className="w-14"
          title={`Opacity: ${Math.round(note.opacity * 100)}%`}
        />
      </div>

      {/* Font size */}
      <button
        onMouseDown={() => onUpdate({ fontSize: Math.max(10, note.fontSize - 1) })}
        className={btnClass}
        title="Smaller text"
      >A−</button>
      <button
        onMouseDown={() => onUpdate({ fontSize: Math.min(32, note.fontSize + 1) })}
        className={btnClass}
        title="Larger text"
      >A+</button>

      {/* Content type toggle */}
      <div className={`no-drag flex items-center rounded overflow-hidden border ml-0.5 ${isDark ? 'border-white/10' : 'border-black/8'}`}>
        {(['text', 'checklist', 'markdown'] as ContentType[]).map((ct) => (
          <button
            key={ct}
            onMouseDown={() => onUpdate({ contentType: ct })}
            className={`px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-all select-none ${
              note.contentType === ct
                ? (isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black/80')
                : (isDark ? 'text-white/40 hover:bg-white/8' : 'text-black/35 hover:bg-black/5')
            }`}
            title={`Switch to ${ct} mode`}
          >
            {ct === 'text' ? 'T' : ct === 'checklist' ? '☑' : 'M'}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Pin */}
      <button
        onMouseDown={() => onUpdate({ pinned: !note.pinned })}
        className={`${btnClass} ${note.pinned ? activeClass : ''}`}
        title={note.pinned ? 'Pinned (always on top)' : 'Not pinned'}
      >📌</button>

      {/* Ghost */}
      <button
        onMouseDown={() => onUpdate({ ghost: !note.ghost })}
        className={`${btnClass} ${note.ghost ? activeClass : ''}`}
        title={note.ghost ? 'Click-through ON' : 'Click-through OFF (⌘⇧G)'}
      >👻</button>

      {/* Pop out */}
      <button
        onMouseDown={onPopOut}
        className={btnClass}
        title="Pop out as floating window"
      >⬡</button>

      {/* Delete */}
      <button
        onMouseDown={onDelete}
        className={`${btnClass} hover:text-red-500`}
        title="Delete this note"
      >🗑</button>

      {/* Close panel */}
      <button
        onMouseDown={onClose}
        className={btnClass}
        title="Hide GhostPad (⌘⇧H)"
      >✕</button>
    </div>
  )
}
