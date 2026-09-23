import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog } from 'electron'
import path from 'path'
import { NoteStore } from './store'
import { Note, NotePatch, IPC } from './types'
import { setPinned, applyContentProtection, hideDockIcon, captureExclusionCaveat } from './platform'
import { registerShortcuts, unregisterAll } from './shortcuts'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// ── Panic hide state ────────────────────────────────────────
let panicActive = false
let panicMainWasVisible = false
let panicHideTimer: ReturnType<typeof setTimeout> | null = null

const store = new NoteStore(app.getPath('userData'))

// ────────────────────────────────────────────────────────────
// Main GhostPad panel window (tabbed)
// ────────────────────────────────────────────────────────────

function createMainWindow(): BrowserWindow {
  const primary = screen.getPrimaryDisplay()
  const wa = primary.workArea
  const width = 440
  const height = 360

  const win = new BrowserWindow({
    width,
    height,
    x: wa.x + wa.width - width - 32,
    y: wa.y + 40,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: true,
    minWidth: 300,
    minHeight: 240,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setPinned(win, true)
  // Apply protection at creation so there is zero window of exposure
  applyContentProtection(win)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    applyContentProtection(win)
    win.showInactive()
  })

  // Re-apply every time the window becomes visible (OS can reset the flag on restore)
  win.on('show', () => applyContentProtection(win))

  win.on('closed', () => { mainWindow = null })

  return win
}

// ────────────────────────────────────────────────────────────
// Panic hide — instant hide/restore of the GhostPad window
// ────────────────────────────────────────────────────────────

function panicToggle(): void {
  if (!panicActive) {
    panicActive = true
    panicMainWasVisible = !!mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()
    if (panicMainWasVisible) {
      // Ask renderer to flush any pending edits first, then hide when confirmed.
      // IPC messages are ordered — all pending notes:update calls from the renderer
      // will be processed before panic:flush-done arrives, guaranteeing no data loss.
      broadcast(IPC.PANIC_PRE, null)
      // Safety fallback: hide after 300ms even if the renderer never responds
      panicHideTimer = setTimeout(() => {
        panicHideTimer = null
        mainWindow?.hide()
      }, 300)
    }
  } else {
    if (panicHideTimer) { clearTimeout(panicHideTimer); panicHideTimer = null }
    panicActive = false
    if (panicMainWasVisible) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        mainWindow = createMainWindow()
      } else {
        applyContentProtection(mainWindow)
        mainWindow.showInactive()
      }
    }
  }
  updateTrayMenu()
}

// Renderer confirmed all pending edits are flushed — now safe to hide
ipcMain.on(IPC.PANIC_FLUSH_DONE, () => {
  if (panicHideTimer) { clearTimeout(panicHideTimer); panicHideTimer = null }
  if (panicActive && panicMainWasVisible) mainWindow?.hide()
})

// ────────────────────────────────────────────────────────────
// Broadcast notes state to the main window
// ────────────────────────────────────────────────────────────

function broadcast(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

// ────────────────────────────────────────────────────────────
// IPC handlers
// ────────────────────────────────────────────────────────────

ipcMain.handle(IPC.NOTES_GET_ALL, () => {
  try { return store.all() }
  catch (err) { console.error('[GhostPad] notes:getAll failed:', err); return [] }
})

ipcMain.handle(IPC.NOTES_CREATE, (_e, overrides: Partial<Note>) => {
  try {
    const title = overrides.title !== undefined ? overrides.title : `Tab ${store.nextTabNumber()}`
    const note = store.create({ ...overrides, title })
    broadcast(IPC.NOTES_CHANGED, store.all())
    updateTrayMenu()
    return note
  } catch (err) {
    console.error('[GhostPad] notes:create failed:', err)
    return null
  }
})

const snapshotTimers = new Map<string, ReturnType<typeof setTimeout>>()

ipcMain.handle(IPC.NOTES_UPDATE, (_e, id: string, patch: NotePatch) => {
  try {
    const note = store.update(id, patch)
    if (!note) return null

    if (patch.content !== undefined) {
      const existing = snapshotTimers.get(id)
      if (existing) clearTimeout(existing)
      snapshotTimers.set(id, setTimeout(() => {
        try { store.saveSnapshot(id) } catch (err) { console.error('[GhostPad] saveSnapshot failed:', err) }
        snapshotTimers.delete(id)
      }, 8000))
    }

    broadcast(IPC.NOTES_CHANGED, store.all())
    updateTrayMenu()
    return note
  } catch (err) {
    console.error('[GhostPad] notes:update failed:', err)
    return null
  }
})

ipcMain.handle(IPC.NOTES_DELETE, (_e, id: string) => {
  try {
    store.remove(id)
    broadcast(IPC.NOTES_CHANGED, store.all())
    updateTrayMenu()
  } catch (err) {
    console.error('[GhostPad] notes:delete failed:', err)
  }
})

ipcMain.on(IPC.WINDOW_CLOSE, () => {
  mainWindow?.hide()
  updateTrayMenu()
})

ipcMain.on(IPC.PANIC_TOGGLE, () => panicToggle())

ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize())

ipcMain.handle(IPC.HISTORY_GET, (_e, noteId: string) => {
  try { return store.getHistory(noteId) }
  catch (err) { console.error('[GhostPad] history:get failed:', err); return [] }
})

ipcMain.handle(IPC.HISTORY_RESTORE, (_e, noteId: string, snapshotId: number) => {
  try {
    const history = store.getHistory(noteId)
    const snapshot = history.find((h) => h.id === snapshotId)
    if (!snapshot) return null
    store.saveSnapshot(noteId)
    const updated = store.update(noteId, { content: snapshot.content })
    broadcast(IPC.NOTES_CHANGED, store.all())
    return updated
  } catch (err) {
    console.error('[GhostPad] history:restore failed:', err)
    return null
  }
})

// ────────────────────────────────────────────────────────────
// Tray
// ────────────────────────────────────────────────────────────

function buildTrayIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(path.join(__dirname, '../../build/tray-icon.png'))
}

function noteLabel(note: Note): string {
  const raw = note.title || note.content || ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, 28) || 'Untitled note'
}

function updateTrayMenu(): void {
  if (!tray) return
  const notes = store.all()
  const caveat = captureExclusionCaveat()

  const notesSubmenu: Electron.MenuItemConstructorOptions[] =
    notes.length === 0
      ? [{ label: 'No notes yet', enabled: false }]
      : notes.map((n) => ({
          label: `${n.visible ? '●' : '○'} ${noteLabel(n)}`,
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
            else mainWindow.show()
          }
        }))

  const panicLabel: Electron.MenuItemConstructorOptions = panicActive
    ? { label: '⚡ Hidden (panic mode) — press ⌘⇧. to restore', enabled: false }
    : { label: '⚡ Panic hide — hide everything (⌘⇧.)', click: () => panicToggle() }

  const menu = Menu.buildFromTemplate([
    panicLabel,
    { type: 'separator' },
    {
      label: panicActive ? 'GhostPad is hidden' : 'Show GhostPad',
      enabled: !panicActive,
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
        else { mainWindow.show(); mainWindow.focus() }
      }
    },
    { label: 'New Tab', accelerator: 'CmdOrCtrl+Shift+N', enabled: !panicActive, click: () => {
      const note = store.create({ title: `Tab ${store.nextTabNumber()}` })
      broadcast(IPC.NOTES_CHANGED, store.all())
      updateTrayMenu()
      if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
      else { mainWindow.show(); mainWindow.focus() }
      void note
    }},
    { label: 'Notes', submenu: notesSubmenu },
    { type: 'separator' },
    { label: '● Notes invisible to screen sharing', enabled: false },
    ...(caveat ? [{ label: caveat, enabled: false } as Electron.MenuItemConstructorOptions] : []),
    { type: 'separator' },
    {
      label: `GhostPad v${app.getVersion()}`,
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About GhostPad',
          message: 'GhostPad',
          detail: `Version ${app.getVersion()}\nInvisible sticky notes for client calls.\nInvisible to screen sharing & recording.\n\n⚡ Panic hide: ⌘⇧. — instantly hide/restore all notes`
        })
      }
    },
    { type: 'separator' },
    { label: 'Quit GhostPad', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
  tray.setToolTip(panicActive ? 'GhostPad — hidden (⌘⇧. to restore)' : 'GhostPad')
}

function setupTray(): void {
  tray = new Tray(buildTrayIcon())
  tray.setToolTip('GhostPad')
  updateTrayMenu()
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow()
    } else if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ────────────────────────────────────────────────────────────
// App lifecycle
// ────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
    else mainWindow = createMainWindow()
  })

  app.whenReady().then(() => {
    hideDockIcon()
    setupTray()
    mainWindow = createMainWindow()

    if (store.all().length === 0) {
      store.create({
        title: 'Tab 1',
        content: 'This note is invisible to screen sharing.\nDouble-click the tab name to rename it.',
        color: 'yellow'
      })
    }

    registerShortcuts({
      newNote: () => {
        const note = store.create({ title: `Tab ${store.nextTabNumber()}` })
        broadcast(IPC.NOTES_CHANGED, store.all())
        updateTrayMenu()
        if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
        else { mainWindow.show(); mainWindow.focus() }
        void note
      },
      toggleHideAll: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) mainWindow.hide()
          else { mainWindow.show(); mainWindow.focus() }
        }
      },
      openManager: () => {
        if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
        else { mainWindow.show(); mainWindow.focus() }
      },
      panicToggle: () => panicToggle()
    })
  })

  app.on('before-quit', () => { store.close() })
  app.on('will-quit', () => { unregisterAll() })
  app.on('window-all-closed', () => { /* stay alive as tray app */ })
  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
    else mainWindow.show()
  })
}
