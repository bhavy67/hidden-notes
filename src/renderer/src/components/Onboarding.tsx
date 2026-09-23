import React from 'react'

const SHORTCUTS = [
  { keys: ['⌘⇧H'],  label: 'Show / hide GhostPad from any app' },
  { keys: ['⌘⇧.'],  label: 'Panic — hide instantly, no data loss' },
  { keys: ['⌘⇧N'],  label: 'New note from anywhere' },
  { keys: ['⌘F'],   label: 'Search notes' },
  { keys: ['⌘Z'],   label: 'Undo in current note' },
]

interface OnboardingProps {
  isDark: boolean
  onDismiss: () => void
}

export default function Onboarding({ isDark, onDismiss }: OnboardingProps) {
  const bg    = isDark ? 'bg-[#1c1d22] border-white/10'   : 'bg-white/95 border-black/8'
  const text  = isDark ? 'text-white/85'                   : 'text-black/80'
  const sub   = isDark ? 'text-white/40'                   : 'text-black/40'
  const divid = isDark ? 'border-white/8'                  : 'border-black/6'
  const kbg   = isDark ? 'bg-white/10 border-white/12'     : 'bg-black/6 border-black/10'
  const btn   = isDark
    ? 'bg-white/10 hover:bg-white/18 text-white/80 border border-white/12'
    : 'bg-black/8 hover:bg-black/14 text-black/70 border border-black/10'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`rounded-xl border shadow-2xl p-5 w-[280px] ${bg}`}>

        <div className="text-center mb-4">
          <span className="text-3xl">👻</span>
          <h2 className={`text-sm font-bold mt-2 ${text}`}>Welcome to GhostPad</h2>
          <p className={`text-[11px] mt-1 leading-relaxed ${sub}`}>
            Your notes are excluded from screen sharing at the OS level.
          </p>
        </div>

        <div className={`border-t ${divid} pt-3 space-y-2.5 mb-4`}>
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <span className={`text-[11px] leading-tight ${sub}`}>{s.label}</span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {s.keys.map((k) => (
                  <kbd key={k} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${kbg} ${text}`}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onMouseDown={onDismiss}
          className={`w-full text-xs font-medium py-2 rounded-lg transition-colors ${btn}`}
        >
          Got it — let's go
        </button>

      </div>
    </div>
  )
}
