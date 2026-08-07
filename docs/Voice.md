# Zen Voice Design and Safety Rules

## Day 5 decision

Zen voice is local-first. `whisper.cpp` is the selected speech-to-text integration target because it supports Windows and CPU-only operation. Piper is the selected text-to-speech runtime for this PC, installed as a local machine dependency and not bundled into Zen's source because it is GPL-3.0 licensed.

The official `whisper.cpp` v1.9.2 Windows x64 runtime and its `ggml-base.en.bin` English model are installed locally under `vendor/whisper-runtime/`. Piper v1.6.0 and the `en_US-lessac-medium`, `en_US-amy-medium`, `en_US-ryan-medium`, and `en_US-bryce-medium` English voices are installed locally under `vendor/piper-runtime/`. Both runtime folders are ignored by Git because they are machine-local dependencies.

## Permission rules

1. Zen requests microphone access only after the user deliberately presses and holds **Voice input**.
2. Zen visibly indicates recording while the button is held. Releasing it or pressing Cancel stops recording immediately.
3. Audio is passed only to the local speech-to-text engine, held only for that request, and deleted after transcription. Zen does not save recordings.
4. Zen never implements an always-listening mode or wake word in this MVP.
5. If the microphone is denied, unavailable, or already in use, Zen explains the problem and does not retry automatically.
6. Zen never falls back to browser, operating-system, or cloud speech recognition without a separate explicit user decision.
7. Read aloud is optional, can be stopped at any time, and uses only the selected local Piper engine. Zen creates a temporary WAV, transfers its bytes to the app for playback, and deletes the temporary file immediately.
8. The microphone picker lists audio inputs reported by Windows, including Bluetooth headset microphones. Zen uses the selected device only for the next push-to-talk request; selecting a device does not start recording.
9. Keyboard control is deliberately split into two independent keys: `F8` is hold-to-speak and stops immediately on release; `F9` starts locked recording and a later `F9` stops and transcribes. The `Fn` key is handled by keyboard hardware and is not reliably available to Windows applications, so it cannot be used as a Zen shortcut.

## Current local integration

- Zen captures microphone audio only after push-to-talk begins, downsampling it to a 16 kHz WAV before passing it through Electron's secure preload bridge.
- Electron runs the installed local binary, returns only text to the renderer, and removes temporary WAV and transcript files after processing.
- Piper v1.6.0 is GPL-3.0 licensed and is installed only as an ignored local dependency for this PC. A distributed Zen package must complete a GPL compliance review before including Piper. Each downloaded voice model also needs its own model-card and license review; Bryce's model card lists its dataset as public domain.
- Piper offers four selected local English voices: Lessac, Amy, Ryan, and Bryce. The selected voice is stored locally. The Electron main process returns in-memory WAV bytes to the renderer; **Stop speaking** stops both active synthesis and playback.

## Test cases before enabling voice

- Normal press, speak, release, and transcription.
- User cancels before release.
- Microphone permission denied, unavailable, or already in use.
- Speech engine missing, corrupt, or returns no text.
- Confirm no microphone prompt occurs while opening Zen, switching conversations, or receiving a response.
- Confirm no recordings persist after transcription or an error.

## Completed local verification

- The official source repository was cloned at revision `306c88f4d1286aec1bf96e544632897886af5501`.
- The v1.9.2 Windows x64 runtime and 147,964,211-byte `base.en` model were downloaded from the official project and model locations.
- `whisper-cli` successfully transcribed the supplied `samples/jfk.wav` locally. No microphone audio was involved in this verification.
- Piper v1.6.0 successfully generated local WAVs using the Lessac, Amy, and Ryan voices. Every verification WAV was deleted after its check.
- Bryce successfully generated a 146,988-byte local verification WAV, and the user confirmed that Bryce works through Zen's Settings selector and Read aloud control. The verification file was deleted.
