import { BrowserWindow, app } from 'electron'

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'

export function hideDockIcon(): void {
  if (isMac && app.dock) app.dock.hide()
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
  if (isWindows) {
    return 'Screen-capture exclusion requires Windows 10 (build 19041) or later.'
  }
  return null
}
