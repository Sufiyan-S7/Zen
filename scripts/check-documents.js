const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { configureDocuments, previewDocuments, importDocuments, listDocuments, searchDocuments, documentPreview, prepareDocumentQuestion, verifyDocumentQuestion, removeDocument } = require('../apps/desktop/src/main/documents');

// Builds a minimal, structurally valid single-page PDF with correctly computed xref byte
// offsets, so Day 18's real pdfjs-dist extraction path can be exercised end-to-end instead
// of only checked against a deliberately-malformed fixture. `text` present -> a page with a
// real text-showing operator (extractable). `text` omitted -> a page with only a vector
// drawing operator and no font/text (a stand-in for an image-only/no-text-layer PDF).
function buildMinimalPdf({ text } = {}) {
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const contentStream = text ? `BT /F1 24 Tf 20 100 Td (${text}) Tj ET` : '0 0 1 1 re f';
  // MediaBox is wide enough for the sample text: pdfjs clips getTextContent() at the page
  // boundary, so a too-narrow page silently truncates extraction — discovered while
  // building this fixture, and worth remembering if this string is ever lengthened.
  objects.push(text
    ? '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 500 200] /Contents 5 0 R >>\nendobj\n'
    : '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 200 200] /Contents 5 0 R >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) { offsets.push(body.length); body += object; }
  const xrefStart = body.length;
  const objectCount = objects.length + 1;
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let index = 1; index < objectCount; index += 1) xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(`${body}${xref}trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`, 'latin1');
}

(async () => {
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-documents-'));
try {
  const textPath = path.join(root, 'notes.txt');
  const utf16Path = path.join(root, 'utf16.md');
  const binaryPath = path.join(root, 'bad.txt');
  const malformedPdfPath = path.join(root, 'malformed.pdf');
  const textPdfPath = path.join(root, 'with-text.pdf');
  const noTextPdfPath = path.join(root, 'no-text.pdf');
  fs.writeFileSync(textPath, 'Private local note.');
  fs.writeFileSync(utf16Path, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Local markdown', 'utf16le')]));
  fs.writeFileSync(binaryPath, Buffer.from([0x61, 0, 0x62]));
  fs.writeFileSync(malformedPdfPath, '%PDF-1.7');
  fs.writeFileSync(textPdfPath, buildMinimalPdf({ text: 'Private local pdf note' }));
  fs.writeFileSync(noTextPdfPath, buildMinimalPdf({}));
  configureDocuments(root);
  const preview = previewDocuments([textPath, utf16Path]);
  assert.equal(preview.length, 2);
  assert.equal(preview[0].displayName, 'notes.txt');
  const imported = await importDocuments([textPath, utf16Path]);
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
  await assert.rejects(() => importDocuments([binaryPath]), /plain-text/);

  // Day 18: real local text-layer PDF extraction (success, malformed, and no-text-layer cases).
  const [importedPdf] = await importDocuments([textPdfPath]);
  assert.equal(importedPdf.type, 'PDF');
  const pdfSearch = searchDocuments('private local pdf note');
  assert.ok(pdfSearch.results.some((result) => result.id === importedPdf.id), 'extracted PDF text must be locally searchable, same as any other import');
  await assert.rejects(() => importDocuments([malformedPdfPath]), (error) => error.code === 'PDF_MALFORMED', 'a structurally invalid PDF must fail closed with PDF_MALFORMED');
  await assert.rejects(() => importDocuments([noTextPdfPath]), (error) => error.code === 'PDF_NO_TEXT_LAYER', 'a valid PDF with no extractable text must fail closed with PDF_NO_TEXT_LAYER');
  assert.equal(listDocuments().length, 3, 'only the successfully extracted PDF should be stored; both rejections must leave no record');
  removeDocument(importedPdf.id);

  // Day 18: confirm PDF extraction never attempts a network call. Data-based loading plus
  // disableAutoFetch/disableStream/disableRange should make this structurally impossible,
  // but this proves it empirically by monkey-patching the transports pdfjs or Node could
  // reach for, rather than trusting the option flags alone.
  const originalHttpRequest = http.request;
  const originalHttpsRequest = https.request;
  const originalFetch = global.fetch;
  let networkCallAttempted = false;
  http.request = (...args) => { networkCallAttempted = true; return originalHttpRequest(...args); };
  https.request = (...args) => { networkCallAttempted = true; return originalHttpsRequest(...args); };
  global.fetch = (...args) => { networkCallAttempted = true; return originalFetch(...args); };
  try {
    const [networkCheckPdf] = await importDocuments([textPdfPath]);
    assert.equal(networkCallAttempted, false, 'PDF extraction must never attempt a network call');
    removeDocument(networkCheckPdf.id);
  } finally {
    http.request = originalHttpRequest;
    https.request = originalHttpsRequest;
    global.fetch = originalFetch;
  }

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
  const [throwawayRecord] = await importDocuments([throwawayPath]);
  const throwawayContext = prepareDocumentQuestion('local', 'Any question');
  const throwawayExcerpt = throwawayContext.excerpts.find((excerpt) => excerpt.id === throwawayRecord.id);
  assert.ok(throwawayExcerpt, 'the throwaway document should appear in a fresh "local" search');
  removeDocument(throwawayRecord.id);
  assert.throws(() => verifyDocumentQuestion(throwawayContext), /removed or changed/, 'a document removed after preview must fail closed at confirmation');

  removeDocument(imported[0].id);
  assert.equal(listDocuments().length, 1);
  assert.throws(() => removeDocument('../../notes.txt'), /invalid/);

  // Day 18: real-world fixtures (not synthetic ones), decoded at test time. Closes the one
  // gap the synthetic malformed/no-text fixtures above don't reach: an actually
  // password-protected PDF hitting pdfjs's real PasswordException path.
  const desktopDir = path.join(__dirname, '..', 'apps', 'desktop');
  const encryptedFixture = path.join(desktopDir, 'encrypted.b64');
  const scannedFixture = path.join(desktopDir, 'scanned.b64');
  if (fs.existsSync(encryptedFixture)) {
    const realEncryptedPdf = path.join(root, 'real-encrypted.pdf');
    fs.writeFileSync(realEncryptedPdf, Buffer.from(fs.readFileSync(encryptedFixture, 'utf8').trim(), 'base64'));
    await assert.rejects(() => importDocuments([realEncryptedPdf]), (error) => error.code === 'PDF_PASSWORD_PROTECTED', 'a real password-protected PDF must fail closed with PDF_PASSWORD_PROTECTED');
    assert.equal(listDocuments().length, 1, 'a rejected real encrypted PDF must leave no stored record');
  }
  // Day 18 follow-up: a genuine image-only PDF must fail closed specifically with
  // PDF_NO_TEXT_LAYER, not merely "some PDF_* code." An earlier version of this fixture
  // was corrupted in transit and only ever exercised PDF_MALFORMED; this was caught by
  // decoding it independently and checking it ends in %%EOF, not by the loose assertion
  // that used to sit here.
  if (fs.existsSync(scannedFixture)) {
    const realScannedPdf = path.join(root, 'real-scanned.pdf');
    fs.writeFileSync(realScannedPdf, Buffer.from(fs.readFileSync(scannedFixture, 'utf8').trim(), 'base64'));
    await assert.rejects(() => importDocuments([realScannedPdf]), (error) => error.code === 'PDF_NO_TEXT_LAYER', 'a real scanned/image-only PDF must fail closed specifically with PDF_NO_TEXT_LAYER');
    assert.equal(listDocuments().length, 1, 'a rejected real scanned PDF must leave no stored record');
  }

  // Day 18: a PDF's extracted text must reach the same Q&A confirmation gate as any other
  // document type, with the same caps and the same tamper check — not just be searchable.
  const [qaPdf] = await importDocuments([textPdfPath]);
  const pdfQaContext = prepareDocumentQuestion('private local pdf note', 'What does the pdf say?');
  assert.ok(pdfQaContext.excerpts.some((excerpt) => excerpt.id === qaPdf.id), 'a PDF document must be eligible as Q&A context, identically to a text import');
  assert.deepEqual(verifyDocumentQuestion(pdfQaContext).query, pdfQaContext.query, 'a PDF-sourced Q&A context must verify identically to a text-sourced one');
  removeDocument(qaPdf.id);

  console.log('Document-import safety checks passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
