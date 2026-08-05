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
- [ ] Install Ollama and a local model
- [ ] Connect the app to Ollama

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

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/Architecture.md)
- [Roadmap](docs/Roadmap.md)
- [Coding standards](docs/CodingStandards.md)

