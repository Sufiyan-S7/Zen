const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { configureDocuments, previewDocuments, importDocuments, listDocuments, removeDocument } = require('../apps/desktop/src/main/documents');

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
  assert.throws(() => importDocuments([binaryPath]), /plain-text/);
  assert.throws(() => importDocuments([pdfPath]), /PDF text extraction/);
  removeDocument(imported[0].id);
  assert.equal(listDocuments().length, 1);
  assert.throws(() => removeDocument('../../notes.txt'), /invalid/);
  console.log('Document-import safety checks passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
