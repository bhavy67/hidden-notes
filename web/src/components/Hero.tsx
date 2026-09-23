import { useEffect, useState } from 'react'
import { detectOS, GITHUB } from '../hooks'

export default function Hero() {
  const [os, setOs] = useState<'mac' | 'windows' | 'other'>('other')
  useEffect(() => { setOs(detectOS()) }, [])

  const primary = os === 'mac'
    ? { href: `${GITHUB}/releases/latest/download/GhostPad.dmg`, label: 'Download for macOS' }
    : os === 'windows'
    ? { href: `${GITHUB}/releases/latest/download/GhostPad.exe`, label: 'Download for Windows' }
    : { href: `${GITHUB}/releases/latest`, label: 'Download free' }

  return (
    <section className="min-h-screen flex flex-col justify-center pt-14 border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 w-full py-20 sm:py-28">

        {/* top label */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-10">
          Open-source · macOS &amp; Windows · Free
        </p>

        <div className="flex flex-col lg:flex-row lg:items-end gap-16">

          {/* headline */}
          <div className="flex-1">
            <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-black leading-[1.02] tracking-tight mb-8">
              Your notes,<br />
              <span className="text-[#f0e040]">off the record.</span>
            </h1>

            <p className="text-[17px] text-white/45 leading-relaxed max-w-md mb-10">
              GhostPad is a floating sticky notepad the OS excludes from every screen recorder, Zoom call, and screenshot. Not filtered. Not blurred.{' '}
              <em className="text-white/65 not-italic">Just gone.</em>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={primary.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#e8e8e8] text-black text-sm font-semibold px-6 py-3 hover:bg-white transition-colors"
              >
                {primary.label}
              </a>
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/20 text-white/55 text-sm px-6 py-3 hover:border-white/50 hover:text-white/80 transition-colors"
              >
                View source
              </a>
            </div>

            <p className="mt-5 text-[12px] text-white/20">
              macOS 10.15+ · Windows 10 build 19041+
            </p>
          </div>

          {/* split mockup */}
          <div className="flex-shrink-0 w-full lg:w-[460px]">
            <div className="grid grid-cols-2 gap-px bg-white/10">

              {/* left pane — what you see */}
              <div className="bg-[#0a0a0a] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-3">You see</p>
                {/* fake app chrome */}
                <div className="border border-white/10">
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/8 bg-white/[0.02]">
                    <span className="w-2 h-2 rounded-full bg-white/15" />
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                    <span className="ml-1.5 text-[10px] text-white/30 truncate">Meeting notes</span>
                  </div>
                  <div className="p-3 font-mono text-[11px] leading-relaxed">
                    <p className="text-white/70 mb-2">Sprint sync</p>
                    <p className="text-white/40">• Auth → Sarah, Fri</p>
                    <p className="text-white/40">• DB window: weekend</p>
                    <p className="text-white/40">• Raise pricing w/ PM</p>
                    <p className="text-white/40 mt-2">Next: <span className="cursor-blink" /></p>
                  </div>
                </div>
              </div>

              {/* right pane — what screen share sees */}
              <div className="bg-[#050505] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-3">Screen share sees</p>
                <div className="border border-white/5 aspect-[4/3] flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl opacity-10">👻</span>
                  <span className="text-[10px] text-white/10 text-center font-mono">// nothing here</span>
                </div>
              </div>

            </div>
            <p className="text-[11px] text-white/20 mt-3 text-right">
              Your colleagues see your desktop. GhostPad is invisible.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
