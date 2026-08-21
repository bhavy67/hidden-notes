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

export type ContentType = 'text' | 'checklist' | 'markdown'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Note {
  id: string
  title: string
  content: string          // plain text or markdown
  contentType: ContentType
  checklistItems: ChecklistItem[]  // used when contentType === 'checklist'
  color: NoteColor
  opacity: number          // 0.3 – 1.0
  fontSize: number         // 10 – 32
  tags: string[]
  pinned: boolean
  ghost: boolean
  visible: boolean
  tabOrder: number
  poppedOut: boolean
  x?: number
  y?: number
  width: number
  height: number
  displayId?: string
  createdAt: number
  updatedAt: number
}

export type NotePatch = Partial<Omit<Note, 'id' | 'createdAt'>>

// IPC channel names
export const IPC = {
  // renderer → main
  NOTES_GET_ALL: 'notes:getAll',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
  NOTES_POP_OUT: 'notes:popOut',
  NOTES_CLOSE_POPUP: 'notes:closePopup',
  WINDOW_DRAG_START: 'window:dragStart',
  WINDOW_CLOSE: 'window:close',
  WINDOW_MINIMIZE: 'window:minimize',
  // main → renderer
  NOTES_CHANGED: 'notes:changed',
  NOTE_TOGGLE_GHOST: 'note:toggleGhost',
  NOTE_TOGGLE_HIDE: 'note:toggleHide',
} as const
