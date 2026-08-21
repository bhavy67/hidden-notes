import { globalShortcut } from 'electron'

interface ShortcutHandlers {
  newNote: () => void
  toggleHideAll: () => void
  toggleGhostAll: () => void
  openManager: () => void
}

export function registerShortcuts(handlers: ShortcutHandlers): void {
  globalShortcut.register('CmdOrCtrl+Shift+N', handlers.newNote)
  globalShortcut.register('CmdOrCtrl+Shift+H', handlers.toggleHideAll)
  globalShortcut.register('CmdOrCtrl+Shift+G', handlers.toggleGhostAll)
  globalShortcut.register('CmdOrCtrl+Shift+M', handlers.openManager)
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
}
