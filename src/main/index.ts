import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, desktopCapturer, systemPreferences, shell, nativeTheme } from 'electron'
import path from 'path'
import { NoteStore } from './store'
import { Note, NotePatch, IPC } from './types'
import { setPinned, applyContentProtection, hideDockIcon, captureExclusionCaveat, isMac, isWindows, isWindowsBuildSupported } from './platform'
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

  // Re-apply every time the window becomes visible (OS can reset the flag)
  win.on('show', () => applyContentProtection(win))
  // On Windows, the DWM display affinity can reset when a window is un-minimized
  win.on('restore', () => applyContentProtection(win))

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
// Protection test
// ────────────────────────────────────────────────────────────

async function runProtectionTest(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    await dialog.showMessageBox({
      type: 'info', title: 'GhostPad — Protection Test',
      message: 'Show GhostPad first',
      detail: 'The GhostPad window must be visible to run the test. Open it from the tray, then try again.'
    })
    return
  }

  // macOS requires explicit Screen Recording permission
  if (isMac) {
    const status = systemPreferences.getMediaAccessStatus('screen')
    if (status !== 'granted') {
      const { response } = await dialog.showMessageBox({
        type: 'info', title: 'Permission needed',
        message: 'Screen Recording permission required',
        detail: 'To verify your notes are invisible, GhostPad needs Screen Recording permission.\n\nOpen System Settings → Privacy & Security → Screen Recording and enable GhostPad, then restart the app.',
        buttons: ['Open Privacy Settings', 'Cancel'], defaultId: 0
      })
      if (response === 0) shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
      return
    }
  }

  // On unsupported Windows, skip pixel test and just warn
  if (isWindows && !isWindowsBuildSupported()) {
    await dialog.showMessageBox({
      type: 'warning', title: 'Protection not available',
      message: 'Your Windows version does not support screen capture exclusion',
      detail: 'Screen capture exclusion (WDA_EXCLUDEFROMCAPTURE) requires Windows 10 build 19041 or later.\n\nYour notes may be visible to screen sharing tools. Please update Windows.'
    })
    return
  }

  const mainBounds = mainWindow.getBounds()
  const display = screen.getDisplayMatching(mainBounds)

  // Place a bright-red reference window centred inside GhostPad with no content
  // protection. On-screen it sits below GhostPad (invisible to the user); in the
  // screen capture GhostPad is excluded, so the red window appears. If we can
  // see it, we know capture is working. Then we check GhostPad's area is black.
  const refW = 100, refH = 100
  const refX = mainBounds.x + Math.round((mainBounds.width  - refW) / 2)
  const refY = mainBounds.y + Math.round((mainBounds.height - refH) / 2)

  const refWin = new BrowserWindow({
    x: refX, y: refY, width: refW, height: refH,
    frame: false, transparent: false, backgroundColor: '#FF0000',
    show: false, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  await refWin.loadURL('data:text/html,<body style="background:#f00;margin:0;width:100vw;height:100vh;"></body>')
  refWin.showInactive()
  await new Promise(r => setTimeout(r, 350)) // let compositor settle

  try {
    const tw = display.bounds.width
    const th = display.bounds.height

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: tw, height: th }
    })

    const source = sources.find(s => s.display_id === String(display.id)) ?? sources[0]
    if (!source) throw new Error('No screen source found')

    const thumb = source.thumbnail
    const { width: imgW, height: imgH } = thumb.getSize()

    // Map logical display coords → thumbnail pixel coords
    function toThumb(lx: number, ly: number) {
      return {
        x: Math.round((lx / tw) * imgW),
        y: Math.round((ly / th) * imgH)
      }
    }

    // Sample a rect (display-relative logical coords) → avg BGR
    function avgColor(lx: number, ly: number, size = 20) {
      const { x, y } = toThumb(lx, ly)
      const half = Math.round((size / tw) * imgW / 2)
      const cx = Math.max(0, Math.min(x - half, imgW - half * 2))
      const cy = Math.max(0, Math.min(y - half, imgH - half * 2))
      const w = Math.min(half * 2, imgW - cx)
      const h = Math.min(half * 2, imgH - cy)
      if (w <= 0 || h <= 0) return { r: 0, g: 0, b: 0 }
      const crop = thumb.crop({ x: cx, y: cy, width: w, height: h })
      const buf = crop.toBitmap() // BGRA
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < buf.length; i += 4) { b += buf[i]; g += buf[i + 1]; r += buf[i + 2]; n++ }
      return n ? { r: r / n, g: g / n, b: b / n } : { r: 0, g: 0, b: 0 }
    }

    // Centre of reference window in display-relative logical coords
    const refRelX = refX + refW / 2 - display.bounds.x
    const refRelY = refY + refH / 2 - display.bounds.y
    const refColor = avgColor(refRelX, refRelY, 30)
    const captureWorking = refColor.r > 150 && refColor.g < 80 && refColor.b < 80

    if (!captureWorking) {
      if (!refWin.isDestroyed()) refWin.close()
      await dialog.showMessageBox({
        type: 'info', title: 'Test inconclusive',
        message: 'Could not confirm screen capture is working',
        detail: 'This usually means Screen Recording permission was just granted and the app needs a restart.\n\nRestart GhostPad and try the test again.'
      })
      return
    }

    // Centre of GhostPad in display-relative logical coords
    const gpRelX = mainBounds.x + mainBounds.width  / 2 - display.bounds.x
    const gpRelY = mainBounds.y + mainBounds.height / 2 - display.bounds.y
    const gpColor = avgColor(gpRelX, gpRelY, 40)
    const isProtected = gpColor.r < 25 && gpColor.g < 25 && gpColor.b < 25

    if (!refWin.isDestroyed()) refWin.close()

    if (isProtected) {
      await dialog.showMessageBox({
        type: 'info', title: '✓ Protection confirmed',
        message: 'Your notes are invisible to screen sharing',
        detail: 'The test confirmed that GhostPad does not appear in screen captures.\n\nZoom, Teams, Meet, OBS, QuickTime, and all other screen sharing tools cannot see your notes.'
      })
    } else {
      await dialog.showMessageBox({
        type: 'warning', title: '⚠ Protection may not be active',
        message: 'GhostPad may be visible to screen sharing tools',
        detail: 'The screen capture test could see the GhostPad window. Try restarting GhostPad. If the issue persists, check that no accessibility or display-override tools are running.'
      })
    }
  } catch (err) {
    if (!refWin.isDestroyed()) refWin.close()
    console.error('[GhostPad] Protection test error:', err)
    await dialog.showMessageBox({
      type: 'warning', title: 'Test failed',
      message: 'Could not run the protection test',
      detail: String(err)
    })
  }
}

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
    {
      label: caveat ? caveat : '● Notes invisible to screen sharing',
      enabled: false
    },
    { label: 'Test screen sharing protection…', click: () => { runProtectionTest().catch(console.error) } },
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
        color: nativeTheme.shouldUseDarkColors ? 'dark' : 'yellow'
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
