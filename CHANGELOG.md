# Changelog

All notable changes to Zen are documented in this file. Zen is a local-first Windows desktop
assistant; every entry below reflects work already implemented and, where noted, verified live
in the running app.

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
