# Zen Project Handoff

## Start Here

Zen is a local-first Windows desktop assistant. It uses Electron for the desktop interface and Ollama for private, on-device AI chat.

Open PowerShell and start Zen with:

```powershell
cd C:\PERSONAL\Zen\apps\desktop
npm.cmd start
```

Do **not** open `apps/desktop/src/renderer/index.html` directly in a web browser. That page depends on Electron's secure preload bridge, which supplies `window.zen`.

A Windows desktop shortcut was created on August 6, 2026 at `C:\Users\khans\OneDrive\Desktop\Zen.lnk`. It now launches Electron directly from `apps\desktop\node_modules\electron\dist\electron.exe`, uses `assets\zen-icon.ico`, and should offer **Pin to taskbar** when right-clicked. The source design is `assets\zen-icon.svg`.

## Continuity Rule

Every future agent working in this repository must update this handoff before reporting a material result. Update `README.md` too whenever project status, startup, completed features, or key usage instructions change. Each handoff update must state the date, work completed, validation, known issues, Git state when relevant, and the next recommended action.

## Current Status — August 6, 2026

The continuity rule above was added on August 6, 2026. `AGENTS.md` contains the same required workflow so it is automatically available to coding agents working in this repository.

### Latest checkpoint — August 6, 2026

- Day 2 conversation-history work passed static validation and manual in-app testing: chat creation, switching, deletion, and saved-history behaviour were verified by the user.
- Day 2 was committed as `a5e71eb feat: complete Day 2 chat experience`.
- Zen can now be started from the desktop shortcut at `C:\Users\khans\OneDrive\Desktop\Zen.lnk`.
- The shortcut launches Electron directly and uses the modern `assets\zen-icon.ico` design, allowing it to be pinned to the Windows taskbar.
- The immediate next action is to add a friendly missing-Electron-bridge guard, then begin Day 3 response streaming.

### Day 1 — Complete and committed

- Repository, product documentation, and Electron workspace are present.
- Ollama was installed and Zen can send private local chat requests to `llama3.2:3b`.
- Commits:
  - `1af19f9 Day 1 Foundation Complete`
  - `66d5d43 feat: add local Ollama chat`

### Day 2 — Complete and committed

The following changes are present but **not committed**:

- Conversation-history sidebar.
- New conversation and delete-conversation controls.
- Named conversations, generated from the first user message.
- Conversation and message timestamps.
- Browser-local conversation storage with migration from the Day 1 single-chat format.
- Updated Day 2 status in `README.md`.

Changed files:

- `README.md`
- `apps/desktop/src/renderer/index.html`
- `apps/desktop/src/renderer/renderer.js`
- `apps/desktop/src/renderer/styles.css`

Validation completed:

```powershell
cd C:\PERSONAL\Zen\apps\desktop
npm.cmd run check
git diff --check
```

Both passed on August 6, 2026 when run from `apps/desktop`. Manual in-app testing by the user also confirmed that chats can be created, switched, deleted, and retained locally after use.

## Diagnosed Startup Issue

The user saw:

```text
I couldn’t reach the local model. Cannot read properties of undefined (reading 'chat')
```

This is **not** an Ollama outage. At diagnosis time:

- The `ollama` process was running.
- `http://127.0.0.1:11434/api/tags` responded successfully.
- Both `llama3.2:3b` and other local models were installed.

Root cause: `window.zen` was absent, meaning the renderer was opened outside the Electron application or without Electron's preload script. Start using `npm.cmd start` from `apps/desktop`.

Recommended follow-up: add a friendly renderer guard that disables sending and explains the Electron-launch requirement when `window.zen` is unavailable, instead of displaying the misleading local-model error.

## Important Project Files

- `README.md` — quick start and completed status.
- `docs/PRD.md` — product requirements.
- `docs/Architecture.md` — technical architecture.
- `docs/Roadmap.md` — four-week project roadmap.
- `apps/desktop/package.json` — available application commands.
- `apps/desktop/src/main/main.js` — Electron main process and Ollama request.
- `apps/desktop/src/main/preload.js` — secure renderer-to-main bridge.
- `apps/desktop/src/renderer/renderer.js` — chat state and UI behaviour.

## Recommended Immediate Steps

1. Start Zen with the command in **Start Here** or the desktop shortcut.
2. Implement the friendly missing-bridge guard described above.
3. Begin Day 3 response streaming, thinking feedback, and Stop Generating.
4. Run `npm.cmd run check` and `git diff --check` after each implementation step.

## Remaining Build Plan

### Day 3 — Stream AI responses

- Display responses progressively.
- Add a thinking indicator and Stop Generating control.
- Make Ollama-offline errors clear.
- Test with every installed model.

### Day 4 — Settings

- Create a Settings page.
- Let the user choose an Ollama model.
- Add theme and local-data controls.
- Add clear-all-conversations.

### Day 5 — Voice preparation

- Research offline speech-to-text and text-to-speech.
- Define voice-permission rules.
- Add voice controls without always-listening.

### Day 6–7 — Week 1 finishing

- Test restart, model failure, saving, new chat, and deletion.
- Fix issues, update documentation, tag the release, and plan Week 2.

### Week 2 — Safe computer control

- Tool registry, action levels, activity log, and permission prompts.
- Approved app and website opening.
- Local file search limited to selected folders.
- Preview-and-confirm file actions; never delete automatically.

### Week 3 — Memory and documents

- Editable preferences and local memory.
- SQLite storage, backup plan, and conversation/activity persistence.
- Import and search approved documents locally.
- Safe custom commands.

### Week 4 — Workflows and release

- Permission-aware multi-step workflows.
- Interface/accessibility polish and safety testing.
- Windows package, installation guidance, backup/export.
- Demo, changelog, and release tag.

## Working Rules

- Keep core functionality local and private by default.
- Require confirmation for actions that affect files, applications, websites, or external services.
- Do not add cloud APIs unless the user explicitly requests them.
- Preserve existing untracked `deliverables/` content; it was present before Day 2 work.
- Do not commit or discard existing changes without the user's approval.
