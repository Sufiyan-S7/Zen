# Safe Workflows — Day 20 Design

## Purpose

A workflow is a saved, named sequence of up to 10 steps — like a Day 19 custom command —
except a step can route to a *different later step* depending on whether the step before it
succeeded or failed. This is the one thing custom commands genuinely cannot do: react to a
failure instead of always stopping cold.

A workflow still grants **no new capability**. Every step is one of:

- **Open an approved app** (Day 8), live-resolved via `computer-control.js`'s `approvedApp()`.
- **Open a website** (Day 8/9), live-resolved via `websitePreview()`.
- **Run a custom command** (Day 19), live-resolved via `custom-commands.js`'s
  `prepareCommandRun()`. If the referenced command's own execution stops partway (per its
  own Day 19 fail-closed rule), the workflow step is treated as failed — no partial-success
  state leaks up from inside a nested command.

No shell, script, filesystem, or network primitive is introduced. Nothing here can do
anything a person couldn't already trigger one confirmed action at a time.

## Why loops are structurally impossible, not just forbidden

Every prior day in this project states an exclusion and relies on validation code to enforce
it. Branching adds a new risk that a stated rule alone doesn't fully cover: a workflow author
could accidentally (or deliberately) create a step that routes back to an earlier step,
producing an infinite loop of confirmed-but-unattended actions.

The design closes this with a single structural constraint instead of separate loop-detection
logic: **every routing target must be a step index strictly greater than the current step's
own index, or the literal value `"stop"`.** Backward and self-referencing jumps are rejected
at validation time, the same way an invalid app ID or malformed URL is rejected today.

Because every step can only route forward, and a workflow has at most 10 steps, execution is
mathematically guaranteed to reach `"stop"` (or run off the end of the list, which behaves
identically to `"stop"`) within at most 10 steps. There is no configuration of a valid,
saved workflow that can run forever or loop. This is a property of the data, not a runtime
watchdog that might fail to catch an edge case.

## Step and routing model

Each step has:

- `type` — `open-approved-app`, `open-website`, or `run-custom-command`, plus the one field
  each needs (`appId`, `url`, or `commandId`).
- `onSuccess` — `"next"` (default, meaning the following step in the list), a specific later
  step index, or `"stop"`.
- `onFailure` — `"stop"` (default, matching Day 19's existing fail-closed behavior), `"next"`,
  or a specific later step index, for the person who explicitly wants a named failure to be
  tolerated and routed elsewhere rather than halting the whole workflow.

```json
{
  "id": "uuid",
  "name": "Morning setup with fallback",
  "steps": [
    { "index": 0, "type": "open-approved-app", "appId": "...", "onSuccess": "next", "onFailure": "stop" },
    { "index": 1, "type": "run-custom-command", "commandId": "...", "onSuccess": "next", "onFailure": 3 },
    { "index": 2, "type": "open-website", "url": "https://...", "onSuccess": "stop", "onFailure": "stop" },
    { "index": 3, "type": "open-website", "url": "https://...fallback", "onSuccess": "stop", "onFailure": "stop" }
  ],
  "createdAt": "ISO-8601"
}
```

## Limits

- Maximum **10 steps** total per workflow (the person's explicit choice for Day 20).
- Maximum 50 saved workflows, matching Day 19's cap.
- No workflow may reference another workflow — only apps, websites, and custom commands.
  This keeps the "forward-index-only" loop proof airtight; nesting workflows inside
  workflows would reopen the loop question through indirection.
- No in-place editing. Changing a saved workflow means removing it and creating a new one,
  matching Day 19's rule and keeping validation simple.

## Explicit exclusions

- **No loops** — structurally impossible per the forward-only routing rule above, not merely
  discouraged.
- **No conditions besides "did the immediately preceding step succeed or fail."** No file
  contents, no system state, no time-of-day, no external data, no user-input prompts mid-run.
  Adding any of those would be a genuinely new capability, not a bigger version of an
  existing one, and is out of scope here.
- **No scheduling or background triggers.** A workflow only runs when a person clicks Run
  and confirms — identical to Day 19. Still Week 4-later territory, not Day 20.
- **No nested workflows.** A workflow step may run a custom command, never another workflow.
- **No parallel steps.** Execution always follows exactly one path through the graph, one
  step at a time, in the order actually taken — never multiple steps at once.
- **No AND/OR combinations of conditions.** Each step has exactly one success route and one
  failure route. Deferred, not designed away permanently — if a real need shows up later,
  it gets its own design pass rather than being folded in here.

## Confirmation contract

**Saving a workflow** shows a Cancel-first confirmation listing every step in order together
with its routing (`onSuccess` / `onFailure`), so the full branch logic is visible before
anything is written to disk — not just a flat step list.

> Save "**{name}**"? Zen will save this named sequence with branching. It replays only apps,
> websites, and custom commands you have already approved, and still asks before every run.
> 1. {step label} → {destination} · on success: {target} · on failure: {target}
> 2. ...

**Running a workflow** shows a separate Cancel-first confirmation, generated fresh from a
live re-resolution of every step (never from what was shown when the workflow was saved),
with the same per-step routing visible.

**Removing a workflow** uses the same pattern, showing the workflow's name.

## Execution and failure reporting

1. Every step is re-resolved live immediately before a run starts, exactly like Day 19 —
   never trusted from storage.
2. Execution starts at step 0 and follows exactly one path: run a step, check whether it
   succeeded or failed, follow that step's `onSuccess`/`onFailure` target, repeat until
   `"stop"` or the end of the list.
3. The result reports the **actual path taken**, not just which steps ran: for each visited
   step, its outcome, and which routing decision was made and why (e.g. "Step 2 failed → its
   onFailure setting routed to step 4" versus "Step 2 failed → no onFailure override, workflow
   stopped"). This is the "failure explanations" requirement from the original Week 4 plan.
4. One local activity-log entry per run: `run-workflow`, scoped to workflow name and a short
   path summary (e.g. "4 of 6 steps visited, stopped at step 4") — never raw step
   destinations, consistent with every prior day's logging rule.

## Storage

`workflows.json` under Electron's user-data directory, same atomic temp-file-then-rename
pattern as `custom-commands.json`, `approved-apps.json`, and `documents.json`. Only
source-of-truth fields are stored (step type, its one reference field, and its two routing
targets) — never a cached label or destination, matching Day 19's reasoning exactly.

## Before enabling

Manual tests required before this ships for regular use: a workflow with no branching runs
identically to a Day 19 command; a workflow where step 2's `onFailure` routes to step 4 (and
step 4 actually runs, skipping step 3); a workflow where a step's `onFailure` is left at the
default `"stop"` and a failure correctly halts there; an attempted backward-routing step is
rejected at save time with a clear message; the 10-step cap is enforced; a step referencing a
custom command that itself later has an approval removed fails that step closed instead of
running blind; and the run result's reported path matches what actually executed, verified
against a deliberately-forced failure.

## Deferred decisions

- Multiple conditions per step, or AND/OR logic across conditions: deferred until a concrete
  need appears.
- Conditions on anything besides immediate prior-step success/failure: deferred indefinitely
  — this is the same category of decision as Day 19's folder-search exclusion, not a small
  scope tweak.
- Scheduling or background/unattended triggers for a saved workflow: still out of scope,
  consistent with Day 19.
- Editing steps or routing in place: deferred, same reasoning as Day 19 (remove-and-recreate
  keeps validation simple).
