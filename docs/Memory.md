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
