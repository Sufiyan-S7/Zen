# ADR-001: V3 local persistence

**Status:** Approved — August 22, 2026
**Decision:** Store V3 durable application data in one local SQLite database, accessed only by the trusted main-process storage service.

## Context

V2 actually persists main-process data as per-feature JSON files and renderer data in browser `localStorage`. Existing documentation that describes SQLite is inaccurate. V3 needs one durable home for task checkpoints, permissions, audit events, memory, conversations, settings, and migrations.

## Decision

- Introduce a main-process `StorageService` with a stable repository-style API; no renderer code opens the database.
- Use SQLite as the sole source of truth for new V3 durable data. Enable WAL mode, foreign keys, and transactional migrations.
- Use a maintained Electron-compatible SQLite binding. The chosen implementation must be rebuilt for the Electron runtime and covered by packaging checks before it becomes a release dependency.
- Import V2 JSON and `localStorage` data through explicit, idempotent migrations. Preserve source data until migration validation succeeds; never silently delete it.
- Keep exports portable and versioned. Backups are an encrypted-at-rest concern only if a user chooses that separately; V3 does not claim encryption it has not implemented.

## Consequences

This removes split persistence semantics and makes restart/resume possible. It adds schema-migration and native-module packaging work, which belongs in Phase 1 and must be validated on the packaged Windows build.
