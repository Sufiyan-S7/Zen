# Day 10 — Local Memory

## Scope

Day 10 starts Week 3 with user-managed long-term memory. A person can manually add, edit, and remove short memories in Zen's **Memory** page. Entries stay in the Electron renderer's local storage and are never created automatically from chat.

## Boundaries

- Memory is local only; no cloud service, document, or external account is involved.
- Zen does not put saved memories into an Ollama prompt in Day 10. This prevents invisible context sharing and keeps recall opt-in for a later scoped day.
- A memory is limited to 500 characters and has no file attachment or executable content.
- Editing and removal require a direct user action; removal asks for confirmation.
- Clearing conversations does not erase memories. They are separate user-owned data sets.

## Deferred work

Document import/indexing, semantic retrieval, memory-in-chat controls, export/backup, and custom commands remain separate Week 3 scopes. Any later recall feature must show exactly which saved memories will be provided to the local model and provide a clear off switch.

## Update — v1.0.1 (August 14, 2026)

Two of the boundaries above changed by explicit user request; this section records what changed and why, rather than editing the Day 10 record above.

- **Recall is now live.** Saved Memory entries are included as plain-language context on every chat request, capped at 4,000 characters. This is the only point memory text reaches Ollama.
- **Auto-save from chat is now live.** A fixed set of pattern matches (name, location, job, birthday, email, phone, stated preferences, and explicit "remember that…"/"note that…") reformats what the user typed into a short fact and saves it — no confirmation prompt, by the user's explicit choice after being offered a confirmation-gated alternative. Every result still passes through the same 500-character/dedupe validation as a manually typed memory, and every entry (recalled or auto-saved) stays visible and editable on the Memory page.
- **Known gap against the Day 10 requirement above:** recall does not yet "show exactly which saved memories will be provided" at the moment of each request the way document Q&A shows its excerpts before sending, and there is no dedicated off switch for recall/auto-save short of deleting entries from the Memory page. Not built this session; flagged here for a future pass rather than silently dropped.

