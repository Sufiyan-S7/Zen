# v2.0 Agent Contract

> This document was drafted under the "v1.1" label (Aug 13, 2026), then that label was renamed to
> "v2.0" for the 2-day sprint (Aug 15, 2026) with a literal, full text rewrite of every "v1.1"
> mention per owner decision — see `HANDOFF.md` for the full history. The blockquote that
> previously described the earlier v2.0→v1.1 rename has been removed here since the literal
> rewrite made it self-contradictory ("from v2.0 to v2.0"); this is a small legibility cleanup,
> not a re-litigation of the historical-rewrite decision itself — flagged per `INSTRUCTIONS.md`
> Section 5.

## Purpose

This document is the constitution for Zen's v2.0 personal-agent executor. It defines the task
lifecycle, the risk model, the permission and audit schemas, emergency-stop guarantees, retention
limits, and the shape of the action registry — before any of it is implemented. Every later v2.0
day of `docs/ZenV2Plan.md` (tray/overlay, planning, approve/pause/stop, folder access, app
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
| `approved` | Owner approved the task, or Zen's direct-request policy classified every step as auto-run eligible | `proposed` |
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
safety boundary in `docs/ZenV2Plan.md` and is not extended by an agent without owner approval:

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

**Resolved (August 13, 2026):** a full PowerShell action type is included in this project, gated
behind an explicit, off-by-default **"Full System Control (PowerShell)"** Settings toggle — see
`docs/ZenV2Plan.md`'s "Resolved — PowerShell / shell scope" section for the full design (typed
confirmation to enable, fail-closed classification on ambiguous commands, redacted audit logging,
a dedicated `docs/PowerShellControl.md` before implementation). Its big-change trigger list
(delete/format/uninstall/registry-write/foreign-process-stop/execution-policy/disk commands) lands
in this `sensitive` list once the toggle exists; everything else it can run is `routine`. The
toggle itself is registered as a `sensitive` action in Section 3's permission-record sense —
enabling it requires the same typed-acknowledgment weight as any other sensitive action.

**Routine** — everything else. Direct requests containing only `open-app`, `open-website`,
`list-folder`, `search-folder`, `read-file`, `browser-navigate`, or `browser-read` can start
without the old task-level Start click, but only after their normal live app/folder/browser grant
checks pass. Other routine action types remain plan-review-gated. Once started, routine steps
execute and report without re-prompting.

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

## 7. Action registry — complete v2.0 schema

Finalized for the 2-day sprint (per `docs/ZenV2-2Day-Sprint-Plan.md` Block A Step 5): every
action type used anywhere in v2.0 is schema-defined here with a fixed risk tier and required
confirmation type, even though most are not implemented until their own block below. Companion
tracker: `docs/ActionRegistrySkeleton.md` (fill in Status per action as it's actually built).

| Action ID | Risk tier | Confirmation |
| --- | --- | --- |
| `noop.wait` | routine | standing task approval (test action; touches nothing outside Zen's own process) |
| `open-app` | routine | direct-request auto-run when the app remains approved; otherwise standing task approval |
| `open-website` | routine | direct-request auto-run for validated HTTPS URLs; otherwise standing task approval |
| `read-file` | routine | direct-request auto-run inside a live, unrevoked folder permission; otherwise standing task approval |
| `list-folder` | routine | direct-request auto-run inside a live, unrevoked folder permission; otherwise standing task approval |
| `search-folder` | routine | direct-request auto-run inside a live, unrevoked folder permission; otherwise standing task approval |
| `move-file` | routine | standing task approval + preview-before-execute (Block E Step 24) |
| `copy-file` | routine | standing task approval + preview-before-execute |
| `rename-file` | routine | standing task approval + preview-before-execute |
| `delete-file` | **sensitive** | fresh confirmation at execution, Recycle-Bin-routed, Undo where supported |
| `click-control` | routine | standing task approval — see flagged gap below |
| `type-into-field` | routine, except credential/password fields | fresh confirmation when the target field is a credential/password field ("entering credentials" is fixed-sensitive in Section 2); standing approval otherwise |
| `run-powershell` | routine by default; **sensitive** for trigger-pattern matches | one-time typed acknowledgment to enable the toggle, plus a fresh confirmation whenever a step matches the delete/format/uninstall/registry-write/kill-process/execution-policy/disk trigger list (Section 2) |
| `browser-navigate` | routine | direct-request auto-run with live browser permission; otherwise standing task approval |
| `browser-read` | routine | direct-request auto-run with live browser permission; page content always treated as untrusted data, never instructions |
| `browser-form-fill-draft` | routine | standing task approval — draft only, no submit/checkout/password/CAPTCHA/2FA autonomy |
| `run-routine` | routine at the registry level | standing task approval; each constituent step still resolves its own tier and permission at run time (no bulk exemption from Section 8) |

**Flagged judgment call (`INSTRUCTIONS.md` Section 5):** `click-control` and `type-into-field`
are registered `routine` because their action *type* has no fixed sensitive effect, but a
specific instance can hit one (e.g. clicking a "Delete"/"Send" control, typing into a password
field) — the same runtime-pattern problem Section 2 already solved for `run-powershell` via its
trigger-pattern classifier. `type-into-field` inherits a narrow version of that exception here
(credential-field detection forces sensitive). `click-control` has no equivalent detector yet;
closing that gap is Block F Step 25's job when the accessibility-automation layer is designed, not
decided ad hoc here. Owner to confirm this is the right interim default before Step 25 lands.

Registry contract every action must satisfy, fixed now so later blocks don't each invent
their own version:

- Registered by `id`, fixed `riskTier`, and an explicit `inputSchema` — the executor rejects any
  step whose action `id` isn't registered, and rejects any input that doesn't match the schema.
- No action may accept a raw shell command, arbitrary file path, or arbitrary argument string as
  input. Every input field is a specific, typed value the schema constrains.
- No action may be registered without a satisfied Section 5 guarantee (safe to abort mid-step, or
  provably atomic).

The future PowerShell action type (Section 2's resolution) follows this same contract when it's
registered: fixed `sensitive`/`routine` classification per command, typed input only (no free-text
shell piped straight to a process), and gated overall by the off-by-default toggle rather than
bypassing this registry.

## 8. Routine vs. sensitive — the classification rule

Section 7's table is the populated result; this section fixes the *rule* that produced it and
that later blocks must keep applying as each action is actually implemented:

- An action's `riskTier` is fixed at registration time by matching it against the Section 2 fixed
  list. If an action's effect matches any item on that list (delete/overwrite, send/publish/upload,
  install, purchase, account/security, credentials, CAPTCHA/2FA, live submission, active-window
  handoff), it is `sensitive`. Otherwise it defaults `routine`.
- A `sensitive` action always requires a fresh confirmation at execution time, linked via
  `confirmationId` (Section 4), even if the owner approved the whole task moments earlier.
- Reclassifying an action from `sensitive` to `routine` is never done implicitly by context (e.g.
  "the owner already deleted a file like this once this task") — the tier is a property of the
  action, not the situation.

## 9. Success criteria and test fixtures — contract itself

Block A has no product code, so its own "success" is that the contract above is implementable and
testable. Concretely, before Block D (executor) begins:

| Check | Fixture |
| --- | --- |
| Every task-state transition in Section 1 is reachable and every terminal state is actually terminal | A stub state-machine test walking `proposed → approved → running → blocked → running → completed`, and separately `... → cancelled` from each non-terminal state |
| An unregistered action id is rejected before execution | Call the (future) executor with an action id not in the registry; expect rejection, zero audit record for a real action, one audit record with `outcome: "failed"` for the rejected attempt itself |
| A malformed input for a registered action is rejected | Call `noop.wait` with `seconds: "forever"` (wrong type) and `seconds: 999` (out of range); both rejected before running |
| Sensitive steps always get a fresh confirmation, even mid-task | A stub two-step task where step 1 is `routine` and step 2 is `sensitive`; confirm step 2 pauses for confirmation even though step 1 ran without one |
| Emergency stop guarantees hold | Stop mid-step on a task with 3 remaining `noop.wait` steps; confirm none of the 3 execute, the task lands in `cancelled`, and the audit trail shows the correct `cancelled`/`skipped` split |
| Retention default is enforced | A synthetic audit record dated 31 days in the past is pruned by the (future) retention job; one dated 29 days in the past is not |

These fixtures are written against the contract now so Block D Step 17 (structured planning) and
Step 18 (deterministic executor) have a fixed target to implement against, rather than each
writing its own interpretation of "approve, pause, stop" from the prose plan alone.

## Explicit exclusions (as of Block A)

- No real action is implemented in code yet — Section 7 is a complete schema, not working
  executor code. `noop.wait` remains the only action safe to test end-to-end before Block D.
- No UI is built. The overlay (Block B), plan review (Block D Step 19), and Agent Home (Block H
  Step 30) are separate, later blocks.
- No permission is actually granted by this document — Section 3's schema is defined, but the
  folder/app/browser grant flows themselves are Block E Step 22 and Block G Step 27 work.
- `docs/AgentModePlan.md` / `docs/AgentModeChecklist.md` are confirmed absent from this repo
  (verified `Test-Path`, Aug 15, 2026) — not an open question, per
  `docs/AgentKickoffBrief.md`.
