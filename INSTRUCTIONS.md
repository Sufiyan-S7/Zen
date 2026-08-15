# Instructions — Zen Project

> Fresh draft, Aug 15, 2026. A prior version of this file was referenced by name in old
> `HANDOFF.md` entries ("per `INSTRUCTIONS.md` Section 5", "not committed... per
> `INSTRUCTIONS.md`") but no longer exists on disk. This is a clean rewrite, not a recovery — old
> citations to it should be read as pointing at the equivalent rule below, not literal text.

## 1. Purpose

This file governs *how an agent works* on Zen day to day: verification discipline, commit/push
defaults for non-feature changes, and how to surface judgment calls. It is not the product's own
safety design — that's `docs/AgentContract.md`. It complements, not replaces, `AGENTS.md`
(continuity/handoff requirements) and `AGENT-UPDATE-PROTOCOL.md` (the ship-a-feature checklist).

## 2. Verify before acting

Never assume a file, folder, branch, or setting exists or has specific content because an older
doc mentions it. Check the live repo (`Test-Path`, `git status`, `git branch -r`, actually
opening the file) before relying on it. Prior sessions on this project have both invented
file references that turned out phantom, and silently assumed stale doc content was current —
both are the failure mode this rule exists to prevent.

## 3. Precision and token discipline

Say what changed and why, once, plainly. Don't restate context the reader already has, don't
pad explanations, don't re-summarize a whole document when a one-line pointer to it will do.
Prefer referencing a doc by path over reproducing its content.

## 4. Commit and push defaults

- A **noticeable product change** (real feature, meaningful fix) follows
  `AGENT-UPDATE-PROTOCOL.md` exactly: commit, changelog, README line, push — automatically.
- A **design-only, naming, or open-question-resolution pass with no product code changed**
  defaults to **commit locally, hold the push** for the owner to review, unless the owner has
  already explicitly told the agent to push automatically for that specific piece of work (as
  with this sprint's `docs/ZenV2-2Day-Sprint-Plan.md`, which does authorize automatic pushes for
  its routine changes).
- Anything touching deletions, config, credentials, or security/auth always stops before
  pushing, per `AGENT-UPDATE-PROTOCOL.md` Section 2's exception — no local override changes this.

## 5. Flagging judgment calls

When an agent adds something beyond what was explicitly specified — a new state, a naming
choice, an interpretation of an ambiguous instruction — say so plainly and mark it as the
owner's to confirm, rather than proceeding as if it were already settled. Do not silently reframe
an ambiguous request into whichever reading is most convenient to implement. This applies
whether the addition is large (a new state in a state machine) or small (a default value chosen
where none was given).

## 7. Precision check-ins and separated testing

- If something is genuinely ambiguous, ask one precise question before proceeding — don't guess,
  and don't ask more than needed to unblock the specific ambiguity.
- Before starting a block of work, or right after a clarifying answer, give a short
  **"Understood:"** line stating what you're about to do, so the owner can catch a misread
  before time is spent on it.
- At the end of every completed block/checkpoint, give a clearly separated **"### Testing"**
  section listing exactly how to verify that block — never folded into the middle of other
  explanation, so the owner can jump straight to it without rereading everything above it.

## 8. Related docs

- `AGENTS.md` — continuity/handoff rules (required commits, `HANDOFF.md`/`README.md` updates).
- `AGENT-UPDATE-PROTOCOL.md` — the three-layer ship checklist for noticeable changes.
- `docs/AgentContract.md` — the *product's* own task/risk/permission contract (Zen's runtime
  behavior), not to be confused with this file.
- `docs/AgentKickoffBrief.md` — verified current repo state and pointers, read this at the start
  of any new session.
