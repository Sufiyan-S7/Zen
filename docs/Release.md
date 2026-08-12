# Zen v0.1.0 release readiness

## Current release boundary (updated Day 28, August 12, 2026)

Zen is complete through Day 27 of the 28-day plan: local chat, persistence, settings,
speech-to-text/text-to-speech, safe computer control (approved apps, websites, folder search),
local memory, document import/search/preview/Q&A including PDF text extraction, safe custom
commands, branching workflows with structurally-impossible loops, an accessibility and
error-handling pass, an unsigned Windows NSIS installer build, and full local backup/export.

It is a working, packaged Windows build (`deliverables/dist/`) that has **not yet had a live
install/uninstall click-through** (Day 25, non-blocking) and is **not code-signed**. Voice
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
- [ ] Full installer install/uninstall click-through (Day 25, still open, non-blocking).

## Source-release plan

1. Complete the final regression checklist and record the result in `HANDOFF.md`.
2. Run `npm.cmd --prefix apps/desktop run check` and `git diff --check`.
3. Commit release documentation, then create an annotated `v0.1.0` Git tag only after the user approves it.
4. Publish source only if the repository and documentation are ready. Keep `vendor/`, `deliverables/`, local conversations, recordings, and models out of Git.

## Future Windows-installer plan

1. Choose and configure a Windows packaging tool.
2. Decide whether voice is omitted or bundled.
3. If bundling voice, complete the Piper GPL and model-license compliance review before packaging.
4. Test a fresh installation, update/rollback behavior, microphone permissions, and uninstall behavior on a separate Windows profile or PC.
5. Write installation and troubleshooting instructions for the packaged build.

## Rollback

There is no deployed service or installer to roll back. Before a source release or package, stop the release if a critical chat, privacy, data-loss, microphone, or licensing issue is found. Keep the last known-good Git commit and do not create a release tag until the issue is resolved and retested.
