# Windows Packaging (implemented August 11, 2026)

## What this is

The first Windows-installable build of Zen, using `electron-builder` to produce an unsigned NSIS
installer. This is packaging only — no product code in `apps/desktop/src` changed.

## Tooling

- Added `electron-builder@^25.1.8` as a devDependency (334 packages, dev-only — none of this is
  shipped inside the packaged app itself).
- Two new scripts in `apps/desktop/package.json`:
  - `npm run pack` — fast unpacked build (`electron-builder --dir`), used for testing without
    producing an installer.
  - `npm run dist` — full NSIS installer build.
- Build output goes to `deliverables/dist/` (outside `apps/desktop`, alongside the pre-existing
  untracked `deliverables/` directory noted in every prior handoff entry).

## The voice-exclusion decision

Per Day 24's `docs/VoiceLicenseReview.md` recommendation, this build does **not** bundle
`vendor/piper-runtime` or `vendor/whisper-runtime`. This required no explicit exclusion rule:
both directories already live outside `apps/desktop` (at the repo root), and `main.js` resolves
their paths relative to `__dirname` — `path.resolve(__dirname, '../../../../vendor/...')` — so
electron-builder's default file-inclusion (scoped to the `apps/desktop` directory containing
`package.json`) never had a reason to see them in the first place. Voice already fails closed
gracefully in this scenario (`VOICE_RUNTIME`/`PIPER_RUNTIME` simply won't resolve to anything, and
the existing UI already handles "Local voice setup is not complete" as a normal state) — this was
confirmed live in the packaged build, not assumed. Voice can be added back once the four voice
MODEL_CARD files are legally reviewed and a bundling decision is made.

## What was verified

- **Config validated:** `appId`, `productName`, NSIS target (non-one-click, user can change
  install directory, Start Menu + Desktop shortcuts), and Windows icon (`assets/zen-icon.ico`,
  the same icon already used by the existing desktop shortcut).
- **`npm run check` still passes in full** after adding the dependency and build config — no
  regression to any existing suite.
- **No vendor/voice leakage, checked programmatically, not assumed:** listed every file inside
  the built `app.asar` with `@electron/asar` (a transitive dependency electron-builder already
  installs) and confirmed zero files anywhere in the path contain `vendor`. 443 files total in
  the packaged app, none of them voice runtime files.
- **The unpacked build was actually launched and used**, not just built: `Zen.exe` from
  `deliverables/dist/win-unpacked/` was started, produced a real "Zen" window, correctly loaded
  the existing local conversation history (proving packaged Electron `userData` resolution still
  works the same as the dev run), and correctly showed **"Voice input unavailable — Local voice
  setup is not complete"** instead of crashing or silently failing — the expected, designed
  degradation, confirmed live rather than assumed from reading the code.
- **The full NSIS installer built successfully:** `Zen Setup 0.1.0.exe` (≈102 MB,
  `deliverables/dist/`), with a matching `.blockmap` for delta-update support later if ever
  needed. Build log shows signing was attempted and skipped (`no signing info identified,
  signing is skipped`) — expected and fine for local/personal use; a real public release would
  need a code-signing certificate, which is a separate, later decision.

## Genuinely still open

- **The installer itself (`Zen Setup 0.1.0.exe`) was not run through a real install.** Running it
  would install Zen system-wide on this machine (Start Menu entry, possible existing-shortcut
  interaction with the manual desktop shortcut from Day 1), which is more invasive than a build
  artifact check and wasn't asked for. The unpacked `win-unpacked/Zen.exe` launch above already
  validates that the packaged app itself works correctly; the NSIS wrapper around it is a
  well-established electron-builder path, not custom logic. A live install/uninstall click-through
  is a reasonable follow-up whenever convenient, same pattern as the Day 18/21 live-click-through
  gaps.
- **13 npm audit findings (12 high, 1 critical)** appeared after installing electron-builder's
  dependency tree. Not investigated or fixed in this pass — these are transitive dev-tooling
  dependencies (electron-builder's own build chain), not code shipped inside the packaged app,
  but they should be reviewed before treating packaging as fully finished, not left indefinitely.
- **No code signing.** The installer is unsigned; Windows SmartScreen will likely warn on first
  run for anyone other than the person who built it. Acceptable for personal/local use; would
  need a certificate before any wider distribution.
- **`.gitignore` not yet updated** to exclude `deliverables/dist/` build output from being
  accidentally tracked. Recommended next-session cleanup, not done here since it touches a file
  outside this session's stated scope.

## Exact next recommended step

Either: (a) do the live install/uninstall click-through and the `.gitignore` cleanup to fully
close packaging out, or (b) move to the two remaining Week 4 items — backup/export, and final
release documentation/changelog/tag — and treat the two open packaging items above as non-blocking
follow-ups, consistent with how this project has handled every prior non-blocking live-test gap.
