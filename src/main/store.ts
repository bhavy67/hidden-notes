import Database from 'better-sqlite3'
import path from 'path'
import { Note, NotePatch, ContentType, NoteColor, NoteSnapshot } from './types'

const SCHEMA_VERSION = 2

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
    color: overrides.color ?? 'yellow',
    opacity: overrides.opacity ?? 0.88,
    fontSize: overrides.fontSize ?? 15,
    pinned: overrides.pinned ?? true,
    ghost: overrides.ghost ?? false,
    visible: overrides.visible ?? true,
    tabOrder: overrides.tabOrder ?? 0,
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
    // Create tables if they don't exist (works on both fresh install and upgrade)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        content_type TEXT NOT NULL DEFAULT 'text',
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
      CREATE TABLE IF NOT EXISTS note_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        saved_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_history_note_id ON note_history(note_id, saved_at DESC);
    `)

    const row = this.db.prepare('SELECT version FROM schema_version LIMIT 1').get() as
      | { version: number }
      | undefined

    if (!row) {
      this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
      return
    }

    // v1 → v2: drop checklist_items column (SQLite doesn't support DROP COLUMN before 3.35,
    // so we just leave it and ignore it going forward — it wastes no meaningful space)
    if (row.version < SCHEMA_VERSION) {
      this.db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION)
    }
  }

  private rowToNote(row: Record<string, unknown>): Note {
    return {
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      contentType: (row.content_type === 'checklist' ? 'text' : row.content_type) as ContentType,
      color: row.color as NoteColor,
      opacity: row.opacity as number,
      fontSize: row.font_size as number,
      pinned: Boolean(row.pinned),
      ghost: Boolean(row.ghost),
      visible: Boolean(row.visible),
      tabOrder: row.tab_order as number,
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

  nextTabNumber(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM notes').get() as { c: number }
    return (row?.c ?? 0) + 1
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
          id, title, content, content_type, color, opacity, font_size,
          pinned, ghost, visible, tab_order, popped_out, x, y, width, height,
          display_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        note.id, note.title, note.content, note.contentType, note.color,
        note.opacity, note.fontSize,
        note.pinned ? 1 : 0, note.ghost ? 1 : 0, note.visible ? 1 : 0,
        note.tabOrder, 0,
        null, null, 400, 320,
        null, note.createdAt, note.updatedAt
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
          title = ?, content = ?, content_type = ?, color = ?, opacity = ?, font_size = ?,
          pinned = ?, ghost = ?, visible = ?, tab_order = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        merged.title, merged.content, merged.contentType, merged.color,
        merged.opacity, merged.fontSize,
        merged.pinned ? 1 : 0, merged.ghost ? 1 : 0, merged.visible ? 1 : 0,
        merged.tabOrder, merged.updatedAt, id
      )
    return merged
  }

  remove(id: string): boolean {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    return result.changes > 0
  }

  // ── History ──────────────────────────────────────────────

  saveSnapshot(noteId: string): void {
    const note = this.get(noteId)
    if (!note) return
    const last = this.db
      .prepare('SELECT content FROM note_history WHERE note_id = ? ORDER BY saved_at DESC LIMIT 1')
      .get(noteId) as { content: string } | undefined
    if (last && last.content === note.content) return

    this.db
      .prepare('INSERT INTO note_history (note_id, content, saved_at) VALUES (?, ?, ?)')
      .run(noteId, note.content, Date.now())

    this.db
      .prepare(`DELETE FROM note_history WHERE note_id = ? AND id NOT IN (
        SELECT id FROM note_history WHERE note_id = ? ORDER BY saved_at DESC LIMIT 25
      )`)
      .run(noteId, noteId)
  }

  getHistory(noteId: string): NoteSnapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM note_history WHERE note_id = ? ORDER BY saved_at DESC LIMIT 25')
      .all(noteId) as Array<{ id: number; note_id: string; content: string; saved_at: number }>
    return rows.map((r) => ({
      id: r.id,
      noteId: r.note_id,
      content: r.content,
      savedAt: r.saved_at,
    }))
  }

  close(): void {
    this.db.close()
  }
}
