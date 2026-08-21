import Database from 'better-sqlite3'
import path from 'path'
import { Note, NotePatch, ContentType, NoteColor, ChecklistItem } from './types'

const SCHEMA_VERSION = 1

function generateId(): string {
  return 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

function defaultNote(overrides: Partial<Note> = {}): Note {
  const now = Date.now()
  return {
    id: overrides.id ?? generateId(),
    title: overrides.title ?? '',
    content: overrides.content ?? '',
    contentType: overrides.contentType ?? 'text',
    checklistItems: overrides.checklistItems ?? [],
    color: overrides.color ?? 'yellow',
    opacity: overrides.opacity ?? 0.88,
    fontSize: overrides.fontSize ?? 15,
    tags: overrides.tags ?? [],
    pinned: overrides.pinned ?? true,
    ghost: overrides.ghost ?? false,
    visible: overrides.visible ?? true,
    tabOrder: overrides.tabOrder ?? 0,
    poppedOut: overrides.poppedOut ?? false,
    x: overrides.x,
    y: overrides.y,
    width: overrides.width ?? 400,
    height: overrides.height ?? 320,
    displayId: overrides.displayId,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

export class NoteStore {
  private db: Database.Database

  constructor(userDataPath: string) {
    const dbPath = path.join(userDataPath, 'ghostpad.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        content_type TEXT NOT NULL DEFAULT 'text',
        checklist_items TEXT NOT NULL DEFAULT '[]',
        color TEXT NOT NULL DEFAULT 'yellow',
        opacity REAL NOT NULL DEFAULT 0.88,
        font_size INTEGER NOT NULL DEFAULT 15,
        tags TEXT NOT NULL DEFAULT '[]',
        pinned INTEGER NOT NULL DEFAULT 1,
        ghost INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        tab_order INTEGER NOT NULL DEFAULT 0,
        popped_out INTEGER NOT NULL DEFAULT 0,
        x INTEGER,
        y INTEGER,
        width INTEGER NOT NULL DEFAULT 400,
        height INTEGER NOT NULL DEFAULT 320,
        display_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
    const row = this.db.prepare('SELECT version FROM schema_version LIMIT 1').get() as
      | { version: number }
      | undefined
    if (!row) {
      this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
    }
  }

  private rowToNote(row: Record<string, unknown>): Note {
    return {
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      contentType: row.content_type as ContentType,
      checklistItems: JSON.parse(row.checklist_items as string) as ChecklistItem[],
      color: row.color as NoteColor,
      opacity: row.opacity as number,
      fontSize: row.font_size as number,
      tags: JSON.parse(row.tags as string) as string[],
      pinned: Boolean(row.pinned),
      ghost: Boolean(row.ghost),
      visible: Boolean(row.visible),
      tabOrder: row.tab_order as number,
      poppedOut: Boolean(row.popped_out),
      x: row.x as number | undefined,
      y: row.y as number | undefined,
      width: row.width as number,
      height: row.height as number,
      displayId: row.display_id as string | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  all(): Note[] {
    const rows = this.db
      .prepare('SELECT * FROM notes ORDER BY tab_order ASC, created_at ASC')
      .all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToNote(r))
  }

  get(id: string): Note | null {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    return row ? this.rowToNote(row) : null
  }

  create(overrides: Partial<Note> = {}): Note {
    const maxOrder = this.db.prepare('SELECT MAX(tab_order) as m FROM notes').get() as
      | { m: number | null }
      | undefined
    const nextOrder = (maxOrder?.m ?? -1) + 1
    const note = defaultNote({ ...overrides, tabOrder: nextOrder })
    this.db
      .prepare(
        `INSERT INTO notes (
          id, title, content, content_type, checklist_items, color, opacity, font_size,
          tags, pinned, ghost, visible, tab_order, popped_out, x, y, width, height,
          display_id, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`
      )
      .run(
        note.id,
        note.title,
        note.content,
        note.contentType,
        JSON.stringify(note.checklistItems),
        note.color,
        note.opacity,
        note.fontSize,
        JSON.stringify(note.tags),
        note.pinned ? 1 : 0,
        note.ghost ? 1 : 0,
        note.visible ? 1 : 0,
        note.tabOrder,
        note.poppedOut ? 1 : 0,
        note.x ?? null,
        note.y ?? null,
        note.width,
        note.height,
        note.displayId ?? null,
        note.createdAt,
        note.updatedAt
      )
    return note
  }

  update(id: string, patch: NotePatch): Note | null {
    const existing = this.get(id)
    if (!existing) return null
    const merged: Note = { ...existing, ...patch, updatedAt: Date.now() }
    this.db
      .prepare(
        `UPDATE notes SET
          title = ?, content = ?, content_type = ?, checklist_items = ?, color = ?,
          opacity = ?, font_size = ?, tags = ?, pinned = ?, ghost = ?, visible = ?,
          tab_order = ?, popped_out = ?, x = ?, y = ?, width = ?, height = ?,
          display_id = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        merged.title,
        merged.content,
        merged.contentType,
        JSON.stringify(merged.checklistItems),
        merged.color,
        merged.opacity,
        merged.fontSize,
        JSON.stringify(merged.tags),
        merged.pinned ? 1 : 0,
        merged.ghost ? 1 : 0,
        merged.visible ? 1 : 0,
        merged.tabOrder,
        merged.poppedOut ? 1 : 0,
        merged.x ?? null,
        merged.y ?? null,
        merged.width,
        merged.height,
        merged.displayId ?? null,
        merged.updatedAt,
        id
      )
    return merged
  }

  remove(id: string): boolean {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    return result.changes > 0
  }

  close(): void {
    this.db.close()
  }
}
