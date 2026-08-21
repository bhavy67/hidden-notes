import React, { useState, useRef, useEffect } from 'react'
import { NoteColor, NOTE_COLORS } from '../types'
import Tooltip from './Tooltip'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
  dark?: boolean
}

interface PopoverPos {
  bottom: number
  left: number
}

// Approximate rendered width of the swatch grid (5 cols × 28px + gaps + padding)
const POPOVER_WIDTH = 168

export default function ColorPicker({ value, onChange, dark }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const current = NOTE_COLORS[value] ?? NOTE_COLORS.yellow

  function openPopover() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    // Sit above the button with a 6px gap; clamp so it doesn't go off the right edge
    const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)
    setPos({ bottom: window.innerHeight - rect.top + 6, left })
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="no-drag relative">
      <Tooltip label="Note colour">
        <button
          ref={btnRef}
          onMouseDown={(e) => { e.preventDefault(); open ? setOpen(false) : openPopover() }}
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all
            ${dark ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/8'}
            ${open ? (dark ? 'bg-white/10' : 'bg-black/8') : ''}
          `}
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-black/15"
            style={{ background: `rgb(${current.tint})` }}
          />
        </button>
      </Tooltip>

      {open && pos && (
        <div
          ref={popoverRef}
          style={{ position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
          className={`
            p-2.5 rounded-xl shadow-2xl
            ${dark ? 'bg-[#2a2b30]/97 border border-white/12' : 'bg-white/97 border border-black/8'}
            backdrop-blur-md
          `}
        >
          {/* Label */}
          <p className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${dark ? 'text-white/35' : 'text-black/30'}`}>
            Colour
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(NOTE_COLORS).map(([name, conf]) => (
              <button
                key={name}
                onMouseDown={(e) => { e.preventDefault(); onChange(name as NoteColor); setOpen(false) }}
                title={conf.label}
                className={`
                  w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95
                  ${value === name
                    ? 'border-gray-600/60 scale-110 shadow-md'
                    : 'border-transparent hover:border-black/20'
                  }
                `}
                style={{ background: `rgb(${conf.tint})` }}
              />
            ))}
          </div>
          {/* Selected label */}
          <p className={`text-[9px] mt-2 text-center ${dark ? 'text-white/30' : 'text-black/30'}`}>
            {NOTE_COLORS[value]?.label ?? ''}
          </p>
        </div>
      )}
    </div>
  )
}
