import React, { ReactNode } from 'react'

interface TooltipProps {
  label: string
  shortcut?: string
  children: ReactNode
  side?: 'top' | 'bottom'
}

export default function Tooltip({ label, shortcut, children, side = 'top' }: TooltipProps) {
  const isTop = side === 'top'
  return (
    <div className="relative group/tip">
      {children}
      <div
        className={`
          absolute ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}
          left-1/2 -translate-x-1/2
          pointer-events-none z-[200]
          opacity-0 group-hover/tip:opacity-100
          transition-opacity duration-100 delay-500
          whitespace-nowrap
        `}
      >
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-900/90 shadow-lg">
          <span className="text-[10px] text-white/90 font-medium">{label}</span>
          {shortcut && (
            <span className="text-[9px] text-white/45 font-mono">{shortcut}</span>
          )}
        </div>
        {/* Arrow */}
        <div className={`
          absolute left-1/2 -translate-x-1/2
          w-0 h-0
          border-x-[5px] border-x-transparent
          ${isTop
            ? 'top-full border-t-[5px] border-t-gray-900/90'
            : 'bottom-full border-b-[5px] border-b-gray-900/90'
          }
        `} />
      </div>
    </div>
  )
}
