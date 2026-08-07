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

## Day 3 status

- [x] Progressive local-model response streaming
- [x] Smooth incremental message updates without panel flicker
- [x] Thinking state and Stop generating control
- [x] Independent generation controls for each conversation
- [x] Independent desktop scrolling for chat history and conversation content
- [x] Partial responses retained after stopping
- [x] Clear Ollama-offline and missing desktop-bridge guidance
- [x] Static checks and a streamed `llama3.2:3b` response check
- [ ] Manual in-app verification of streaming and Stop generating
- [x] Day 3 changes committed as `b368961`

## Day 4 status

- [x] Local Settings page with model, theme, and data controls
- [x] Installed Ollama model list and per-message model selection
- [x] Dark/light preference saved locally
- [x] Confirmed clear-all-conversations control
- [x] Editable message draft while a reply generates
- [x] New conversations start with an empty draft
- [x] Manual in-app verification
- [x] Day 4 settings work committed to Git

## Day 5 voice preparation

- [x] Select `whisper.cpp` as the offline speech-to-text target
- [x] Define explicit local-only, push-to-talk microphone rules
- [x] Add a safe local-voice readiness state and Settings guidance
- [x] Prevent all voice use while local engines are unavailable
- [x] Review and install official local `whisper.cpp` Windows runtime and English model
- [x] Implement push-to-talk transcription with temporary-audio cleanup
- [x] Fix the local runtime path and verify the installed executable and model are detected
- [x] Add locally saved microphone selection
- [x] Add separate reliable keyboard controls: F8 hold-to-speak and F9 locked recording
- [x] Manually verify real push-to-talk transcription with the selected microphone
- [x] Test denied permission, cancellation, empty speech, and headset disconnection
- [x] Review Piper GPL-3.0 licensing and install it as a local-only dependency
- [x] Add local Read aloud, Stop speaking, and voice-selection controls
- [x] Manually verify Read aloud and Stop speaking through the desktop app
- [x] Verify Lessac, Amy, and Ryan local voice models
- [x] Add and verify the local Bryce voice model
- [x] Commit completed Day 5 work

## Day 6 reliability validation — complete

- [x] Run preflight checks and confirm the local model service is reachable.
- [x] Verify chats, settings, selected microphone, and selected read-aloud voice survive a full app restart.
- [x] Verify conversation lifecycle: create, switch, save, delete, and clear-history safeguards.
- [x] Verify clear recovery messages when Ollama or a selected model is unavailable, then confirm recovery once it is back.
- [x] Fix and manually verify the confirmed light-theme color issue.
- [x] Complete the conversation-lifecycle check and record the final Day 6 results.
- [x] Add and verify Bryce as an additional permitted local read-aloud voice.

## Day 7 release preparation

- [ ] Review the completed Week 1 feature set and known licensing obligations.
- [ ] Update user-facing setup, privacy, and voice documentation for a clean handoff.
- [ ] Run final regression checks and prepare a release tag or package plan.

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
