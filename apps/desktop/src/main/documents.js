const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_BATCH_BYTES = 100 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, '.pdf']);
const MAX_SEARCH_QUERY_LENGTH = 200;
const MAX_SEARCH_RESULTS = 50;
const MAX_PREVIEW_LENGTH = 1200;
const MAX_QA_DOCUMENTS = 3;
const MAX_QA_CONTEXT_LENGTH = 4000;
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
function searchDocuments(query) {
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_SEARCH_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(query)) throw safeError('Enter a plain-text search term up to 200 characters long.', 'INVALID_SEARCH_QUERY');
  const term = query.trim();
  const needle = term.toLocaleLowerCase();
  const results = [];
  for (const item of readStoredDocuments()) {
    if (item?.status !== 'imported' || typeof item.extractedText !== 'string') continue;
    const haystack = item.extractedText.toLocaleLowerCase();
    let index = haystack.indexOf(needle);
    if (index < 0) continue;
    let matchCount = 0; let cursor = index;
    while (cursor >= 0) { matchCount += 1; cursor = haystack.indexOf(needle, cursor + needle.length); }
    const start = Math.max(0, index - 100); const end = Math.min(item.extractedText.length, index + term.length + 120);
    results.push({ id: item.id, displayName: item.displayName, type: item.type, matchCount, snippet: `${start ? '…' : ''}${item.extractedText.slice(start, end).replace(/\s+/g, ' ')}${end < item.extractedText.length ? '…' : ''}` });
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }
  return { query: term, results, capped: results.length >= MAX_SEARCH_RESULTS };
}
function documentPreview(id, query, occurrence = 0) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That document record is invalid.', 'INVALID_DOCUMENT');
  if (!Number.isInteger(occurrence) || occurrence < 0 || occurrence > 99) throw safeError('That preview position is invalid.', 'INVALID_PREVIEW_POSITION');
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_SEARCH_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(query)) throw safeError('Enter a plain-text search term up to 200 characters long.', 'INVALID_SEARCH_QUERY');
  const item = readStoredDocuments().find((entry) => entry?.id === id && entry.status === 'imported' && typeof entry.extractedText === 'string');
  if (!item) throw safeError('That imported document is no longer available in Zen.', 'DOCUMENT_NOT_FOUND');
  const needle = query.trim().toLocaleLowerCase(); const haystack = item.extractedText.toLocaleLowerCase();
  let index = haystack.indexOf(needle); let count = 0;
  while (index >= 0 && count < occurrence) { index = haystack.indexOf(needle, index + needle.length); count += 1; }
  if (index < 0) throw safeError('That search match is no longer available.', 'MATCH_NOT_FOUND');
  const start = Math.max(0, index - Math.floor((MAX_PREVIEW_LENGTH - needle.length) / 2));
  const end = Math.min(item.extractedText.length, start + MAX_PREVIEW_LENGTH);
  return { id: item.id, displayName: item.displayName, type: item.type, occurrence, text: `${start ? '…' : ''}${item.extractedText.slice(start, end)}${end < item.extractedText.length ? '…' : ''}` };
}
function validateDocumentQuestion(question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 4000 || /[\u0000-\u001f\u007f]/.test(question)) {
    throw safeError('Enter a plain-text question up to 4,000 characters long.', 'INVALID_DOCUMENT_QUESTION');
  }
  return question.trim();
}
function excerptForMatch(text, needle, limit) {
  const index = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) return null;
  const excerptLength = Math.min(limit, text.length);
  const start = Math.max(0, Math.min(index - Math.floor((excerptLength - needle.length) / 2), text.length - excerptLength));
  const end = start + excerptLength;
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
function prepareDocumentQuestion(query, question) {
  const search = searchDocuments(query);
  const validatedQuestion = validateDocumentQuestion(question);
  if (!search.results.length) throw safeError('No imported documents match that search. Nothing was sent to the local model.', 'NO_DOCUMENT_MATCH');
  const records = readStoredDocuments();
  const excerpts = [];
  let characterCount = 0;
  for (const result of search.results) {
    if (excerpts.length >= MAX_QA_DOCUMENTS || characterCount >= MAX_QA_CONTEXT_LENGTH) break;
    const item = records.find((entry) => entry?.id === result.id && entry.status === 'imported' && typeof entry.extractedText === 'string');
    if (!item) continue;
    const remaining = MAX_QA_CONTEXT_LENGTH - characterCount;
    const excerpt = excerptForMatch(item.extractedText, search.query, remaining);
    if (!excerpt) continue;
    excerpts.push({ id: item.id, displayName: item.displayName, text: excerpt, contentHash: item.contentHash });
    characterCount += excerpt.length;
  }
  if (!excerpts.length) throw safeError('No imported documents are still available for that question.', 'NO_DOCUMENT_MATCH');
  return { query: search.query, question: validatedQuestion, excerpts, characterCount, truncated: search.results.length > excerpts.length || characterCount >= MAX_QA_CONTEXT_LENGTH };
}
function verifyDocumentQuestion(context) {
  if (!context || !Array.isArray(context.excerpts) || !context.excerpts.length || context.excerpts.length > MAX_QA_DOCUMENTS) throw safeError('This document question is invalid.', 'INVALID_DOCUMENT_QUESTION');
  const records = readStoredDocuments();
  let characterCount = 0;
  for (const excerpt of context.excerpts) {
    const item = records.find((entry) => entry?.id === excerpt.id && entry.status === 'imported' && typeof entry.extractedText === 'string');
    if (!item || item.contentHash !== excerpt.contentHash) throw safeError('A document was removed or changed before confirmation. Nothing was sent to the local model.', 'DOCUMENT_CONTEXT_CHANGED');
    characterCount += excerpt.text.length;
  }
  if (characterCount !== context.characterCount || characterCount > MAX_QA_CONTEXT_LENGTH) throw safeError('The document context exceeds Zen’s safety limit.', 'DOCUMENT_CONTEXT_LIMIT');
  return context;
}
function removeDocument(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That document record is invalid.', 'INVALID_DOCUMENT');
  const documents = readStoredDocuments();
  const item = documents.find((entry) => entry.id === id);
  if (!item) throw safeError('That document is not stored in Zen.', 'DOCUMENT_NOT_FOUND');
  writeStoredDocuments(documents.filter((entry) => entry.id !== id));
  return { id: item.id, displayName: item.displayName };
}
module.exports = { configureDocuments, previewDocuments, importDocuments, listDocuments, searchDocuments, documentPreview, prepareDocumentQuestion, verifyDocumentQuestion, removeDocument };
