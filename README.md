# Anima

A small Windows desktop app that gives **Claude Code** different personalities.
Each "card" is a personality that changes how Claude *writes*, and can read its
replies *out loud* in a voice you pick (English, Thai, and more). One card is
active at a time; it lives in your system tray.

> **Just want to install and use it?** See **[SHARE-README.md](SHARE-README.md)**
> (double-click the installer, no building needed).

## Platform

- **Windows desktop** (Electron). The packaged installer targets Windows only.
- The **typing** feature wires into **Claude Code in VS Code** via its hook
  system, so it needs Node.js installed (the hooks run with `node`).
- The **out-loud voice** uses a free Microsoft voice service, so it needs an
  internet connection.

## Run from source (for developers)

```bash
npm install
npm start        # launches the app (dev)
```

`npm start` goes through `scripts/launch.cjs`, which clears the
`ELECTRON_RUN_AS_NODE` environment flag — some setups have it on globally, and
it makes `electron .` boot as plain Node and fail. The launcher strips it first.

## Build the installer

```bash
npm run dist     # -> release/Anima Setup <version>.exe (Windows NSIS installer)
```

Icons are generated from `assets/logo-source.png`:

```bash
npm run icons
```

## Tests

```bash
node scripts/test-phase3.cjs   # 21 checks: the Claude connect/hook/voice wiring
```

The test runs against a throwaway `.claude` directory and an OS-assigned free
port, so it never touches your real settings and is safe to run while the app is
open.

## How it fits together

- `electron/main.cjs` — window, tray, data, all IPC.
- `electron/store.cjs` — the personality cards + UI state on disk (seeds four
  demo cards on first run).
- `electron/voice.cjs` / `electron/voiceServer.cjs` — text-to-speech via
  `msedge-tts`, served on a small local port so replies can be spoken aloud.
- `electron/claude.cjs` — the **Connect** flow: backs up your Claude `settings.json`,
  then merges in Anima's hooks *without* disturbing any hooks you already have.
  **Disconnect** removes only Anima's own entries.
- `electron/hooks/anima-chat.cjs` — injects the active personality's writing style.
- `electron/hooks/anima-stop.cjs` — speaks part of each finished reply aloud.
- `src/App.jsx` — the whole UI (the deck, editor, settings).

## License

Personal project shared as-is. No warranty.
