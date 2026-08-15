# Zen v2.0 — Action Registry Tracker (skeleton)

Companion tracker for `docs/AgentContract.md` Section 7. Not the schema itself — the contract
owns the schema shape and the fixed routine/sensitive classification rule (Section 8). This file
tracks, action by action, whether each entry has been registered and implemented, so nothing is
invented ad hoc mid-block.

Fill in **Risk Tier**, **Confirmation Type**, and **Status** as each action is actually
registered/implemented — don't pre-fill them now.

| # | Action ID | Risk Tier | Confirmation Type | Implemented in Block/Step | Status |
|---|---|---|---|---|---|
| 1 | `open-app` | routine | standing task approval | Block D, Step 16 | Schema drafted |
| 2 | `open-website` | routine | standing task approval | Block D, Step 16 | Schema drafted |
| 3 | `read-file` | routine | standing task approval | Block D Step 16 (subset) / Block E Step 23 (full) | Schema drafted |
| 4 | `list-folder` | routine | standing task approval | Block D, Step 16 | Schema drafted |
| 5 | `search-folder` | routine | standing task approval | Block E, Step 23 | Schema drafted |
| 6 | `move-file` | routine | standing approval + preview-before-execute | Block E, Step 24 | Schema drafted |
| 7 | `copy-file` | routine | standing approval + preview-before-execute | Block E, Step 24 | Schema drafted |
| 8 | `rename-file` | routine | standing approval + preview-before-execute | Block E, Step 24 | Schema drafted |
| 9 | `delete-file` | sensitive | fresh confirmation, Recycle-Bin-routed | Block E, Step 24 | Schema drafted |
| 10 | `click-control` | routine (gap flagged, see `AgentContract.md` §7) | standing task approval | Block F, Step 25 [High risk] | Schema drafted |
| 11 | `type-into-field` | routine, sensitive for credential fields | fresh confirmation for credential fields | Block F, Step 25 [High risk] | Schema drafted |
| 12 | `run-powershell` | routine by default, sensitive on trigger-pattern match | typed enable acknowledgment + fresh confirmation on match | Block F, Step 26 | Schema drafted |
| 13 | `browser-navigate` | routine | standing task approval | Block G, Step 28 [High risk] | Schema drafted |
| 14 | `browser-read` | routine | standing task approval | Block G, Step 28 [High risk] | Schema drafted |
| 15 | `browser-form-fill-draft` | routine | standing task approval (no submit) | Block G, Step 28 [High risk] | Schema drafted |
| 16 | `run-routine` | routine | standing approval; steps re-check own tier | Block H, Step 29 | Schema drafted |

## Rules that apply to every row (from `docs/AgentContract.md`)

- Registered by `id`, fixed `riskTier`, explicit `inputSchema` — no raw shell command, arbitrary
  file path, or arbitrary argument string as input; every field is typed and schema-constrained.
- `riskTier` is fixed at registration time by matching against Section 2's list. Never decided
  at runtime by the model, never reclassified implicitly by context.
- No action registered without a satisfied emergency-stop guarantee (Section 5).
- Sensitive-tier actions always require a fresh confirmation at execution time, even under a
  standing task-level approval.

## Status legend

`Not started` → `Schema drafted` → `Registered in contract` → `Implemented` → `Manually verified`
