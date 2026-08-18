# Changelog

All notable changes to Zen are documented in this file. Zen is a local-first Windows desktop
assistant; every entry below reflects work already implemented and, where noted, verified live
in the running app.

## [Unreleased] — Zen v2.1

### Added — 2026-08-18
- Approving an app no longer requires hand-navigating Program Files in the native picker: a new
  **Browse installed apps** option on the Approved Apps card lists real, installed apps resolved
  from Windows Start Menu shortcuts, searchable by name. Picking one goes through the exact same
  preview-then-confirm approval flow as the native picker — this only changes how a path is
  found, never how an app gets approved.
- Agent Home can now clear its own history: **Clear finished task history** removes only
  completed/failed/cancelled tasks (a task still in flight is never touched), and **Clear audit
  log** empties Zen's local, append-only `task-audit.log`. Both are confirm-before-clearing and
  local only; neither affects saved routines, permissions, or approvals.
- Automated coverage for both new clears added to `scripts/check-task-executor.js`.

### Fixed — 2026-08-18
- **Browse installed apps** could list browsers (Chrome, Edge, Brave, etc.) alongside real
  approvable apps, even though approving one always fails — `computer-control.js` rejects every
  browser executable by design. Confirmed live on a real machine before fixing: this machine's
  own Start Menu shortcuts for Brave/Chrome/Edge would all have shown up with a dead-end Approve
  button. Now filtered out using the same `isBrowserLauncher()` check the approval flow itself
  enforces, with permanent regression coverage.
- `scripts/check-backup.js` never configured the routines store for its sandbox, so any
  backup/restore path touching routines failed with a raw `ENOENT` rename error. Fixed, and the
  backup round-trip test now covers routines the same way it already covers every other category
  (approved apps, custom commands, workflows, documents).

## [2.0.0] — 2026-08-17 — v2.0 sprint (Blocks A-H)

### Changed — 2026-08-17
- Direct requests now use Zen's local planner: “Open YouTube” no longer needs a `Task:` prefix.
  Validated low-impact plans auto-run while file changes, UI control, form drafts, routines, and
  PowerShell remain review-gated; sensitive steps still require their fresh confirmation.
- Folder access now presents one clear **Select folder** action. A selected folder is a persistent
  grant for Zen's scoped file tools; deletion remains Recycle-Bin-routed and confirmation-gated.

### Added — 2026-08-17
- Block H routines and Agent Home: create a named, reviewable routine from a local task plan;
  each saved routine is limited to 10 linear actions, re-validates against the live action
  registry when it runs, cannot nest, and never bypasses a constituent sensitive step's fresh
  confirmation. Routines are included in local backup/restore.
- Agent Home shows saved routines, active/recent session tasks, 30-day redacted step history,
  folder/browser access with direct revoke controls, and the current undo boundaries. It adds no
  background runs or new permissions.
- `npm run check` now syntax-checks and exercises routines, including backup round-trip,
  invalid/nested routine rejection, and per-step confirmation after routine expansion.

### Added — 2026-08-17
- Block G browser control, live-verified end-to-end: found and fixed a real bug where
  `browser-navigate` → `browser-read` → `browser-form-fill-draft` chained onto three different
  tabs instead of one (own-window mode opened a fresh blank tab on every call), so a read right
  after a navigate always came back empty. Fixed by caching and reusing the single Zen-owned tab
  across a session; deterministic checks (`check-browser-control.js`) and a fresh live round trip
  (`check-browser-control-live.js`, real Chrome, real profile) both pass now.

### Added — 2026-08-15
- Instant invocation (Block B): system tray (icon, hide-on-close, Quit Zen), single-instance
  lock, global `Ctrl+Alt+Space` hotkey with conflict detection, and a compact command overlay
  window (Escape-to-close, click-away-to-close, focus-restore on close).

## [1.0.0] — 2026-08-12 — full 28-day MVP

### Week 1 — Foundation and conversation (Days 1–7)
- Local Ollama chat (`llama3.2:3b`), streaming responses with a Stop generating control.
- Conversation sidebar: create, switch, rename (from first message), delete, persist across restarts.
- Settings: model selection, Light/Dark theme (later expanded to Deep violet/Lavender light/True
  black presets with custom accent colors), clear-all-conversations.
- Fully local voice: `whisper.cpp` speech-to-text (F8 hold-to-speak, F9 locked recording) and
  Piper text-to-speech (Lessac, Amy, Ryan, Bryce voices, per-voice speed).
- Release readiness review and `v0.1.0` local source tag on `77a549f`.

### Week 2 — Safe computer control (Days 8–9)
- Local tool registry and browser-local activity log (last 200 records).
- Approved-app manager: user selects `.exe` via native picker, previews, confirms; open/remove
  with separate confirmations. No arbitrary executable or argument control.
- Website opening: HTTPS-only, validated, previewed, confirmed. Separate constrained flow for
  Chromium browser web apps (name + fixed HTTPS address + browser).
- Selected-folder filename search: one-use, five-minute, window-bound native folder grant;
  recursive, root-bound, capped at 100 results; no file contents read, no changes made.
- `scripts/check-computer-control.js` added to `npm run check`.

### Week 3 — Memory and documents (Days 10–19)
- Local memory page: manually saved preferences/facts, inline edit/cancel, independent of
  conversation storage, never auto-extracted or supplied to Ollama.
- Local text-document import (TXT/MD/CSV/JSON): native-picker-only, 20 MiB/file, 20 files or
  100 MiB/batch, atomic local storage, no source-file copying.
- Local plain-text document search (case-insensitive, capped) and bounded local previews.
- PDF text-layer extraction (`pdfjs-dist`, text-layer only, no network/script execution),
  replacing the earlier fail-closed `PDF_EXTRACTION_UNAVAILABLE` behavior. Fails closed on
  password-protected, malformed, or no-text-layer PDFs.
- Confirmation-gated document Q&A: the first point where document text may reach Ollama, capped
  at 3 documents / 4,000 characters, shown in full before any model call.
- Safe custom commands: named 1–5-step sequences, each step re-resolved live against an
  already-approved app or website; folder search excluded as a step type.
- `scripts/check-documents.js` and `scripts/check-custom-commands.js` added to `npm run check`.

### Week 4 — Workflows and release (Days 20–27)
- Branching workflows: up to 10 steps, each routing to a later step or "stop" on success/failure.
  Loops are structurally impossible (forward-only routing index), not just disallowed by rule.
  Steps reuse approved apps, websites, or existing custom commands — no new execution primitive.
- Accessibility and error-handling pass: modal focus trap with `inert` background, `aria-hidden`
  on decorative icons, `:focus-visible` ring on the composer, one clarified error message.
- GPL and voice-model license review: whisper.cpp confirmed MIT-safe to bundle; Piper confirmed
  GPL-3.0 with a plausible subprocess compliance path pending legal sign-off; Lessac/Ryan voices
  flagged as likely carrying a restrictive research license, Bryce's public-domain claim marked
  unverified. Decision: first Windows build ships without any bundled voice runtime.
- Windows packaging: unsigned NSIS installer via `electron-builder`, `npm run pack`/`npm run
  dist`. Verified no `vendor/` (voice runtime) files reach the packaged app; unpacked build
  launched and confirmed working with graceful voice-unavailable degradation.
- Local backup & export: one JSON file captures every local store (conversations, settings,
  activity log, memory, approved apps, custom commands, workflows, documents). Export previews
  real counts and writes via native Save dialog; restore **replaces** (not merges) after
  re-validating every record through its original creation-time validator, and fails closed on a
  malformed file or unrecognized format version. Verified with a live export → restore round
  trip, August 12, 2026.
- `scripts/check-workflows.js` and `scripts/check-backup.js` added to `npm run check`.

### Release verification (August 12, 2026)
- Live install verified: the NSIS installer was run (silent, per-user) and produced a working
  install at `AppData\Local\Programs\Zen`, registered in Windows' uninstall list, launching a
  real Zen window without disturbing the existing Day 1 source-launch desktop shortcut.
- `npm audit` re-checked and now reports 0 vulnerabilities (the 13 findings noted after Day 25's
  `electron-builder` install were resolved by a later dependency-tree update).
- `v0.1.0`'s original tag (Day 7, Week-1-only checkpoint) is left in place unchanged; this
  finished-MVP milestone is tagged `v1.0.0` instead, to avoid rewriting what the existing tag
  already meant.

## Known limitations at this checkpoint

- Installer is unsigned; Windows SmartScreen will likely warn on first run on a machine other
  than the one it was built on.
- Voice (Piper/whisper.cpp) is not included in the packaged build pending the license review
  above; it works only in local source-checkout use with the runtimes installed separately.
