# Zen V3 — Core Architecture Migration Plan

**Status:** Phase 0 baseline complete. Phase 1 is ready to begin.

## Purpose

V3 evolves the shipped V2.1 agent into a durable local-first personal-agent platform. V2 remains valuable capability and safety prior art; it is not the V3 architecture. V3 preserves the existing privacy and confirmation guarantees: no cloud fallback, no always-listening audio, no arbitrary model-to-shell execution, and explicit confirmation for destructive, external, credential, account, purchase, CAPTCHA, and 2FA actions.

## Approved foundation

- [ADR-001](decisions/ADR-001-v3-local-persistence.md): one local SQLite source of truth behind a main-process storage service.
- [ADR-002](decisions/ADR-002-v3-ipc-preload-boundary.md): renderer is untrusted; preload exposes only narrow domain APIs.

## Migration work

### Phase 1 — Core foundation

1. Create the V3 storage service, schema migration runner, backup envelope, and migration verification.
2. Scaffold the trusted core, typed IPC contract modules, and test harness without changing user-visible V2 behavior.
3. Inventory and map V2 JSON/localStorage domains for idempotent migration.

### Phase 2 — Model layer

1. Extract a provider-neutral local Model Layer.
2. Move the two V2 implementation call sites together: shared chat/document-Q&A path and task planning.
3. Preserve structured-plan validation and local-only defaults.

### Phase 3 — Worker and capability runtime

1. Build the Worker/Capability Layer around validated action requests.
2. Register the existing action registry and installed-app discovery as capabilities.
3. Decide and document the execution model before concurrent execution is introduced.

### Phase 4 — Durable task runtime

1. Retain V2 task vocabulary: proposed, approved, running, paused, blocked, completed, failed, cancelled.
2. Add durable checkpoints, dependencies, priority, resume, and human handoff.
3. Re-evaluate custom commands, workflows, routines, and scheduling against the new runtime.

### Phase 5 — Memory and context

1. Rebuild memory with lifecycle, source, explicit/inferred distinction, retrieval, and review controls.
2. Move conversations into the same context architecture rather than another isolated store.
3. Decide indexing and retrieval before implementation.

### Phase 6 — Permissions and capabilities

1. Extend the existing capability-scoped model with risk level, expiry, approval context, and microphone/network/screen-context grants.
2. Fold V2 auto-run policy into formal Risk Classes A/B/C.

### Phase 7 — Verification and recovery

1. Define event-log ownership across the executor and UI activity history.
2. Require precondition checks, verification, and rollback/recovery metadata per capability.
3. Retain Recycle Bin undo as V2 prior art, without claiming rollback where it does not exist.

### Phase 8 — Halo UX

1. Replace renderer presentation, overlay, and approval-popup implementations.
2. Preserve instant capture, persistent non-blocking approval, and executor-as-source-of-truth behavior.
3. Use small prototypes to settle the final information architecture.

### Phases 9–11

Integration, testing/hardening, then V3 validation and release readiness.

## V2 migration classification summary

- Keep: voice, installed-app discovery, PDF fixtures, validation discipline, reference documentation.
- Modify: orchestration, permissions, registry, task state machine, planner, logs, auto-run policy, capability modules, backup, renderer orchestration/settings/activity.
- Rebuild: model layer, worker/capability layer, memory, durable task persistence, renderer conversation state.
- Replace: renderer presentation, overlay UI, approval popup.

## Deferred feature work

The previously proposed Git-activity companion, stat engine, diary, visual panel, and share-card export remain valid V3 feature candidates. They are deliberately scheduled after the durable storage, IPC, and capability foundations so they are built on the V3 architecture rather than becoming a parallel persistence/UI path.

## Definition of ready

A phase may begin only when its prerequisite ADRs, migration scope, contract tests, and rollback/recovery expectations are written down. No unresolved design choice is to be hidden inside implementation work.
