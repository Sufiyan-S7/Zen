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

## Day 7 release preparation — complete

- [x] Review the completed Week 1 feature set and known licensing obligations.
- [x] Update user-facing setup, privacy, and voice documentation for a clean handoff.
- [x] Run final regression checks and prepare a source-release tag plan.

## Next: Week 2 safe computer control

- [x] Make the chat and Settings layout use the available desktop window width.
- [x] Add saved Deep violet, Lavender light, and True black theme presets with accent-colour choices.
- [x] Add saved text-size, chat-spacing, and contrast-protected custom accent controls.
- [x] Add saved interface-font, chat-bubble, reset-appearance, and read-aloud speed controls.
- [x] Add live theme preview cards, per-voice read-aloud speeds, and a user-selected appearance shortcut.
- [x] Manually verify appearance customization, per-voice speed, custom shortcut, and saved settings after restart.
- [x] Define the initial action scope, confirmation contract, validation rules, and local activity-log contract. See [safe computer-control design](docs/ComputerControl.md).
- [x] Build the local tool registry and browser-local activity log, with a 200-record limit and confirmation-protected clearing.
- [x] Add preview-and-confirm controls for opening user-provided HTTPS websites from the new **Activity** page.
- [x] Manually verify the website confirmation flow after fixing the startup-overlay bug.
- [x] Add a user-managed local approved-app list: choose a Windows `.exe`, confirm its exact path, open it only after a new confirmation, or remove its approval.
- [x] Manually verify approved-app approval, cancellation, opening, revocation, chat guidance, and local activity records.
- [x] Add file search limited to folders the user explicitly selects, with a native folder grant, confirmation, 100-result cap, and filename/path-only results.
- [x] Manually verify approved-app, HTTPS-website, and selected-folder-search confirmations, cancellation, errors, and local activity records.
- [x] Add automated safety checks for URL restrictions, search validation, selected-folder boundaries, result caps, and confirmation-required tools.
- [x] Add a confirmed browser-web-app option with a fixed user name, Chromium launcher, and HTTPS destination.
- [x] Manually verify browser-web-app opening, cancellation, persistence after restart, and approval removal.

## Day 10 local memory — complete

- [x] Add a dedicated **Memory** page for manually saved local preferences, facts, and standing instructions.
- [x] Keep memory separate from conversations; clearing chats does not erase saved memories.
- [x] Support editing and confirmation-protected removal of a memory.
- [x] Keep saved memories out of model prompts for now, so there is no invisible recall or automatic collection.
- [x] Document the local-memory boundary in [docs/Memory.md](docs/Memory.md).
- [x] Manually verify add, edit, removal, cancellation, and persistence after restarting Zen.
- [x] Replace the unreliable browser edit prompt with Zen's inline Save changes and Cancel editor.
- [x] Day 10 changes committed as `feat: complete Day 10 local memory`.

## Day 11 document-import safety design — complete

- [x] Define native-picker-only, per-import consent for selected text and PDF files.
- [x] Define format, size, path, token, local-storage, activity-log, and model-context boundaries.
- [x] Define cancellation, failure, removal, and Day 12 validation requirements.
- [x] Do not enable document access, indexing, or document-to-model context in this design day. See [Document import design](docs/DocumentImport.md).

## Day 12 selected text-document import — complete

- [x] Add a **Documents** page with a Windows native multi-file picker and confirmation preview.
- [x] Import selected TXT, MD, CSV, and JSON files locally using one-use, window-bound selection tokens and main-process revalidation.
- [x] Store extracted text atomically in Zen app data; allow confirmed removal from Zen without touching source files.
- [x] Add automatic boundary checks for text decoding, binary rejection, PDF fail-closed behavior, persistence, and removal.
- [x] Manually verify selection, cancellation, import, restart persistence, removal, and source-file preservation.
- [ ] PDF extraction, document search, and chat recall remain disabled.
- [x] Day 12 changes committed as `feat: complete Day 12 local document import`.

## Day 13 local document search — complete

- [x] Search only Zen's already imported local text; never reopen source files.
- [x] Add case-insensitive plain-text search, capped local snippets, and invalid-query safeguards.
- [x] Keep searches and results out of Ollama requests.
- [x] Manually verify matching, no-match, invalid-query, and restart behavior.
- [x] Day 13 changes committed as `feat: complete Day 13 local document search`.

## Day 14 local document previews — complete

- [x] Add an explicit local preview for a chosen search result, limited to stored Zen text.
- [x] Keep source files closed and document text out of Ollama.
- [x] Add main-process validation and automated preview coverage.
- [x] Manually verify preview behavior, source-file preservation, and restart behavior.
- [x] Keep previews intentionally limited to 1,200 characters of local context.
- [x] Day 14 changes committed as `feat: complete Day 14 local document previews`.

## Day 15 document Q&A design — complete

- [x] Define the confirmation-gated flow that will let a question reach the local model together with locally stored document excerpts.
- [x] Cap a question's context at 3 documents / 4,000 combined characters, with visible truncation when exceeded.
- [x] Exclude PDF sources (extraction remains unavailable) and require a Cancel-first preview of the exact excerpts and question before any model call.
- [x] Scope `document-qa` activity logging to document names, character count, and status only — never question, excerpt, or answer text. See [docs/DocumentQA.md](docs/DocumentQA.md).
- [x] Implementation (Day 16): native entry point, confirmation preview, capped context assembly, and the fixed answer-from-excerpts system instruction are built and manually verified.

## Day 16 document Q&A implementation — complete

- [x] Add an **Ask about these results** entry point that appears once a local document search returns a match.
- [x] Assemble up to 3 documents / 4,000 combined characters of excerpts and show them in a Cancel-first confirmation before any model call.
- [x] Send the question and excerpts to the local model only after explicit confirmation, with a fixed answer-from-excerpts-only system instruction.
- [x] Log `document-qa` activity from the real chat outcome (not on dispatch), scoped to document name(s) and character count only.
- [x] Add automated coverage for the context caps, tamper detection, and removed-document fail-closed case.
- [x] Manually verify a grounded answer, an out-of-scope question, Cancel, Escape, and the privacy-safe Activity log in the running app.
- [ ] Optional follow-up: live manual check of the mid-flow document-removal case and the visible-truncation-over-cap case (both covered by automated tests already).

## Technology choices

| Area | Choice |
| --- | --- |
| Desktop app | Electron |
| UI | HTML, CSS, JavaScript |
| Local AI | Ollama |
| Storage | Browser local storage inside the Electron app |
| Voice | whisper.cpp speech-to-text + Piper text-to-speech |
| Browser automation | Playwright (planned) |

## Run the desktop app

### Prerequisites

- Windows, Node.js, and Ollama installed locally.
- Ollama running with at least one local model, such as `llama3.2:3b`.
- Voice is optional. The machine-local `vendor/whisper-runtime/` and `vendor/piper-runtime/` folders are intentionally not included in Git. Without them, chat still works but voice controls remain unavailable.

From the project folder, run:

```powershell
npm.cmd --prefix apps/desktop install
npm.cmd --prefix apps/desktop start
```

The first command downloads Electron once. Zen opens as a local desktop chat app and uses Ollama only on your computer.

## Using Zen

- Create and switch conversations in the sidebar. Conversations and preferences stay in the app's local storage.
- Open **Settings** to select an installed Ollama model, Light or Dark theme, microphone, and read-aloud voice.
- Open **Activity** to review a user-provided HTTPS website before opening it. Zen shows the normalized destination and requires your confirmation; activity records stay local. Zen validates the address, not whether the remote site will return a 404 or sign-in page.
- In **Activity → Choose what Zen may open**, select a Windows app to approve. Zen saves the approval locally, asks again before every launch, and lets you remove it at any time. For a Chrome/Edge/Brave/Opera/Vivaldi web app, use the browser-web-app form to save a fixed name, browser launcher, and HTTPS address; Zen will not accept arbitrary browser arguments.
- In **Settings → Appearance**, use live theme preview cards and choose any safe appearance shortcut to cycle presets while Zen is focused. F8 and F9 remain reserved for voice recording.
- Hold **F8** to speak; release it to transcribe locally. Press **F9** once to start locked recording and again to stop it.
- Use **Read aloud** on an assistant message, and **Stop speaking** at any time. The installed local voices are Lessac, Amy, Ryan, and Bryce; Settings can save a slower, normal, faster, or fastest read-aloud speed.

## Release status

Zen `v0.1.0` is tagged locally as a tested source release, not a packaged Windows installer. Do not distribute the bundled voice runtimes or Piper models until their GPL and individual model-license obligations have been reviewed. See the [release readiness guide](docs/Release.md) and [voice rules](docs/Voice.md).

### Desktop shortcut

`Zen.lnk` is available on the Windows desktop. It now launches Electron directly and uses Zen's custom AI-engine icon. Double-click it to start Zen without opening PowerShell first; right-click the shortcut and select **Pin to taskbar** for even faster access.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/Architecture.md)
- [Roadmap](docs/Roadmap.md)
- [Coding standards](docs/CodingStandards.md)
- [Release readiness](docs/Release.md)
- [Voice rules and licensing](docs/Voice.md)
- [Local memory scope](docs/Memory.md)
- [Document import design](docs/DocumentImport.md)
- [Document Q&A design](docs/DocumentQA.md)
- [Project handoff](HANDOFF.md)

## Project continuity

When work is completed, update `HANDOFF.md` with the current state and next step. Update this README whenever the project status or usage instructions change. This keeps the project ready to transfer to a new agent at any time.
