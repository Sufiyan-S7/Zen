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

### Latest checkpoint — August 7, 2026

#### Day 7 — release preparation in progress

- Release review completed: Zen is a tested local-development app but not yet a distributable Windows installer. Voice runtimes and models are deliberately ignored by Git; Piper is GPL-3.0 and each voice model requires a license/model-card review before any bundle or distribution.
- Updated `README.md`, `docs/Voice.md`, and new `docs/Release.md` with accurate startup instructions, local-only usage, voice controls, licensing boundary, final regression checklist, source-release plan, installer plan, and rollback rule.
- No runtime code changed. Day 7 documentation is committed on `main` as `docs: complete Day 7 release readiness`; pre-existing untracked `deliverables/` remains untouched.
- Final manual regression passed: normal local chat, restart persistence, conversation safeguards, Light/Dark readability, F8 and F9 voice input, read aloud/Stop speaking, and Ollama/model failure recovery all work correctly. The user prefers Ryan as their selected read-aloud voice because Bryce was slower than preferred; Bryce remains available locally.
- Validation passed: final `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed before the documentation commit. A `v0.1.0` tag must be created only after explicit user approval. There is no packaging configuration yet, so a tag would represent a source release only.
- Exact next recommended step: ask the user whether to create the annotated `v0.1.0` source-release tag. Do not create a Windows installer or distribute Piper/voice runtimes until packaging and license reviews are complete.

#### Day 6 — reliability validation started

- Scope: verify startup, saved local state, conversation lifecycle, failure recovery, and release readiness after the completed Day 5 voice work.
- Baseline: commit `4329df9 feat: complete Day 5 local voice`; no tracked changes are pending. The existing untracked `deliverables/` directory remains intentionally untouched.
- Initial checklist is mirrored in `README.md`. No product code has changed as part of Day 6 yet.
- Preflight passed: `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed. Ollama was reachable at `127.0.0.1:11434` and reported `deepseek-r1:8b`, `llama3.2:3b`, and `gemma4:12b`.
- User validation passed: a full Zen restart preserved saved state; Ollama/model recovery messaging also passed.
- Confirmed Day 6 defect: the light theme had incomplete color overrides, leaving several text, status, and control combinations inconsistent or difficult to read. The light palette now sets native light controls and explicit high-contrast colors for navigation, status, cards, messages, composer, voice controls, and destructive actions.
- User confirmation: the revised Light theme is "100% fine and perfect." `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed after the CSS change.
- User validation complete: conversation create/switch/save, delete confirmation, clear-history cancellation safeguard, and normal typing all passed. The earlier intermittent missing-text-caret report did not recur and is not a confirmed defect.
- Day 6 reliability validation is complete. The user requested one scoped addition before the next Git commit/release preparation: add their own permitted personal local read-aloud voice.
- August 7, 2026 voice addition: the user chose the official `en_US-bryce-medium` Piper voice for now. Its `.onnx` model and matching `.onnx.json` configuration were downloaded to ignored `vendor/piper-runtime/voices/`; Bryce was registered as a selectable local read-aloud voice. The model is not tracked by Git.
- Validation passed: Bryce generated a 146,988-byte local WAV successfully; that temporary verification file was removed. `npm.cmd --prefix apps\\desktop run check` and `git diff --check` also passed after the change.
- User confirmation: Bryce works perfectly through Zen's Settings selector and Read aloud control. Day 6 is complete.
- Git state: Day 6 documentation, light-theme CSS changes, and Bryce voice registration are committed on `main` as `feat: complete Day 6 reliability`; pre-existing untracked `deliverables/` remains untouched. All Piper runtime and voice files remain ignored.
- Known issue: none confirmed.
- Exact next recommended step: begin Day 7 release preparation: documentation/privacy review, final regression verification, and a release tag or package plan. A personal voice can later replace or supplement Bryce once it exists as a consented Piper `.onnx` plus `.onnx.json` model.

- Day 5 voice preparation is complete. The user confirmed normal voice input, Bluetooth microphone selection, saved preferences, F8 hold-to-speak, F9 locked recording, all requested input safety cases, local Read aloud, and Stop speaking work correctly in the desktop app.
- August 7, 2026 completion: added locally selectable Lessac, Amy, and Ryan Piper voices and committed the completed Day 5 work.
- Zen now provides fully local speech-to-text through `whisper.cpp`, selectable Windows microphone input, two independent keyboard recording controls, and fully local Piper read aloud. The selectable local Piper voices are Lessac, Amy, and Ryan; the selected voice is saved locally.
- Piper v1.6.0 is GPL-3.0 and its three voice models remain Git-ignored machine-local dependencies under `vendor/piper-runtime/`. Any distributable Zen package must complete a GPL compliance review before bundling Piper.
- Validation passed: all three Piper voices generated local WAV files successfully (Lessac 56,364 bytes; Amy 80,428 bytes; Ryan 60,460 bytes), the temporary files were removed, `npm.cmd run check` passed, and `git diff --check` passed.
- Git state: Day 5 local voice work is committed on `main`; pre-existing untracked `deliverables/` remains untouched.
- Known issue: no active Day 5 blockers. The next recommended work is Day 6–7 Week 1 finishing: regression-test restart, model failure, saving, new chat, and deletion; fix any findings; prepare the release documentation and tag.

- Day 5 offline speech-to-text is integrated but awaits manual microphone validation. The official `whisper.cpp` v1.9.2 Windows x64 runtime and `ggml-base.en.bin` English model are installed locally in Git-ignored `vendor/whisper-runtime/`; the official source is cloned in Git-ignored `vendor/whisper.cpp/` at revision `306c88f4d1286aec1bf96e544632897886af5501`.
- Zen detects that runtime through its secure Electron bridge, enables **Hold to speak** only when the local executable and model are present, requests microphone access only when the user presses that control, records while held, and stops on release. The renderer creates a 16 kHz WAV in memory; Electron writes it temporarily, transcribes it locally, inserts the returned text into the draft, and removes both temporary audio and transcript files.
- Zen keeps the existing privacy rules: no always-listening, no recording retention, and no browser, operating-system, or cloud transcription fallback. Piper remains uninstalled and requires a GPL distribution plus voice-model provenance review before read aloud is enabled.
- Validation passed: `npm.cmd run check`, `git diff --check`, and a direct `whisper-cli` transcription of the official bundled `samples/jfk.wav`. The expected JFK sentence was produced locally; a temporary text output was deleted after the test.
- Git state: Day 4 remains committed as `32f435d`; Day 5 code, documentation, `.gitignore`, and earlier continuity documentation edits are uncommitted. Large local `vendor/whisper.cpp/` and `vendor/whisper-runtime/` dependencies are ignored; pre-existing untracked `deliverables/` remains untouched.
- Known issue: real microphone capture, permission denial, cancellation, and empty-audio flows need manual desktop-app testing. The runtime uses CPU inference on this machine because no compatible GPU backend was found.
- August 6, 2026 diagnosis: the first in-app test correctly showed **Voice input unavailable** because `VOICE_RUNTIME` resolves one directory too shallow. It currently points to `C:\PERSONAL\Zen\apps\vendor\whisper-runtime`, which does not exist, while the verified runtime is at `C:\PERSONAL\Zen\vendor\whisper-runtime`. This is a path-resolution bug, not an installation, permission, or model failure.
- August 6, 2026 fix: `VOICE_RUNTIME` now resolves to `C:\PERSONAL\Zen\vendor\whisper-runtime`. Validation confirmed both `whisper-cli.exe` and `ggml-base.en.bin` exist at that corrected location; `npm.cmd run check` and `git diff --check` pass.
- August 6, 2026 microphone-selection addition: Settings now lists Windows audio-input devices, lets the user choose one (including a connected Bluetooth headset microphone), and stores that device choice locally. It does not request microphone permission while listing or choosing a device. Zen uses the selected device ID only when a push-to-talk recording starts.
- Manual in-app validation: the user confirmed on August 6, 2026 that Zen transcribes their voice perfectly through the selected microphone.
- August 6, 2026 keyboard-control redesign: `Ctrl + Alt` was removed because modifier-only shortcuts are handled inconsistently by Windows/Electron. `Fn` cannot be used because it is normally handled by keyboard hardware and does not reach Windows applications. Zen now uses two independent Electron-intercepted keys: **F8** for immediate hold-to-speak and **F9** as a locked-recording toggle. They have no shared timing, double-tap, or duration logic. The code also cancels a pending microphone startup if F9 is pressed again before recording begins.
- Manual in-app validation: the user confirmed that the F8 and F9 keyboard controls, voice transcription, microphone selection, persistence, and normal voice flow work correctly.
- August 6, 2026 local read-aloud addition: Piper v1.6.0 (GPL-3.0) and the `en_US-lessac-medium` voice are installed under ignored `vendor/piper-runtime/`. Piper is not bundled in Zen's source or Git history. The Electron main process invokes Piper locally, reads the temporary WAV into memory, deletes it, and gives the bytes to the renderer. Every assistant message has **Read aloud**; the composer shows **Stop speaking** while synthesis or playback is active.
- Validation passed: the Piper CLI generated a 104,492-byte local verification WAV using the selected voice; the test file was deleted. `npm.cmd run check` and `git diff --check` pass.
- Known issue: Read aloud and Stop speaking still need manual desktop-app verification with the user's actual audio output. A future distributable Zen package needs a GPL compliance review before bundling Piper.
- Exact next recommended step: restart Zen, click **Read aloud** on a short assistant response, then click **Stop speaking** while it plays. Confirm that audio stays local and playback stops. If confirmed, stage and commit the Day 5 changes, then run the remaining denial/cancellation/empty-speech/headset-disconnection safety checks.

- Day 4 settings implementation is complete and committed to Git.
- Zen now has a Settings page with locally saved Ollama model selection, dark/light theme selection, and a confirmation-protected clear-all-conversations control.
- The model list comes from local Ollama through Electron's preload bridge; model names are validated in the main process before each chat request.
- Settings are stored only in browser-local storage. Clearing conversations stops active local generations, removes migrated legacy history, and starts one fresh local conversation.
- Validation passed: `npm.cmd run check` and `git diff --check`.
- Current Git state: all tracked Day 4 files are committed; pre-existing untracked `deliverables/` remains untouched.
- Manual in-app validation on August 6, 2026: the user confirmed that the completed Day 4 experience works correctly.
- August 6, 2026 input fix: Zen no longer disables the message field while a reply is generating. The user can type the next message with a visible caret, while Send remains disabled until the active reply ends or is stopped. Creating a new conversation now clears any unsent draft instead of carrying it into the new chat.
- Validation after the input fix passed: `npm.cmd run check` and `git diff --check`.
- Exact next recommended step: begin Day 5 voice preparation by evaluating offline speech-to-text and text-to-speech options, then define explicit microphone-permission rules.

- Day 3 response-streaming implementation is complete and committed as `b368961 feat: complete Day 3 streaming experience`.
- Zen now progressively displays responses from `llama3.2:3b`, shows a Thinking state, and provides a Stop generating button. Stopping retains the response received so far.
- A renderer guard now disables chat and explains that Zen must be opened through its Electron desktop app when `window.zen` is unavailable.
- Offline Ollama failures now instruct the user to start Ollama; unavailable-model responses identify the configured model.
- Validation passed: `npm.cmd run check`, `git diff --check`, and a direct streamed `llama3.2:3b` response returned three chunks with a completed stream marker.
- Ollama is reachable and reports `deepseek-r1:8b`, `llama3.2:3b`, and `gemma4:12b`; only Zen's configured `llama3.2:3b` was exercised because model selection is Day 4 work.
- Current Git state after the Day 3 commit: no tracked working-tree changes; pre-existing untracked `deliverables/` remains untouched.
- Known issue: the live app interaction (including Stop generating) still needs a manual desktop test.
- August 6, 2026 bug fix: streamed output no longer rebuilds the entire messages panel for every chunk, eliminating the visible flicker and scroll jump reported by the user. The in-progress assistant bubble is updated in place.
- August 6, 2026 bug fix: generation state is now per conversation. A background reply no longer puts other conversations into a Thinking state or prevents the user from sending a message there; Stop generating always affects the selected conversation.
- August 6, 2026 UI fix: the desktop sidebar and conversation pane now scroll independently. Scrolling either pane no longer moves the other; narrow mobile layouts retain normal single-page scrolling.
- The chat-switch timestamp issue identified in review is fixed: final response metadata is now applied to the conversation that received the response, not whichever chat happens to be selected.
- Stream handling now also processes a final chunk that lacks a trailing newline and avoids removing an active request when a duplicate request identifier is rejected.
- Validation after the fix passed: `npm.cmd run check`, `git diff --check`, and a direct streamed `llama3.2:3b` response returned three chunks with a completed stream marker.
- Manual in-app validation on August 6, 2026: the user confirmed that the response flickering is gone after the incremental-update fix.
- Validation for the scroll fix passed: `npm.cmd run check` and `git diff --check`.
- Exact next recommended step: manually confirm independent scrolling in the desktop app, then continue with Day 4 settings work.

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

- Display responses progressively. **Implemented; static and direct-stream checked.**
- Add a thinking indicator and Stop Generating control. **Implemented; requires manual in-app verification.**
- Make Ollama-offline errors clear. **Implemented.**
- Test with every installed model. **Deferred until Day 4 model selection exposes those models in Zen.**

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
