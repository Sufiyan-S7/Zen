# Safe Custom Commands — Day 19 Design

## Purpose

A custom command is a named, saved sequence of 1–5 steps that a person builds once and
replays later as a single reviewed action. It grants **no new capability**. Every step must
resolve, at the moment it is built *and again at the moment it is run*, against an action
that already exists and is already independently approved elsewhere in Zen:

- **Open an approved app** — must resolve via the existing approved-app registry
  (`docs/ComputerControl.md`). If the underlying approval was removed, the step fails closed.
- **Open a website** — must resolve via the existing HTTPS validation rules
  (`docs/ComputerControl.md`). The same format rules apply; nothing new is accepted.

A custom command is best understood as a *bookmark for a sequence*, not a new execution
primitive. It cannot open anything Zen could not already open one confirmation at a time.

## Explicit exclusions

- **No folder search as a step.** Folder search requires a fresh native-picker grant each
  time (a five-minute, one-use, window-bound token). That grant cannot be pre-saved without
  either silently widening its scope or re-prompting the picker anyway, which defeats the
  point of a saved command. Folder search stays a manual, per-use Activity action only.
- **No arbitrary shell, script, or PowerShell steps**, ever.
- **No nesting** — a custom command cannot reference another custom command.
- **No scheduling or background triggers.** A command only runs when a person clicks Run and
  confirms. Scheduled/automatic execution is Week 4 workflow territory, not Day 19.
- **No in-place step editing.** Changing a saved command means removing it and creating a
  new one. This keeps validation simple and avoids partial-mutation edge cases.
- Maximum 5 steps per command, maximum 50 saved commands.

## Storage

`custom-commands.json` under Electron's user-data directory, written with the same
temp-file-then-rename atomic pattern as `approved-apps.json` and `documents.json`. Each
record stores only the minimal source-of-truth fields needed to re-resolve a step later —
never a cached destination or label, which could go stale:

```json
{
  "id": "uuid",
  "name": "Morning setup",
  "steps": [
    { "type": "open-approved-app", "appId": "..." },
    { "type": "open-website", "url": "https://..." }
  ],
  "createdAt": "ISO-8601"
}
```

## Validation rules

- **Name:** non-empty, trimmed, up to 60 characters, no control characters.
- **Steps:** array of 1–5 entries. Each entry's live resolution reuses
  `computer-control.js`'s own `approvedApp(appId)` and `websitePreview(url)` — the exact same
  functions the existing approved-app and website tools already use. A custom command has no
  separate, weaker validation path.
- Every list/preview/run operation **re-resolves every step live** against current state. A
  step whose app approval was removed, or whose URL fails today's validation, is marked
  unavailable rather than trusted from the stored record. This matches Day 16's
  content-hash-on-read pattern for documents: never trust a cached copy of something that
  could have changed since it was saved.

## Confirmation contract

**Saving a command** shows a Cancel-first confirmation listing every resolved step in order
(its live label and destination), before anything is written to disk.

> Save "**{name}**"? Zen will save this named sequence. It replays only apps and websites
> you have already approved, and still asks before every run.

**Running a command** shows a separate Cancel-first confirmation, generated fresh from a
live re-resolution of every step (never from what was shown when the command was created):

> Run "**{name}**"? Zen will run each step below in order. It stops and tells you if a step
> fails.
> 1. {step label} → {step destination}
> 2. ...

Approving a save or a run is one confirmation for the whole reviewed sequence, not one
confirmation per internal step. This is the entire point of Day 19: previously separate,
individually-confirmed actions become one named, still-fully-visible, still-confirmed unit.
It does not weaken confirmation — every step's real destination is shown before approval,
exactly as if opened individually.

**Removing a command** uses the same pattern, showing the command's name.

## Execution sequence

1. Zen re-resolves every step live (never from storage alone) and produces a sanitized
   preview — same as every other Day 8+ action.
2. The renderer shows the confirmation; Cancel is the default.
3. A cancellation ends the flow; the local activity record shows `cancelled`.
4. On approval, the main process re-validates every step **again** (defense in depth — the
   renderer's preview is never trusted as authorization) immediately before running it.
5. Steps run **in order**. If a step fails, execution **stops immediately** — Zen does not
   continue past a failure blind. The result clearly states how many steps completed and
   which one stopped it.
6. Every run produces one local activity record per command execution, with a step-count
   result (e.g. "3/3 steps completed") — not per-step destinations, since those are already
   visible in the command itself and duplicating them in the log adds no protective value.

## Local activity log

Three new action types, following the existing schema in `docs/ComputerControl.md`:

| Action | Preview field | Result field |
| --- | --- | --- |
| `create-custom-command` | `{name} · {n} steps` | — |
| `run-custom-command` | `{name} · {n} steps` | `{completed}/{total} steps completed` |
| `remove-custom-command` | `{name}` | — |

No question text, excerpt text, raw step destinations, or credentials are ever logged beyond
what this table specifies, consistent with every prior day's logging rule.

## Before enabling

Manual tests required before this ships for regular use: save with 1 step, save with 5
steps, attempt a 6th step (rejected), save with an app step whose approval is later removed
(list shows it unavailable, Run is disabled), run a command successfully, run a command
where a middle step fails (execution stops, partial result reported accurately), remove a
command (its underlying app/website approvals are unaffected), and restart persistence.

## Deferred decisions

- Reordering or editing steps within an existing command: deferred: remove-and-recreate is
  sufficient for Day 19's scope.
- Any timer, hotkey, or background trigger for a saved command: Week 4 workflow territory.
- Folder-search steps: deferred indefinitely unless a future design solves the live-grant
  problem without silently widening what a saved command can touch unattended.
