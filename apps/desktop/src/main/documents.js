const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_BATCH_BYTES = 100 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, '.pdf']);
let documentsPath = '';

function configureDocuments(userDataPath) { documentsPath = path.join(userDataPath, 'documents.json'); }
function safeError(message, code) { const error = new Error(message); error.code = code; return error; }
function validateFiles(filePaths) {
  if (!Array.isArray(filePaths) || !filePaths.length || filePaths.length > MAX_FILES) throw safeError(`Choose between 1 and ${MAX_FILES} documents.`, 'INVALID_BATCH');
  let totalBytes = 0;
  const files = filePaths.map((filePath) => {
    if (typeof filePath !== 'string' || !filePath) throw safeError('The document selection is invalid.', 'INVALID_PATH');
    const resolved = path.resolve(filePath);
    const link = fs.lstatSync(resolved);
    if (link.isSymbolicLink() || link.isDirectory() || !link.isFile()) throw safeError(`Choose a regular file: ${path.basename(resolved)}.`, 'UNSAFE_FILE');
    const verified = fs.realpathSync(resolved);
    const stat = fs.statSync(verified);
    const extension = path.extname(verified).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) throw safeError(`${path.basename(verified)} is not a supported document.`, 'UNSUPPORTED_TYPE');
    if (stat.size > MAX_FILE_BYTES) throw safeError(`${path.basename(verified)} is larger than 20 MiB.`, 'FILE_TOO_LARGE');
    totalBytes += stat.size;
    return { path: verified, displayName: path.basename(verified), extension, size: stat.size };
  });
  if (totalBytes > MAX_BATCH_BYTES) throw safeError('The selected documents exceed the 100 MiB import limit.', 'BATCH_TOO_LARGE');
  return files;
}
function previewDocuments(filePaths) {
  return validateFiles(filePaths).map(({ displayName, extension, size }) => ({ displayName, type: extension.slice(1).toUpperCase(), size }));
}
function readTextDocument(file) {
  if (!TEXT_EXTENSIONS.has(file.extension)) throw safeError(`${file.displayName} is a PDF. PDF text extraction will be added in a later scoped update; this file was not imported.`, 'PDF_EXTRACTION_UNAVAILABLE');
  const bytes = fs.readFileSync(file.path);
  let encoding = 'utf-8';
  let start = 0;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) { encoding = 'utf-16le'; start = 2; }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) throw safeError(`${file.displayName} uses an unsupported text encoding.`, 'UNSUPPORTED_ENCODING');
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  if (encoding === 'utf-8' && bytes.includes(0)) throw safeError(`${file.displayName} is not a plain-text document.`, 'BINARY_CONTENT');
  let extractedText;
  try { extractedText = new TextDecoder(encoding, { fatal: true }).decode(bytes.subarray(start)).trim(); } catch { throw safeError(`${file.displayName} could not be decoded as text.`, 'INVALID_TEXT'); }
  if (!extractedText) throw safeError(`${file.displayName} contains no readable text.`, 'EMPTY_TEXT');
  return extractedText;
}
function readStoredDocuments() {
  try { const data = JSON.parse(fs.readFileSync(documentsPath, 'utf8')); return Array.isArray(data) ? data : []; }
  catch (error) { if (error.code === 'ENOENT') return []; throw safeError('Zen could not read its local document store.', 'STORE_READ_FAILED'); }
}
function writeStoredDocuments(documents) {
  const temporary = `${documentsPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(documents), 'utf8'); fs.renameSync(temporary, documentsPath); }
  finally { try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { } }
}
function importDocuments(filePaths) {
  const files = validateFiles(filePaths);
  const importedAt = new Date().toISOString();
  const records = files.map((file) => {
    const extractedText = readTextDocument(file);
    return { id: crypto.randomUUID(), displayName: file.displayName, type: file.extension.slice(1).toUpperCase(), sourcePath: file.path, sourceSize: file.size, importedAt, contentHash: crypto.createHash('sha256').update(extractedText).digest('hex'), extractedText, status: 'imported' };
  });
  const documents = readStoredDocuments();
  writeStoredDocuments([...records, ...documents]);
  return records.map(({ id, displayName, type, sourceSize, importedAt, status }) => ({ id, displayName, type, sourceSize, importedAt, status }));
}
function listDocuments() { return readStoredDocuments().filter((item) => item?.status === 'imported').map(({ id, displayName, type, sourceSize, importedAt, status }) => ({ id, displayName, type, sourceSize, importedAt, status })); }
function removeDocument(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That document record is invalid.', 'INVALID_DOCUMENT');
  const documents = readStoredDocuments();
  const item = documents.find((entry) => entry.id === id);
  if (!item) throw safeError('That document is not stored in Zen.', 'DOCUMENT_NOT_FOUND');
  writeStoredDocuments(documents.filter((entry) => entry.id !== id));
  return { id: item.id, displayName: item.displayName };
}
module.exports = { configureDocuments, previewDocuments, importDocuments, listDocuments, removeDocument };
