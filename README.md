# GhostPad

Invisible sticky notes for your screen — hidden from screen sharing and screen recording.

Built for professionals who need quick notes during client calls, demos, or meetings without exposing them to the other party.

---

## Download

Go to the [**Releases**](../../releases) page and download the file for your OS:

- **macOS** → `GhostPad-x.x.x.dmg`
- **Windows** → `GhostPad Setup x.x.x.exe`

No install of Node.js or anything else required.

---

## How it works

GhostPad uses the OS-level screen capture exclusion API to make the note window invisible to any screen sharing or recording tool — Zoom, Google Meet, Microsoft Teams, QuickTime, OBS, and native screen recording.

- **macOS:** Uses `NSWindowSharingNone`
- **Windows:** Uses `SetWindowDisplayAffinity` (requires Windows 10 build 19041+)

---

## Features

- Chrome-style tab strip — multiple notes, one panel
- 10 color themes with dark mode
- Adjustable font size
- Full-text search across all notes
- Note history with restore
- Persistent storage via SQLite
- Lives in the system tray — no Dock icon, no Cmd+Tab clutter

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+N` | New note tab |
| `Cmd/Ctrl+Shift+H` | Hide / show GhostPad |
| `Cmd/Ctrl+Shift+M` | Show GhostPad |
| `Cmd/Ctrl+Shift+.` | Panic hide — instantly vanish everything |
| `Cmd/Ctrl+F` | Search notes |
| `Escape` | Close search / history panel |
| Double-click tab | Rename tab |

---

## Installation

### macOS

1. Download `GhostPad-x.x.x.dmg` from [Releases](../../releases)
2. Open the `.dmg` and drag **GhostPad** into your Applications folder
3. On first launch macOS will show *"cannot be verified"* — this is normal for unsigned apps
4. **Right-click → Open → Open** to bypass it (one time only)

   Or go to **System Settings → Privacy & Security → Open Anyway** after the blocked attempt.

### Windows

1. Download `GhostPad Setup x.x.x.exe` from [Releases](../../releases)
2. Run the installer — SmartScreen may warn *"unrecognized app"*, click **More info → Run anyway**
3. GhostPad installs and launches automatically

---

## Publishing a release (for the repo owner)

Pushing a version tag triggers GitHub Actions to automatically build for both Mac and Windows and attach the files to the release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will build on a real Mac runner and a real Windows runner in parallel. Once done, the `.dmg` and `.exe` appear automatically on the Releases page.

> **Manual build (if you prefer):** `npm run dist:mac` must be run on a Mac, `npm run dist:win` on Windows. You can't cross-compile due to the native SQLite dependency.

---

## Running from source (developers)

### Requirements

- Node.js 18+
- macOS or Windows 10 build 19041+
- Python 3 with `setuptools`

```bash
pip3 install setuptools
```

### Install & run

```bash
git clone https://github.com/your-username/ghostpad.git
cd ghostpad
npm install
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

A GhostPad icon appears in your menu bar and the note panel opens automatically.

---

## License

MIT
