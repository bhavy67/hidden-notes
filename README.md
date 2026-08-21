# GhostPad

Invisible sticky notes for your screen — hidden from screen sharing and screen recording.

Built for professionals who need quick notes during client calls, demos, or meetings without exposing them to the other party.

---

## How it works

GhostPad uses the OS-level screen capture exclusion API (`setContentProtection`) to make the note window invisible to any screen sharing or recording tool — Zoom, Google Meet, Microsoft Teams, QuickTime, OBS, and native screen recording.

- **macOS:** Uses `NSWindowSharingNone`
- **Windows:** Uses `SetWindowDisplayAffinity` (requires Windows 10 build 19041+)

---

## Features

- Chrome-style tab strip — multiple notes, one panel
- 10 color themes with dark mode
- Adjustable font size
- Full-text search across all notes (`Cmd/Ctrl+F`)
- Note history with restore
- Persistent storage via SQLite
- Lives in the system tray — no Dock icon, no Cmd+Tab clutter

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+N` | New note tab |
| `Cmd/Ctrl+Shift+H` | Hide / show GhostPad |
| Double-click tab | Rename tab |

---

## Sharing with Friends

Build a distributable file and send it — no install of Node or anything else required on their end.

### Build

```bash
npm run dist:mac   # produces dist/GhostPad-x.x.x.dmg  (macOS)
npm run dist:win   # produces dist/GhostPad Setup x.x.x.exe  (Windows)
```

The output lands in the `dist/` folder. Send that file to your friend.

### macOS — what your friend does

1. Open the `.dmg` file
2. Drag **GhostPad** into their Applications folder
3. On first launch macOS will block it with *"cannot be verified"* — this is normal for unsigned apps
4. To open it anyway: **right-click → Open** → click **Open** in the dialog

Or they can go to **System Settings → Privacy & Security → scroll down → Open Anyway** after the first blocked attempt.

### Windows — what your friend does

1. Run the `.exe` installer
2. Windows SmartScreen may warn *"unrecognized app"* — click **More info → Run anyway**
3. GhostPad installs and launches automatically

---

## Running from source (developers only)

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

A GhostPad icon will appear in your menu bar. The note panel opens automatically.

---

## License

MIT
