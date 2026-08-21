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

  // ── subscriptions ─────────────────────────────────────────
  onNotesChanged: (cb: (notes: Note[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, notes: Note[]) => cb(notes)
    ipcRenderer.on(IPC.NOTES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.NOTES_CHANGED, handler)
  },
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
