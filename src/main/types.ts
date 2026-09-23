export type NoteColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'dark'
  | 'slate'
  | 'amber'
  | 'rose'
  | 'teal'

export type ContentType = 'text' | 'markdown'

export interface Note {
  id: string
  title: string
  content: string
  contentType: ContentType
  color: NoteColor
  opacity: number          // 0.3 – 1.0
  fontSize: number         // 10 – 32
  pinned: boolean
  ghost: boolean
  visible: boolean
  tabOrder: number
  createdAt: number
  updatedAt: number
}

export type NotePatch = Partial<Omit<Note, 'id' | 'createdAt'>>

export interface NoteSnapshot {
  id: number
  noteId: string
  content: string
  savedAt: number
}

// IPC channel names
export const IPC = {
  // renderer → main
  NOTES_GET_ALL: 'notes:getAll',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
  WINDOW_CLOSE: 'window:close',
  WINDOW_MINIMIZE: 'window:minimize',
  HISTORY_GET: 'history:get',
  HISTORY_RESTORE: 'history:restore',
  PANIC_TOGGLE: 'panic:toggle',
  PANIC_FLUSH_DONE: 'panic:flush-done', // renderer → main: pending edits flushed, safe to hide
  // main → renderer
  NOTES_CHANGED: 'notes:changed',
  PANIC_PRE: 'panic:pre',               // main → renderer: flush pending edits before hide
} as const
