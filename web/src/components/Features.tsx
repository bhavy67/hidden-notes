import { useReveal } from '../hooks'

const features = [
  { n: '01', title: 'Always on top',      body: 'Floats above every window at system level. Won\'t get buried under your browser.' },
  { n: '02', title: 'Markdown mode',      body: 'Toggle between plain text and markdown. Edit and preview without leaving the tab.' },
  { n: '03', title: 'Tags + search',      body: 'Tag notes. Search by title, content, or tag with keyboard-only navigation.' },
  { n: '04', title: 'Colour-coded tabs',  body: 'Six colours per note. Visual grouping at a glance.' },
  { n: '05', title: 'Version history',    body: '25 rolling snapshots per note. Restore any point in one click.' },
  { n: '06', title: 'Font size control',  body: 'Scale 11px to 26px on the fly. Keyboard shortcut.' },
  { n: '07', title: 'Fully offline',      body: 'SQLite, local. No cloud. No account. No sync. Your machine only.' },
  { n: '08', title: 'Keyboard first',     body: 'Every action has a shortcut. You should never need to reach for the mouse.' },
]

export default function Features() {
  const { ref, visible } = useReveal()

  return (
    <section id="features" className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''} flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Everything you need.<br />Nothing you don't.</h2>
          </div>
          <p className="text-sm text-white/35 max-w-xs leading-relaxed">
            Built for people who live in meetings and need a scratchpad that won't get them caught.
          </p>
        </div>

        {/* grid with borders forming a table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-white/8">
          {features.map((f, i) => (
            <FeatureCell key={f.n} feature={f} delay={i * 50} />
          ))}
        </div>

      </div>
    </section>
  )
}

function FeatureCell({ feature, delay }: { feature: typeof features[0]; delay: number }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} border-r border-b border-white/8 p-6 hover:bg-white/[0.025] transition-colors`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-[10px] font-mono text-white/20 block mb-3">{feature.n}</span>
      <h3 className="text-sm font-semibold text-white/85 mb-2">{feature.title}</h3>
      <p className="text-[13px] text-white/40 leading-relaxed">{feature.body}</p>
    </div>
  )
}
