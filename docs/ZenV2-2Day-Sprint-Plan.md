# Zen v2.0 — 2-Day Sprint Plan (Aug 15–16, 2026)

**Final locked decisions (confirmed Aug 14, 2026 — no further questions pending):**

- **Version label = v2.0** everywhere — commits, `CHANGELOG.md`, docs, and the final tag. This
  supersedes the "v1.1" label used since Aug 13, 2026.
- **Branch:** rename `zen-1.1` → `zen-2.0` (local + remote), then delete the old `origin/zen-1.1`
  remote branch once the rename is confirmed on GitHub. This mirrors the same rename-then-delete
  pattern already used once on this project (`zen-2.0` → `zen-1.1`, old remote deleted) — just
  reversed.
- **Historical rewrite = literal, full replace.** Every existing "v1.1" mention becomes "v2.0"
  everywhere, including old dated `HANDOFF.md` log entries. This deliberately reverses the prior
  session's "preserve history as written" rule — the owner's explicit, informed choice this time.
- Activation shortcut = `Ctrl+Alt+Space` (unchanged).
- Scope = full v2.0 feature set, compressed rigor (owner-accepted trade-off).

**File/doc cleanup — verified against real disk state, Aug 14, 2026:**

- `docs/AgentContract.md`: real content confirmed on disk — kept, its internal "v1.1" references
  updated to "v2.0" in Block A.
- `docs/PowerShellControl.md`, `docs/AgentModePlan.md`, `docs/AgentModeChecklist.md`: **verified
  absent from the repo** via direct filesystem check (`Test-Path`, all three returned `False`) —
  not just assumed missing. These were phantom references left in old `HANDOFF.md` entries by a
  prior session, not real files. Nothing to move to `docs/_unnecessary-files/`; there is no trash
  to clean up for these three. `docs/PowerShellControl.md` will instead be authored fresh,
  same-day, as part of Block F Step 26, since the run-powershell action can't ship without it.
- **Update (Aug 15, 2026): `AGENT-UPDATE-PROTOCOL.md` and `INSTRUCTIONS.md` now exist**, added at
  repo root — the owner supplied the original `AGENT-UPDATE-PROTOCOL.md` content and asked for a
  fresh `INSTRUCTIONS.md`. Both are real; follow them directly rather than treating them as
  phantom. `AGENT-UPDATE-PROTOCOL.md` carries a sprint-scoped note at its top confirming the
  LinkedIn batching override below doesn't conflict with it.
- `docs/_unnecessary-files/` still stands as a general rule for anything *else* found stale or
  conflicting mid-sprint. The original plan's Step 3 (move AgentModePlan/AgentModeChecklist
  there) is removed outright since those files don't exist to move.
- **LinkedIn draft:** batched into **one draft per day** (end of Day 1, end of Day 2), overriding
  `AGENT-UPDATE-PROTOCOL.md` Section 3's per-change default — see that file's sprint-scoped note.
- **Push-exception rule** (never push anything touching PowerShell/credentials/config without
  explicit go-ahead): now formally sourced from `AGENT-UPDATE-PROTOCOL.md` Section 2's exception
  and `INSTRUCTIONS.md` Section 4, both real files as of Aug 15, 2026 — kept inline in the Day 2
  close-out step below too, for a self-contained sprint plan.
- Pacing is sequence-based, not hour-boxed — work the numbered order below at whatever daily pace
  is realistic.

**Note on risk (unchanged):** Compressing a 30-day plan into 2 days means safety-critical pieces —
PowerShell gating, browser handoff, deletion confirmations — get far less real-world testing than
Zen's own design principles call for. Steps 26 and 29 (app automation, browser control) are the
highest-risk compression points.

---

## DAY 1 (Aug 15) — Foundation + Core Agent Loop

### Block A: Repo sync & rename
1. Run Tier 1 verification (`git rev-parse HEAD`, `git status --porcelain`) against `HANDOFF.md`'s
   Last Verified Commit; resolve any drift before touching code.
2. Rename branch `zen-1.1` → `zen-2.0` (`git branch -m`), push with upstream tracking set, then
   delete the old `origin/zen-1.1` remote branch once the new one is confirmed present on GitHub.
3. Rename `docs/ZenV1_1Plan.md` → `docs/ZenV2Plan.md`. Do a full-repo, literal find/replace of
   "v1.1" → "v2.0" (and "V1_1" / "V1.1" variants) across every file that contains it, including
   every historical `HANDOFF.md` log entry — applied everywhere, not preserved as history this
   time, per the owner's explicit instruction.
4. Confirm `docs/AgentModePlan.md` / `docs/AgentModeChecklist.md` genuinely don't exist
   (`Test-Path` both) before treating that old naming conflict as resolved — expected to be a
   no-op, but verify rather than assume, since the last audit's first pass on this project made
   exactly this kind of unverified assumption once before.
5. Finalize `docs/AgentContract.md`: task states, risk tiers (routine vs. sensitive), permission
   record schema, audit log fields, emergency-stop behavior, and the complete action registry
   schema — every action type used anywhere in v2.0 (open-app, open-website, read-file,
   list-folder, search-folder, move/copy/rename-file, delete-file, click-control, type-into-field,
   browser-navigate, browser-read, browser-form-fill-draft, run-powershell, run-routine) with its
   risk tier and required confirmation type, even though most aren't implemented until Day 2.
   Update its internal "v1.1" references to "v2.0" as part of this same pass.
6. Commit the rename + contract doc as one Day-boundary commit:
   `docs: rename v1.1 to v2.0, finalize agent contract`.

### Block B: Instant invocation
7. Build system tray integration: icon, hide-on-close, "Quit Zen" menu item, launch-at-login
   toggle.
8. Implement duplicate-instance prevention (single-instance lock).
9. Build global hotkey registration for `Ctrl+Alt+Space` with conflict detection.
10. Build the compact command overlay window (Wispr-Flow-sized), Escape-to-close, focus-restore.
11. Manual smoke test: hotkey from 3 different foreground apps; confirm overlay opens/closes
    cleanly and focus returns correctly.

### Block C: Voice + typed input
12. Wire push-to-talk `whisper.cpp` capture into the overlay (reuse v1.0 engine).
13. Add live waveform indicator while listening.
14. Add typed-entry fallback as an equal first-class input path.
15. Add editable transcript step + re-ask/retry handling for low-confidence transcription, plus
    the "Failed to load transcript" clean-close path.

### Block D: Task planning & execution core
16. Implement the initial subset of the Step 5 action registry (open-app, open-website,
    read-file, list-folder) — remaining registry actions are implemented as their blocks are
    reached below, but all are already schema-defined so nothing is invented ad hoc later.
17. Build the goal → structured task plan step (transcript/typed input → explicit step list
    against the registry). Budget extra time — most likely to need real iteration.
18. Build the single deterministic executor: preconditions, postcondition checks, timeouts,
    bounded retries — every action routes through this, no exceptions.
19. Build the one-approval-per-task flow + per-step sensitive-action re-confirmation gate
    (delete/overwrite, send/publish, install, purchase, account/security, credential, CAPTCHA/2FA)
    driven by the risk tiers defined in Step 5.
20. Build pause/resume/cancel + global emergency-stop shortcut.
21. Build the append-only local audit log (risk level, outcome, confirming action), 30-day
    rolling retention.

**End of Day 1 checkpoint (mandatory):** update `HANDOFF.md` Current Status + commit, regardless
of how much of Day 1's block list is actually done. (`SESSION-LOG.md` doesn't exist and won't be
created — `HANDOFF.md` is the sole continuity record, per owner decision Aug 15, 2026.) Also
write **one batched LinkedIn draft** summarizing the day's work (per the batching decision above
— not one draft per change).

---

## DAY 2 (Aug 16) — Permissions, Automation, Browser, Polish

### Block E: File/folder + permissions
22. Build persistent folder-permission grant (reuse v1.0's native-picker pattern) + dedicated
    permissions page listing/revoking grants.
23. Implement the search-folder and read-file registry actions: recursive search + bounded
    text/PDF read inside permitted folders, rejecting out-of-scope/binary/oversized files.
24. Implement the move/copy/rename/delete-file registry actions as a file organize plan with
    preview-before-execute, Recycle-Bin-routed deletes, and Undo where supported.

### Block F: App automation + PowerShell
25. **[High risk]** Implement the click-control / type-into-field registry actions via an
    accessibility-first automation layer: window finding, reading accessible labels, clicking
    named controls, typing into fields, with a defined fallback for non-automatable apps. If not
    solid partway through the day, cut to "supported apps only" rather than shipping broad blind
    automation.
26. Implement the run-powershell registry action: off-by-default toggle (never inherited from
    config/backup), typed acknowledgment to enable, sensitive-pattern classifier (delete/format/
    uninstall/registry/kill-process/execution-policy/disk commands) that always re-confirms even
    with toggle on, and secret/credential redaction in audit logs. **Author `docs/PowerShellControl.md`
    fresh as part of this step** — it doesn't exist yet, so this is design-and-code together,
    same-day, matching the compressed-rigor trade-off the owner already accepted, rather than the
    usual design-doc-first-then-implement-later pattern used earlier in the project.

### Block G: Browser control
27. Implement Chrome attach (real profile), default-own-window behavior, and the "use my current
    window" handoff with confirmation-toggle + auto-revert-after-task + visible "Zen is active"
    indicator.
28. **[High risk]** Implement the browser-navigate / browser-read / browser-form-fill-draft
    registry actions: research actions (open/search/navigate/read/extract) treating all page
    content as untrusted data, never instructions — and draft-only form-fill (no submit/checkout/
    password/CAPTCHA/2FA autonomy). This is a real prompt-injection surface since Zen reads live
    logged-in pages; don't skip the untrusted-data boundary to save time.

### Block H: Routines, home, close-out
29. Implement the run-routine registry action: upgrade v1.0 custom commands/workflows into named
    voice-invokable routines with per-run permission re-checks.
30. Build the Agent Home page: active/recent tasks, routines, permissions with revoke controls,
    undo availability, task history.
31. Full pass: `npm.cmd run check`, manual smoke test of at least one end-to-end task per feature
    area (invocation → plan → sensitive-step confirm → execution → audit log entry), fix anything
    broken, then final `HANDOFF.md`/`CHANGELOG.md` update, tag as `v2.0`, and
    commit. Write **one batched LinkedIn draft** summarizing Day 2's work. Push routine changes
    automatically; **stop and ask before pushing** anything touching PowerShell, credentials, or
    config, per `AGENT-UPDATE-PROTOCOL.md` Section 2's exception (kept inline here too).
