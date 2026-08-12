# Zen v2.0 — 30-day personal desktop agent plan

## Product brief

Build Zen v2.0 as the owner's local-first Windows personal agent. Zen starts optionally at
Windows sign-in, remains available in the system tray, and opens a compact command overlay from
the global shortcut **Ctrl + Alt + Space**. The user can speak or type a goal, review Zen's
action plan, approve it, watch it work across permitted files, desktop applications, and the web,
then pause or stop it at any moment.

Zen v2.0 must feel immediate like a voice-command tool, but it must not convert a language-model
response into unrestricted Windows commands. The model proposes structured tasks; Zen's local,
validated action registry executes only supported actions.

## Decisions confirmed

- Activation shortcut: **Ctrl + Alt + Space**. It is configurable and Zen detects/report conflicts.
- Personal Agent mode: broad owner-granted access is allowed for normal work.
- Safety boundary: deleting/overwriting data, sending/publishing/uploading, installing software,
  purchases, account or security changes, credentials, CAPTCHA, and 2FA require explicit human
  control or a specific final confirmation. Secret extraction, hidden activity, and permission
  bypasses are prohibited.
- Privacy: local Ollama and local speech processing remain the default; no background recording,
  cloud account, or silent upload is introduced.

## v2.0 acceptance standard

By Day 30, the owner can sign in, invoke Zen from anywhere, say or type a real task, see the
exact files/apps/sites it will touch, approve it, follow live step-by-step progress, stop it, and
review or undo supported changes. Every action has a permission scope, audit record, and clear
failure/recovery path.

## 30-day execution plan

### Week 1 — instant invocation and agent control plane

**Day 1 — v2.0 agent contract**

- Finalize task states, risk tiers, permission records, audit fields, emergency-stop behavior,
  retention limits, and the first supported action registry.
- Define success criteria and test fixtures for every later action type.

**Day 2 — startup and tray lifecycle**

- Add opt-in launch at Windows sign-in, a tray menu, hide-on-close, visible Quit, and duplicate
  process prevention.

**Day 3 — global overlay**

- Implement `Ctrl + Alt + Space`, configurable shortcut capture, conflict feedback, right-side
  compact overlay, Escape close, and focus restoration.

**Day 4 — voice/typed command capture**

- Integrate push-to-talk local transcription in the overlay, editable transcript, typed fallback,
  listening/transcribing/error states, and guaranteed temporary-audio cleanup.

**Day 5 — structured planning**

- Convert user goals into validated task plans with steps, tools, targets, risk, expected result,
  and unknowns. Reject executable text, arbitrary shell input, and unregistered tools.

**Day 6 — approve, pause, stop**

- Build plan review, per-task approval, Pause/Resume, Cancel, a global emergency-stop shortcut,
  and a live task timeline.

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
  renames, and creates. Require final confirmation for delete/overwrite.

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

**Day 15 — managed browser session**

- Launch a Zen-managed Chromium session with visible task context; retain HTTPS validation and
  do not silently attach to a signed-in personal browser profile.

**Day 16 — research and extraction**

- Add open/search/navigate/read/extract actions, with source URLs, on-screen progress, and local
  summaries. Treat page content as untrusted data, never as tool instructions.

**Day 17 — browser drafting boundary**

- Fill supported web forms as a reviewable draft. Submission, file upload, checkout, password
  entry, CAPTCHA, and 2FA remain owner actions or demand a specific final confirmation.

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

- Test mixed tasks across files, apps, and web research; verify stop/retry/resume and that no
  sensitive/external action bypasses final confirmation. Commit the closed week.

### Week 4 — trusted daily use and release readiness

**Day 22 — Agent home**

- Create a single Agent page for active/recent tasks, routines, permissions, undo availability,
  task history, and an understandable “Zen can access” summary.

**Day 23 — explicit personal memory**

- Support “remember” and “forget” commands only when explicitly requested, with editable,
  reviewable local entries. Automatic memory collection remains off.

**Day 24 — owner-controlled proactive work**

- Add opt-in reminders and scheduled routines from explicit user schedules only. No background
  observation of files, screen, audio, or browsing habits.

**Day 25 — security/privacy audit**

- Audit permission storage, activity logs, backup/restore, UI automation, browser session data,
  and error reports. Add redaction and prove secrets are neither harvested nor logged.

**Day 26 — accessibility/reliability audit**

- Test keyboard-only overlay and confirmations, focus trap/restoration, high contrast, offline
  voice/model states, automation timeouts, app/browser crashes, and recovery behavior.

**Day 27 — real personal workflow trial**

- Run owner-selected daily tasks: organize a folder, prepare an app workspace, web research, and
  a mixed multi-step task. Capture defects and tighten the supported-action registry.

**Day 28 — operations and packaging**

- Update installer behavior, startup troubleshooting, backups, migration rules, help content,
  and release automation. Preserve the existing unsigned/voice-licensing limitations unless
  separately resolved.

**Day 29 — v2.0 release candidate**

- Run automated suites and a manual acceptance checklist covering startup, overlay, voice,
  permissions, file/app/browser tools, undo, task stop/recovery, backups, and upgrades.

**Day 30 — owner acceptance and release**

- Perform final owner walkthrough, document outcomes and known limits, update README/HANDOFF/
  changelog, create a v2.0 tag only with approval, and publish only appropriate source/artifacts.

## Required acceptance walkthroughs

1. After Windows sign-in, press `Ctrl + Alt + Space`, say “Organize my Downloads,” approve the
   listed file operations, and undo one completed move.
2. Say “Open VS Code and prepare my Zen workspace,” and verify Zen only uses the permitted app
   and folder, reporting each completed step.
3. Say “Research three current options for X,” review source-linked results, and confirm no page
   instruction caused unapproved activity.
4. Say “Fill this form but do not send it,” and verify Zen stops at the completed draft.
5. Trigger emergency stop during a multi-step task and prove no later step runs.

## Plan review

This plan is feasible on top of Zen's existing Electron, Ollama, local-voice, approved-app,
folder-boundary, activity-log, command/workflow, and backup foundations. The high-risk parts are
Windows UI automation and browser reliability; the plan controls that risk by introducing a
small verified action registry, accessibility-first controls, visible state verification, and
real-world testing before broader autonomy. It deliberately does not promise arbitrary shell
commands, stealth, credential handling, or unsupervised external actions, because those would
make the personal-agent experience unreliable and unsafe.
