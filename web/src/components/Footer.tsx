import { GITHUB } from '../hooks'

export default function Footer() {
  return (
    <footer className="py-8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[12px] text-white/25">
          <span>👻</span>
          <span className="font-semibold">GhostPad</span>
          <span>·</span>
          <span>MIT License · {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-[12px] text-white/25">
          <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="hover:text-white/55 transition-colors">GitHub</a>
          <a href={`${GITHUB}/releases`} target="_blank" rel="noopener noreferrer" className="hover:text-white/55 transition-colors">Releases</a>
          <a href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer" className="hover:text-white/55 transition-colors">Report a bug</a>
        </div>
      </div>
    </footer>
  )
}
