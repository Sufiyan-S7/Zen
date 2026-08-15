# Zen v2.0 — Agent Kickoff Brief

**Read this file first, before touching any code.** It exists to eliminate two failure modes
seen in prior sessions: (1) hallucinating files that were never actually created, and (2)
silently re-deciding questions the owner already answered. Everything below was verified against
the live repo at `C:\PERSONAL\Zen` on Aug 15, 2026.

## The plan you follow

**`docs/ZenV2-2Day-Sprint-Plan.md` is the single authoritative plan. Execute it top to bottom,
starting at Block A Step 1.** It supersedes `Zen-v1.1-2Day-Sprint-Plan.md` and
`docs/ZenV1_1Plan.md` (renamed to `docs/ZenV2Plan.md` in Block A Step 3). Do not re-derive these
decisions or draft a new plan.

## Read in this order before starting

1. `AGENTS.md` (repo root) — continuity/handoff rules.
2. `INSTRUCTIONS.md` (repo root) — verification discipline, commit/push defaults, judgment-call
   flagging (Section 5).
3. `AGENT-UPDATE-PROTOCOL.md` (repo root) — the ship-a-feature checklist. Note its sprint-scoped
   override at the top: LinkedIn is batched once/day during this sprint, not per-change.
4. This file, then `docs/ZenV2-2Day-Sprint-Plan.md`, then `docs/AgentContract.md`.
5. `docs/ActionRegistrySkeleton.md` — tracking table, fill in as each action is implemented.

## Verified live repo state (Aug 15, 2026, before Day 1 starts)

- **Branch:** local `zen-1.1` at commit `375bd03`, tracking `origin/zen-1.1`, 0 ahead / 0 behind.
  The `zen-1.1` → `zen-2.0` rename has **not** happened yet — that's Block A Step 2.
- **Working tree:** only pre-existing untracked items (`.backups/`, `.cursorrules.txt`,
  `deliverables/`) plus this session's new/uncommitted context docs. No other drift.
- **`docs/AgentContract.md` is real and substantial** — keep it, update its "v1.1" references to
  "v2.0" in Block A Step 5. Do not rewrite its structure.
- **`AGENT-UPDATE-PROTOCOL.md` and `INSTRUCTIONS.md` are now real** (added Aug 15, 2026) — follow
  them; don't treat them as phantom.

- **Still confirmed absent from disk** — don't hunt for these, don't try to move them to
  `docs/_unnecessary-files/`:
  - `docs/AgentModePlan.md`, `docs/AgentModeChecklist.md`
  - `docs/PowerShellControl.md` (authored fresh in Block F Step 26, same-day as the
    run-powershell action)
  - `SESSION-LOG.md` — confirmed absent and **staying** absent, per owner decision. The sprint
    plan's two checkpoint steps have been corrected to reference `HANDOFF.md` only.

## Corrections already applied (Aug 15, 2026)

- `docs/ZenV2-2Day-Sprint-Plan.md`: removed the two `SESSION-LOG.md` mentions (Day 1 checkpoint,
  Step 31); removed the stale "`AGENT-UPDATE-PROTOCOL.md` does not exist" note now that it's real.
- `README.md` "Next planned version" section: removed the incorrect claim that
  `docs/AgentModePlan.md` / `docs/AgentModeChecklist.md` exist as "two earlier draft design
  files" — they don't, and the sentence describing them has been corrected accordingly.

## Standing rules carried into this sprint (unchanged, don't re-litigate)

- Unnecessary/superseded files → `docs/_unnecessary-files/`, never deleted outright.
- LinkedIn draft: **one batched draft per day** (end of Day 1, end of Day 2), not per change.
- Push-exception rule: push routine changes automatically; **stop and ask before pushing**
  anything touching PowerShell, credentials, or config.
- Historical rewrite for the v1.1→v2.0 rename is **literal and full**, including old dated
  `HANDOFF.md` log entries.
- One task-level approval per task; sensitive-tier actions always get a fresh confirmation
  regardless of standing approval (`docs/AgentContract.md` Section 2).

## Where to start

Block A, Step 1 of `docs/ZenV2-2Day-Sprint-Plan.md`: Tier 1 verification against `HANDOFF.md`'s
Last Verified Commit. Given the state above, this should confirm clean and move to Step 2.
