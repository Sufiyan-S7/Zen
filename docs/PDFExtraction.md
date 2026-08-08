# Day 17 — Local PDF Text Extraction Design

## Purpose

Day 12 accepts a selected PDF into the picker only to identify and safely decline it with
`PDF_EXTRACTION_UNAVAILABLE`, because no reviewed local parser is bundled. This design selects
that parser and defines the rules Day 18 must implement before Zen is allowed to read PDF
content. Day 17 enables no PDF reading. `readTextDocument` in `documents.js` continues to reject
every `.pdf` file until Day 18 ships.

## User promise

Unchanged from Day 11/12: Zen reads a PDF only after the person selects that exact file through
Windows' native picker and confirms the existing Day 12 preview. Extraction happens entirely on
the local computer. No page is rendered, no embedded script runs, no embedded link is followed,
and no network request of any kind is made while reading a PDF.

## Library selection

| Candidate | License | Shells out / native binary? | Fit |
| --- | --- | --- | --- |
| `pdfjs-dist` (Mozilla PDF.js, legacy Node build) | Apache-2.0 | No — pure JS/WASM, runs in-process | **Recommended.** Actively maintained by Mozilla, widely audited, permissive license compatible with Zen's own (non-GPL) code, and the same engine Chromium uses to render PDFs, so its text layer matches what a person sees when they open the file elsewhere. |
| `pdf-parse` | MIT | No | Simpler API, but it is a thin wrapper pinned to an old `pdfjs-dist` version with inconsistent maintenance. Not recommended as the primary choice; could be a fallback only if `pdfjs-dist`'s Node integration proves impractical. |

**Decision:** use `pdfjs-dist`'s legacy Node build for text-layer extraction only. Do not use its
rendering/canvas APIs — Zen does not need a page image, and rendering pulls in a larger,
harder-to-audit code path for no benefit here.

**Before Day 18 implementation:** re-verify `pdfjs-dist`'s current published license and
maintenance status on npm, since this design predates the actual `npm install`.

## Extraction rules

- Text-layer extraction only. Never rasterize, screenshot, or OCR a page.
- Never execute embedded JavaScript, form actions, or launch actions that some PDFs contain.
- Never resolve or fetch an embedded URI, external stream, or remote font/resource — extraction
  must succeed or fail using only the bytes already read from disk.
- Never write, print, or open the source PDF in an external viewer as part of extraction.
- Concatenate page text in page order with a single newline between pages; trim the result the
  same way `readTextDocument` already trims plain-text imports.
- Reuse the existing 20 MiB per-file / 20 files / 100 MiB batch limits from Day 11 — a PDF is
  validated by `validateFiles` before extraction is ever attempted, same as today.

## Rejection cases (fail closed, matching Day 12's existing pattern)

| Case | Error code |
| --- | --- |
| Password-protected / encrypted PDF | `PDF_PASSWORD_PROTECTED` |
| Malformed / unparseable PDF | `PDF_MALFORMED` |
| Image-only PDF (no extractable text layer) | `PDF_NO_TEXT_LAYER` |
| Extracted text is empty after trimming | `EMPTY_TEXT` (existing code, reused) |
| Parser throws for any other reason | `PDF_EXTRACTION_FAILED` |

Each rejection reports the display name and a stable non-sensitive code, exactly like the current
`readTextDocument` failures. No partial record is stored. No automatic retry.

## Storage boundary

Unchanged from Day 11/12. A successfully extracted PDF produces the same `documents.json` record
shape already used for text imports (`id`, `displayName`, `type: 'PDF'`, `sourcePath`,
`sourceSize`, `importedAt`, `contentHash`, `extractedText`, `status`). No new fields, no new
store, no SQLite migration. The source PDF is never copied, modified, or reopened.

## Privacy and model boundary

Identical to every other document type: extracted PDF text is searchable locally (Day 13),
previewable locally (Day 14), and reaches Ollama only through the existing Day 15/16
confirmation-gated Q&A flow, counted against the same 3-document / 4,000-character cap. PDF gets
no special model access and no bypass of the confirmation preview.

## Activity log

No new log action. A completed PDF import still writes the existing `import-documents` entry
(display name, size, status). A rejection writes `rejected` or `failed` with the same redacted
fields Day 11 already defined — never the parser's raw error text, which could otherwise leak
fragments of the PDF's internal structure.

## Required Day 18 validation

- Import a normal text-based PDF; confirm extracted text is stored, searchable, and previewable
  identically to a `.txt` import.
- Import a password-protected PDF and confirm `PDF_PASSWORD_PROTECTED` with no stored record.
- Import a scanned/image-only PDF and confirm `PDF_NO_TEXT_LAYER` with no stored record.
- Import a deliberately corrupted PDF and confirm `PDF_MALFORMED` with no stored record.
- Confirm no network request occurs during extraction (verify with the OS-level absence of any
  outbound connection while a PDF containing an external-resource reference is imported).
- Confirm a PDF's extracted text can reach Ollama only through the existing Day 16 confirmation
  dialog, not automatically.
- Re-run the full existing `scripts/check-documents.js` suite to confirm no regression to
  plain-text import, search, preview, or Q&A behavior.

## Deferred work

OCR for image-only PDFs, PDF metadata extraction, multi-column/table-aware extraction, and
per-page citation in Q&A answers remain outside Day 17 and Day 18.
