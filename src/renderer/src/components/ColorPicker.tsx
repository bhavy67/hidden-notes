import React, { useState, useRef, useEffect } from 'react'
import { NoteColor, NOTE_COLORS } from '../types'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
  dark?: boolean
}

export default function ColorPicker({ value, onChange, dark }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = NOTE_COLORS[value] ?? NOTE_COLORS.yellow

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="no-drag relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all
          ${dark ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/8'}
        `}
        title="Note color"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/15"
          style={{ background: `rgb(${current.tint})` }}
        />
      </button>

      {open && (
        <div
          className={`
            absolute bottom-9 left-0 z-50 p-2 rounded-xl shadow-xl
            ${dark ? 'bg-[#2a2b30]/95' : 'bg-white/95'}
            backdrop-blur-sm border
            ${dark ? 'border-white/10' : 'border-black/8'}
          `}
        >
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(NOTE_COLORS).map(([name, conf]) => (
              <button
                key={name}
                onMouseDown={(e) => { e.preventDefault(); onChange(name as NoteColor); setOpen(false) }}
                className={`
                  w-6 h-6 rounded-full border transition-transform hover:scale-110
                  ${value === name ? 'ring-2 ring-offset-1 ring-black/30 scale-110' : 'border-black/10'}
                `}
                style={{ background: `rgb(${conf.tint})` }}
                title={conf.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
