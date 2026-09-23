import { useEffect, useState } from 'react'
import { detectOS, GITHUB, useReveal } from '../hooks'

export default function Download() {
  const [os, setOs] = useState<'mac' | 'windows' | 'other'>('other')
  const { ref, visible } = useReveal()
  useEffect(() => { setOs(detectOS()) }, [])

  return (
    <section className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-8">Download</p>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-12">
            Your notes.<br />
            No one else's business.<br />
            <span className="text-[#f0e040]">Start for free.</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <a
              href={`${GITHUB}/releases/latest/download/GhostPad.dmg`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 border px-7 py-5 hover:bg-white hover:text-black hover:border-white transition-colors group ${
                os === 'mac' ? 'border-white text-white' : 'border-white/20 text-white/55 hover:text-black'
              }`}
            >
              <span className="text-2xl">🍎</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Download for macOS</p>
                <p className="text-[11px] opacity-50 mt-0.5">macOS 10.15 · Apple Silicon &amp; Intel</p>
              </div>
              {os === 'mac' && (
                <span className="ml-auto text-[10px] uppercase tracking-widest text-white/40 border border-white/20 px-2 py-0.5">Your OS</span>
              )}
            </a>

            <a
              href={`${GITHUB}/releases/latest/download/GhostPad.exe`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 border px-7 py-5 hover:bg-white hover:text-black hover:border-white transition-colors group ${
                os === 'windows' ? 'border-white text-white' : 'border-white/20 text-white/55 hover:text-black'
              }`}
            >
              <span className="text-2xl">🪟</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Download for Windows</p>
                <p className="text-[11px] opacity-50 mt-0.5">Windows 10 build 19041+</p>
              </div>
              {os === 'windows' && (
                <span className="ml-auto text-[10px] uppercase tracking-widest text-white/40 border border-white/20 px-2 py-0.5">Your OS</span>
              )}
            </a>
          </div>

          <div className="flex items-center gap-5 text-[12px] text-white/25">
            <span>Free forever</span>
            <span>·</span>
            <span>No account</span>
            <span>·</span>
            <a href={`${GITHUB}`} target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">MIT license ↗</a>
            <span>·</span>
            <a href={`${GITHUB}/releases`} target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">All releases ↗</a>
          </div>
        </div>

      </div>
    </section>
  )
}
