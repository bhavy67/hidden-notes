import { contextBridge, ipcRenderer } from 'electron'
import { Note, NotePatch, IPC } from '../main/types'

const api = {
  // ── queries ──────────────────────────────────────────────
  getAllNotes: (): Promise<Note[]> => ipcRenderer.invoke(IPC.NOTES_GET_ALL),

  // ── mutations ─────────────────────────────────────────────
  createNote: (overrides?: Partial<Note>): Promise<Note> =>
    ipcRenderer.invoke(IPC.NOTES_CREATE, overrides ?? {}),

  updateNote: (id: string, patch: NotePatch): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTES_UPDATE, id, patch),

  deleteNote: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.NOTES_DELETE, id),

  popOutNote: (noteId: string): void =>
    ipcRenderer.send(IPC.NOTES_POP_OUT, noteId),

  // ── window controls ──────────────────────────────────────
  closeWindow: (): void => ipcRenderer.send(IPC.WINDOW_CLOSE),
  minimizeWindow: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),

  // ── subscriptions ─────────────────────────────────────────
  onNotesChanged: (cb: (notes: Note[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, notes: Note[]) => cb(notes)
    ipcRenderer.on(IPC.NOTES_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.NOTES_CHANGED, handler)
  },

  onToggleGhost: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on(IPC.NOTE_TOGGLE_GHOST, handler)
    return () => ipcRenderer.removeListener(IPC.NOTE_TOGGLE_GHOST, handler)
  },

  // ── query params ──────────────────────────────────────────
  getQueryParams: (): Record<string, string> => {
    const params = new URLSearchParams(window.location.search)
    const obj: Record<string, string> = {}
    params.forEach((v, k) => { obj[k] = v })
    return obj
  }
}

contextBridge.exposeInMainWorld('ghostpad', api)

// Type declaration for renderer
export type GhostPadAPI = typeof api
