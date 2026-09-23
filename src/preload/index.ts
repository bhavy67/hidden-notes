import { contextBridge, ipcRenderer } from 'electron'
import { Note, NotePatch, NoteSnapshot, IPC } from '../main/types'

const api = {
  // ── notes ────────────────────────────────────────────────
  getAllNotes: (): Promise<Note[]> => ipcRenderer.invoke(IPC.NOTES_GET_ALL),
  createNote: (overrides?: Partial<Note>): Promise<Note> =>
    ipcRenderer.invoke(IPC.NOTES_CREATE, overrides ?? {}),
  updateNote: (id: string, patch: NotePatch): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTES_UPDATE, id, patch),
  deleteNote: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.NOTES_DELETE, id),

  // ── history ──────────────────────────────────────────────
  getHistory: (noteId: string): Promise<NoteSnapshot[]> =>
    ipcRenderer.invoke(IPC.HISTORY_GET, noteId),
  restoreSnapshot: (noteId: string, snapshotId: number): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.HISTORY_RESTORE, noteId, snapshotId),

  // ── window controls ──────────────────────────────────────
  closeWindow: (): void => ipcRenderer.send(IPC.WINDOW_CLOSE),
  minimizeWindow: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  panicToggle: (): void => ipcRenderer.send(IPC.PANIC_TOGGLE),
  panicFlushDone: (): void => ipcRenderer.send(IPC.PANIC_FLUSH_DONE),

  // ── subscriptions ─────────────────────────────────────────
  onNotesChanged: (cb: (notes: Note[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, notes: Note[]) => cb(notes)
    ipcRenderer.on(IPC.NOTES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.NOTES_CHANGED, handler)
  },
  onPanicPre: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on(IPC.PANIC_PRE, handler)
    return () => ipcRenderer.removeListener(IPC.PANIC_PRE, handler)
  },
  // ── pop-out windows ──────────────────────────────────────
  popoutNote: (noteId: string): Promise<void> => ipcRenderer.invoke(IPC.NOTE_POPOUT, noteId),
  popinNote:  (noteId: string): Promise<void> => ipcRenderer.invoke(IPC.NOTE_POPIN, noteId),

  // ── settings ─────────────────────────────────────────────
  getSetting: (key: string): Promise<string | null> => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
  setSetting: (key: string, value: string): Promise<void> => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),

  // ── utils ─────────────────────────────────────────────────
  getQueryParams: (): Record<string, string> => {
    const params = new URLSearchParams(window.location.search)
    const obj: Record<string, string> = {}
    params.forEach((v, k) => { obj[k] = v })
    return obj
  }
}

contextBridge.exposeInMainWorld('ghostpad', api)

export type GhostPadAPI = typeof api
