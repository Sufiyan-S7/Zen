# ADR-002: V3 IPC and preload boundary

**Status:** Approved — August 22, 2026
**Decision:** Keep the renderer untrusted and expose only narrow, domain-specific APIs through preload; all capability and storage enforcement remains in the main process.

## Context

V2 already uses `contextIsolation: true`, `nodeIntegration: false`, and `contextBridge`. V3 needs an explicit contract so that its new worker, memory, and task systems do not turn that boundary into a generic command channel.

## Decision

- Keep `contextIsolation: true`, `sandbox: true` where Electron compatibility permits, and `nodeIntegration: false` for all renderer windows.
- Preload exposes named, schema-validated APIs such as `tasks`, `memory`, `settings`, and `events`; it never exposes raw IPC, filesystem, shell, database, or worker handles.
- Renderer requests express user intent or read models. The main process validates caller context, input schema, permission state, task state, and capability availability before dispatch.
- Capability workers receive a validated action request from the trusted orchestrator, not messages from the renderer or raw model output.
- Every IPC contract has a request/result shape, error code, and automated contract test. Approval and task-progress events are pushed through allowlisted subscriptions with explicit unsubscribe support.

## Consequences

This keeps V3's existing local safety boundary intact while allowing the UI to evolve independently. It requires a migration away from broad or feature-mixed preload methods as each V3 domain is introduced.
