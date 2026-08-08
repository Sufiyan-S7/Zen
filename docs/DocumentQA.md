# Day 15 — Local Document Question-Answering Design

## Purpose

This design defines the first point at which document text is allowed to reach the local Ollama
model. Days 12–14 deliberately kept document text out of every model request. Day 15 enables no
picker, retrieval, or prompt change — it fixes the rules Day 16 must implement before any document
excerpt may leave local storage and enter a model prompt.

## User promise

Zen will never place document text into a request to the local model without the user first seeing
the exact excerpts, their source documents, and the question about to be sent, and explicitly
confirming. A normal chat question never silently pulls in document context. Each confirmation
covers one question only; asking again requires a new preview and a new confirmation.

## Scope

- Builds only on text already stored locally by Day 12 import (`extractedText`) and already
  surfaced by Day 13 search / Day 14 preview. No new file access is introduced.
- PDF content is excluded, consistent with Day 12: PDF extraction remains unavailable
  (`PDF_EXTRACTION_UNAVAILABLE`), so PDFs cannot be a Q&A source yet.
- Entry point is a question asked from an existing Day 13 search result set, or a dedicated "Ask
  about my documents" action that runs the same local search first. There is no free-text path that
  skips local search and goes straight to the model.

## Context limits

- At most **3 documents** may contribute excerpts to a single question.
- Combined excerpt length is capped at **4,000 characters** — an explicit, visible extension of Day
  14's single 1,200-character preview, not a silent increase to it.
- If matching local text exceeds the cap, Zen truncates by relevance and states in the preview that
  the excerpts shown are partial.

## Permission and confirmation contract

1. The user asks a question in the document Q&A entry point.
2. The main process runs the existing local search against `extractedText` only and selects up to
   3 documents' worth of matching excerpts, within the 4,000-character cap.
3. Zen shows a confirmation preview containing: the question as typed, the full excerpt text, and
   the display name of each source document. It states: **"Zen will send your question and these
   excerpts to your local model. Nothing leaves this computer."**
4. **Cancel** is the initial focus, matching the Day 11/12 pattern. Escape, closing the modal, or a
   cancelled request results in no model call.
5. Only on **Ask** does the main process build the Ollama request. The request includes a fixed
   system instruction: answer only from the provided excerpts, and state plainly when the excerpts
   do not contain the answer. The model must not be told to assume unstated document content.
6. The question and answer are stored exactly as any normal chat exchange is today; the only
   addition is a tag listing which document display names were used as context, so a later
   reviewer can see the exchange drew on local documents. Raw excerpt text is never duplicated
   into conversation storage.

## Privacy and model boundary

- Excerpts and the question reach Ollama only after the confirmation in Step 3–5 above.
- Source paths are never sent to the model — only excerpt text and document display names.
- The activity log records action `document-qa` with document display names, the combined
  character count sent, and status (`requested`, `cancelled`, `completed`, `failed`). It never
  records the question text, the excerpt text, or the model's answer.
- Removing a document (per Day 12) invalidates it as a future Q&A source immediately; an
  in-progress question already confirmed is not retroactively affected.

## Failure behavior

Zen fails closed and reports a stable, non-sensitive error code for: no matching local text, a
referenced document removed between preview and confirm, a cap violation, and an unreachable local
model. No partial or silent request is sent in any failure case.

## Required Day 16 validation

- Confirm the preview's excerpts and source names exactly match what is sent to Ollama.
- Confirm Cancel, Escape, and modal close all result in zero model calls.
- Confirm the 3-document / 4,000-character caps are enforced and truncation is visibly stated.
- Confirm an insufficient-context question produces the "not contained in the excerpts" answer
  rather than a fabricated one.
- Confirm a document removed after preview but before confirmation fails closed.
- Confirm the activity log contains no question text, excerpt text, or answer text.
- Confirm conversation history shows the document names used, without duplicating raw excerpts.

## Deferred work

Implicit/automatic retrieval on ordinary chat messages, semantic embeddings, PDF-sourced Q&A,
cross-turn retention of document context without a fresh confirmation, and citation deep-linking to
a specific location within a source document remain outside Day 15 and Day 16.
