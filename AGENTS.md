# Zen Project Instructions

## Completed-Day Commits — Required

When a planned day of work is complete, manually validated where applicable, and its continuity documentation is current, create a Git commit for that day's scoped changes before starting work for the next day. Do not include unrelated existing changes or the next day's work. The only exception is when the user explicitly asks not to commit yet.

## Continuity Documentation — Required

For every task that changes, diagnoses, validates, or reports material work in this repository:

1. Update `HANDOFF.md` before giving the final result.
2. Update `README.md` when the project status, startup steps, completed features, or key usage guidance changes.
3. In `HANDOFF.md`, record the date, what changed, validation performed, current Git state when relevant, known issues, and the exact next recommended step.
4. Do not consider a Zen task complete until the continuity documentation is current.

The purpose is to let a new agent continue work without relying on chat history. Preserve the existing project conventions: local-first operation, privacy by default, and user confirmation for impactful actions.

## Related protocols — Required

Also read `INSTRUCTIONS.md` (verification discipline, commit/push defaults, judgment-call
flagging) and `AGENT-UPDATE-PROTOCOL.md` (the three-layer checklist for shipping a noticeable
change — commit, changelog, README, LinkedIn draft) before starting work. Both live at the repo
root alongside this file.
