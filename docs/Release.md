# Zen v1.0.0 release record and follow-up guidance

## Current release boundary (updated Day 28, August 12, 2026)

Zen is complete through Day 28 of the 28-day plan: local chat, persistence, settings,
speech-to-text/text-to-speech, safe computer control (approved apps, websites, folder search),
local memory, document import/search/preview/Q&A including PDF text extraction, safe custom
commands, branching workflows with structurally-impossible loops, an accessibility and
error-handling pass, an unsigned Windows NSIS installer build, and full local backup/export.

It is a working, packaged Windows build (`deliverables/dist/`) whose NSIS installer has been
installed and launched successfully on Windows. The installer is **not code-signed**. Voice
(Piper/whisper.cpp) is deliberately excluded from the packaged build per Day 24's license
review — Lessac and Ryan likely carry a restrictive "Blizzard" research license incompatible
with redistribution, and Bryce's "public domain" claim is unverified. Do not bundle any voice
runtime or model in a distributed build until that review is resolved.

## Final regression checklist

- [x] Start Zen while Ollama is running; send and receive a local chat message.
- [x] Restart Zen; confirm conversations, model, theme, microphone, and selected read-aloud voice remain saved.
- [x] Create, switch, delete, and cancel deletion of a temporary conversation.
- [x] Confirm Light and Dark themes remain readable.
- [x] Use F8 hold-to-speak and F9 locked recording with the selected microphone.
- [x] Read aloud an assistant response with Bryce, then use Stop speaking. Ryan is now selected because Bryce was slower than preferred.
- [x] Temporarily make Ollama or the selected model unavailable only if safe to do so; confirm Zen shows a clear recovery message, then restore normal operation.
- [x] Approve, open, and remove an approved app; open an approved website; run a selected-folder filename search (Week 2, Days 8–9).
- [x] Import, search, preview, and ask a confirmation-gated question over a local document, including a real PDF (Days 12–18).
- [x] Build, save, run, and remove a custom command and a branching workflow, including a failure-branch route (Days 19–21).
- [x] Package an unpacked build and confirm it launches, loads existing data, and degrades gracefully with voice unavailable (Day 25).
- [x] Export all local data to a file, then restore from that file and confirm it replaces (not merges) current state (Day 27, verified live August 12, 2026).
- [x] Full installer live install: NSIS installer run silently, produced a real registered
      Windows install at `AppData\Local\Programs\Zen`, launched a working Zen window, did not
      disturb the existing Day 1 source-launch shortcut (verified August 12, 2026). Uninstall
      itself not separately exercised, since a clean successful install/launch is the higher-risk
      direction and was the item this checklist was tracking.

## Completed release record

- Final regression checks were completed and recorded in `HANDOFF.md`.
- `npm.cmd --prefix apps/desktop run check` and `git diff --check` passed for the release.
- `v0.1.0` remains the earlier Week-1 source checkpoint on `77a549f`; the finished MVP is the
  annotated `v1.0.0` tag on `3293cfc`.
- `main` and both tags were pushed to `origin` during Day 28.
- Keep `vendor/`, `deliverables/`, local conversations, recordings, and models out of Git.

## Optional post-release work

1. Obtain and configure a code-signing certificate; the prepared workflow and owner-controlled
   options are documented in `CodeSigning.md`.
2. Before distributing a build with bundled voice, complete legal review of Piper GPL-3.0
   compliance and each proposed voice model's MODEL_CARD/license.
3. If Zen is distributed more broadly, test upgrade, rollback, microphone permissions, and
   uninstall on a separate Windows profile or PC.

## Rollback

There is no deployed service or installer to roll back. Before a source release or package, stop the release if a critical chat, privacy, data-loss, microphone, or licensing issue is found. Keep the last known-good Git commit and do not create a release tag until the issue is resolved and retested.
