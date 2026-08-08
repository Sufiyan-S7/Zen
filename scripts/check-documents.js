const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { configureDocuments, previewDocuments, importDocuments, listDocuments, searchDocuments, documentPreview, prepareDocumentQuestion, verifyDocumentQuestion, removeDocument } = require('../apps/desktop/src/main/documents');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-documents-'));
try {
  const textPath = path.join(root, 'notes.txt');
  const utf16Path = path.join(root, 'utf16.md');
  const binaryPath = path.join(root, 'bad.txt');
  const pdfPath = path.join(root, 'example.pdf');
  fs.writeFileSync(textPath, 'Private local note.');
  fs.writeFileSync(utf16Path, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Local markdown', 'utf16le')]));
  fs.writeFileSync(binaryPath, Buffer.from([0x61, 0, 0x62]));
  fs.writeFileSync(pdfPath, '%PDF-1.7');
  configureDocuments(root);
  const preview = previewDocuments([textPath, utf16Path]);
  assert.equal(preview.length, 2);
  assert.equal(preview[0].displayName, 'notes.txt');
  const imported = importDocuments([textPath, utf16Path]);
  assert.equal(imported.length, 2);
  assert.equal(listDocuments().length, 2);
  const search = searchDocuments('local');
  assert.equal(search.results.length, 2);
  assert.equal(search.results[0].displayName, 'notes.txt');
  assert.ok(search.results[0].snippet.length <= 242);
  const previewText = documentPreview(imported[0].id, 'local');
  assert.equal(previewText.displayName, 'notes.txt');
  assert.match(previewText.text, /Private local note/);
  assert.throws(() => documentPreview(imported[0].id, '', 0), /plain-text/);
  assert.throws(() => searchDocuments(''), /plain-text/);
  assert.throws(() => importDocuments([binaryPath]), /plain-text/);
  assert.throws(() => importDocuments([pdfPath]), /PDF text extraction/);

  // Document Q&A (Day 16): context preparation, caps, and tamper detection.
  const qaContext = prepareDocumentQuestion('local', 'What does the note say?');
  assert.equal(qaContext.question, 'What does the note say?');
  assert.ok(qaContext.excerpts.length >= 1 && qaContext.excerpts.length <= 3, 'excerpts must respect the 3-document cap');
  assert.ok(qaContext.characterCount <= 4000, 'combined excerpt length must respect the 4,000-character cap');
  assert.ok(qaContext.excerpts.every((excerpt) => typeof excerpt.contentHash === 'string' && excerpt.contentHash.length === 64));
  assert.deepEqual(verifyDocumentQuestion(qaContext).query, qaContext.query, 'verification must accept an unmodified context');

  assert.throws(() => prepareDocumentQuestion('local', ''), /plain-text question/);
  assert.throws(() => prepareDocumentQuestion('local', 'x'.repeat(4001)), /plain-text question/);
  assert.throws(() => prepareDocumentQuestion('no-such-term-anywhere', 'A question'), /No imported documents match/);

  const tamperedContext = { ...qaContext, excerpts: qaContext.excerpts.map((excerpt) => ({ ...excerpt, contentHash: 'tampered' })) };
  assert.throws(() => verifyDocumentQuestion(tamperedContext), /removed or changed/, 'a content-hash mismatch must fail closed');

  const overCapContext = { ...qaContext, characterCount: 999999 };
  assert.throws(() => verifyDocumentQuestion(overCapContext), /safety limit/, 'a characterCount above the cap must fail closed');

  const emptyContext = { ...qaContext, excerpts: [] };
  assert.throws(() => verifyDocumentQuestion(emptyContext), /invalid/, 'an empty excerpt set must be rejected');

  const throwawayPath = path.join(root, 'throwaway-local.txt');
  fs.writeFileSync(throwawayPath, 'Local throwaway content for removal testing.');
  const [throwawayRecord] = importDocuments([throwawayPath]);
  const throwawayContext = prepareDocumentQuestion('local', 'Any question');
  const throwawayExcerpt = throwawayContext.excerpts.find((excerpt) => excerpt.id === throwawayRecord.id);
  assert.ok(throwawayExcerpt, 'the throwaway document should appear in a fresh "local" search');
  removeDocument(throwawayRecord.id);
  assert.throws(() => verifyDocumentQuestion(throwawayContext), /removed or changed/, 'a document removed after preview must fail closed at confirmation');

  removeDocument(imported[0].id);
  assert.equal(listDocuments().length, 1);
  assert.throws(() => removeDocument('../../notes.txt'), /invalid/);
  console.log('Document-import safety checks passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
