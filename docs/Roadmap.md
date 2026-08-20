# Zen — Project Roadmap

*Local-first AI desktop assistant for Windows. Repo: github.com/Sufiyan-S7/Zen*

> Superseded the original Week 1-4-only outline on August 20, 2026. This file now tracks the
> full v1.0-v5.0 arc. Status here is verified against live `git`/repo state, not assumed from
> prior notes -- see `HANDOFF.md` for the session that last confirmed it.

---

## v1.0 — Local AI Desktop Assistant
**Status: Shipped — tagged `v1.0.0`, August 12, 2026**

Core identity: local-first Windows chat assistant, everything on-device via Ollama, no cloud,
approval-gated for anything beyond conversation.

- Local Ollama chat (llama3.2:3b), streaming responses, per-message model selection
- Conversation sidebar (create/switch/rename/delete), persists across restarts
- Full appearance/settings customization (themes, fonts, bubble style, read-aloud speed)
- Fully local voice: whisper.cpp STT (F8/F9), Piper TTS (4 voices) — not bundled in installer
  pending GPL-3.0 license review
- Safe computer control: approved-app manager, HTTPS-only site opening, scoped one-use folder
  search
- Manual-only Memory page (never auto-extracted, never sent to model)
- Document import + confirmation-gated Q&A (TXT/MD/CSV/JSON, text-layer PDFs)
- Custom commands (1–5 steps) and workflows (up to 10 steps, branching, no loops)
- Accessibility features, local backup/export/restore
- Unsigned NSIS installer (SmartScreen warning is a known limitation)

---

## v2.0 — Voice-First Personal Desktop Agent
**Status: Shipped — tagged `v2.0`, August 17, 2026 (all Blocks A–H complete)**

Core identity: upgrades v1.0 from "chat + approve-then-open" into a real agent — plans goals as
steps, executes with per-step confirmation, controls apps/files/PowerShell/browser.

- **A — Foundation:** AgentContract.md (task states, risk tiers, permissions, action registry) ✅
- **B — Instant invocation:** system tray, global hotkey (Ctrl+Alt+Space), command overlay ✅
- **C — Voice + typed input:** push-to-talk with waveform, editable transcript + retry ✅
- **D — Task planning/execution:** goal → planner → approval; deterministic executor;
  pause/resume/cancel + emergency stop; 30-day audit log ✅
- **E — File/folder actions:** persistent permission grants, move/copy/rename/delete
  (Recycle Bin-routed) ✅
- **F — App automation + PowerShell:** UI Automation-scoped control, sensitive-command
  classifier ✅
- **G — Browser control:** Chrome remote debugging, navigate/read/form-fill-draft (no autonomous
  submit) — live-verified end-to-end, including a real tab-reuse bug fix ✅
- **H — Routines + Agent Home:** named reusable task plans (max 10 linear actions, re-validated
  live, no nesting), Agent Home dashboard (routines, active/recent tasks, 30-day step history,
  folder/browser access + revoke) ✅

One scoped gap was logged at v2.0 tag time and deliberately deferred rather than blocking
release: no clear-task-history / clear-audit-log control existed yet. Closed in v2.1 below.

---

## v2.1 — Agent Home polish + a real bug fix
**Status: Shipped (commit `eed2e51`, August 18, 2026) — not yet tagged**

- **Clear task history / clear audit log** in Agent Home, closing the gap logged at `v2.0`.
  Terminal-state tasks only; an in-flight task is never touched. Confirm-before-clear, local
  only.
- **Browse installed apps**: lists real installed apps from Windows Start Menu shortcuts as an
  alternative to hand-navigating the native file picker when approving an app. Reuses the exact
  same preview → confirm approval flow — only changes how a path is found.
- **Bug fix:** Browse installed apps could list browser executables (Chrome/Edge/Brave) even
  though approving one always fails by design — found live on the actual dev machine, fixed by
  reusing the same `isBrowserLauncher()` check the approval flow already enforces, with
  permanent regression coverage.
- **Bug fix:** `scripts/check-backup.js` never configured the routines store for its sandbox, so
  any backup/restore path touching routines crashed with a raw `ENOENT`. Fixed; backup round-trip
  now covers routines like every other category.

All work is committed and pushed to `origin/zen-2.0`, `npm run check` passes in full (14 check
scripts), and the live click-throughs were manually confirmed. **Outstanding housekeeping: tag
this state `v2.1`** — it has been feature-complete since August 18 but the tag was never cut.

---

## v3.0 — Companion + Feature Expansion
**Status: Planned, not started. Full master plan + ready-to-paste build prompts received
August 20, 2026.**

Headline feature: an AI companion/pet fed by real local git activity — no new cost, no new
permission model (reuses v2.0's existing folder-permission grants).

Build order (5 steps, each its own commit before moving to the next):
1. **Git Activity Reader** — local `git log` only, no network, no AI calls; rolling 7/30-day
   windows of commit count/timing/message data, refreshed on start + daily
2. **Stat Engine** — Discipline, Night-Owl Level, Bug-Fix Skill, Momentum (0–100 each); derived
   Mood (Thriving / Content / Sleepy / Feral) with gradual decay after 2+ inactive days
3. **Diary generator** — rule-based templates by default (zero cost); optional AI mode using the
   already-running local model; three tone presets (Wholesome / Sarcastic / Roast)
4. **Visual panel** — sprite/avatar + stat bars + diary text, embedded in existing UI (not a new
   window), theme-aware; cosmetic evolution tiers unlocked by sustained Discipline
5. **Share card export** — local PNG render (LinkedIn/social-sized), native save dialog, same
   pattern as the existing v1.0 backup/export

Reserved slot: whatever polish items get deferred from v1.0–v2.1 (e.g. signed installer, voice
bundling resolution) — audit once v3.0 core is shipped.

---

## v4.0 — Unified Unsloth Core (System Overhaul)
**Status: Planned, not started. Prerequisite: v3.0 shipped.**

Full engine migration — Ollama fully retired, Unsloth becomes the sole local inference engine.

Build order (7 steps):
1. Stand up Unsloth locally (OpenAI-compatible endpoint at `localhost:8000`), addable alongside
   Ollama, not replacing it yet
2. Parallel-run validation harness — same task set run against both backends, diffed, pass/fail
   report per feature area
3. New AgentContract action types for code execution (Bash/Python) and web search, added through
   the existing permission/confirmation system, not bypassing it — code exec defaults to the
   highest risk tier, matching `run-powershell`; web search results always treated as untrusted
   data, same rule as `browser-read`
4. Dual-tier model router (Tier 1 ~3B always-warm for hotkeys/quick commands; Tier 2 7B/8B
   on-demand for doc Q&A/web search/code exec/complex planning)
5. Vulkan/Intel Arc iGPU tuning (Yoga Slim 7i) with dynamic VRAM release, benchmarked against the
   old Ollama numbers
6. UI redesign — visually inspired by Unsloth Studio, built as original Zen code (Studio's UI is
   AGPL-3.0; Unsloth's core is Apache 2.0 — do not fork/embed Studio UI code)
7. Retire Ollama entirely once parity is confirmed — remove the integration, update installer and
   docs, confirm no code path still depends on Ollama's API shape

---

## v5.0 — Autonomous Proactive Digital Organism
**Status: Planned, long-term direction, not a single scoped release. Prerequisite: v4.0 shipped
and stable.**

Explicitly meant to fragment into sub-releases (5.1–5.5) rather than ship as one version. The one
rule that governs every capability below: **no sub-agent, vision-based action, or "proactive"
suggestion ever bypasses the v2.0 AgentContract confirmation flow** — proactive means surfacing
sooner, never acting without approval.

Build order, lowest risk to highest risk:
1. **Ambient intelligence** — pattern detection over the existing v2.0 audit log; dismissible,
   non-intrusive suggestions only; global + per-suggestion opt-out
2. **Read-only spatial vision** — local vision-language model describes screen content and
   locates named UI elements; no clicking yet; fills the gap where v2.0's UI Automation has no
   accessibility API to hook into
3. **Researcher + System Health sub-agents** — informational only; Researcher summarizes web
   findings from saved Memory topics; System Health proposes (never auto-runs) cleanup actions
   through the normal confirmation flow
4. **Developer sub-agent** — watches permission-granted repos for build failures/lint
   errors/stale branches, drafts a fix as a plan; never applies without approval
5. **MCP consumption** — connect external MCP servers (databases, repos, browser extensions),
   each with its own permission entry, same grant/revoke pattern as folder permissions
6. **Vision-based clicking** — highest risk, done last; scoped exactly like v2.0's UI Automation
   (approved, already-running apps only; preview-before-execute; fresh confirmation every time)
7. **Sovereign Mesh** — cross-device sync, starting with encrypted export/import between two
   devices (not live P2P) as the foundation before any real-time sync is attempted

---

## Sequencing Summary

| Version | Status | Core Theme |
|---|---|---|
| v1.0 | ✅ Shipped (`v1.0.0`) | Local chat assistant foundation |
| v2.0 | ✅ Shipped (`v2.0`) | Real agent — plans & executes tasks |
| v2.1 | ✅ Shipped, untagged | Agent Home polish + bugfixes |
| v3.0 | 📋 Planned, prompts ready | Companion feature + expanded features |
| v4.0 | 📋 Planned, prompts ready | Full engine migration to Unsloth |
| v5.0 | 📋 Long-term direction, prompts ready | Autonomous, proactive, multi-agent |

**Immediate next action:** tag the current `zen-2.0` HEAD as `v2.1`, then begin v3.0 Prompt 1
(Git Activity Reader) — it has no dependency on anything unbuilt and reuses the existing v2.0
folder-permission system as-is.
