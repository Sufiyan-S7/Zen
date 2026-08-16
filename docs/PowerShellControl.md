# PowerShell Control (Full System Control)

Written as part of Block F, Step 26 (`docs/ZenV2-2Day-Sprint-Plan.md`), design-and-code together
per that step's explicit note -- not the usual design-doc-first-then-implement pattern used for
earlier days (8/11/15/17/20). Implements `docs/ZenV2Plan.md`'s "Resolved -- PowerShell / shell
scope" section and the `run-powershell` row of `docs/AgentContract.md` Section 7.

## What this is

`run-powershell` is the one action in Zen's entire registry permitted to carry a free-text
command. Every other action (`open-app`, `move-file`, `click-control`, ...) takes typed,
schema-constrained input only, per `docs/AgentContract.md` Section 7's general registry contract.
PowerShell is the deliberate, single, contained exception to that rule -- gated behind its own
off-by-default toggle so the exception doesn't weaken anything else in the registry.

## Off by default, never inherited

- The toggle lives in its own file, `powershell-toggle.json`, in Zen's userData folder --
  independent of `settings.json` and never touched by `backup.js`'s export/restore (confirmed:
  `backup.js` contains no reference to PowerShell or the toggle file). A restored backup can
  never silently re-enable this on a machine where the owner never turned it on themselves.
- A fresh clone, fresh install, or fresh userData folder always starts `enabled: false`. This is
  verified directly in `scripts/check-powershell-control.js` (a second, independent sandbox
  folder is checked to default off, and the toggle's state is confirmed to survive -- not
  reset by -- a simulated app restart).
- `apps/desktop/src/main/main.js` calls `configurePowerShellControl(app.getPath('userData'))`
  once at startup, alongside every other store's `configure*` call, following the exact same
  pattern as `permissions.js`/`workflows.js`/etc.

## Turning it on

Settings -> "Full System Control (PowerShell)" card. The owner must type an exact phrase
(`powershell-control.js`'s `REQUIRED_ACKNOWLEDGMENT`, currently `"I understand the risk"`) into a
text field, then confirm through Zen's normal confirmation-dialog flow (`requestActionConfirmation`
in `renderer.js`) before `enablePowerShell()` is ever called. `enablePowerShell()` itself
re-validates the typed text server-side (trimmed, exact match) rather than trusting the renderer's
own gating -- the same defense-in-depth pattern used everywhere else confirmations gate a
sensitive action in this codebase.

**Flagged judgment call** (`INSTRUCTIONS.md` Section 5): the exact acknowledgment phrase is a
chosen default, not specified by the sprint plan beyond "typed acknowledgment to enable." Owner's
to confirm or change.

## What the toggle unlocks -- and what it doesn't

Turning the toggle on unlocks the *channel*, not a blanket sensitive-tier exemption:

- Once on, most PowerShell commands run as `routine` -- they execute as soon as a task is
  approved, without a second per-step confirmation, same as any other routine step.
- A fixed, fail-closed trigger-pattern classifier (`classifyPowerShellCommand` in
  `powershell-control.js`) always re-escalates a matching command to `sensitive`, which means a
  fresh confirmation at the moment it runs, even though the toggle is already on and even though
  the whole task was already approved. The trigger list matches `docs/AgentContract.md` Section
  2 exactly: delete/format/uninstall/registry-write/kill-process/execution-policy/disk commands.
  Matching is deliberately liberal (keyword/cmdlet-name patterns, not a full PowerShell parser) --
  an under-match is the unsafe direction, so ambiguous phrasing classifies sensitive, never
  routine.
- Turning the toggle itself on or off is, separately, always a sensitive-weight action (a
  confirmation dialog with a typed acknowledgment to enable) -- this isn't a `run-powershell`
  step going through the registry, it's Settings-level, but it's held to the same weight
  deliberately.

## Redaction

`redactCommandForAudit()` scrubs the command text before it's ever written to the audit log
(`docs/AgentContract.md` Section 4's "never raw secrets/credentials" rule), matching on
`password:`/`secret:`/`token:`/`-credential:`-style key=value shapes, `ConvertTo-SecureString`
arguments, and `Authorization: Bearer ...` headers. This errs toward over-redaction: a false
positive costs nothing to the audit trail's usefulness, while under-redacting a real secret is
the actual failure this exists to prevent. `task-executor.js` calls this via `run-powershell`'s
own `redactForAudit(input)` export rather than the generic key-name-based `redactInput()` helper
every other action falls back to.

## Execution

`runPowerShellCommand()` spawns `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass
-Command <command>` as a single argv element (`spawn(..., { windowsHide: true })`, no
`shell: true`, no string concatenation into a shell line) -- the same safe-spawn pattern already
used everywhere else in this codebase (`open-app`, `whisper`/`piper`, `app-automation.js`'s fixed
scripts). A 30-second timeout kills the process and rejects; stdout/stderr are each capped at
8,000 characters with a `…(truncated)` marker past that. `execute()` re-checks `isPowerShellEnabled()`
fresh every call, not a value cached from validation time, matching the project's established
re-resolve-at-run-time convention (`permissions.js`'s folder grants work the same way).

## What this does not do

- No arbitrary shell access for any other action -- `run-powershell` is the single, contained
  exception described above, not a general escape hatch.
- No credential storage or injection. Zen never supplies a saved password/secret into a
  PowerShell command on the owner's behalf; anything of that shape in a command the owner
  supplied is redacted for audit purposes only, not extracted or reused.
- No elevation. Commands run with whatever privileges the Zen process itself already has; this
  channel does not attempt a UAC prompt or any other privilege escalation.

## Testing

`scripts/check-powershell-control.js` covers: off-by-default on a fresh sandbox, rejected/accepted
typed acknowledgments, restart persistence of both the enabled and disabled state, a second
independent sandbox also defaulting off, the full sensitive/routine command classification list,
redaction of each secret shape (and pass-through of ordinary commands), and one real spawn of a
harmless command (`Write-Output`) to confirm the actual process-execution path works end to end,
not just its call signature. `scripts/check-action-registry.js` separately covers the
registry-level wiring: `run-powershell`'s fixed `routine` tier, its `isStepSensitive` escalation,
`redactForAudit`, and that `execute()` refuses to run at all while the toggle is off.

Not yet done: a live, in-app click-through (Settings toggle on -> a real task with a routine
PowerShell step -> a real task with a command matching the sensitive trigger list, confirming the
fresh re-confirmation actually appears) has not been manually verified in the running desktop app
this session. Flagged as the owner's next verification step, same as Day 18's PDF click-through
gap and Block E's live-testing convention elsewhere in this project.
