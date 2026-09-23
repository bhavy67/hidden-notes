import { useEffect, useState } from 'react'
import { GITHUB } from '../hooks'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
      scrolled ? 'bg-[#0a0a0a] border-b border-white/8' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="text-base">👻</span>
          <span className="text-sm font-semibold tracking-tight">GhostPad</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-white/35">
          {[
            ['#how-it-works', 'How it works'],
            ['#features',     'Features'],
            ['#invisible',    'The tech'],
            ['#faq',          'FAQ'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="hover:text-white/80 transition-colors">{label}</a>
          ))}
        </div>

        <a
          href={`${GITHUB}/releases/latest`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium border border-white/20 text-white/70 px-4 py-1.5 hover:border-white/60 hover:text-white transition-colors"
        >
          Download ↗
        </a>
      </div>
    </nav>
  )
}
