import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog } from 'electron'
import path from 'path'
import { NoteStore } from './store'
import { Note, NotePatch, IPC } from './types'
import { setPinned, applyContentProtection, hideDockIcon, captureExclusionCaveat } from './platform'
import { clampToVisibleDisplay, displayIdForPoint } from './displayUtils'
import { registerShortcuts, unregisterAll } from './shortcuts'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const popoutWindows = new Map<string, BrowserWindow>()

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

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    applyContentProtection(win)
    win.showInactive()
  })

  win.on('moved', () => {
    const [x, y] = win.getPosition()
    const [w, h] = win.getSize()
    // persist panel position in settings (future: store.savePanelBounds)
    void [x, y, w, h]
  })

  win.on('resized', () => {
    const [x, y] = win.getPosition()
    const [w, h] = win.getSize()
    void [x, y, w, h]
  })

  win.on('closed', () => {
    mainWindow = null
  })

  return win
}

// ────────────────────────────────────────────────────────────
// Pop-out: detach a note into its own floating window
// ────────────────────────────────────────────────────────────

function openPopout(noteId: string): void {
  if (popoutWindows.has(noteId)) {
    const existing = popoutWindows.get(noteId)!
    if (!existing.isDestroyed()) {
      existing.show()
      return
    }
  }

  const note = store.get(noteId)
  if (!note) return

  const bounds = clampToVisibleDisplay(note)
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x + 30,
    y: bounds.y + 30,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: true,
    minWidth: 220,
    minHeight: 160,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setPinned(win, note.pinned)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?noteId=${noteId}&mode=popout`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), {
      query: { noteId, mode: 'popout' }
    })
  }

  win.once('ready-to-show', () => {
    applyContentProtection(win)
    win.showInactive()
  })

  win.on('moved', () => {
    const [x, y] = win.getPosition()
    store.update(noteId, { x, y, displayId: displayIdForPoint(x, y) })
  })

  win.on('resized', () => {
    const [x, y] = win.getPosition()
    const [w, h] = win.getSize()
    store.update(noteId, { x, y, width: w, height: h })
  })

  win.on('closed', () => {
    popoutWindows.delete(noteId)
    store.update(noteId, { poppedOut: false })
    broadcast(IPC.NOTES_CHANGED, store.all())
  })

  popoutWindows.set(noteId, win)
  store.update(noteId, { poppedOut: true })
}

// ────────────────────────────────────────────────────────────
// Broadcast notes state to all windows
// ────────────────────────────────────────────────────────────

function broadcast(channel: string, payload: unknown): void {
  const targets = [mainWindow, ...popoutWindows.values()].filter(
    (w): w is BrowserWindow => !!w && !w.isDestroyed()
  )
  for (const w of targets) {
    w.webContents.send(channel, payload)
  }
}

// ────────────────────────────────────────────────────────────
// IPC handlers
// ────────────────────────────────────────────────────────────

ipcMain.handle(IPC.NOTES_GET_ALL, () => store.all())

ipcMain.handle(IPC.NOTES_CREATE, (_e, overrides: Partial<Note>) => {
  const note = store.create(overrides)
  broadcast(IPC.NOTES_CHANGED, store.all())
  updateTrayMenu()
  return note
})

ipcMain.handle(IPC.NOTES_UPDATE, (_e, id: string, patch: NotePatch) => {
  const note = store.update(id, patch)
  if (!note) return null

  // Sync pinned state to popout window if it exists
  if (typeof patch.pinned === 'boolean') {
    const win = popoutWindows.get(id)
    if (win && !win.isDestroyed()) setPinned(win, patch.pinned)
  }

  // Ghost → force always-on-top on popout
  if (typeof patch.ghost === 'boolean') {
    const win = popoutWindows.get(id)
    if (win && !win.isDestroyed()) {
      setPinned(win, patch.ghost ? true : note.pinned)
    }
  }

  broadcast(IPC.NOTES_CHANGED, store.all())
  updateTrayMenu()
  return note
})

ipcMain.handle(IPC.NOTES_DELETE, (_e, id: string) => {
  const win = popoutWindows.get(id)
  if (win && !win.isDestroyed()) win.destroy()
  popoutWindows.delete(id)
  store.remove(id)
  broadcast(IPC.NOTES_CHANGED, store.all())
  updateTrayMenu()
})

ipcMain.on(IPC.NOTES_POP_OUT, (_e, noteId: string) => {
  openPopout(noteId)
  broadcast(IPC.NOTES_CHANGED, store.all())
  updateTrayMenu()
})

ipcMain.on(IPC.WINDOW_CLOSE, () => {
  mainWindow?.hide()
  updateTrayMenu()
})

ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize()
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
            if (!mainWindow || mainWindow.isDestroyed()) {
              mainWindow = createMainWindow()
            } else {
              mainWindow.show()
            }
          }
        }))

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show GhostPad',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          mainWindow = createMainWindow()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { label: 'New Note', accelerator: 'CmdOrCtrl+Shift+N', click: () => {
      const note = store.create()
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
          detail: `Version ${app.getVersion()}\nInvisible sticky notes for client calls.\nInvisible to screen sharing & recording.`
        })
      }
    },
    { type: 'separator' },
    { label: 'Quit GhostPad', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
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
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      mainWindow = createMainWindow()
    }
  })

  app.whenReady().then(() => {
    hideDockIcon()
    setupTray()
    mainWindow = createMainWindow()

    // Seed with a welcome note if DB is fresh
    if (store.all().length === 0) {
      store.create({
        title: 'Welcome to GhostPad',
        content: 'This note is invisible to screen sharing.\nPress Cmd+Shift+N for a new note.',
        color: 'yellow'
      })
    }

    registerShortcuts({
      newNote: () => {
        store.create()
        broadcast(IPC.NOTES_CHANGED, store.all())
        updateTrayMenu()
        if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
        else { mainWindow.show(); mainWindow.focus() }
      },
      toggleHideAll: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) mainWindow.hide()
          else { mainWindow.show(); mainWindow.focus() }
        }
      },
      toggleGhostAll: () => broadcast(IPC.NOTE_TOGGLE_GHOST, null),
      openManager: () => {
        if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
        else { mainWindow.show(); mainWindow.focus() }
      }
    })

    screen.on('display-added', () => {/* future: reposition popped-out notes */})
    screen.on('display-removed', () => {})
    screen.on('display-metrics-changed', () => {})
  })

  app.on('before-quit', () => {
    store.close()
  })

  app.on('will-quit', () => {
    unregisterAll()
  })

  app.on('window-all-closed', () => {
    // Stay alive as tray app — don't quit when all windows close
  })

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow()
    } else {
      mainWindow.show()
    }
  })
}
