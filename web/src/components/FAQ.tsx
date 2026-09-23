import { useState } from 'react'
import { useReveal } from '../hooks'

const faqs = [
  {
    q: 'Does it actually work with Zoom, Teams, and Meet?',
    a: 'Yes. All three use the OS window capture API, which respects the exclusion flag. GhostPad renders as a blank region in your video feed and in any recording made by the conferencing tool.',
  },
  {
    q: 'What if someone physically looks at my monitor?',
    a: "GhostPad is invisible to digital capture — not to human eyes. If someone is in the same room, they'll see it. That's what the panic key is for.",
  },
  {
    q: 'Is my data ever sent anywhere?',
    a: 'No. GhostPad stores everything in a local SQLite file on your machine. No cloud sync, no telemetry, no account, no server.',
  },
  {
    q: 'Does it work on older Windows?',
    a: "GhostPad runs on any Windows version, but screen-capture exclusion requires build 19041+. On older builds it works as a notepad — just not hidden from screen share. The app tells you.",
  },
  {
    q: 'Will it slow my machine down?',
    a: 'No. CPU usage at idle is near zero. RAM footprint is 80–120 MB, similar to a browser tab. SQLite writes are synchronous and fast.',
  },
  {
    q: 'Can I have multiple notes?',
    a: 'Yes. GhostPad is tabbed. Each note has its own colour, tags, and version history. Open as many as you like.',
  },
  {
    q: 'Is it open source?',
    a: 'Yes. MIT license. Read the code, fork it, contribute. GitHub link is in the footer.',
  },
]

export default function FAQ() {
  const { ref, visible } = useReveal()

  return (
    <section id="faq" className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''} mb-12`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Questions you<br />were thinking.
          </h2>
        </div>

        <div className="max-w-3xl divide-y divide-white/8 border-t border-white/8">
          {faqs.map((item, i) => (
            <FAQItem key={i} item={item} delay={i * 40} />
          ))}
        </div>

      </div>
    </section>
  )
}

function FAQItem({ item, delay }: { item: typeof faqs[0]; delay: number }) {
  const [open, setOpen] = useState(false)
  const { ref, visible } = useReveal()

  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 py-5 text-left hover:text-white transition-colors text-white/75"
      >
        <span className="text-[15px] font-medium">{item.q}</span>
        <span className={`flex-shrink-0 text-white/30 text-lg leading-none transition-transform duration-150 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <p className="text-[13px] text-white/40 leading-relaxed pb-5 max-w-2xl">{item.a}</p>
      )}
    </div>
  )
}
