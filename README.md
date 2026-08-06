# Zen

Zen is a local-first AI desktop assistant for Windows. It is being built to understand natural-language requests, help manage work, and automate safe computer tasks while keeping the user in control.

## Principles

- **Local first:** core features work on the computer, without a cloud account.
- **Private by default:** conversations and preferences stay local.
- **User control:** destructive or high-impact actions always require approval.
- **Transparent:** Zen shows what it is doing and why.
- **Modular:** voice, AI, memory, and automation are separate capabilities.

## Day 1 status

- [x] Git repository and workspace layout
- [x] Product, architecture, roadmap, and coding-standard documents
- [x] Minimal Electron desktop application
- [x] Install Ollama and local models
- [x] Connect the app to Ollama with private local chat

## Day 2 status

- [x] Local conversation history with new and delete controls
- [x] Named conversations and message timestamps
- [x] Improved local-model loading and error states
- [x] Manual testing of chat creation, switching, deletion, and saved history
- [x] Day 2 changes committed as `a5e71eb`

## Technology choices

| Area | Choice |
| --- | --- |
| Desktop app | Electron |
| UI | HTML, CSS, JavaScript (Day 1); React + TypeScript planned |
| Local AI | Ollama |
| Storage | SQLite (planned) |
| Voice | whisper.cpp + Piper (planned) |
| Browser automation | Playwright (planned) |

## Run the desktop app

From the `apps/desktop` folder, run:

```powershell
npm.cmd install
npm.cmd start
```

The first command downloads Electron once. The application currently opens a local, offline dashboard that confirms the foundation is ready.

### Desktop shortcut

`Zen.lnk` is available on the Windows desktop. It now launches Electron directly and uses Zen's custom AI-engine icon. Double-click it to start Zen without opening PowerShell first; right-click the shortcut and select **Pin to taskbar** for even faster access.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/Architecture.md)
- [Roadmap](docs/Roadmap.md)
- [Coding standards](docs/CodingStandards.md)
- [Project handoff](HANDOFF.md)

## Project continuity

When work is completed, update `HANDOFF.md` with the current state and next step. Update this README whenever the project status or usage instructions change. This keeps the project ready to transfer to a new agent at any time.
