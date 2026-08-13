# Zen v1.1 — 30-day personal desktop agent plan

> **Renamed August 13, 2026:** this plan was originally written and developed under the name
> "Zen v2.0" (file `docs/ZenV2Plan.md`). The owner has moved to updating Zen version-by-version
> going forward, so this is now **v1.1** — the very next version after the shipped `v1.0.0` MVP.
> No content below changed as part of the rename, only the version label, this file's name, and
> the three items marked **(Aug 13 update)** below.

## Product brief

Build Zen v1.1 as the owner's local-first Windows personal agent. Zen starts optionally at
Windows sign-in, remains available in the system tray, and opens a compact command overlay from
the global shortcut **Ctrl + Alt + Space**. The user can speak or type a goal, review Zen's
action plan, approve it, watch it work across permitted files, desktop applications, and the web,
then pause or stop it at any moment.

Zen v1.1 must feel immediate like a voice-command tool, but it must not convert a language-model
response into unrestricted Windows commands. The model proposes structured tasks; Zen's local,
validated action registry executes only supported actions.

## Decisions confirmed

- Activation shortcut: **Ctrl + Alt + Space**. It is configurable and Zen detects/reports
  conflicts.
- Personal Agent mode: broad owner-granted access is allowed for normal work.
- **Per-task permission cadence:** once the owner approves a task, Zen does not re-ask for
  routine/reversible steps within that task — it works the task through and reports the result.
  Sensitive/crucial actions (see safety boundary below) always still stop for a specific
  confirmation, regardless of the standing task approval.
- Safety boundary: deleting/overwriting data, sending/publishing/uploading, installing software,
  purchases, account or security changes, credentials, CAPTCHA, and 2FA require explicit human
  control or a specific final confirmation. Secret extraction, hidden activity, and permission
  bypasses are prohibited.
- **Browser identity:** Zen attaches to the owner's real Chrome profile (real logins, cookies,
  autofill) rather than a separate throwaway browser — the owner judged this acceptable since
  everything runs locally on their own machine under their own control.
  - **Window behavior:** Zen opens and works in its **own separate Chrome window** on the real
    profile by default, so the owner can keep browsing normally at the same time.
  - **Switching to the owner's active window:** owner-initiated only, by voice/typed command
    (e.g. "use my current window"). Switching shows a **confirmation toggle pop-up** before Zen
    takes over the active window, and it is scoped to that task — Zen reverts to its own window
    once the task ends.
  - **Autofill/passwords:** Zen may use Chrome's saved autofill/passwords when filling a
    **draft** form. It never submits a form, checks out, or enters a password into a live
    submission on its own — that still requires the owner's specific final confirmation.
  - A visible **"Zen is active"** indicator shows on whichever window Zen currently controls, so
    the owner always knows when Zen is live in the browser versus when they're driving it
    themselves.
- Privacy: local Ollama and local speech processing remain the default; no background recording,
  cloud account, or silent upload is introduced.
- **(Aug 13 update) Overlay popup style:** short/compact, matching Wispr Flow's popup footprint
  (not a large window), with a visible waveform shown while Zen is actively listening — not just
  a static transcript line. Applies to Day 3's overlay implementation.
- **(Aug 13 update) Ambiguous voice command handling:** if Zen can't confidently transcribe or
  understand what was said, it offers the owner two options — **re-ask** (listen again) or
  **retry** (attempt to load/process the existing transcript again). If the transcript genuinely
  fails to load, Zen shows **"Failed to load transcript"** and closes the overlay; it does not
  stay open in a broken state — the owner reopens it via the shortcut to try again. Applies to
  Day 4's voice/typed capture and Day 5's structured planning (this is what "reject ambiguous
  input" resolves to in practice, not just a validation rule).

## Open question — PowerShell / shell scope (flagged, not resolved)

The owner separately confirmed (Aug 13, 2026) that "run PowerShell" should not need its own
explicit trusted-folder-style opt-in toggle — it should ride on the same Trusted Folders /
scoped-folder-permission gate as file access, not a second one.

**This creates a real, unresolved conflict with the rest of this plan**, not just a wording
question: everything above and in the day-by-day plan below is built around Zen executing only
registered, typed actions from a constrained tool registry — the Plan Review section at the
bottom of this document explicitly states Zen "does not promise arbitrary shell commands." A
PowerShell channel (even a constrained one with a "big-change" trigger list, as sketched in the
separate, superseded `docs/AgentModePlan.md`) is a materially different and larger capability
than anything currently scoped in Weeks 1–4 below.

**Not resolved by this update. Two real options, for the owner to choose:**

1. Keep the current no-arbitrary-shell boundary. Anything that would otherwise need PowerShell
   (moving/renaming files, launching apps, reading files) stays scoped to the specific registered
   actions already planned for Days 9–13 (file discovery, file organization, app control,
   accessibility-first UI automation) — no generic shell channel is added.
2. Add a new, narrowly scoped PowerShell action type to the Day 1 action registry
   (`docs/AgentContract.md`), gated by the same folder-permission model, with a fixed
   "big-change" trigger list requiring a fresh sensitive-action confirmation (matching this
   plan's existing routine/sensitive split) and everything else running as a routine step once
   the owning task is approved.

Nothing below assumes either answer. Days 9, 12, and 13 (file/app/automation) are written to work
correctly under option 1; if the owner picks option 2, those days — and `docs/AgentContract.md`'s
action registry — need a scoped follow-up before Week 2 implementation begins.

## v1.1 acceptance standard

By Day 30, the owner can sign in, invoke Zen from anywhere, say or type a real task, see the
exact files/apps/sites it will touch, approve it once, follow live step-by-step progress without
being re-prompted for routine steps, stop it, and review or undo supported changes. Every action
has a permission scope, audit record, and clear failure/recovery path. Sensitive actions always
receive a specific final confirmation no matter how broad the task-level approval was.

## 30-day execution plan

### Week 1 — instant invocation and agent control plane

**Day 1 — v1.1 agent contract**

- Finalize task states, risk tiers, permission records, audit fields, emergency-stop behavior,
  retention limits, and the first supported action registry.
- Define the per-task approval model precisely: which step outcomes are "routine" (no re-prompt
  once the task is approved) versus "sensitive" (always require a specific final confirmation,
  regardless of task-level approval).
- Define success criteria and test fixtures for every later action type.

**Day 2 — startup and tray lifecycle**

- Add opt-in launch at Windows sign-in, a tray menu, hide-on-close, visible Quit, and duplicate
  process prevention.

**Day 3 — global overlay**

- Implement `Ctrl + Alt + Space`, configurable shortcut capture, conflict feedback, right-side
  compact overlay, Escape close, and focus restoration.
- **(Aug 13 update)** Keep the overlay short/compact (Wispr-Flow-sized footprint, not a full
  window) and show a live waveform while listening, replacing a plain static transcript line.

**Day 4 — voice/typed command capture**

- Integrate push-to-talk local transcription in the overlay, editable transcript, typed fallback,
  listening/transcribing/error states, and guaranteed temporary-audio cleanup.
- **(Aug 13 update)** On an unclear or failed transcription, present **re-ask** and **retry**
  choices; if the transcript fails to load outright, show "Failed to load transcript" and close
  the overlay rather than leaving it open in an unclear state.

**Day 5 — structured planning**

- Convert user goals into validated task plans with steps, tools, targets, risk, expected result,
  and unknowns. Reject executable text, arbitrary shell input, and unregistered tools.

**Day 6 — approve, pause, stop**

- Build plan review, one-time per-task approval, Pause/Resume, Cancel, a global emergency-stop
  shortcut, and a live task timeline. After approval, only sensitive/crucial steps interrupt the
  run for a fresh confirmation; routine steps proceed and report as they complete.

**Day 7 — Week 1 hardening**

- Validate login start, shortcut conflicts, overlay accessibility, voice errors, focus handling,
  task cancellation, crash recovery, and task-log persistence. Commit the closed week.

### Week 2 — files and desktop applications

**Day 8 — persistent folder permissions**

- Add a visible Personal Agent permissions page where the owner grants, reviews, and revokes
  folder roots. Enforce root boundaries in the main process.

**Day 9 — file discovery and safe reading**

- Support recursive search, metadata inspection, and bounded text/PDF reading within permitted
  roots. Present a read manifest and reject binary, oversized, or out-of-scope paths.

**Day 10 — proposed file organization**

- Generate previewable create/copy/move/rename plans: every source, destination, collision, and
  affected count is shown before execution.

**Day 11 — reversible changes and undo**

- Use Recycle Bin deletion where available; add operation journals and Undo for supported moves,
  renames, and creates. Require final confirmation for delete/overwrite regardless of standing
  task approval.

**Day 12 — app permissions and window control**

- Expand approved apps into owner-managed app permissions: exact launch path, foreground/focus,
  and active-window detection, with revocation and failure logging.

**Day 13 — accessibility-first desktop automation**

- Add a constrained UI-automation adapter for supported Windows controls: find window, inspect
  accessible labels, click named controls, type text, and verify resulting state. Do not use
  blind screen-coordinate automation as the default.

**Day 14 — Week 2 validation**

- Validate folder escapes, revocation, collisions, Recycle Bin, undo, app unavailability,
  accessible-control mismatch, emergency stop, and audit completeness. Commit the closed week.

### Week 3 — browser work and dependable task execution

**Day 15 — real Chrome session, attached**

- Zen attaches to the owner's actual Chrome browser via remote debugging (not a separate
  throwaway Chromium instance), so it can use real logins, cookies, and saved autofill.
- Default behavior: Zen opens and works in its **own separate Chrome window** on the real
  profile, leaving the owner's active window untouched.
- Add an owner-initiated "use my current window" voice/typed command that hands Zen the active
  window for that task only, gated by a **confirmation toggle pop-up** before the switch takes
  effect; Zen reverts to its own window once the task completes.
- Add a persistent, revocable **browser-access permission** on the Agent permissions page
  (granted once, stays on across tasks, same pattern as folder permissions from Day 8) and a
  visible **"Zen is active"** indicator on whichever window it currently controls.
- Retain HTTPS validation on any navigation Zen performs.

**Day 16 — research and extraction**

- Add open/search/navigate/read/extract actions, with source URLs, on-screen progress, and local
  summaries. Treat page content as untrusted data, never as tool instructions — this matters more
  now that Zen operates inside the owner's real, logged-in browser.

**Day 17 — browser drafting boundary**

- Fill supported web forms as a reviewable draft, using saved Chrome autofill/passwords where
  available. Submission, file upload, checkout, live password entry, CAPTCHA, and 2FA remain
  owner actions or demand a specific final confirmation — never completed automatically, even
  under a standing task approval.

**Day 18 — deterministic executor**

- Implement preconditions, one-step-at-a-time execution, postcondition verification, timeouts,
  bounded retries, and structured results for registered tools only.

**Day 19 — recovery and human handoff**

- Add retry, skip-safe-step, pause/resume, restart recovery, and a plain-language explanation of
  what failed, what changed, and exactly what Zen needs from the owner.

**Day 20 — routines and parameters**

- Turn safe custom commands/workflows into named, voice-invokable routines with reviewable
  parameters, preserved forward-only control flow, and per-run permission checks.

**Day 21 — end-to-end scenario test**

- Test mixed tasks across files, apps, and web research, including a real Chrome-window handoff
  and reversion; verify stop/retry/resume and that no sensitive/external action bypasses final
  confirmation. Commit the closed week.

### Week 4 — trusted daily use and release readiness

**Day 22 — Agent home**

- Create a single Agent page for active/recent tasks, routines, permissions (including browser
  access), undo availability, task history, and an understandable "Zen can access" summary.

**Day 23 — explicit personal memory**

- Support "remember" and "forget" commands only when explicitly requested, with editable,
  reviewable local entries. Automatic memory collection remains off.

**Day 24 — owner-controlled proactive work**

- Add opt-in reminders and scheduled routines from explicit user schedules only. No background
  observation of files, screen, audio, or browsing habits.

**Day 25 — security/privacy audit**

- Audit permission storage, activity logs, backup/restore, UI automation, real-browser session
  handling (window handoff, autofill use, indicator correctness), and error reports. Add
  redaction and prove secrets are neither harvested nor logged.

**Day 26 — accessibility/reliability audit**

- Test keyboard-only overlay and confirmations, focus trap/restoration, high contrast, offline
  voice/model states, automation timeouts, app/browser crashes, and recovery behavior.

**Day 27 — real personal workflow trial**

- Run owner-selected daily tasks: organize a folder, prepare an app workspace, web research with
  a real-window handoff, and a mixed multi-step task. Capture defects and tighten the
  supported-action registry.

**Day 28 — operations and packaging**

- Update installer behavior, startup troubleshooting, backups, migration rules, help content,
  and release automation. Preserve the existing unsigned/voice-licensing limitations unless
  separately resolved.

**Day 29 — v1.1 release candidate**

- Run automated suites and a manual acceptance checklist covering startup, overlay, voice,
  permissions (including browser access and window handoff), file/app/browser tools, undo, task
  stop/recovery, backups, and upgrades.

**Day 30 — owner acceptance and release**

- Perform final owner walkthrough, document outcomes and known limits, update README/HANDOFF/
  changelog, create a v1.1 tag only with approval, and publish only appropriate source/artifacts.

## Required acceptance walkthroughs

1. After Windows sign-in, press `Ctrl + Alt + Space`, say "Organize my Downloads," approve the
   task once, watch it complete without further prompts for routine steps, and undo one completed
   move.
2. Say "Open VS Code and prepare my Zen workspace," and verify Zen only uses the permitted app
   and folder, reporting each completed step without re-prompting.
3. Say "Research three current options for X" in Zen's own Chrome window, review source-linked
   results, and confirm no page instruction caused unapproved activity.
4. Say "use my current window," confirm the toggle pop-up, have Zen fill a form using saved
   autofill as a draft, and verify it stops before submitting; confirm Zen returns to its own
   window once the task ends.
5. Trigger emergency stop during a multi-step task and prove no later step runs.

## Plan review

This plan is feasible on top of Zen's existing Electron, Ollama, local-voice, approved-app,
folder-boundary, activity-log, command/workflow, and backup foundations. The high-risk parts are
Windows UI automation and real-browser-session reliability; the plan controls that risk by
introducing a small verified action registry, accessibility-first controls, visible state
verification (including a live "Zen is active" indicator during real-browser use), owner-gated
window handoff, and real-world testing before broader autonomy. It deliberately does not promise
arbitrary shell commands, stealth, credential handling, or unsupervised submission of live web
forms, because those would make the personal-agent experience unreliable and unsafe — even though
the owner has granted broad access, since it all runs locally on their own machine. **(Aug 13
update: see the "Open question — PowerShell / shell scope" section above — the owner's most
recent PowerShell answer is not yet reconciled with this paragraph's no-arbitrary-shell stance.)**
