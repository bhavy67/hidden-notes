import React, { useEffect, useState } from 'react'
import type { NoteSnapshot } from '../../../main/types'

interface HistoryPanelProps {
  noteId: string
  onRestore: (snapshotId: number) => void
  onClose: () => void
  isDark: boolean
}

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HistoryPanel({ noteId, onRestore, onClose, isDark }: HistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([])
  const [restoring, setRestoring] = useState<number | null>(null)

  useEffect(() => {
    window.ghostpad.getHistory(noteId).then(setSnapshots)
  }, [noteId])

  const bg = isDark ? 'bg-black/30 border-white/10' : 'bg-white/40 border-black/8'
  const rowHover = isDark ? 'hover:bg-white/10' : 'hover:bg-black/6'
  const textMain = isDark ? 'text-white/75' : 'text-black/65'
  const textSub = isDark ? 'text-white/35' : 'text-black/35'

  return (
    <div className={`flex flex-col border-b backdrop-blur-sm ${bg}`} style={{ maxHeight: 180 }}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${textSub}`}>Note history</span>
        <button onMouseDown={onClose} className={`text-xs opacity-40 hover:opacity-80 ${textMain}`}>✕</button>
      </div>

      <div className="overflow-y-auto">
        {snapshots.length === 0 ? (
          <p className={`px-3 pb-2 text-[10px] ${textSub}`}>
            No snapshots yet — history saves automatically as you type.
          </p>
        ) : (
          snapshots.map((snap) => {
            const preview = snap.content.slice(0, 55)
            return (
              <div key={snap.id} className={`flex items-center gap-2 px-3 py-1.5 ${rowHover} transition-colors`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${textMain}`}>{formatTime(snap.savedAt)}</p>
                  <p className={`text-[9px] truncate ${textSub}`}>{preview || 'Empty note'}</p>
                </div>
                <button
                  onMouseDown={async () => {
                    setRestoring(snap.id)
                    await onRestore(snap.id)
                    setRestoring(null)
                    onClose()
                  }}
                  disabled={restoring === snap.id}
                  className={`text-[10px] px-2 py-0.5 rounded transition-all flex-shrink-0
                    ${isDark ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-black/8 hover:bg-black/15 text-black/60'}
                    ${restoring === snap.id ? 'opacity-40' : ''}
                  `}
                >
                  {restoring === snap.id ? '…' : 'Restore'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
