# Backup & Export (Day 26 design)

## What this is

The next capability before any code enables it, matching the Day 8/11/15/17/20/22/24 pattern.
Backup & Export lets a person save every piece of Zen's local state to one file of their choosing,
and later restore it — on this machine, a fresh install, or a different PC. No cloud, no
auto-upload, no background sync.

## What's actually being backed up (confirmed by reading the real stores, not assumed)

| Store | Location | Contains |
|---|---|---|
| Conversations | `localStorage['zen-local-conversations-v2']` | All chat history |
| Settings | `localStorage['zen-local-settings-v1']` | Theme, model choice, voice, shortcuts |
| Activity log | `localStorage['zen-local-activity-v1']` | Last 200 action records |
| Memory | `localStorage['zen-local-memories-v1']` | Saved preferences/facts |
| Approved apps | `approved-apps.json` (userData) | App name + validated path |
| Custom commands | `custom-commands.json` (userData) | Saved step sequences |
| Workflows | `workflows.json` (userData) | Saved branching step sequences |
| Documents | `documents.json` (userData) | Imported doc names + extracted text |

## Explicit exclusions

- **Never** `vendor/piper-runtime` or `vendor/whisper-runtime` — these are machine-local
  dependencies, not Zen's own data, and are already excluded from packaging (Day 25) for the
  same reason.
- **Never** the original source files a document was imported from — Zen never copied them in
  the first place (Day 12), so there is nothing there to back up; only the already-stored
  extracted text travels.
- **Never** anything automatically sent anywhere. Export writes to one local path the user picks
  via Electron's native Save dialog. Restore reads from one local path the user picks via the
  native Open dialog. No network call is made by either operation.

## Format

A single JSON file, `zen-backup-<date>.json`, with a top-level `{ "formatVersion": 1, "exportedAt":
"<ISO timestamp>", "data": { conversations, settings, activityLog, memories, approvedApps,
customCommands, workflows, documents } }` envelope. `formatVersion` exists so a future incompatible
format fails closed with a clear message instead of silently corrupting data — the same intent as
the fail-closed rejection codes used throughout Day 12/17/18. No zip/compression dependency is
added for v1; these are small JSON stores, not media files.

## Export flow

1. New **Backup & Export** section (Settings page). One button: **Export all local data**.
2. One Cancel-first confirmation dialog states exactly what will be included, with real counts
   pulled live at click time (e.g. "12 conversations, 3 approved apps, 4 custom commands, 2
   workflows, 6 documents, your saved memory and settings") — never a generic "your data" message.
3. On confirm, the renderer gathers its four `localStorage` sections and sends them over the
   existing secure preload bridge; the main process reads its four JSON stores directly, builds
   the envelope, and opens a native **Save As** dialog. Nothing is written until the user picks a
   location and confirms the OS dialog itself — a second, OS-level confirmation on top of Zen's own.

## Restore flow — this is the higher-risk direction, and is designed accordingly

- **Restore replaces, it does not merge**, for the same reason Day 19 chose remove-and-recreate
  over in-place editing: merge logic is where subtle bugs hide, and a person restoring a backup
  almost always means "make my data match this file," not "combine."
- One Cancel-first confirmation before restore, showing the counts found *in the backup file*
  (not the current state) and stating plainly and specifically that this **replaces** current
  conversations, settings, activity log, memory, approved apps, custom commands, workflows, and
  documents — every category named, not summarized as "everything."
- **Every restored record is re-validated through the exact same validators used when it was
  originally created** — `approved-apps.json` entries re-checked against `computer-control.js`'s
  own app-approval validator, custom commands and workflows re-checked against their own
  save-time step/routing validators — rather than trusting the file's contents as pre-approved.
  This mirrors the "never trust a cached preview, always re-resolve live" rule already used
  throughout Days 19–21. A restored approved-app entry pointing at an executable that no longer
  exists on this machine is reported as unavailable, exactly like a removed approval is today —
  it is not silently dropped or silently trusted.
- A malformed file, a `formatVersion` this build doesn't recognize, or a file that isn't valid
  JSON at all fails closed before touching any existing store — current data is never partially
  overwritten by a bad read.
- No restored content of any kind reaches Ollama as part of this process. Restore is local
  file-to-local-store only.

## Day 27 implementation scope (for the next session)

1. New `apps/desktop/src/main/backup.js`: `buildBackupEnvelope()`, `validateBackupEnvelope()`,
   `applyBackupEnvelope()` — the last one calling into `computer-control.js`/`custom-commands.js`/
   `workflows.js`'s existing validators, not duplicating validation logic.
2. Two new IPC handlers (`zen:backup:export`, `zen:backup:import`) plus `preload.js` wiring.
3. Settings-page **Backup & Export** section: Export button, Restore button, both Cancel-first
   confirmations described above.
4. One new `backup-export` / `backup-restore` activity-log entry per operation, scoped to counts
   and outcome only — never conversation, document, or memory text — consistent with every prior
   day's minimal-logging rule.
5. `scripts/check-backup.js`: round-trip export → restore → verify counts match; malformed-file
   rejection; unsupported `formatVersion` rejection; a restored approved-app pointing at a
   nonexistent executable reported unavailable, not silently accepted; a restore that replaces
   (not merges) existing data, verified explicitly.
6. `npm run check` passing plus a short manual export → restore round trip in the running app is
   the sign-off bar, matching Day 19/21's "verify live before treating as closed" standard.
