import { BrowserWindow, app } from 'electron'
import os from 'os'

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'

// WDA_EXCLUDEFROMCAPTURE (the strong API used by setContentProtection on Windows)
// requires Windows 10 build 19041 or later.
export function isWindowsBuildSupported(): boolean {
  if (!isWindows) return true
  const parts = os.release().split('.').map(Number)
  return parts.length >= 3 && parts[2] >= 19041
}

export function hideDockIcon(): void {
  if (isMac) {
    // accessory policy removes the app from dock, Cmd+Tab switcher, and Spotlight
    app.setActivationPolicy('accessory')
    if (app.dock) app.dock.hide()
  }
}

export function setPinned(win: BrowserWindow, pinned: boolean): void {
  if (pinned) {
    win.setAlwaysOnTop(true, 'screen-saver')
    if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreenSpaces: true })
  } else {
    win.setAlwaysOnTop(false)
    if (isMac) win.setVisibleOnAllWorkspaces(false)
  }
}

export function applyContentProtection(win: BrowserWindow): void {
  if (!win || win.isDestroyed()) return
  win.setContentProtection(true)
}

export function captureExclusionCaveat(): string | null {
  if (isWindows && !isWindowsBuildSupported()) {
    return `⚠ Windows ${os.release()} — screen capture exclusion needs build 19041+`
  }
  return null
}
