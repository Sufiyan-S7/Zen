# Superseded: original personal-agent draft (early exploration)

> **Naming note (August 13, 2026):** this document originally called itself "Zen v1.1." That
> version number has since been reassigned to the current live plan — see below. This file's
> own content is unchanged below this header; only the header/links were updated, to avoid two
> different designs both claiming to be "v1.1."

The current planning baseline is [Zen v1.1](ZenV1_1Plan.md) (renamed from `ZenV2Plan.md` on
August 13, 2026 — see `HANDOFF.md`). This document is retained as the original early-exploration
proposal that predates that plan.

## Objective

Turn Zen from a local desktop assistant with narrowly approved actions into a personal,
voice-first Windows agent: it starts with the user, opens from a global shortcut as a compact
right-side overlay, understands a spoken or typed request, previews the intended work, and
performs approved desktop and browser tasks locally.

The default product stance is **Personal Agent mode**: the owner may grant broad access to their
own computer, but Zen still requires a concise confirmation before irreversible, security-
sensitive, or externally consequential work. This prevents a transcription/model mistake from
deleting data, sending a message, making a purchase, uploading files, revealing credentials, or
changing security settings.

## Definition of done

- Zen can start at Windows sign-in, remain in the tray, and open a focused voice overlay through
  a configurable global shortcut.
- A user can speak or type a task, inspect a clear proposed plan, approve it, watch progress, and
  stop it immediately.
- Zen can safely inspect and manage user-selected file locations, open/use approved desktop apps,
  browse and complete supported browser tasks, and combine those actions into resumable workflows.
- Every action has an audit record, permission scope, cancellation path, and clear failure state.
- It remains local-first: no cloud account, background recording, secret collection, or silent
  data upload is introduced.

## Permission model

| Tier | Examples | Default behavior |
| --- | --- | --- |
| Observe | Search/read selected files, inspect screen/app state, browse public pages | May run after Personal Agent mode is enabled; show progress |
| Reversible | Open apps/sites, create folders, copy/move to a recycle-bin-backed location, fill a draft | Run after task approval; preserve undo/review where possible |
| Consequential | Delete/overwrite files, send/publish/upload, downloads, install software, payments, account/security changes | Always show a specific final confirmation |
| Forbidden | Extract passwords/tokens, defeat login/2FA/CAPTCHA, bypass OS permissions, hide activity | Never automate |

## 30-day delivery plan

### Week 1 — invoke Zen and establish safe agent foundations

**Day 1 — Personal Agent design and threat model**

- Write the exact permission, confirmation, audit, emergency-stop, and privacy contracts.
- Define task states: captured, planned, awaiting approval, executing, paused, completed,
  cancelled, failed.
- Specify a supported-action registry instead of unrestricted model-generated commands.

**Day 2 — Windows background lifecycle**

- Add optional launch-at-login, tray icon, hidden-on-close behavior, and a visible Quit Zen action.
- Keep startup opt-in and local; verify clean startup/shutdown and no duplicate process.

**Day 3 — global shortcut and compact overlay shell**

- Add a configurable global shortcut (proposed default: `Ctrl+Win+Space`) and a compact,
  right-side, always-on-top overlay.
- Support open, close, Escape cancel, focus restoration, and screen-reader labels.

**Day 4 — voice command capture in the overlay**

- Reuse local whisper.cpp with push-to-talk, clear listening/transcribing states, editable text,
  and no retained recording.
- Add typed command entry as an equal fallback.

**Day 5 — intent-to-plan contract**

- Convert a request into a structured task plan: requested outcome, proposed steps, affected
  apps/files/sites, permission tier, and unknowns.
- Do not execute natural-language output directly.

**Day 6 — task approval and emergency controls**

- Add Approve, Edit, Cancel, Pause, and Stop-now controls; provide a global stop shortcut.
- Add task timeline and minimal local audit records.

**Day 7 — Week 1 validation and commit**

- Manually validate sign-in startup, tray behavior, shortcut conflicts, overlay focus, voice
  capture, cancellation, and emergency stop. Add automated contract checks and commit.

### Week 2 — personal file and app control

**Day 8 — scoped file permissions**

- Replace one-use folder search grants with saved, user-visible folder scopes for Personal Agent
  mode; retain add/remove/revoke controls and root-bound validation.

**Day 9 — file discovery and safe reading**

- Add recursive file search, metadata inspection, and text/PDF reading inside granted scopes.
- Show exactly which files Zen read; keep binary/large-file limits and never read secrets by
  default.

**Day 10 — file organization proposals**

- Implement proposed folder creation, copy, move, rename, and duplicate cleanup plans with a
  preview of every affected path.

**Day 11 — reversible file changes**

- Send deletions to the Windows Recycle Bin where possible; add undo records for supported
  create/move/rename operations and explicit overwrite confirmation.

**Day 12 — broad app access with guardrails**

- Extend approved-app handling into user-managed app permissions (launch, focus, and window
  detection) while retaining exact executable paths and revocation.

**Day 13 — desktop automation adapter**

- Add an accessibility-first Windows UI automation layer for supported interactions: focus a
  window, click named controls, type into fields, and read accessible labels. Capture no more
  screen data than needed; require a fallback plan when an app is not automatable.

**Day 14 — Week 2 validation and commit**

- Test file-boundary enforcement, Recycle Bin behavior, undo, revoked permission failure,
  approved-app launch/focus, and safe desktop-automation failure handling.

### Week 3 — browser work and reliable task execution

**Day 15 — browser session architecture**

- Choose and implement a user-visible browser-control path: Zen-managed Chromium first, with
  explicit future support for a user-authorized existing browser profile.
- Keep HTTPS-only navigation and display the active site and task state.

**Day 16 — browser research actions**

- Support open, search, navigate, read page text, extract user-requested facts, and save a local
  result summary with source links.

**Day 17 — browser form drafting**

- Let Zen fill supported forms as drafts and highlight every field/value before submission.
- Sending, publishing, purchasing, uploading, password entry, CAPTCHA, and 2FA remain human
  actions or require the final consequential-action confirmation where technically possible.

**Day 18 — task planner and executor**

- Build a deterministic executor that maps plans only to registered file, app, browser, and
  workflow actions. Add preconditions, retries, timeouts, and per-step results.

**Day 19 — recovery and handoff**

- Add pause/resume, retry failed step, skip safe optional step, and a user-readable explanation
  of what blocked the task and what Zen needs next.

**Day 20 — reusable routines**

- Upgrade custom commands/workflows into voice-invokable routines with parameters and a review
  screen. Preserve forward-only workflow safety rules.

**Day 21 — Week 3 validation and commit**

- Run end-to-end tasks spanning files, apps, and browser research; validate stop/retry/resume,
  browser boundaries, and no-send/no-purchase safeguards.

### Week 4 — autonomy experience, privacy, and release readiness

**Day 22 — agent home and activity experience**

- Add an Agent page for active tasks, recent outcomes, permissions, routines, and a clear
  “what Zen can access” summary.

**Day 23 — natural-language memory controls**

- Let the user explicitly ask Zen to remember or forget standing preferences. Keep automatic
  memory extraction disabled by default and make every saved memory reviewable.

**Day 24 — proactive but user-controlled help**

- Add opt-in local reminders/routine suggestions based only on explicit schedules and saved
  routines—not passive monitoring or surveillance.

**Day 25 — privacy and security audit**

- Threat-model logs, permission grants, browser data, file handling, UI automation, and backup.
- Add redaction/minimal logging rules and verify secrets are neither read nor written to logs.

**Day 26 — accessibility and reliability audit**

- Validate keyboard-only overlay control, focus behavior, voice errors, offline-model failures,
  app/browser timeouts, and recovery messages.

**Day 27 — real-world task test day**

- Test owner-selected daily workflows: organizing a folder, opening an app and preparing work,
  browser research, and a mixed multi-step task. Record failures and refine the registry.

**Day 28 — packaging and operations update**

- Update installer/startup guidance, backup schema, troubleshooting, and release workflow for
  v1.1. Keep voice excluded from distributed builds unless its licensing decision changes.

**Day 29 — final regression and release candidate**

- Run automated suites plus manual tests for startup, overlay, permissions, files, apps, browser,
  task stop, recovery, backup/restore, and upgrade safety.

**Day 30 — acceptance, documentation, and release**

- Complete the acceptance checklist with the owner, update README/HANDOFF/changelog, create a
  scoped release tag only after approval, and publish only the source/build artifacts appropriate
  to the resolved signing and voice-license state.

## Suggested acceptance scenarios

1. At sign-in, press the shortcut, say “Organize my Downloads into project folders,” review the
   exact move plan, approve it, and undo a selected operation.
2. Say “Open VS Code and prepare my Zen project,” then have Zen launch the approved app and open
   the explicitly granted project folder.
3. Say “Research three current options for X,” watch Zen browse and collect linked results, then
   review the saved summary.
4. Say “Fill this form but do not send it,” then verify Zen stops at a clearly marked draft.
5. Press the emergency-stop shortcut mid-task and confirm no further step executes.

## Assumptions to confirm before Day 1 implementation

- Default activation shortcut: `Ctrl+Win+Space`; it will be configurable because Windows-level
  shortcuts can conflict with other software.
- “Full desktop access” means broad owner-granted scopes and app permissions, not silent access
  to credentials, security controls, or irreversible/external actions.
- Browser automation starts in a Zen-managed Chromium session; use of an existing signed-in
  browser profile is a later, separately consented option.
- The local Ollama model remains the planner. Its actions stay constrained by Zen's deterministic
  tool registry and confirmation policy.
