## 2026-08-15 — Zen v2.0, Day 1: from chat app to agent

Been heads-down on Zen v2.0 today — here's what shipped:

- Instant invocation: a global Ctrl+Alt+Space hotkey opens a compact command overlay from
  anywhere on the desktop, system tray + single-instance lock included.
- Voice or typed input, your choice: hold-to-talk with a live waveform, or just type — both land
  in an editable transcript you send yourself, nothing auto-sent.
- The actual agent loop: type "Task: open my resume" and Zen turns it into a plan, shows it in a
  small approval popup, then runs it through a deterministic executor with per-step timeouts,
  retries, pause/resume/cancel, a global emergency-stop hotkey, and a local audit log of every
  step taken.

Next up: folder permissions and real file actions (move/copy/rename/delete with previews and
undo) — Day 2.

Building this as a fully local, privacy-first personal agent — no cloud, no telemetry.
