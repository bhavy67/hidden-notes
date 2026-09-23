import { useEffect, useState } from 'react'
import { useReveal, detectOS } from '../hooks'

type OS = 'mac' | 'windows'

const shortcuts: { action: string; desc: string; mac: string[]; win: string[] }[] = [
  { action: 'Show / hide',      desc: 'Toggle from any app',           mac: ['⌘','⇧','Space'],    win: ['Ctrl','⇧','Space'] },
  { action: 'Panic',            desc: 'Hide immediately',              mac: ['Esc'],               win: ['Esc'] },
  { action: 'New note',         desc: 'Open a new tab',                mac: ['⌘','N'],             win: ['Ctrl','N'] },
  { action: 'Close tab',        desc: 'Close current note',            mac: ['⌘','W'],             win: ['Ctrl','W'] },
  { action: 'Search',           desc: 'Full-text + tag search',        mac: ['⌘','K'],             win: ['Ctrl','K'] },
  { action: 'Toggle markdown',  desc: 'Switch text ↔ markdown',        mac: ['⌘','M'],             win: ['Ctrl','M'] },
  { action: 'Font size',        desc: 'Zoom in / out',                 mac: ['⌘','+/−'],           win: ['Ctrl','+/−'] },
  { action: 'History',          desc: 'Browse version snapshots',      mac: ['⌘','H'],             win: ['Ctrl','H'] },
]

export default function Shortcuts() {
  const [os, setOs] = useState<OS>('mac')
  const { ref, visible } = useReveal()

  useEffect(() => {
    const d = detectOS()
    setOs(d === 'windows' ? 'windows' : 'mac')
  }, [])

  return (
    <section className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''} flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">Shortcuts</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Keyboard first.<br />Always.</h2>
          </div>

          {/* OS toggle */}
          <div className="flex items-center border border-white/12">
            {(['mac', 'windows'] as OS[]).map((o) => (
              <button
                key={o}
                onClick={() => setOs(o)}
                className={`px-4 py-1.5 text-[12px] font-medium transition-colors ${
                  os === o ? 'bg-white text-black' : 'text-white/35 hover:text-white/70'
                }`}
              >
                {o === 'mac' ? 'macOS' : 'Windows'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/8">
          {shortcuts.map((s, i) => (
            <ShortcutRow key={s.action} s={s} os={os} i={i} />
          ))}
        </div>

      </div>
    </section>
  )
}

function ShortcutRow({ s, os, i }: { s: typeof shortcuts[0]; os: OS; i: number }) {
  const { ref, visible } = useReveal()
  const keys = os === 'windows' ? s.win : s.mac
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} flex items-center justify-between gap-6 py-4 border-b border-white/8 hover:bg-white/[0.02] transition-colors px-1`}
      style={{ transitionDelay: `${i * 40}ms` }}
    >
      <div className="flex items-baseline gap-4 sm:gap-8">
        <span className="text-[10px] font-mono text-white/20 w-5">{String(i + 1).padStart(2, '0')}</span>
        <div>
          <span className="text-[13px] font-medium text-white/80">{s.action}</span>
          <span className="hidden sm:inline text-[12px] text-white/25 ml-3">{s.desc}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {keys.map((k, j) => (
          <span key={j} className="flex items-center gap-1">
            <kbd>{k}</kbd>
            {j < keys.length - 1 && <span className="text-white/15 text-[10px]">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
