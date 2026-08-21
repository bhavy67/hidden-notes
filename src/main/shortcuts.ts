import { globalShortcut } from 'electron'

interface ShortcutHandlers {
  newNote: () => void
  toggleHideAll: () => void
  openManager: () => void
  panicToggle: () => void
}

export function registerShortcuts(handlers: ShortcutHandlers): void {
  globalShortcut.register('CmdOrCtrl+Shift+N', handlers.newNote)
  globalShortcut.register('CmdOrCtrl+Shift+H', handlers.toggleHideAll)
  globalShortcut.register('CmdOrCtrl+Shift+M', handlers.openManager)
  globalShortcut.register('CmdOrCtrl+Shift+.', handlers.panicToggle)
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
}
