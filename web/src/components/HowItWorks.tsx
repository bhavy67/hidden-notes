import { useReveal } from '../hooks'

const steps = [
  {
    n: '01',
    title: 'Global shortcut, any app',
    body: 'Press your hotkey from anywhere — Zoom, Figma, your IDE. GhostPad pops to the front. Hit it again, gone.',
  },
  {
    n: '02',
    title: 'OS excludes it from capture',
    body: 'The window is marked capture-excluded the moment it opens. Every screen recorder, screenshot tool, and screen share that uses the OS APIs sees nothing.',
  },
  {
    n: '03',
    title: 'Panic key — under 300ms',
    body: 'Press Esc. GhostPad waits for any pending writes to finish, then hides. No data loss, no half-written note left on screen.',
  },
  {
    n: '04',
    title: 'Notes are always there',
    body: 'Everything is written to a local SQLite file as you type. Reopen in three days. Your notes are exactly where you left them.',
  },
]

export default function HowItWorks() {
  const { ref, visible } = useReveal()

  return (
    <section id="how-it-works" className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''} mb-16`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Simple for you.<br />Invisible to everyone else.</h2>
        </div>

        <div className="space-y-0 divide-y divide-white/8">
          {steps.map((s, i) => (
            <Step key={s.n} step={s} delay={i * 80} />
          ))}
        </div>

      </div>
    </section>
  )
}

function Step({ step, delay }: { step: typeof steps[0]; delay: number }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-10 py-8`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-[11px] font-mono text-white/20 flex-shrink-0 sm:w-8">{step.n}</span>
      <h3 className="text-lg sm:text-xl font-semibold tracking-tight flex-shrink-0 sm:w-64">{step.title}</h3>
      <p className="text-sm text-white/45 leading-relaxed max-w-lg">{step.body}</p>
    </div>
  )
}
