# Day 11 — Safe Local Document Import Design

## Purpose

This design prepares Zen to import documents that a person explicitly selects, then search them locally in later scoped work. Day 11 enables no file picker, reader, index, document search, or model recall. It defines the constraints that Day 12 must implement before Zen is allowed to access a document.

## User promise

Zen will access a document only after the person selects that exact file through Windows' native picker and confirms a clear preview. It will not scan folders, watch for changes, import attachments from chat, infer a path from text, upload a document, or include document text in a model prompt without a separate future control.

## Initial supported files

The first import implementation may accept only these regular files:

| Type | Extensions | Day 12 handling |
| --- | --- | --- |
| Plain text | `.txt`, `.md`, `.csv`, `.json` | Decode UTF-8/UTF-16 text locally; reject binary or invalid content. |
| PDF | `.pdf` | Extract text locally only; reject password-protected, malformed, image-only, or empty-text PDFs with a clear explanation. |

Microsoft Office files, archives, executables, shortcuts, images, cloud URLs, and folders are excluded. Each source file is limited to 20 MiB; an import request may contain at most 20 files and 100 MiB in total. These limits must be validated in the Electron main process both before the preview and immediately before reading.

## Permission and confirmation contract

1. The user opens **Documents** and chooses **Import documents**.
2. Windows' native file picker supplies the candidate file paths; the renderer may never submit an arbitrary path.
3. The main process resolves every path and validates: it is a real regular file, has an allowed extension, meets size limits, and is not a symbolic link/reparse point.
4. Zen shows a preview with each file's base name, type, and size. It also states: **“Zen will read these selected files on this computer and save extracted text for local search. Nothing is uploaded or sent to the chat model.”**
5. **Cancel** is the initial focus. Escape, closing the modal, any validation failure, or an expired picker token cancels the import without reading a file.
6. After **Import locally**, the main process consumes the one-use, window-bound token; revalidates every file; and reads only the approved set.

Approval is for one import transaction, not an ongoing folder or file grant. Reimporting a changed source needs a new selection and confirmation.

## Local storage boundary

Day 12 stores an import record and extracted text in Zen's app data, not in the source document's folder. The original file is never copied, changed, moved, deleted, or opened in another application.

An import record contains only:

| Field | Purpose |
| --- | --- |
| `id` | Local UUID |
| `displayName` | Source base name shown in Zen |
| `type` | Supported file type |
| `sourcePath` | Local source path, visible to the user but never sent to Ollama |
| `sourceSize` | Size rechecked at import |
| `importedAt` | ISO-8601 local timestamp |
| `contentHash` | Detects a later source change without retaining the source copy |
| `extractedText` | Local searchable text, subject to deletion |
| `status` | `imported`, `rejected`, `failed`, or `removed` |

The first implementation uses an app-data JSON store only if it can write atomically with restricted permissions. A SQLite migration is deferred until the storage and backup design is separately approved. Import records and extracted text must have a visible removal control; removal deletes Zen's stored extracted text and record, never the original source file.

## Privacy and model boundary

- All file reading and extraction happen on the local computer.
- Source paths, document text, hashes, and search results are never written to the Activity log beyond a minimal document display name and status.
- Document text is not included in Ollama chat requests in Day 12 or Day 13.
- Day 14 search returns local snippets only. Day 15 question answering requires a separate explicit per-question document-context preview.
- Zen must not claim to have imported, indexed, searched, or read a document based on chat text alone.

## Failure behavior

Zen fails closed for unavailable files, changed files, symlinks/reparse points, unsupported extensions, oversize batches, extraction failures, password-protected PDFs, and empty text. It reports a stable non-sensitive error code and the relevant display name, leaves no partial record, and never retries automatically.

## Activity log

Each requested import writes a local activity entry with action `import-documents`, a sanitized list of display names and sizes, and status `requested`, `cancelled`, `rejected`, `failed`, or `completed`. Do not log paths, document text, hashes, or parser errors. The existing 200-entry retention and confirmation-protected log clearing rules apply.

## Required Day 12 validation

- Pick valid text and PDF files, inspect the preview, cancel, and confirm no file is read or stored.
- Confirm a valid import, restart Zen, and verify the local record persists.
- Test unsupported files, a renamed/missing file after preview, an oversize file, a batch over the limit, and a reparse-point attempt.
- Test malformed, password-protected, image-only, and empty PDFs.
- Verify that removing an import deletes Zen's stored text only and leaves the source file untouched.
- Verify activity-log statuses, cancellation, and redaction of paths/text.
- Verify no document text or path reaches an Ollama request.

## Deferred work

Folder-wide import, automatic rescanning, OCR, Office formats, semantic embeddings, external services, document question answering, export/backup, and shared/cloud libraries are outside Day 11 and Day 12.

## Day 12 implementation status

The initial Day 12 implementation supports the plain-text formats above with a native picker, preview, one-use token, main-process revalidation, local atomic JSON storage, and removal. A PDF is accepted by the picker so Zen can identify it, but is then safely declined with `PDF_EXTRACTION_UNAVAILABLE`: no local PDF parser is bundled yet. PDF extraction remains deferred until a parser is selected, reviewed, and tested locally; Zen never uploads the PDF as a fallback. Manual desktop validation passed on August 7, 2026 for cancellation, text import, restart persistence, removal/source preservation, and safe PDF denial.
