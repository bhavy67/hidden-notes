// Re-export shared types for renderer
export type { Note, NoteColor, ContentType, NotePatch } from '../../main/types'

export const NOTE_COLORS: Record<string, { label: string; tint: string; dark: boolean }> = {
  yellow: { label: 'Yellow',  tint: '255, 224, 130', dark: false },
  green:  { label: 'Green',   tint: '178, 235, 178', dark: false },
  blue:   { label: 'Blue',    tint: '170, 214, 255', dark: false },
  pink:   { label: 'Pink',    tint: '255, 190, 214', dark: false },
  purple: { label: 'Purple',  tint: '212, 190, 255', dark: false },
  amber:  { label: 'Amber',   tint: '255, 213, 120', dark: false },
  rose:   { label: 'Rose',    tint: '255, 180, 180', dark: false },
  teal:   { label: 'Teal',    tint: '160, 230, 220', dark: false },
  slate:  { label: 'Slate',   tint: '200, 210, 220', dark: false },
  dark:   { label: 'Dark',    tint: '40,  42,  48',  dark: true  },
}
