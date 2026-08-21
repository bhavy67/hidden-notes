import { screen } from 'electron'

interface Bounds {
  x?: number
  y?: number
  width: number
  height: number
  displayId?: string
}

export function clampToVisibleDisplay(bounds: Bounds): {
  x: number
  y: number
  width: number
  height: number
  displayId: string
} {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()

  let targetDisplay = primary
  if (bounds.x !== undefined && bounds.y !== undefined) {
    const nearest = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
    targetDisplay = nearest
  }

  const wa = targetDisplay.workArea
  const x = Math.max(wa.x, Math.min(bounds.x ?? wa.x + 40, wa.x + wa.width - bounds.width))
  const y = Math.max(wa.y, Math.min(bounds.y ?? wa.y + 40, wa.y + wa.height - bounds.height))

  return { x, y, width: bounds.width, height: bounds.height, displayId: String(targetDisplay.id) }
}

export function displayIdForPoint(x: number, y: number): string {
  const display = screen.getDisplayNearestPoint({ x, y })
  return String(display.id)
}
