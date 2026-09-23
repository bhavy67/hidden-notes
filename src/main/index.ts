import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, desktopCapturer, systemPreferences, shell, nativeTheme, Notification } from 'electron'
import path from 'path'
import https from 'https'
import { NoteStore } from './store'
import { Note, NotePatch, IPC } from './types'
import { setPinned, applyContentProtection, hideDockIcon, captureExclusionCaveat, isMac, isWindows, isWindowsBuildSupported } from './platform'
import { clampToVisibleDisplay, displayIdForPoint } from './displayUtils'
import { registerShortcuts, unregisterAll } from './shortcuts'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const popoutWindows = new Map<string, BrowserWindow>()

// ── Panic hide state ────────────────────────────────────────
let panicActive = false
let panicVisibleWindows: BrowserWindow[] = []
let panicFlushRemaining = 0
let panicHideTimer: ReturnType<typeof setTimeout> | null = null

const store = new NoteStore(app.getPath('userData'))

// ── Update check ─────────────────────────────────────────────
let updateAvailable: { version: string; url: string } | null = null

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const l = parse(latest)
  const c = parse(current)
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] ?? 0; const b = c[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}

function checkForUpdate(): void {
  const req = https.get(
    {
      hostname: 'api.github.com',
      path: '/repos/bhavy67/hidden-notes/releases/latest',
      headers: { 'User-Agent': `GhostPad/${app.getVersion()}`, 'Accept': 'application/vnd.github.v3+json' },
      timeout: 8000,
    },
    (res) => {
      if (res.statusCode !== 200) return
      let raw = ''
      res.on('data', (chunk: string) => { raw += chunk })
      res.on('end', () => {
        try {
          const release = JSON.parse(raw) as { tag_name: string; html_url: string }
          if (!isNewerVersion(release.tag_name, app.getVersion())) return
          updateAvailable = { version: release.tag_name.replace(/^v/, ''), url: release.html_url }
          updateTrayMenu()
          if (Notification.isSupported()) {
            const n = new Notification({
              title: 'GhostPad update available',
              body: `v${updateAvailable.version} is ready — click to download.`,
              silent: true,
            })
            n.on('click', () => shell.openExternal(updateAvailable!.url))
            n.show()
          }
        } catch { /* silent */ }
      })
    }
  )
  req.on('error', () => { /* silent */ })
  req.on('timeout', () => req.destroy())
}

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
    x: wa.x + Math.round((wa.width - width) / 2),
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

function allManagedWindows(): BrowserWindow[] {
  const wins: BrowserWindow[] = []
  if (mainWindow && !mainWindow.isDestroyed()) wins.push(mainWindow)
  for (const w of popoutWindows.values()) if (!w.isDestroyed()) wins.push(w)
  return wins
}

function panicToggle(): void {
  if (!panicActive) {
    panicActive = true
    panicVisibleWindows = allManagedWindows().filter((w) => w.isVisible())
    if (panicVisibleWindows.length === 0) { panicActive = false; return }

    panicFlushRemaining = panicVisibleWindows.length
    // Ask every visible window to flush pending edits before hiding
    for (const w of panicVisibleWindows) w.webContents.send(IPC.PANIC_PRE, null)
    // Safety fallback: hide everything after 300ms
    panicHideTimer = setTimeout(() => {
      panicHideTimer = null
      for (const w of panicVisibleWindows) if (!w.isDestroyed()) w.hide()
    }, 300)
  } else {
    if (panicHideTimer) { clearTimeout(panicHideTimer); panicHideTimer = null }
    panicActive = false
    panicFlushRemaining = 0
    for (const w of panicVisibleWindows) {
      if (!w.isDestroyed()) { applyContentProtection(w); w.showInactive() }
    }
    panicVisibleWindows = []
  }
  updateTrayMenu()
}

// Each window confirms flush; hide all once every window has responded
ipcMain.on(IPC.PANIC_FLUSH_DONE, () => {
  if (!panicActive) return
  panicFlushRemaining = Math.max(0, panicFlushRemaining - 1)
  if (panicFlushRemaining === 0) {
    if (panicHideTimer) { clearTimeout(panicHideTimer); panicHideTimer = null }
    for (const w of panicVisibleWindows) if (!w.isDestroyed()) w.hide()
  }
})

// ────────────────────────────────────────────────────────────
// Broadcast notes state to the main window
// ────────────────────────────────────────────────────────────

function broadcast(channel: string, payload: unknown): void {
  for (const w of allManagedWindows()) w.webContents.send(channel, payload)
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

ipcMain.handle(IPC.SETTINGS_GET, (_e, key: string) => {
  try { return store.getSetting(key) }
  catch (err) { console.error('[GhostPad] settings:get failed:', err); return null }
})

ipcMain.handle(IPC.SETTINGS_SET, (_e, key: string, value: string) => {
  try { store.setSetting(key, value) }
  catch (err) { console.error('[GhostPad] settings:set failed:', err) }
})

// ────────────────────────────────────────────────────────────
// Pop-out windows — each note can float in its own window
// ────────────────────────────────────────────────────────────

function createPopoutWindow(note: Note): BrowserWindow {
  const geo = store.getGeometry(note.id)
  const w = geo?.width || 400
  const h = geo?.height || 320
  const clamped = clampToVisibleDisplay({ x: geo?.x ?? undefined, y: geo?.y ?? undefined, width: w, height: h })

  const win = new BrowserWindow({
    width: clamped.width, height: clamped.height,
    x: clamped.x, y: clamped.y,
    frame: false, transparent: true, resizable: true,
    hasShadow: false, skipTaskbar: true,
    minWidth: 260, minHeight: 200,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    }
  })

  setPinned(win, true)
  applyContentProtection(win)

  const query = { noteId: note.id, popout: 'true' }
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const u = new URL(process.env['ELECTRON_RENDERER_URL'])
    u.search = new URLSearchParams(query).toString()
    win.loadURL(u.toString())
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { query })
  }

  win.once('ready-to-show', () => { applyContentProtection(win); win.showInactive() })
  win.on('show', () => applyContentProtection(win))
  win.on('restore', () => applyContentProtection(win))

  const saveGeometry = () => {
    if (win.isDestroyed()) return
    const [x, y] = win.getPosition()
    const [width, height] = win.getSize()
    const displayId = displayIdForPoint(x, y)
    store.updateGeometry(note.id, { x, y, width, height, displayId })
  }
  win.on('moved', saveGeometry)
  win.on('resized', saveGeometry)

  win.on('closed', () => {
    popoutWindows.delete(note.id)
    try {
      store.update(note.id, { poppedOut: false })
      broadcast(IPC.NOTES_CHANGED, store.all())
    } catch { /* window may close after store is gone at quit */ }
  })

  return win
}

ipcMain.handle(IPC.NOTE_POPOUT, (_e, noteId: string) => {
  try {
    const existing = popoutWindows.get(noteId)
    if (existing && !existing.isDestroyed()) {
      existing.show(); existing.focus(); return
    }
    const note = store.get(noteId)
    if (!note) return
    store.update(noteId, { poppedOut: true })
    const win = createPopoutWindow(note)
    popoutWindows.set(noteId, win)
    broadcast(IPC.NOTES_CHANGED, store.all())
  } catch (err) { console.error('[GhostPad] note:popout failed:', err) }
})

ipcMain.handle(IPC.NOTE_POPIN, (_e, noteId: string) => {
  try {
    const win = popoutWindows.get(noteId)
    if (win && !win.isDestroyed()) win.close()
    else {
      store.update(noteId, { poppedOut: false })
      broadcast(IPC.NOTES_CHANGED, store.all())
    }
  } catch (err) { console.error('[GhostPad] note:popin failed:', err) }
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
  const version = app.getVersion()

  const notesSubmenu: Electron.MenuItemConstructorOptions[] =
    notes.length === 0
      ? [{ label: 'No notes yet', enabled: false }]
      : notes.map((n) => ({
          label: `${n.poppedOut ? '↗' : n.visible ? '●' : '○'} ${noteLabel(n)}`,
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
            else mainWindow.show()
          }
        }))

  const panicLabel: Electron.MenuItemConstructorOptions = panicActive
    ? { label: '⚡ Hidden (panic mode) — press ⌘⇧. to restore', enabled: false }
    : { label: '⚡ Panic hide — hide everything (⌘⇧.)', click: () => panicToggle() }

  const template: Electron.MenuItemConstructorOptions[] = [
    panicLabel,
    { type: 'separator' },
  ]

  // Prominent update notification at the top when available
  if (updateAvailable) {
    template.push(
      { label: `🆕 Update available — v${updateAvailable.version}`, click: () => shell.openExternal(updateAvailable!.url) },
      { type: 'separator' }
    )
  }

  template.push(
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
    { label: caveat ? caveat : '● Notes invisible to screen sharing', enabled: false },
    { label: 'Test screen sharing protection…', click: () => { runProtectionTest().catch(console.error) } },
    { type: 'separator' },
    {
      label: updateAvailable
        ? `GhostPad v${version}  (v${updateAvailable.version} available)`
        : `GhostPad v${version}`,
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About GhostPad',
          message: `GhostPad v${version}`,
          detail: updateAvailable
            ? `A new version (v${updateAvailable.version}) is available.\nClick "Download update" in the tray menu to get it.\n\nInvisible sticky notes — hidden from screen sharing & recording.`
            : `Invisible sticky notes for client calls.\nHidden from screen sharing & recording at the OS level.\n\n⚡ Panic hide: ⌘⇧. — instantly hide/restore all notes`
        })
      }
    },
    { type: 'separator' },
    { label: 'Quit GhostPad', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
  )

  tray.setContextMenu(Menu.buildFromTemplate(template))

  const baseTooltip = updateAvailable
    ? `GhostPad v${version} — v${updateAvailable.version} update available`
    : `GhostPad v${version}`
  tray.setToolTip(panicActive ? `GhostPad v${version} — hidden (⌘⇧. to restore)` : baseTooltip)
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

    // Check for updates 20s after startup — silent, non-blocking
    setTimeout(() => checkForUpdate(), 20_000)

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
        const wins = allManagedWindows()
        const anyVisible = wins.some((w) => w.isVisible())
        if (anyVisible) { wins.forEach((w) => w.hide()) }
        else {
          if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow()
          else { mainWindow.show(); mainWindow.focus() }
          for (const w of popoutWindows.values()) if (!w.isDestroyed()) { w.show(); w.focus() }
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
