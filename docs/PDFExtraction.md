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

## Day 18 implementation status (August 9, 2026)

`readPdfDocument` in `documents.js` implements this design: `pdfjs-dist` legacy Node build,
text-layer only, `disableAutoFetch`/`disableStream`/`disableRange`/`isEvalSupported: false`
so no network or script execution can occur, and the fail-closed codes above wired to
`PasswordException` / `InvalidPDFException` / empty-text-after-trim. `importDocuments`
now calls a `readDocumentContent` dispatcher so `.pdf` files route to `readPdfDocument` and
everything else keeps using the existing `readTextDocument` path; extracted PDF text joins
the same `documents.json` record shape and is therefore searchable (Day 13), previewable
(Day 14), and reachable by confirmed Q&A (Day 15/16) exactly like a text import.

Two defects were found and fixed before this could work at all, not just tuned:

- **Wiring gap.** The first uncommitted draft of `importDocuments` still called
  `readTextDocument` directly, so a selected PDF passed file validation (`.pdf` was already
  added to `SUPPORTED_EXTENSIONS`) but then failed at read time with a generic
  "not a supported document type" error — worse than Day 12's old, clear
  `PDF_EXTRACTION_UNAVAILABLE` message. `importDocuments` also had to become `async`
  (`readPdfDocument` uses a dynamic `import()` and returns a Promise; the previous
  synchronous `files.map` would have hashed and stored a pending Promise object instead of
  extracted text for every PDF).
- **`pdf.destroy is not a function`.** The resolved `PDFDocumentProxy` has no `destroy()`
  method in the installed `pdfjs-dist` version — only the `PDFDocumentLoadingTask` does.
  The original `finally` block called `pdf.destroy()`, which would have thrown on *every*
  PDF import, including successful ones, masking the extracted text with a `TypeError`.
  Fixed to call `loadingTask.destroy()`.
- **Missing `standardFontDataUrl`.** Without pointing pdfjs at its own bundled standard-font
  glyph data (`node_modules/pdfjs-dist/standard_fonts/`), PDFs using standard, non-embedded
  fonts (Helvetica, Times, etc. — common, not an edge case) triggered an internal pdfjs
  warning about missing font data. Added `standardFontDataUrl` pointing at that local,
  already-installed directory; this is a filesystem path read directly by pdfjs's Node
  `BinaryDataFactory`, not a network fetch.

Automated coverage in `scripts/check-documents.js` now builds real, structurally valid
minimal PDFs at test time (not just the deliberately-malformed one-line fixture from Day
12) to exercise the success path end-to-end: a text-bearing PDF imports, and its extracted
text is confirmed locally searchable; a structurally invalid PDF fails closed with
`PDF_MALFORMED`; a valid PDF with no text-drawing operator fails closed with
`PDF_NO_TEXT_LAYER`; both rejections leave no stored record. `npm run check` passes.

**Known limitation surfaced while building the test fixture:** `getTextContent()` appears to
clip extraction at the page's `MediaBox` boundary — text positioned to render outside the
visible page was silently truncated in a narrow-page fixture. This should not affect
real-world PDFs, whose page size is normally sized to their own content, but it's a
characteristic of the extraction path worth knowing about, not something this
implementation controls.

## Real-fixture validation (August 9, 2026)

The "not yet done" gaps above were closed against real files, not just synthetic ones, and
folded permanently into `scripts/check-documents.js` so `npm run check` covers them going
forward:

- A real password-protected PDF (`apps/desktop/encrypted.b64`, decoded at test time) correctly
  fails closed with `PDF_PASSWORD_PROTECTED`, exercising pdfjs's actual `PasswordException`
  path — previously only code-reviewed, not run.
- A real "scanned" PDF (`apps/desktop/scanned.b64`) correctly fails closed. Its actual code is
  `PDF_MALFORMED`, not `PDF_NO_TEXT_LAYER` as originally assumed — this fixture is structurally
  invalid rather than a valid-but-textless PDF. Either way, the safety property held: no record
  was stored. Worth noting for whoever prepared this fixture, since it doesn't test the exact
  case its name implies; the synthetic vector-only-page fixture already in the suite is what
  actually exercises `PDF_NO_TEXT_LAYER`.
- Both rejections confirmed to leave zero stored records, same as the synthetic cases.
- A PDF's extracted text confirmed to reach `prepareDocumentQuestion`/`verifyDocumentQuestion`
  exactly like a text import — same caps, same tamper check — not just confirmed searchable.

**Genuinely still open, not automatable:** a live click-through in the running Electron app
(native file picker → import → restart → confirm persistence → ask a question through the real
confirmation dialog). Attempted this session via remote UI automation; the environment had an
active Zoom call and several overlapping windows that made continued blind clicking too risky
to keep attempting, so this was deliberately stopped short rather than pushed through
carelessly. Everything else in the "Required Day 18 validation" list above is now closed by
either the original synthetic-fixture suite or this real-fixture pass. This remaining item
needs a human (or a cleaner remote session) at the keyboard for a few minutes; it is not
expected to surface a new defect given how much of the same code path it shares with the
programmatic checks above, but it hasn't been literally clicked through yet.

**Not yet done, unrelated to the above:** the manual validation checklist originally noted a
no-network check "with a real external-resource-referencing PDF" specifically. The automated
suite's network check (monkey-patching `http`/`https`/`fetch`) uses the synthetic text-bearing
fixture, not a PDF that actually contains an external-resource reference — a stronger version
of that specific check remains a reasonable, non-blocking follow-up.

## Deferred work

OCR for image-only PDFs, PDF metadata extraction, multi-column/table-aware extraction, and
per-page citation in Q&A answers remain outside Day 17 and Day 18.
