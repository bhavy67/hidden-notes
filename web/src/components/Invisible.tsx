import { useReveal } from '../hooks'

export default function Invisible() {
  const { ref, visible } = useReveal()

  return (
    <section id="invisible" className="border-b border-white/8">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">

        <div ref={ref} className={`reveal ${visible ? 'visible' : ''} mb-14`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">The tech</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-2xl">
            Why it actually works.<br />
            <span className="text-white/30">Most tools just fake it.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/8">

          <OsCard
            os="macOS"
            api="NSWindowSharingNone"
            delay={0}
            body={[
              "Apple's Window Server has a flag — NSWindowSharingNone — that marks a window's backing store as off-limits to any other process.",
              "This includes Zoom, Teams, QuickTime, OBS, and the system screenshot shortcut. They all call the same OS API. They all see nothing.",
              "Electron exposes this via win.setContentProtection(true). GhostPad applies it the moment the window handle is created — before the first frame renders.",
            ]}
            note="Requires macOS 10.15+"
          />

          <OsCard
            os="Windows"
            api="WDA_EXCLUDEFROMCAPTURE"
            delay={100}
            body={[
              "Windows 10 build 19041 added WDA_EXCLUDEFROMCAPTURE to the SetWindowDisplayAffinity API. The window renders as a solid black region to any capture process.",
              "This covers all tools that use the OS display affinity system, which includes the major conferencing apps.",
              "Older Windows builds run GhostPad normally — it just won't be excluded from capture. The app tells you if your build is unsupported.",
            ]}
            note="Requires Windows 10 build 19041+"
          />

        </div>

        {/* Myth row */}
        <div className="mt-px grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/8">
          {[
            { q: 'Does it work with Zoom?',         a: 'Yes. Zoom uses the OS capture API.' },
            { q: 'What about OBS?',                  a: 'Yes. Window capture and display capture both see blank.' },
            { q: 'What about iOS screen mirroring?', a: 'iOS mirroring routes through the OS — excluded too.' },
          ].map((item) => (
            <MythCell key={item.q} {...item} />
          ))}
        </div>

      </div>
    </section>
  )
}

function OsCard({ os, api, body, note, delay }: {
  os: string; api: string; body: string[]; note: string; delay: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} bg-[#0a0a0a] p-8`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-5">{os}</p>
      <p className="font-mono text-[13px] text-[#f0e040] mb-6 break-all">{api}</p>
      <div className="space-y-4">
        {body.map((p, i) => (
          <p key={i} className="text-[13px] text-white/45 leading-relaxed">{p}</p>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-white/20 font-mono">{note}</p>
    </div>
  )
}

function MythCell({ q, a }: { q: string; a: string }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''} bg-[#0a0a0a] px-6 py-5`}>
      <p className="text-[13px] font-semibold text-white/70 mb-1.5">{q}</p>
      <p className="text-[12px] text-white/35">{a}</p>
    </div>
  )
}
