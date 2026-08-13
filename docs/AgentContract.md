# v1.1 Agent Contract — Day 1 Design

> **Renamed August 13, 2026** from "v2.0" to "v1.1" — see `docs/ZenV1_1Plan.md`'s own naming
> note and `HANDOFF.md` for the full rationale. No content below changed as part of the rename.

## Purpose

This document is the constitution for Zen's v1.1 personal-agent executor. It defines the task
lifecycle, the risk model, the permission and audit schemas, emergency-stop guarantees, retention
limits, and the shape of the action registry — before any of it is implemented. Every later v1.1
day of `docs/ZenV1_1Plan.md` (tray/overlay, planning, approve/pause/stop, folder access, app
control, browser work, the deterministic executor itself) builds on exactly this contract rather than inventing its own
states or confirmation rules.

Nothing in this document grants Zen a new capability. No action executes as a result of this file
existing. It fixes the rules that Day 6's approve/pause/stop UI and Day 18's deterministic
executor must implement correctly.

## 1. Task states

A task moves through a fixed, closed set of states:

| State | Meaning | Entered from |
| --- | --- | --- |
| `proposed` | Zen has produced a structured plan from the owner's goal; nothing has run | New task |
| `approved` | Owner gave the one-time per-task approval | `proposed` |
| `running` | The executor is actively executing steps | `approved`, `paused`, `blocked` |
| `paused` | Owner-initiated pause; no step is executing | `running` |
| `blocked` | A step needs a fresh confirmation (sensitive action) or hit an unrecoverable, non-fatal snag and needs owner input to continue | `running` |
| `completed` | Every step finished; task reached its end normally | `running` |
| `failed` | A step failed and no further route was possible | `running`, `blocked` |
| `cancelled` | Owner stopped the task (Cancel or emergency stop) before it reached `completed`/`failed` | Any non-terminal state |

`completed`, `failed`, and `cancelled` are terminal. A terminal task is never resumed; a new task
is proposed instead. This mirrors the loop-safety principle already used for workflows (Day 20/21
of the v1.0.0 plan): no state graph in Zen is allowed to leave a task runnable forever without an
owner action.

`blocked` is the one state this draft adds beyond the plan's original wording ("approved → running
→ paused/stopped → completed"). It exists so a sensitive-action confirmation or a genuine step
failure has somewhere to sit that is distinct from `paused` (owner chose to pause something healthy)
and distinct from `failed` (nothing further will happen). Flagging this addition explicitly, per
`INSTRUCTIONS.md` Section 5 — it is a judgment call for the owner to confirm, not treated as settled.

## 2. Risk tiers

Two tiers only: **routine** and **sensitive**. No "medium" tier — a three-way split would create
judgment calls about which bucket an action lands in; two tiers keeps the rule mechanical.

**Sensitive** — always requires a fresh, specific confirmation at the moment it executes,
regardless of the standing task-level approval. This list is fixed by the already-confirmed
safety boundary in `docs/ZenV1_1Plan.md` and is not extended by an agent without owner approval:

- Delete or overwrite existing data
- Send, publish, or upload anything
- Install software
- Purchases
- Account or security changes
- Entering credentials
- CAPTCHA or 2FA
- Submitting a live web form, checkout, or live password entry (Day 17 boundary)
- Switching Zen into the owner's active Chrome window (Day 15 boundary — the confirmation toggle
  pop-up *is* this tier's confirmation for that specific action)

**Open, not yet resolved as of this contract:** whether a constrained PowerShell action type
belongs in this registry at all is an open question — see `docs/ZenV1_1Plan.md`'s "Open question
— PowerShell / shell scope" section (added Aug 13, 2026). If the owner chooses to add it, its
big-change trigger list (delete/uninstall/format/registry-write/etc.) would land in this
`sensitive` list; until then, no PowerShell action is registered (Section 7).

**Routine** — everything else. Once a task is approved, routine steps execute and report without
re-prompting.

Every action in the registry (Section 7) carries a fixed risk tier at registration time. A step's
tier is never decided at runtime by the model — the executor looks it up from the registry.

## 3. Permission records

A permission record is what the owner grants once and Zen checks before every relevant step.

```json
{
  "id": "perm_<uuid>",
  "kind": "folder | app | browser",
  "scope": "<folder path, or app id, or 'browser'>",
  "grantedAt": "<ISO 8601>",
  "revokedAt": "<ISO 8601 | null>",
  "grantedVia": "native-picker | approved-app-flow | agent-permissions-page"
}
```

- `folder` and `app` reuse the existing v1.0.0 approved-app / folder-picker grant mechanics — this
  contract does not replace them, it extends the same shape to `browser` (Day 15's persistent,
  revocable browser-access permission).
- A revoked record (`revokedAt` set) is never deleted, only marked revoked, so the audit trail
  in Section 4 can still explain why a later step failed closed.
- Every step that touches a folder, app, or the browser must resolve against a live, unrevoked
  record immediately before executing — never against a cached grant from earlier in the task.
  This matches the re-resolve-at-run-time pattern already proven in `custom-commands.js` and
  `workflows.js`.

## 4. Audit fields

Every executed step — routine or sensitive, successful or not — writes one audit record:

```json
{
  "id": "audit_<uuid>",
  "taskId": "task_<uuid>",
  "stepIndex": 0,
  "action": "<registry action id>",
  "riskTier": "routine | sensitive",
  "target": "<redacted description, never raw secrets/credentials>",
  "confirmationId": "<id of the fresh confirmation, or null for routine steps>",
  "outcome": "completed | failed | skipped | cancelled",
  "startedAt": "<ISO 8601>",
  "endedAt": "<ISO 8601>",
  "errorSummary": "<plain-language reason, or null>"
}
```

- `confirmationId` links a sensitive step's execution to the specific fresh confirmation that
  authorized it, so the audit trail can prove a sensitive action never ran on standing task
  approval alone.
- `target` follows the existing minimal-logging rule from every v1.0.0 capability (custom
  commands, workflows, backup/export): enough to be meaningful, never raw content, never
  credentials or secrets. Redaction rules from Day 25's planned security/privacy audit apply
  retroactively to this schema, not as a later bolt-on.
- Audit records are append-only, same as `SESSION-LOG.md`'s own append-only rule in this Project's
  `INSTRUCTIONS.md` — a record is never rewritten after the fact, only superseded by a later
  record for a later step.

## 5. Emergency-stop behavior

Emergency stop is a single global action, available whenever a task is `running`, `paused`, or
`blocked`. It guarantees:

1. No queued step starts after the stop signal is received.
2. The in-flight step either completes to a safe boundary or aborts cleanly — it never leaves a
   sensitive action half-applied (e.g. a partial file write, a partial form submission). Where an
   action cannot guarantee a safe mid-step abort, it must not begin until this guarantee is
   satisfied — this is a hard constraint on which actions Section 7's registry may ever contain,
   not just a runtime behavior.
3. The task transitions to `cancelled`, never `failed` (a stop is an owner decision, not an
   error) and never silently to `completed`.
4. Every step that had already executed keeps its audit record; the audit trail shows exactly
   where the task stopped and why (`outcome: "cancelled"` on the interrupted step, `"skipped"` on
   every step that never started).
5. A plain-language summary is shown to the owner: what finished, what didn't, and that nothing
   further will happen without a new task.

## 6. Retention limits

- Task and audit records: retained locally for **30 days on a rolling basis**, then automatically
  pruned, matching the existing 200-record activity-log cap's spirit (bounded, not unlimited) while
  giving enough window to review a recent task. This is a default, not a hard architectural limit —
  Day 23's "remember only when explicitly requested" principle means Zen must not silently extend
  retention to build a profile of the owner's activity.
- The owner can manually clear task/audit history at any time from the future Agent home (Day 22),
  the same pattern as the existing activity-log clear-with-confirmation control.
- Permission records (Section 3) are retained until explicitly revoked — they are grants, not
  history, so the 30-day rule does not apply to them.

## 7. Action registry — Day 1 scaffold only

**Correction to the Day-1 proposal reviewed earlier (unrelated to the later v2.0→v1.1 rename
below):** an early draft of this plan listed real
actions (`read_file`, `list_dir`, `launch_app`, `focus_window`) as the "first registry." That was
wrong for Day 1 specifically — those actions belong to Day 9 (file discovery) and Day 12 (app/window
control) respectively, which is where their own validation and exclusion rules get designed. Adding
them here would let Week 2/3 capability quietly exist a week early with none of that day's scoped
review. Day 1's registry is a **schema and one no-op test action**, nothing that touches a real
file, app, or website:

```json
{
  "id": "noop.wait",
  "riskTier": "routine",
  "inputSchema": { "seconds": "number, 0–5" },
  "description": "Waits, does nothing else. Exists to test task-state transitions, approval, pause/stop, and audit logging end-to-end before any real action type is registered."
}
```

Registry contract every future action must satisfy, fixed now so later days don't each invent
their own version:

- Registered by `id`, fixed `riskTier`, and an explicit `inputSchema` — the executor rejects any
  step whose action `id` isn't registered, and rejects any input that doesn't match the schema.
- No action may accept a raw shell command, arbitrary file path, or arbitrary argument string as
  input. Every input field is a specific, typed value the schema constrains.
- No action may be registered without a satisfied Section 5 guarantee (safe to abort mid-step, or
  provably atomic).

## 8. Routine vs. sensitive — the classification rule

Because the registry above intentionally contains no real actions yet, this section fixes the
*rule* future days apply, not a populated table:

- An action's `riskTier` is fixed at registration time by matching it against the Section 2 fixed
  list. If an action's effect matches any item on that list (delete/overwrite, send/publish/upload,
  install, purchase, account/security, credentials, CAPTCHA/2FA, live submission, active-window
  handoff), it is `sensitive`. Otherwise it defaults `routine`.
- A `sensitive` action always requires a fresh confirmation at execution time, linked via
  `confirmationId` (Section 4), even if the owner approved the whole task moments earlier.
- Reclassifying an action from `sensitive` to `routine` is never done implicitly by context (e.g.
  "the owner already deleted a file like this once this task") — the tier is a property of the
  action, not the situation.

## 9. Success criteria and test fixtures — Day 1 itself

Day 1 has no product code, so its own "success" is that the contract above is implementable and
testable. Concretely, before Day 2 begins:

| Check | Fixture |
| --- | --- |
| Every task-state transition in Section 1 is reachable and every terminal state is actually terminal | A stub state-machine test walking `proposed → approved → running → blocked → running → completed`, and separately `... → cancelled` from each non-terminal state |
| An unregistered action id is rejected before execution | Call the (future) executor with an action id not in the registry; expect rejection, zero audit record for a real action, one audit record with `outcome: "failed"` for the rejected attempt itself |
| A malformed input for a registered action is rejected | Call `noop.wait` with `seconds: "forever"` (wrong type) and `seconds: 999` (out of range); both rejected before running |
| Sensitive steps always get a fresh confirmation, even mid-task | A stub two-step task where step 1 is `routine` and step 2 is `sensitive`; confirm step 2 pauses for confirmation even though step 1 ran without one |
| Emergency stop guarantees hold | Stop mid-step on a task with 3 remaining `noop.wait` steps; confirm none of the 3 execute, the task lands in `cancelled`, and the audit trail shows the correct `cancelled`/`skipped` split |
| Retention default is enforced | A synthetic audit record dated 31 days in the past is pruned by the (future) retention job; one dated 29 days in the past is not |

These fixtures are written against the contract now so Day 5 (structured planning) and Day 18
(deterministic executor) have a fixed target to implement against, rather than each writing its
own interpretation of "approve, pause, stop" from the prose plan alone.

## Explicit exclusions (Day 1)

- No real action is registered. `noop.wait` is the only entry and it touches nothing outside
  Zen's own process.
- No UI is built. The overlay (Day 3), plan review (Day 6), and Agent home (Day 22) are separate,
  later days.
- No permission is actually granted by this document — Section 3's schema is defined, but the
  folder/app/browser grant flows themselves are Day 8 and Day 15 work.
- This document does not decide the fate of `docs/AgentModePlan.md` / `docs/AgentModeChecklist.md`
  — that remains an open question for the owner, separate from and not blocking this contract.
