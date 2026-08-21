# GhostPad

Invisible sticky notes for your screen — hidden from screen sharing and screen recording.

Built for professionals who need quick notes during client calls, demos, or meetings without exposing them to the other party.

---

## How it works

GhostPad uses the OS-level screen capture exclusion API (`setContentProtection`) to make the note window invisible to any screen sharing or recording tool — Zoom, Google Meet, Microsoft Teams, QuickTime, OBS, and native screen recording.

- **macOS:** Uses `NSWindowSharingNone`
- **Windows:** Uses `SetWindowDisplayAffinity` (requires Windows 10 build 19041+)

---

## Features (Phase 1)

- Chrome-style tab strip — multiple notes, one panel
- 3 note types: plain text, checklist, markdown
- 10 color themes with dark mode
- Adjustable opacity and font size
- Pin (always-on-top) and Ghost (click-through) modes
- Pop out any note as a floating window
- Persistent storage via SQLite
- Lives in the system tray — no Dock icon

---

## Getting Started

### Requirements

- Node.js 18+
- macOS or Windows 10 (build 19041+)
- Python 3 with `setuptools` (for native build)

```bash
pip3 install setuptools
```

### Install & Run

```bash
git clone https://github.com/your-username/ghostpad.git
cd ghostpad
npm install
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

> A GhostPad icon will appear in your menu bar. The note panel opens automatically.

### Build for distribution

```bash
npm run dist:mac   # macOS .dmg
npm run dist:win   # Windows installer
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+N` | New note tab |
| `Cmd/Ctrl+Shift+H` | Hide / show GhostPad |
| `Cmd/Ctrl+Shift+G` | Toggle ghost (click-through) mode |
| Double-click tab | Rename tab |

---

## Roadmap

- [ ] Markdown preview
- [ ] Tags and full-text search
- [ ] Export notes (copy as text / markdown)
- [ ] Note history / undo
- [ ] Meeting mode (structured agenda + action items)
- [ ] Optional cloud sync for teams

---

## License

MIT
