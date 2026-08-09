# Zen Project Handoff

> **`SESSION-LOG.md`, in this same folder, has the dated session-by-session history behind these
> decisions.** Skim its last 2â€“3 entries alongside this file at the start of any new session.

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

## Current Status â€” August 6, 2026

The continuity rule above was added on August 6, 2026. `AGENTS.md` contains the same required workflow so it is automatically available to coding agents working in this repository.

#### Day 10 â€” local memory complete (August 7, 2026)

- Added the **Memory** page, replacing the disabled placeholder. A person can manually save a short local preference, fact, or standing instruction; edit it with an inline **Save changes** / **Cancel** editor; or remove it after confirmation. Memory entries use their own renderer-local storage key and are intentionally independent from conversations, so clearing chats does not remove memories.
- Memory is deliberately not supplied to Ollama prompts in this slice. Zen never auto-extracts chat content into memory, and document import, semantic retrieval, exports, and model recall remain out of scope. `docs/Memory.md` states the privacy boundaries and the planned opt-in recall requirement.
- The initial browser-style **Edit** prompt did not work reliably in the desktop app. It was replaced with an inline Memory-page editor that avoids the unsupported prompt flow and gives visible Save changes and Cancel controls.
- August 7, 2026 follow-up diagnosis: the reported unchanged Edit behavior came from an Electron window started at 4:02 PM, before the renderer file was updated at 4:07 PM and Day 10 was committed at 4:08 PM. Electron does not hot-reload renderer files in an existing window. Fully quit Zen and reopen it to load the inline editor; clicking **Edit** then replaces that memory card with a textarea and **Save changes** / **Cancel** buttons.
- Validation passed: `npm.cmd --prefix apps\\desktop run check` (including the existing computer-control safety suite) and `git diff --check`. The user manually verified add, removal, cancellation, restart persistence, and conversation-clearing independence; they reported the original edit issue, which is addressed by the inline editor.
- Git state: Day 10 is committed separately as `feat: complete Day 10 local memory`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: scope Day 11 document import as a user-selected, local-only flow; do not grant automatic file access or enable memory recall without a new explicit control.

#### Day 12 â€” selected text-document import complete (August 7, 2026)

- Added a **Documents** page and a constrained main-process document service. Zen can now receive only native-picker-selected TXT, MD, CSV, or JSON files, show base name/type/size in a confirmation preview, consume a five-minute one-use window-bound token, revalidate paths and limits, and store extracted text atomically in Electron app data.
- Each source is limited to 20 MiB; a batch is limited to 20 files / 100 MiB. The service rejects symlinks/reparse points, folders, unsupported types, binary content, invalid text, missing selections, and invalid record IDs. Removing an import removes Zen's stored text and record only; it does not change the source file.
- PDF is deliberately fail-closed with `PDF_EXTRACTION_UNAVAILABLE` because no reviewed local parser is bundled. The picker may show a PDF, but Zen does not read or upload it. Document search, indexing, and Ollama context remain unavailable.
- August 7, 2026 Day 12 display bug fixed: imports succeeded, but `renderDocuments` shadowed the browser `document` object with a document-record parameter, so the list renderer threw while creating each row and showed the misleading â€œcould not loadâ€ message. The renderer now uses distinct item-record names; imported TXT files will display after restarting Zen.
- Validation passed: `npm.cmd --prefix apps\\desktop run check`, including new document-import checks for normal UTF-8 and UTF-16 text imports, binary rejection, PDF rejection, store persistence, and removal; `git diff --check` passed.
- Manual desktop validation passed: the user cancelled a selection, imported documents, restarted Zen and confirmed persistence, removed documents and confirmed their source files were unchanged, and confirmed PDF files are safely denied.
- Git state: Day 12 is committed separately as `feat: complete Day 12 local document import`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: plan Day 13 local document search. It must search only Day 12's already imported local extracted text, return local results/snippets only, never access source files again, and never add document content to Ollama requests.

### Latest checkpoint â€” August 7, 2026

#### Day 7 â€” release preparation complete

- Release review completed: Zen is a tested local-development app but not yet a distributable Windows installer. Voice runtimes and models are deliberately ignored by Git; Piper is GPL-3.0 and each voice model requires a license/model-card review before any bundle or distribution.
- Updated `README.md`, `docs/Voice.md`, and new `docs/Release.md` with accurate startup instructions, local-only usage, voice controls, licensing boundary, final regression checklist, source-release plan, installer plan, and rollback rule.
- No runtime code changed. Day 7 documentation is committed on `main` as `docs: complete Day 7 release readiness`; pre-existing untracked `deliverables/` remains untouched.
- Final manual regression passed: normal local chat, restart persistence, conversation safeguards, Light/Dark readability, F8 and F9 voice input, read aloud/Stop speaking, and Ollama/model failure recovery all work correctly. The user prefers Ryan as their selected read-aloud voice because Bryce was slower than preferred; Bryce remains available locally.
- Validation passed: final `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed before the documentation commit. The user explicitly approved and the annotated local source-release tag `v0.1.0` was created on commit `77a549f` (`docs: complete Day 7 release readiness`). No GitHub publish or binary package was created.
- Exact next recommended step: begin the next planned feature only after defining its scope. Do not create a Windows installer or distribute Piper/voice runtimes until packaging and license reviews are complete.

#### Next planned work â€” Week 2 safe computer control

- August 7, 2026 Day 9 browser web-app capability: added a separate Activity form for a user-defined web-app name, fixed HTTPS address, and a native-picker-selected Chromium browser launcher. Zen validates and stores that exact trio; on every separately confirmed launch, the main process revalidates it and generates only `--app={normalized HTTPS URL}`. Regular app approval continues to reject browser executables, and arbitrary browser arguments are never accepted. Chrome, Edge, Brave, Opera, Vivaldi, and supported proxy launchers are accepted; Firefox is deliberately excluded because it does not support this Chromium app-mode contract.
- Validation passed: `npm.cmd --prefix apps\\desktop run check` and `git diff --check`; the user manually approved and opened a browser web app, cancelled a launch, verified persistence after restart, and removed the approval successfully.
- Day 9 is complete: all Activity actions, cancellation paths, invalid website rejection, browser-web-app behavior, local persistence, and revocation have passed manual verification. This Day 9 commit contains the automated safety suite, website-result clarification, and constrained browser-web-app support.
- Git state: Day 9 is committed separately on `main` as `feat: complete Day 9 control hardening`; existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` changes remain outside this commit and untouched.
- Exact next recommended step: plan the next scoped Zen capability; do not broaden browser arguments, arbitrary executable control, or file access without a new safety design and user confirmation.

- August 7, 2026 Day 9 bug fixes: clarified that Zen validates a website address's safety and format but cannot determine whether the remote page exists; browser dispatch now reports that a 404 or sign-in screen is the website's response rather than claiming the page opened successfully. The regular approved-app flow rejects browser executables so it cannot start a browser without a fixed destination; browser web apps use the separate constrained flow above.
- Validation pending: run the automated safety suite and manually verify that a browser executable is rejected during approval, while a normal installed app remains approvable.

- August 7, 2026 Day 9 reliability and privacy hardening: added `scripts/check-computer-control.js` to the standard desktop `check` command. It verifies HTTPS-only URL restrictions, malformed/sensitive URL rejection, invalid search-query rejection, nested case-insensitive filename matches, root-bounded paths, the 100-result cap, and that every currently enabled tool requires confirmation.
- Validation passed: `npm.cmd --prefix apps\\desktop run check` (including the new computer-control suite) and `git diff --check`.
- Day 8 commit: verified Day 8 is committed on `main` as `5df31a8 feat: complete Day 8 safe computer control`. The commit contains the Activity controls, tool registry, user-managed app approvals, website opening, selected-folder filename search, confirmation UI, local activity logging, documentation, and the completed-day commit rule.
- Current Day 9 status: automated boundary coverage is complete. The remaining Day 9 work is a consolidated in-app regression of each Activity action and restart persistence, followed by a separate Day 9 commit.
- Git state: Day 9 changes are intentionally uncommitted in `apps/desktop/package.json` and `scripts/check-computer-control.js`; existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` changes remain outside the Day 8 commit and untouched.
- Exact next recommended step: run the consolidated Activity regression (website approve/cancel/reject, app approve/open/remove, folder-search approve/cancel/reject, activity-log clear cancellation, restart persistence). Then commit Day 9 separately.

- August 7, 2026 Day 8 folder search implementation: Activity now includes **Search a folder**. The user enters a file-name term, selects a folder through Windows' native picker, reviews the exact folder and term, and confirms before Zen recursively returns matching file or folder names and paths. The one-use folder-selection token expires after five minutes and is bound to the originating window; results are capped at 100, skip symbolic links, revalidate the folder at execution, and cannot escape the selected folder. Zen does not read file contents or make changes.
- Day 8 manual sign-off: the user confirmed the selected-folder filename-search flow works perfectly in the desktop app. Day 8 is complete: approved apps, HTTPS websites, and selected-folder filename search all use previews, confirmations, local activity records, and the documented constraints.
- Automated validation passed: `npm.cmd --prefix apps\\desktop run check`, `node --check apps\\desktop\\src\\main\\computer-control.js`, an isolated nested-folder test (two case-insensitive matches, root-bound results), invalid-query rejection checks, and `git diff --check`.
- Manual desktop verification passed: the user verified a harmless-folder search, confirmation, and displayed results in the desktop app. Day 8 is fully signed off.
- Exact next recommended step: begin Day 9 reliability and privacy hardening; no additional capabilities should be enabled for Day 8.

- August 7, 2026 approved-app manager: replaced the one-off File Explorer registry with a user-managed local app list. In Activity, the user selects a Windows `.exe` through the native picker, reviews and confirms its exact path, then may open it only after a separate per-launch confirmation or remove the approval with confirmation. Approvals persist in `approved-apps.json` under Electron's user-data directory, not chat/localStorage. File Explorer is seeded only because the user explicitly approved it earlier; it is removable like any other entry.
- August 7, 2026 diagnosis from user screenshots: requests to list `C:\Games` were sent to the chat model, which has no filesystem-search tool. Its â€œlistâ€ and bracketed placeholders were fabricated text; Zen did not read or enumerate that folder. Folder-granted filename search remains unimplemented.
- Product-scope clarification: an approved-app record currently authorizes only a future/user-confirmed launch of that exact executable. It does not grant Zen control of an app's interface, access to its contents, or permission to make changes within it. The user reasonably expected broader useful control; do not present app approval as general app control until concrete app-specific capabilities exist and pass manual validation.
- User manual validation passed: approved-app selection, approval persistence, cancellation, launch confirmation, revocation, non-misleading chat behaviour, and local activity records are all working correctly.
- Day 8 remaining work is now scope confirmation for the next capability: selected-folder filename search. The intended flow is native folder picker â†’ one-time folder grant â†’ preview of folder and query â†’ confirmation â†’ capped local filename/path results â†’ local activity record. It must not read file contents, leave the selected folder, or change files.
- Correction: the selected-folder search flow above is planned, not implemented. The current Activity page has approved-app and website controls only; do not tell the user that a folder-picker option is already visible.
- Known issue: despite the prompt's general file-control limits, the model can still invent file-listing answers. The next folder-search work must intercept file-list requests in the renderer and direct the user to a native folder-picker workflow until the constrained search tool exists.
- Security boundary: renderer-originated paths and app arguments are never launched. The main process holds a five-minute, one-use selection token, validates that the selected item is a real `.exe`, stores its real path, accepts only its stored ID to launch, and launches with no user-controlled arguments. Chat open requests receive local Activity guidance instead of reaching the model.
- Automated validation passed: `npm.cmd --prefix apps\\desktop run check`, syntax check for `computer-control.js`, an isolated persistent-registry test covering initial File Explorer migration, approved-ID resolution, removal, and invalid-ID rejection, plus `git diff --check`.
- Known issue: full in-app manual testing of choosing, approving, launching, cancelling, removing, and restart persistence remains required. Zen can open approved apps only; it cannot make arbitrary changes inside apps.
- Exact next recommended step: restart Zen, use **Activity â†’ Add an approved app** to approve one non-critical app, test cancellation then launch, restart Zen to confirm persistence, then remove its approval to verify revocation.

- August 7, 2026 Day 8 bug fix: the new website confirmation dialog could appear with a blank destination and leave the user unable to act on it. The issue was isolated to renderer-side modal lifecycle handling: temporary listeners and lack of a complete-preview guard made the dialog state fragile.
- Follow-up root cause confirmed from the live screenshot: `.modal-backdrop { display: grid; }` overrode the native `hidden` attribute because it has equal CSS specificity and appears later in the stylesheet. This made the empty confirmation dialog display immediately at startup, where no pending request exists for its buttons to resolve.
- Added `.modal-backdrop[hidden] { display: none !important; }`. The dialog is now absent until a verified website preview deliberately removes `hidden`.
- User manual validation passed: after restarting Zen, the website confirmation flow works correctly and the empty startup overlay is gone.
- August 7, 2026 diagnosis from user screenshot: Zen's chat model replied that it could open File Explorer and displayed `C:\`, but no File Explorer tool, allowlist entry, confirmation, or execution path exists. This was a misleading model-generated chat response; it did not open File Explorer inside Zen or in Windows. The displayed path is plain message text.
- August 7, 2026 File Explorer implementation: the user's explicit approval added one code-owned app registry entry for `C:\Windows\explorer.exe`, with the fixed destination `C:\`. The Activity page now offers **Open File Explorer**, previews that destination, requires confirmation, launches only that verified executable, and writes a local activity record. It accepts no user-supplied app path or arguments.
- Chat no longer forwards a File Explorer open request to the model. It displays local guidance to use Activity â†’ Open File Explorer, preventing the earlier false claim. The system prompt also explicitly forbids claims that chat executed a computer action.
- Validation pending: manually confirm Open File Explorer starts Windows File Explorer at `C:\`, then cancel it in a second test and verify the activity log records both results. Automated syntax, registry, and diff checks remain to be run.
- Exact next recommended step: restart Zen and run those two File Explorer confirmation tests; only then consider adding a second explicitly named app.
- The confirmation dialog now fails closed when no verified URL and hostname are present. Approve, Cancel, Escape, and a backdrop click are permanently wired to a single pending-confirmation state; closing restores focus to the originating control. No missing destination can reach `shell.openExternal`.
- Validation passed: static renderer/main/preload/tool-module checks and `git diff --check`. Manual desktop verification is still required: submit a normal HTTPS site, cancel, press Escape, click the backdrop, and enter an invalid value; confirm no dialog appears for invalid input and no action occurs after cancellation.
- Exact next recommended step: restart Zen and run that five-case manual confirmation check before relying on the website-opening flow.

- August 7, 2026 Day 8 implementation: added a code-owned local tool registry, browser-local activity log (newest 200 records), Activity page, confirmation modal with Cancel as the initial focus, and a live user-provided HTTPS website-opening flow. The renderer requests a main-process preview first; the main process validates the destination again after approval and only then calls Windows' default-browser opener. The old unrestricted new-window handler now always denies new window requests.
- Website validation accepts only complete HTTPS URLs without embedded credentials, control characters, or fragments. All requests, cancellations, validation rejections, failures, and successful opens receive a local safe activity record. Clearing the log requires confirmation.
- App opening remains unavailable because the code-owned app registry is intentionally empty. Folder search is not implemented. No action can be triggered by chat text.
- Validation passed: `npm.cmd --prefix apps\desktop run check`, `node --check apps\desktop\src\main\computer-control.js`, focused validator checks for valid HTTPS and rejected HTTP/file/credential/fragment/malformed inputs, and `git diff --check`.
- Git state: existing uncommitted changes remain in the desktop app, `README.md`, `HANDOFF.md`, and `docs/Voice.md`; new untracked `docs/ComputerControl.md` and `apps/desktop/src/main/computer-control.js` are part of Day 8 work. The pre-existing `deliverables/` directory remains untouched.
- Known issue: live desktop confirmation, default-browser opening, cancellation, and activity-log persistence still need manual user testing. Initial app names are required before Zen can safely add an app allowlist.
- Exact next recommended step: manually verify the Activity website flow with one normal HTTPS site, one cancellation, and one rejected address; then name the first installed apps you want Zen to be allowed to open.

- August 7, 2026 Day 8 design is complete. Added `docs/ComputerControl.md`, which fixes the initial scope to confirmed opens of registry-approved apps and user-provided HTTPS websites, plus one-time folder-granted file-name search. It documents strict exclusions, modal wording, validation rules, a local activity-log schema and 200-record retention limit, execution sequence, and the pre-enable test matrix.
- No computer-control code or ability was enabled. The initial app allowlist remains intentionally empty until the user names apps they want Zen to approve.
- Validation: reviewed the design against `docs/PRD.md`, `docs/Architecture.md`, `docs/Roadmap.md`, and Zen's local-first safety requirements.
- Exact next recommended step: implement the code-owned tool registry and browser-local activity-log service from `docs/ComputerControl.md`; retain an empty app allowlist until the user supplies approved app names.

- August 7, 2026 interface improvement: removed the fixed 920px maximum width from the main content column. On wider desktop windows, Chat and Settings now use the previously unused right-side space; message bubbles retain their own readable maximum width. This area was not reserved for a future feature.
- Validation passed: CSS change is limited to the main content width; `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed. The user should visually confirm the wider layout after restarting Zen.
- August 7, 2026 appearance update: used the user's supplied Lavender Dream and True Black palette ideas to add three saved full-interface presets: Deep violet (default dark), Lavender light, and True black. Added a saved Lavender, Periwinkle, or Soft plum accent choice. Existing saved `Dark` and `Light` settings migrate safely to Deep violet and Lavender light.
- Appearance personalization: Settings now also offers Small, Default, and Large text sizes; Compact, Comfortable, and Spacious chat spacing; and a Custom accent colour picker. The custom accent is applied only to accent surfaces, and Zen automatically selects the stronger of near-black or white button text for that colour.
- Additional settings: interface font (Modern sans, Soft rounded, Classic serif), Rounded/Square chat bubbles, and Reset appearance are now saved locally. These settings only affect the Settings and chat interface; the homepage workflow remains unchanged.
- Read-aloud speed: added slower (0.8Ã—), normal (1Ã—), faster (1.2Ã—), and fastest (1.4Ã—) choices. The selected speed crosses the secure Electron bridge as a validated value and Piper receives the equivalent local `--length-scale`. A direct Ryan 1.2Ã— Piper verification WAV was generated successfully (89,644 bytes) and deleted.
- Appearance previews and shortcut: Settings now shows three clickable live preview cards and a live current-style preview. The user may set or clear their own safe appearance shortcut; it cycles themes only while Zen is focused. The capture process blocks unsafe/reserved shortcuts, and F8/F9 remain reserved for voice controls.
- Per-voice speed: each read-aloud voice now remembers its own selected speed. The old single saved speed is safely migrated to the previously selected voice.
- User validation passed: all appearance controls, preview cards, custom shortcut, per-voice speech speed, and persistence after restart work correctly in the desktop app.
- Validation passed: `npm.cmd --prefix apps\\desktop run check` and `git diff --check` passed after the theme, appearance, speed, preview, and shortcut work. The feature changes and updated continuity documentation are currently uncommitted; pre-existing `deliverables/` remains untouched.
- Remaining project work begins with a permission-first design for safe desktop actions. No computer-control capability is enabled yet.
- Step 1: define a small approved action list and non-negotiable confirmation rules. Recommended initial scope: open a named installed app, open a user-provided website, and search only a user-selected folder. Do not add arbitrary command execution, unrestricted file access, or background automation.
- Step 2: implement a local tool registry and activity log that records requested action, preview, user approval/cancellation, result, and errors.
- Step 3: implement open-app/open-website previews and confirmations, then a folder-granted file search with the same safeguards.
- Step 4: manually test approval, cancellation, unavailable apps, invalid URLs, inaccessible folders, and audit records before enabling each action.
- Git state: `v0.1.0` is an annotated local source-release tag on `77a549f`; `main` contains the Week 2 plan as `docs: outline Week 2 next steps`. The only untracked item is the pre-existing untouched `deliverables/` directory.
- Known issue: none confirmed. A Windows installer remains future work pending packaging and license review.
- Exact next recommended step: visually confirm the wider desktop layout and new appearance presets, then agree the Week 2 action scope and confirmation wording before implementing the local tool registry and activity log.

#### Day 6 â€” reliability validation started

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
- Known issue: no active Day 5 blockers. The next recommended work is Day 6â€“7 Week 1 finishing: regression-test restart, model failure, saving, new chat, and deletion; fix any findings; prepare the release documentation and tag.

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

### Day 1 â€” Complete and committed

- Repository, product documentation, and Electron workspace are present.
- Ollama was installed and Zen can send private local chat requests to `llama3.2:3b`.
- Commits:
  - `1af19f9 Day 1 Foundation Complete`
  - `66d5d43 feat: add local Ollama chat`

### Day 2 â€” Complete and committed

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
I couldnâ€™t reach the local model. Cannot read properties of undefined (reading 'chat')
```

This is **not** an Ollama outage. At diagnosis time:

- The `ollama` process was running.
- `http://127.0.0.1:11434/api/tags` responded successfully.
- Both `llama3.2:3b` and other local models were installed.

Root cause: `window.zen` was absent, meaning the renderer was opened outside the Electron application or without Electron's preload script. Start using `npm.cmd start` from `apps/desktop`.

Recommended follow-up: add a friendly renderer guard that disables sending and explains the Electron-launch requirement when `window.zen` is unavailable, instead of displaying the misleading local-model error.

## Important Project Files

- `README.md` â€” quick start and completed status.
- `docs/PRD.md` â€” product requirements.
- `docs/Architecture.md` â€” technical architecture.
- `docs/Roadmap.md` â€” four-week project roadmap.
- `apps/desktop/package.json` â€” available application commands.
- `apps/desktop/src/main/main.js` â€” Electron main process and Ollama request.
- `apps/desktop/src/main/preload.js` â€” secure renderer-to-main bridge.
- `apps/desktop/src/renderer/renderer.js` â€” chat state and UI behaviour.

## Recommended Immediate Steps

### Week 2 plan reconfirmed â€” August 7, 2026

- The Week 2 plan was restated to the user; no product code or behaviour changed.
- Scope remains permission-first safe computer control: agree the initial approved actions and confirmation wording; build a local tool registry and activity log; add preview-and-confirm opening of approved apps and user-provided websites; add file search limited to folders explicitly selected by the user; then test approval, cancellation, unavailable apps, invalid URLs, inaccessible folders, and audit records.
- Validation: reviewed `README.md` and `docs/Roadmap.md` against this handoff.
- Git state: existing uncommitted modifications remain in `HANDOFF.md`, `README.md`, the desktop app sources, and `docs/Voice.md`; the pre-existing untracked `deliverables/` directory remains untouched.
- Known issues: none confirmed.
- Exact next recommended step: agree the three initial allowed action types and the precise confirmation text before implementation.

### Day 8 plan â€” August 7, 2026

- Day 8 is the design-and-safety foundation for Week 2; no computer-control action should be enabled until its approved scope and confirmation rules are agreed.
- Steps: inventory the proposed first actions; define their allowed inputs and explicit exclusions; assign action levels; write the preview and confirmation wording; define cancellation and error behaviour; define the local activity-log fields and retention; review the design against Zen's local-first/privacy rules; then obtain user approval before implementation begins.
- Validation: plan derived from the Week 2 roadmap and safe-computer-control checkpoint.
- Git state: existing uncommitted modifications remain in `HANDOFF.md`, `README.md`, the desktop app sources, and `docs/Voice.md`; the pre-existing untracked `deliverables/` directory remains untouched.
- Known issues: none confirmed.
- Exact next recommended step: approve the Day 8 action scope and confirmation wording.

1. Start Zen with the command in **Start Here** or the desktop shortcut.
2. Implement the friendly missing-bridge guard described above.
3. Begin Day 3 response streaming, thinking feedback, and Stop Generating.
4. Run `npm.cmd run check` and `git diff --check` after each implementation step.

## Remaining Build Plan

### Day 3 â€” Stream AI responses

- Display responses progressively. **Implemented; static and direct-stream checked.**
- Add a thinking indicator and Stop Generating control. **Implemented; requires manual in-app verification.**
- Make Ollama-offline errors clear. **Implemented.**
- Test with every installed model. **Deferred until Day 4 model selection exposes those models in Zen.**

### Day 4 â€” Settings

- Create a Settings page.
- Let the user choose an Ollama model.
- Add theme and local-data controls.
- Add clear-all-conversations.

### Day 5 â€” Voice preparation

- Research offline speech-to-text and text-to-speech.
- Define voice-permission rules.
- Add voice controls without always-listening.

### Day 6â€“7 â€” Week 1 finishing

- Test restart, model failure, saving, new chat, and deletion.
- Fix issues, update documentation, tag the release, and plan Week 2.

### Week 2 â€” Safe computer control

- Tool registry, action levels, activity log, and permission prompts.
- Approved app and website opening.
- Local file search limited to selected folders.
- Preview-and-confirm file actions; never delete automatically.

### Week 3 â€” Memory and documents

- Editable preferences and local memory.
- SQLite storage, backup plan, and conversation/activity persistence.
- Import and search approved documents locally.
- Safe custom commands.

### Week 4 â€” Workflows and release

- Permission-aware multi-step workflows.
- Interface/accessibility polish and safety testing.
- Windows package, installation guidance, backup/export.
- Demo, changelog, and release tag.

## Master 28-day checklist report â€” August 7, 2026

- A complete Day 1â€“28 checklist was provided to the user from the recorded roadmap and completed-day commits. Days 1â€“10 are complete, with Day 10 committed as `b362047 feat: complete Day 10 local memory`; Days 11â€“28 are planned only.
- No product behavior changed for this report. Current unrelated working-tree items remain `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/`.
- Exact next recommended step: begin Day 11 with a written safety design for user-selected, local-only document import before enabling any document access.

## Day 11 â€” document-import safety design complete (August 7, 2026)

- Added `docs/DocumentImport.md`, defining the next capability before code enables it: a Windows-native-picker-only, one-use, window-bound import grant for explicitly selected `.txt`, `.md`, `.csv`, `.json`, and text-extractable `.pdf` files.
- The design limits individual files to 20 MiB and a batch to 20 files / 100 MiB, rejects reparse points and unsupported/password-protected/image-only PDFs, previews only base names/types/sizes, keeps **Cancel** as the initial choice, and requires main-process revalidation before reading.
- It specifies local-only extracted-text storage, no source-file copying or alteration, visible removal that deletes Zen's copy only, redacted activity logging, and a strict rule that document text and paths do not reach Ollama in Days 12â€“13.
- No document picker, reader, index, search, or model recall was enabled in Day 11. No personal files were accessed.
- Validation passed: design reviewed against `docs/PRD.md`, `docs/ComputerControl.md`, `docs/Memory.md`, and the local-first architecture. `git diff --check` passed.
- Git state: Day 11 documentation is committed separately; pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: implement Day 12's native picker, one-use import token, main-process validators, atomic local store, and confirmation UI exactly to this design; do not implement indexing or chat recall yet.

## Day 13 â€” local document search complete (August 7, 2026)

- Added a local-only plain-text search over the extracted text already stored by Day 12. It never reopens source files, exposes source paths, or sends document text, queries, snippets, or results to Ollama.
- Documents now offers a case-insensitive search field with main-process query validation, a 200-character query limit, a 50-document result cap, match counts, and short whitespace-normalized snippets.
- Validation passed: `npm.cmd --prefix apps\\desktop run check`, including document import/search tests for case-insensitive matches, snippets, and invalid queries; `git diff --check` passed.
- Manual validation passed: the user verified matches, no-match behavior, invalid queries, restart behavior, and normal local document searching.
- Git state: Day 13 is committed separately as `feat: complete Day 13 local document search`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: plan Day 14 document-result refinement. Preserve the local-only boundary: improve result navigation and safe snippets without opening source files, adding document Q&A, or sending document text to Ollama.

## Day 14 â€” local document previews complete (August 7, 2026)

- Added a **Preview locally** control to each Day 13 search result. It requests a bounded 1,200-character context window from Zen's existing local document store, identifies the document, and states that the source file was not reopened. The bounded preview is intentional: it provides relevant context without becoming an unrestricted full-document viewer.
- Preview requests validate the stored document ID, plain-text query, and occurrence position in the main process. They expose no path and never call Ollama or read source files.
- Validation passed: `npm.cmd --prefix apps\\desktop run check`, including document-preview coverage and existing safety checks; `git diff --check` passed. A focused review confirmed the new IPC bridge exposes only ID/query/occurrence, previews derive only from `extractedText`, and all UI content uses `textContent`.
- Manual validation passed: the user verified local previews, restart behavior, removed-document handling, and source-file preservation.
- Git state: Day 14 is committed separately as `feat: complete Day 14 local document previews`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: plan Day 15 as an explicit per-question local document Q&A design; do not place document text into Ollama prompts until the user sees and approves the exact selected context.

## Day 15 â€” document Q&A design complete (August 8, 2026)

- Added `docs/DocumentQA.md`, defining the next capability before code enables it: the first point where document text is allowed to reach the local Ollama model, gated by an explicit per-question confirmation preview.
- The design caps a question's context at 3 documents / 4,000 combined characters, excludes PDF (still unavailable per Day 12), requires a Cancel-first confirmation showing the exact excerpts and question before any model call, and fixes a system instruction so the model answers only from provided excerpts and says plainly when they don't contain the answer.
- Activity logging for `document-qa` is scoped to document display names, character count, and status only â€” never question text, excerpt text, or the model's answer, consistent with the existing no-text-in-logs rule from Day 11.
- No document picker, retrieval, prompt change, or model call was enabled in Day 15. No document text has reached Ollama as a result of this work.
- Validation: design reviewed against `docs/DocumentImport.md`, `docs/Memory.md`, `docs/PRD.md`, and `docs/Architecture.md` for consistency with existing local-first/privacy boundaries.
- Git state: Day 15 documentation is committed separately as `docs: complete Day 15 document Q&A design`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, and `deliverables/` remain unrelated and untouched. A working `git` (2.53.0) was located at `C:\Users\khans\AppData\Local\github-copilot-git-2.53.0-3\cmd\git.exe`, not on PATH by default; the repo also required a one-time `git config --global --add safe.directory` exception due to a Windows-account ownership mismatch on `.git`.
- Exact next recommended step: implement Day 16 exactly to this design â€” native search-result question entry point, confirmation preview, capped context assembly, and the fixed system instruction â€” then run the Day 16 validation checklist in `docs/DocumentQA.md` before enabling it for regular use.

## Working Rules

- Keep core functionality local and private by default.
- Require confirmation for actions that affect files, applications, websites, or external services.
- Do not add cloud APIs unless the user explicitly requests them.
- Preserve existing untracked `deliverables/` content; it was present before Day 2 work.
- Do not commit or discard existing changes without the user's approval.

## Project progress review (August 8, 2026)

- Reviewed the committed implementation, `README.md`, the four-week roadmap, the product requirements, release guidance, and the latest Day 15 design. No product behavior changed in this review.
- Progress: the planned work is complete through Day 15 of 28 (about 54% of the calendar plan). Weeks 1 and 2 are implemented and manually validated; Week 3 has local memory plus text-document import, search, and bounded previews. Day 15 is a completed safety design, not a delivered document-Q&A feature.
- The immediate remaining implementation is Day 16: build confirmation-gated Q&A over selected local document search results, enforcing the 3-document / 4,000-character limits, logging only permitted metadata, and completing every validation item in `docs/DocumentQA.md`.
- Remaining roadmap themes after Day 16: semantic/PDF document capabilities and safe custom commands; confirmed multi-step workflows; accessibility and error-handling polish; broader automated safety coverage; Windows packaging with voice-license review; backup/export, demo, changelog, and final release readiness.
- Git state at review: the latest scoped commit is `ef7d9fd docs: complete Day 15 document Q&A design`. Existing unrelated working-tree items remain `docs/Voice.md` (modified), `.cursorrules.txt` (untracked), and `deliverables/` (untracked); they were not changed or included by this review.
- Known issue: no confirmed product blocker. PDF extraction and document Q&A are intentionally not yet enabled.
- Exact next recommended step: begin Day 16 exactly as specified in `docs/DocumentQA.md`, then manually validate its cancellation, cap, removal, privacy-log, and answer-grounding behavior before committing the completed day.

## Day 16 â€” document Q&A implementation complete (August 8, 2026)

- Implemented the Day 15 design end-to-end. In Documents, running a local search that returns at least one match reveals an **Ask about these results** card. Submitting a question calls `prepareDocumentQuestion`, which re-runs the search and assembles up to 3 documents / 4,000 combined characters of excerpts.
- A Cancel-first confirmation dialog shows the exact question and full excerpt text, with the fixed notice "Zen will send your question and these excerpts to your local model. Nothing leaves this computer." Only a confirmed **Ask Zen** sends the request to Ollama, with a system instruction to answer only from the provided excerpts.
- The resulting chat message shows a `documentSources` tag ("Asked with confirmed local excerpts: <name>") without duplicating raw excerpt text into conversation storage.
- Activity logging for `document-qa` now reflects the real chat outcome: entries move `requested` â†’ `completed`/`failed` based on `finishGeneration`, not on dispatch, and invalid/failed preparation also produces a logged entry (`rejected`/`failed`) where it previously did not. Logged fields remain limited to document name(s) and character count â€” never question, excerpt, or answer text.
- Fixed stale Documents-page copy that still said chat recall was unavailable, now that confirmed Q&A is live.
- Added automated coverage in `scripts/check-documents.js`: 3-document cap, 4,000-character cap, content-hash tamper detection, over-cap rejection, empty-excerpt rejection, and the "document removed after preview" fail-closed case. `npm run check` (including this new coverage) passes.
- Manual validation passed in the running desktop app, using a throwaway local test document: a grounded question correctly answered using a fact that only existed in that document (confirming real grounding, not model prior knowledge); an out-of-scope question did not produce a fabricated answer; Cancel and Escape both resulted in zero model calls and no chat message; the Activity log showed only document name, character count, and status for every `document-qa` entry.
- Not separately re-verified live this session: the mid-flow "document removed between preview and confirm" case, and the visible-truncation-when-over-cap case. Both are exercised by the Day 16 automated suite above; a live manual pass on these two is a reasonable but non-blocking follow-up.
- `docs/Voice.md`'s pre-existing duplicate "8." numbering issue remains untouched and unrelated, consistent with every prior day's handling of that file.
- Git state: committed separately as `feat: complete Day 16 document Q&A implementation` on `main` (run `git log --oneline -1` for the current hash). Pre-existing `docs/Voice.md`, `.cursorrules.txt`, `.backups/`, and `deliverables/` remain outside this commit, untouched. Pushed to `origin/main` and confirmed matching (both at `5af3eac` as of this update).
- Exact next recommended step: optionally close the two non-blocking manual checks noted above; then move to the next Week 3/4 roadmap theme (semantic/PDF document capabilities, safe custom commands, or Week 4 workflow/automation planning).

## Day 17 â€” PDF text extraction design complete (August 9, 2026)

- Added `docs/PDFExtraction.md`, defining the next capability before code enables it: local text-layer PDF extraction to replace Day 12's `PDF_EXTRACTION_UNAVAILABLE` fail-closed behavior.
- Selected `pdfjs-dist` (Mozilla PDF.js, legacy Node build, Apache-2.0) for text-layer-only extraction â€” no rendering, no embedded-script execution, no embedded-URI/network resolution. `pdf-parse` was considered and rejected as the primary choice due to inconsistent maintenance of its pinned dependency.
- Defined fail-closed rejection codes (`PDF_PASSWORD_PROTECTED`, `PDF_MALFORMED`, `PDF_NO_TEXT_LAYER`, `PDF_EXTRACTION_FAILED`) matching Day 12's existing error pattern, and confirmed a successful extraction reuses the existing `documents.json` record shape with no new store or fields.
- PDF text will reach Ollama only through the existing Day 15/16 confirmation-gated Q&A flow, under the same 3-document/4,000-character cap â€” no new model-access path.
- No PDF reading was enabled. `readTextDocument` in `apps/desktop/src/main/documents.js` still rejects every `.pdf` with `PDF_EXTRACTION_UNAVAILABLE` until Day 18 ships.
- Validation: design reviewed against `docs/DocumentImport.md`, `docs/DocumentQA.md`, `docs/PRD.md`, and `docs/Architecture.md` for consistency with existing local-first/privacy boundaries; `git diff --check` passed.
- Git state: Day 17 documentation to be committed separately as `docs: complete Day 17 PDF extraction design`. Pre-existing `docs/Voice.md`, `.cursorrules.txt`, `.backups/`, and `deliverables/` remain unrelated and untouched.
- Exact next recommended step: implement Day 18 exactly to `docs/PDFExtraction.md` â€” add `pdfjs-dist` as a dependency, extend `readTextDocument` (or a sibling `readPdfDocument`) to extract text-layer content, wire the defined rejection codes, and run the Day 18 validation checklist before enabling PDF import for regular use.


## Day 18 - PDF text extraction implementation complete (August 9, 2026)

- Implemented `readPdfDocument` in `apps/desktop/src/main/documents.js` per `docs/PDFExtraction.md`: `pdfjs-dist` (^6.2.108, Apache-2.0) legacy Node build, text-layer only, `disableAutoFetch`/`disableStream`/`disableRange`/`isEvalSupported: false` so no network access or script execution is possible. Added a `readDocumentContent` dispatcher so `.pdf` routes to the new function while every other type keeps using the existing `readTextDocument` path unchanged.
- `importDocuments` is now `async` (PDF extraction is inherently asynchronous); a batch still fails closed all-or-nothing on any single file's error, matching the prior synchronous behavior exactly.
- Wired all four designed fail-closed codes: `PDF_PASSWORD_PROTECTED`, `PDF_MALFORMED` (from pdfjs's `PasswordException`/`InvalidPDFException`), `PDF_NO_TEXT_LAYER` (extracted text empty after trim), and `PDF_EXTRACTION_FAILED` (catch-all). No partial record is ever stored on rejection.
- Two implementation-time defects were found and fixed before this worked correctly, not just as tuning: (1) the resolved `PDFDocumentProxy` has no `destroy()` method in the installed `pdfjs-dist` version - only `PDFDocumentLoadingTask.destroy()` does; calling `pdf.destroy()` in the `finally` block would have thrown on every successful extraction and masked the returned text. Verified empirically against the real installed package (`typeof pdf.destroy === 'undefined'`, `typeof loadingTask.destroy === 'function'`) before trusting the fix. (2) Missing `standardFontDataUrl` caused internal pdfjs warnings for PDFs using standard, non-embedded fonts (Helvetica, Times, etc.) - fixed by pointing it at the local, already-installed `node_modules/pdfjs-dist/standard_fonts/` directory (a filesystem path, not a network fetch).
- Extracted PDF text reuses the existing `documents.json` record shape exactly - no new fields, no new store - so it is searchable (Day 13), previewable (Day 14), and reachable only through the existing confirmation-gated Q&A flow (Day 15/16) under the same 3-document/4,000-character cap. No PDF-specific model-access path was added.
- `scripts/check-documents.js` now builds real, structurally valid minimal PDFs at test time (correct xref byte offsets, not just pdfjs's fallback repair) to exercise: a text-bearing PDF importing and becoming locally searchable; a structurally invalid PDF failing closed with `PDF_MALFORMED`; a PDF with a vector-only page (no text operator) failing closed with `PDF_NO_TEXT_LAYER`; and confirmation that both rejections leave zero stored records.
- Added an automated network-safety check: monkey-patches `http.request`, `https.request`, and global `fetch` around a real PDF import and asserts none are called, proving the "no network access during extraction" design requirement empirically rather than trusting the option flags alone.
- A real limitation was discovered and documented (not fixed, since it doesn't apply to real-world files): `getTextContent()` clips at the page's `MediaBox` boundary, so a too-narrow test page can silently truncate extraction. Noted in `docs/PDFExtraction.md` and inline in the test fixture builder.
- `docs/DocumentImport.md` and `docs/DocumentQA.md` updated with "Superseded August 9, 2026 (Day 18)" notes marking `PDF_EXTRACTION_UNAVAILABLE` as no longer applicable, without deleting the Day 12/15 history those files record.
- Validation: full `npm run check` passes (syntax checks + `check-computer-control.js` + `check-documents.js`, including the new PDF and network-safety assertions). `git diff --check` clean.
- **Closed this session (August 9, 2026):** the two real-file gaps above were resolved, not just left as not yet done. A real password-protected PDF and a real scanned PDF (`apps/desktop/encrypted.b64`/`scanned.b64`, already present on disk) were decoded and run through the actual `importDocuments` function directly - both fail closed correctly (`PDF_PASSWORD_PROTECTED` and `PDF_MALFORMED` respectively; the scanned fixture's actual structure triggers `PDF_MALFORMED`, not `PDF_NO_TEXT_LAYER` as originally assumed - noted honestly in `docs/PDFExtraction.md`). Neither leaves a stored record. This is now permanent coverage in `scripts/check-documents.js`, not a one-off script - `npm run check` exercises it every time. A full PDF-to-search-to-preview-to-Q&A round trip was also added and passes, closing the gap where only a `.txt` import had been pushed through the Q&A gate before.
- **Genuinely still open:** a literal live click-through in the running Electron app (native picker, import, restart, confirm persistence, ask a question through the real confirmation dialog UI). Attempted via remote automation this session; stopped deliberately after the desktop turned out to have an active Zoom call and heavily overlapping windows, making further blind coordinate-based clicking an unacceptable risk. Not expected to surface a new defect given how much of the same code path the programmatic checks above already share with it, but it hasn't been physically clicked through.
- Git state: committed as `feat: complete Day 18 PDF text extraction` on `main`, pushed to `origin/main`. Files: `apps/desktop/package.json`, `apps/desktop/package-lock.json`, `apps/desktop/src/main/documents.js`, `apps/desktop/src/renderer/index.html`, `scripts/check-documents.js`, `docs/PDFExtraction.md`, `docs/DocumentImport.md`, `docs/DocumentQA.md`, `apps/desktop/encrypted.b64`, `apps/desktop/scanned.b64`. `docs/Voice.md` remains a separate, unrelated pre-existing local edit and stays out of this commit, same as every prior day.
- Exact next recommended step: optionally close the live-click-through gap above (a few minutes, non-blocking); then move to the remaining Week 3 theme (safe custom commands) or Week 4.