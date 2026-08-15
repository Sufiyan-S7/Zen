// Block D, Step 21: append-only local audit log for task execution, per
// docs/AgentContract.md Section 4 (record shape) and Section 6 (30-day rolling retention).
// A record is never rewritten after the fact -- appendAuditRecord only appends; pruneAuditLog
// is the only function that rewrites the file, and it only removes expired records, never
// existing content past the cutoff.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let auditLogPath = '';

function configureAuditLog(userDataPath) {
  auditLogPath = path.join(userDataPath, 'task-audit.log');
}

function readAuditRecords() {
  if (!auditLogPath || !fs.existsSync(auditLogPath)) return [];
  return fs.readFileSync(auditLogPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function writeAuditRecords(records) {
  const tempPath = `${auditLogPath}.${process.pid}.tmp`;
  const body = records.map((record) => JSON.stringify(record)).join('\n');
  fs.writeFileSync(tempPath, records.length ? `${body}\n` : '', 'utf8');
  fs.renameSync(tempPath, auditLogPath);
}

// riskTier/outcome/target/confirmationId/errorSummary follow docs/AgentContract.md Section 4
// exactly. target must already be redacted by the caller (task-executor.js) -- this module does
// not know which fields of an action's input are sensitive.
function appendAuditRecord(record) {
  if (!auditLogPath) throw new Error("Zen has not prepared its local audit log yet.");
  const full = {
    id: `audit_${crypto.randomUUID()}`,
    taskId: record.taskId,
    stepIndex: record.stepIndex,
    action: record.action,
    riskTier: record.riskTier,
    target: record.target,
    confirmationId: record.confirmationId ?? null,
    outcome: record.outcome,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    errorSummary: record.errorSummary ?? null
  };
  fs.appendFileSync(auditLogPath, `${JSON.stringify(full)}\n`, 'utf8');
  return full;
}

function pruneAuditLog(now = Date.now()) {
  const records = readAuditRecords();
  const kept = records.filter((record) => {
    const endedAt = Date.parse(record.endedAt || record.startedAt || '');
    return !Number.isFinite(endedAt) || (now - endedAt) <= RETENTION_MS;
  });
  if (kept.length !== records.length) writeAuditRecords(kept);
  return { total: records.length, kept: kept.length, pruned: records.length - kept.length };
}

function listAuditRecords() {
  return readAuditRecords();
}

module.exports = { configureAuditLog, appendAuditRecord, pruneAuditLog, listAuditRecords };
