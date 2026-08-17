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

## Day 17 PDF extraction design — complete

- [x] Select a local PDF text-extraction library: `pdfjs-dist` (Mozilla PDF.js, Apache-2.0), text-layer only, no rendering or embedded-script execution.
- [x] Define fail-closed rejection codes for password-protected, malformed, image-only, and otherwise-failed PDFs.
- [x] Confirm extraction reuses the existing local document-record shape with no new store or fields.
- [x] Keep PDF text out of Ollama except through the existing confirmed Day 15/16 Q&A flow.
- [x] Implementation (Day 18): dependency added, `readPdfDocument` extends the import path, all four rejection codes wired, automated suite covers success/malformed/no-text-layer/no-network cases.

## Day 18 PDF extraction implementation — complete

- [x] Add `pdfjs-dist` as a runtime dependency and extend `documents.js` with `readPdfDocument`.
- [x] Wire `PDF_PASSWORD_PROTECTED`, `PDF_MALFORMED`, `PDF_NO_TEXT_LAYER`, `PDF_EXTRACTION_FAILED`.
- [x] Automated tests: synthetic PDF success/malformed/no-text-layer cases, plus real password-protected and real scanned fixtures decoded from `apps/desktop/encrypted.b64`/`scanned.b64`, plus a no-network-call check.
- [x] A PDF's extracted text confirmed to reach the Q&A confirmation gate exactly like a text import — same caps, same tamper check.
- [x] `npm run check` passes in full, permanently, not just for this session.
- [ ] Live click-through in the running app (native picker → import → restart → confirm persistence → ask via the real confirmation dialog UI). Not automated this session due to desktop conditions (active call, overlapping windows) making further remote clicking unsafe to continue. Non-blocking — the same code path is already exercised programmatically above.

## Day 19 safe custom commands — complete

- [x] Define and build named, saved 1–5-step sequences that replay only already-approved apps/websites — no new execution primitive. See [Custom commands design](docs/CustomCommands.md).
- [x] Every step re-resolves live against the existing approved-app/website validators at save time and again at run time; a removed approval fails that step closed instead of running blind.
- [x] One Cancel-first confirmation for the whole sequence (build/save and run), not one per internal step, per explicit user direction.
- [x] Add `create-custom-command` / `run-custom-command` / `remove-custom-command` activity logging, scoped to name and step count/outcome only.
- [x] Add automated coverage (`scripts/check-custom-commands.js`) and manual in-app verification before committing.
- [x] Day 19 changes committed as `feat: complete Day 19 custom commands`.

## Day 20 safe workflows design — complete

- [x] Define named, saved sequences of up to 10 steps where a step can route to a different later step depending on whether the step before it succeeded or failed. See [Workflows design](docs/Workflows.md).
- [x] Steps stay limited to opening an approved app, opening a website, or running an existing saved custom command — no new execution primitive.
- [x] Loops made structurally impossible: every routing target must be a strictly later step index, or "stop" — never backward, never self-referencing.
- [x] Define the branch-aware confirmation contract and the failure-path reporting requirement (report the actual path taken and why, not just which steps ran).
- [x] No code enabled in Day 20 — design only, matching the Day 8/11/15/17 pattern.
- [x] Day 20 changes committed as `docs: complete Day 20 workflow design`.

## Day 21 safe workflows implementation — complete

- [x] Implement `workflows.js`: 1-10 step / 50-workflow caps, and routing validation that rejects any target that is not "stop", "next", or a strictly later step index, making loops structurally impossible.
- [x] Steps resolve to an approved app, a website, or an existing saved custom command; a "run custom command" workflow step executes through the same code path as running that command directly.
- [x] Add the `zen:workflows:*` IPC handlers and a run handler that follows each step's success/failure routing and reports the exact path taken and why.
- [x] Add a Workflows card on the Activity page with per-step success/failure routing, one Cancel-first confirmation for save and for run, and a path-taken run result.
- [x] Add `create-workflow` / `run-workflow` / `remove-workflow` activity logging, scoped to name and a short path summary only.
- [x] Add automated coverage (`scripts/check-workflows.js`), including branch resolution, loop rejection, and fail-closed cases for removed approvals and removed custom commands.
- [x] Live click-through in the running desktop app — complete. User confirmed save, run (app opened successfully), and persistence after a full restart.

## Day 22 accessibility and error-handling audit — complete

- [x] Audit the confirmation modal, decorative icon labeling, keyboard focus visibility, and error-message consistency against the real source files. See [Accessibility & error-handling audit](docs/AccessibilityErrorHandling.md).
- [x] Four concrete findings: no modal focus trap / inert background; decorative icons missing `aria-hidden`; the composer message field missing a `:focus-visible` style; one vague error message in Day 21's `executeStep` helper.
- [x] Spot-checked and found clean: settings reset paths, Day 6/9 theme contrast work, and `aria-live` coverage on every dynamic panel.
- [x] No code changed in Day 22 — audit only, matching the Day 8/11/15/17/20 pattern. Day 23 will implement exactly the four findings above.

## Day 23 accessibility and error-handling fixes — complete

- [x] Modal focus trap: Tab/Shift+Tab now cycles only between Cancel and Approve; `#app-shell` is marked `inert` while the confirmation dialog is open.
- [x] `aria-hidden="true"` added to all six decorative icon glyphs (five nav icons plus the Send button's arrow), accessible names unchanged.
- [x] `:focus-visible` ring added to the composer message textarea, consistent with the accent-ring style used elsewhere.
- [x] The vague `executeStep` error message reworded to be specific, consistent with the rest of `main.js`.
- [x] `npm run check` passes in full. A short manual Tab-through of the modal and composer field is recommended but not yet confirmed — see [Project handoff](HANDOFF.md).

## Day 24 GPL and voice-model license review — complete

- [x] whisper.cpp confirmed MIT-licensed by reading its LICENSE file directly — safe to bundle, no further review needed. See [GPL & voice-model license review](docs/VoiceLicenseReview.md).
- [x] Piper confirmed GPL-3.0 (its original MIT repo was archived in 2025; active development moved to a GPL-3.0 fork). A plausible subprocess-based compliance path exists but still needs real legal sign-off before bundling.
- [x] Found a concrete, previously-unrecorded risk: the Lessac voice (and Ryan, fine-tuned from it) likely carries a restrictive "Blizzard" research license incompatible with redistribution. Amy's and Bryce's current licensing could not be independently re-confirmed this session.
- [x] Recommendation: do not bundle any of the four voice models without reading their MODEL_CARD files directly; package Zen's first release without voice bundled, which does not block packaging from starting.

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
- In **Activity → Custom commands**, bundle apps/websites you've already approved into a named, saved sequence of up to 5 steps. Saving and running each show one confirmation listing every step; Zen replays only what you separately approved.
- In **Activity → Workflows**, chain approved apps, websites, and saved custom commands into a sequence of up to 10 steps where each step can route to a different later step depending on success or failure. Loops are structurally impossible — every route must point forward or stop. Saving and running each show one confirmation listing every step and its routing; a run reports the exact path taken.
- In **Settings → Appearance**, use live theme preview cards and choose any safe appearance shortcut to cycle presets while Zen is focused. F8 and F9 remain reserved for voice recording.
- Hold **F8** to speak; release it to transcribe locally. Press **F9** once to start locked recording and again to stop it.
- Use **Read aloud** on an assistant message, and **Stop speaking** at any time. The installed local voices are Lessac, Amy, Ryan, and Bryce; Settings can save a slower, normal, faster, or fastest read-aloud speed.

## Release status

Zen's completed MVP is tagged `v1.0.0` and includes a tested unsigned Windows installer. The
earlier `v0.1.0` tag remains the Week-1 source checkpoint. Do not distribute bundled voice
runtimes or Piper models until their GPL and individual model-license obligations have been
reviewed. See the [release record](docs/Release.md), [code-signing guidance](docs/CodeSigning.md),
and [voice rules](docs/Voice.md).

## Next planned version

Zen v2.0 is planned as a voice-first personal desktop agent: optional Windows startup, the
configurable `Ctrl + Alt + Space` global shortcut, a compact command overlay, structured task
planning, scoped file/app/browser automation, undo, and explicit safety controls. See the
[30-day v2.0 plan](docs/ZenV2Plan.md).

As of August 16, 2026, this plan is being executed as a compressed 2-day sprint
(`docs/ZenV2-2Day-Sprint-Plan.md`) under the finalized name **v2.0** rather than the full 30-day
schedule. **Blocks A-H are implemented and automated checks pass in full. The final manual
desktop smoke test for the PowerShell and accessibility-automation paths remains a release gate;
v2.0 is not tagged until that walkthrough passes.**
Day 1 closed out the foundation and core agent loop: system tray, single-instance lock, the
`Ctrl+Alt+Space` global hotkey, the compact command overlay, push-to-talk voice input with typed
fallback, and a working goal-to-plan-to-execution loop. Direct requests such as “Open YouTube”
now route to the local-model planner without a `Task:` prefix. Zen auto-runs validated low-impact
actions (open approved apps/HTTPS sites, search or read inside selected folders, and browser
research after browser access is granted); file changes, UI automation, form filling, routines,
and PowerShell still show a task review, while sensitive actions always require a fresh
confirmation. The task window shows progress, supports pause/resume/cancel, and works with the
global `Ctrl+Alt+Escape` emergency stop and append-only local audit log. Block E added persistent
folder-permission grants (Activity page, grant/list/revoke) and real file actions on top of that
loop: `search-folder`, `read-file` on any file inside a granted folder, and `move-file`/
`copy-file`/`rename-file`/`delete-file` -- delete is Recycle-Bin-routed and asks for a fresh,
distinct confirmation in the popup right before it runs. Block F added accessibility-first app
automation (`click-control`/`type-into-field`, scoped to already-approved, already-running apps,
UI Automation only -- no blind coordinate clicks or SendKeys) and an off-by-default
**Full System Control (PowerShell)** channel (`run-powershell`): a typed acknowledgment to enable,
a fail-closed sensitive-command classifier that always re-confirms a risky command even with the
toggle on, and secret/credential redaction in the audit log -- see
[docs/PowerShellControl.md](docs/PowerShellControl.md). `docs/AgentModePlan.md` and
`docs/AgentModeChecklist.md`, previously described here as existing superseded draft files, do
**not** actually exist in this repo — that was a stale reference from an earlier session and has
been corrected (verified via direct filesystem check, Aug 15, 2026). `docs/ZenV2-2Day-Sprint-Plan.md`
is authoritative for this sprint; `docs/AgentContract.md` holds the underlying task/risk/permission
contract. See [HANDOFF.md](HANDOFF.md) for the full audit.

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
- [PDF extraction design](docs/PDFExtraction.md)
- [Custom commands design](docs/CustomCommands.md)
- [Workflows design](docs/Workflows.md)
- [Accessibility & error-handling audit](docs/AccessibilityErrorHandling.md)
- [GPL & voice-model license review](docs/VoiceLicenseReview.md)
- [Zen v2.0 personal desktop agent plan](docs/ZenV2Plan.md)
- [Agent contract (v2.0 task states, risk tiers, permissions, audit)](docs/AgentContract.md)
- [2-day sprint plan](docs/ZenV2-2Day-Sprint-Plan.md)
- [PowerShell control (Full System Control)](docs/PowerShellControl.md)
- [Project handoff](HANDOFF.md)

## Project continuity

When work is completed, update `HANDOFF.md` with the current state and next step. Update this README whenever the project status or usage instructions change. This keeps the project ready to transfer to a new agent at any time.
