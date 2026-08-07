# Zen v0.1.0 release readiness

## Current release boundary

Zen has completed Week 1 local-chat, persistence, settings, speech-to-text, text-to-speech, and reliability validation. It is ready to be used from its source checkout on this PC.

It is **not yet a distributable Windows installer**. The locally installed Whisper and Piper runtimes are ignored by Git, and Piper is GPL-3.0 licensed. Do not package, upload, or distribute those runtime files or voice models until their licenses, notices, source-code obligations, and each voice model's model card have been reviewed.

## Final regression checklist

- [x] Start Zen while Ollama is running; send and receive a local chat message.
- [x] Restart Zen; confirm conversations, model, theme, microphone, and selected read-aloud voice remain saved.
- [x] Create, switch, delete, and cancel deletion of a temporary conversation.
- [x] Confirm Light and Dark themes remain readable.
- [x] Use F8 hold-to-speak and F9 locked recording with the selected microphone.
- [x] Read aloud an assistant response with Bryce, then use Stop speaking. Ryan is now selected because Bryce was slower than preferred.
- [x] Temporarily make Ollama or the selected model unavailable only if safe to do so; confirm Zen shows a clear recovery message, then restore normal operation.

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
