# GPL and Voice-Model License Review (Day 24)

Blocking review named in the Week 4 roadmap ("Windows installer packaging and the GPL/voice-
model license review for Piper and whisper.cpp runtimes"), before any packaging work bundles
either runtime. This is not legal advice -- it is a factual review to inform a real legal check
before any public distribution, verified against local files and current external sources rather
than assumed from `docs/Voice.md`'s original note.

## 1. whisper.cpp -- confirmed safe to bundle

Read `vendor/whisper.cpp/LICENSE` directly: **MIT License**, copyright the ggml authors. MIT
permits redistribution, including in a closed-source or commercial product, provided the license
text and copyright notice are retained somewhere in the distribution (a standard `THIRD_PARTY_
LICENSES` file is sufficient). No further review needed for whisper.cpp itself. This is a
positive finding that removes one of the two runtimes from any bundling concern.

## 2. Piper (the engine binary) -- confirmed GPL-3.0, and the history matters

Verified via external search, since this determines real distribution rights, not just repeated
`docs/Voice.md`'s existing note:

- Piper's original repository (`rhasspy/piper`) was MIT-licensed. It was **archived (read-only)
  in October 2025** and no longer receives updates.
- Active development moved to a community fork, `OHF-Voice/piper1-gpl`, under the **GPL-3.0**
  license, starting March 2025.
- `vendor/piper-runtime` is a Python venv with `piper.exe`, `pip.exe`, and `python.exe` inside
  `venv/Scripts/` -- installed via `pip install piper-tts`, which today resolves to the
  GPL-3.0 fork's package, not the archived MIT original. This confirms `docs/Voice.md`'s
  existing conclusion (Piper is GPL-3.0 as installed) rather than overturning it, but the
  license-history nuance (it changed from MIT) was not previously recorded and is worth keeping
  for anyone reviewing this later.

**What GPL-3.0 actually requires, if Piper is ever bundled:** Zen invokes Piper as a separate
subprocess (per `docs/Voice.md`'s own architecture notes -- Electron runs the installed local
binary and only text/audio bytes cross the boundary, no Piper source is compiled into Zen). This
is the standard "mere aggregation / separate program" pattern that does not require Zen's own
source to become GPL, provided a real bundling attempt also: (a) includes the complete
corresponding source code for the exact Piper build shipped, or a written offer for it, per
GPL-3.0 SS6; and (b) includes the full GPL-3.0 license text in the distribution. This is a
factual summary of how GPL-3.0 is generally applied to separately-invoked subprocess tools, not a
legal opinion -- a real public release should still get an actual legal check before shipping
Piper, and the safest and simplest posture for now remains what Day 5 already decided: keep Piper
as a local, machine-installed, not-bundled dependency.

## 3. Voice models -- the real finding of this review

This is the part `docs/Voice.md`'s single line ("Bryce's model card lists its dataset as public
domain") undersold. The `piper-voices` Hugging Face repository shows a top-level `license: mit`
badge, but that badge covers the *loader code and repository*, not necessarily each individual
voice's training-data rights. Piper's own documentation is explicit that **the MODEL_CARD file
for each voice, not the repo-level badge, is the authoritative license for that voice**, and that
these vary per voice.

Checked what could be verified this session:

- **Lessac:** a maintainer discussion on the Piper project's own GitHub confirms the Lessac voice
  carries a **"Blizzard" license** (from the Blizzard Challenge speech-synthesis research
  competition), and a project contributor's assessment in that same discussion is that this
  license is restrictive and likely **does not permit commercial or general-redistribution use**
  of derivatives. The underlying *text* Lessac was recorded reading (Black Beauty, Mansfield
  Park, Pride and Prejudice) is public domain, but that does not make the *voice recording/model
  itself* public domain -- these are two different rights, and conflating them was the likely
  source of confusion worth correcting here.
- **Ryan:** identified in a re-hosted model listing as **fine-tuned from Lessac medium**. A voice
  fine-tuned from a Blizzard-licensed base model likely inherits the same restriction, though
  this was not separately confirmed by opening Ryan's own MODEL_CARD text directly this session.
- **Amy and Bryce:** not independently re-confirmed this session. The tools available could
  surface Hugging Face page listings and discussion threads but could not retrieve the literal
  MODEL_CARD file contents for these two voices specifically. `docs/Voice.md`'s existing claim
  that Bryce's dataset is public domain should be treated as **unverified, not confirmed**, until
  someone opens the actual file directly (`https://huggingface.co/rhasspy/piper-voices/blob/main/
  en/en_US/bryce/medium/MODEL_CARD` and the equivalent for Amy) and reads it.

## Recommendation

- **Do not bundle the Lessac or Ryan voice models** in any distributed Zen build without a
  dedicated legal check first -- the Blizzard-license signal found this session is a real,
  concrete flag, not a hypothetical one.
- **Do not bundle Amy or Bryce** either, until their actual MODEL_CARD files are opened and read
  directly -- the existing "public domain" note in `docs/Voice.md` is not independently confirmed
  by this review and should not be relied on for a distribution decision as-is.
- **whisper.cpp can be bundled** with only a standard MIT attribution file -- no further review
  needed.
- **Piper's engine binary** has a plausible GPL-3.0 compliance path as a separately-invoked
  subprocess, but still needs an actual legal check before a real public release; for now, the
  existing Day 5 decision (local machine dependency, not bundled) remains the correct, safe
  default and this review found nothing that changes that.
- None of this blocks continued local development or personal use of voice features on this
  machine -- it only blocks *packaging Zen for other people* with voice included, which was
  already the open item on the roadmap.

## Next step

Before any Windows packaging work: either (a) ship Zen's first packaged release **without**
bundling Piper or any voice model, with voice features simply unavailable until the runtime is
installed separately by the user (matching how it works today), or (b) get an actual legal
opinion on the GPL-3.0 subprocess question and open each of the four MODEL_CARD files directly to
confirm redistribution rights before deciding which, if any, voices can ship. Option (a) is the
lower-risk path and does not block Day 25+ packaging work from starting.