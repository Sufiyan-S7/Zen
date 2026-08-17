const { exportApprovedApps, restoreApprovedApps } = require('./computer-control');
const { exportCommands, restoreCommands } = require('./custom-commands');
const { exportWorkflows, restoreWorkflows } = require('./workflows');
const { exportDocuments, restoreDocuments } = require('./documents');
const { exportRoutines, restoreRoutines } = require('./routines');

const FORMAT_VERSION = 1;
// Generous sanity ceiling per localStorage-derived section -- not a real limit on normal use,
// just a guard against a corrupt/malicious multi-hundred-MB payload reaching JSON.stringify.
const MAX_LOCAL_SECTION_BYTES = 50 * 1024 * 1024;

function safeError(message, code) { const error = new Error(message); error.code = code; return error; }

function validateLocalSection(value, name) {
  if (value === undefined || value === null) return null;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (serialized.length > MAX_LOCAL_SECTION_BYTES) throw safeError(`${name} is too large to back up.`, 'BACKUP_SECTION_TOO_LARGE');
  return value;
}

// Combines the renderer's four localStorage sections (already-parsed values sent over the
// preload bridge -- the main process cannot read localStorage itself) with a fresh read of the
// four main-process-owned stores. This only assembles the in-memory envelope; nothing is
// written to disk here. The caller (main.js) decides where, or whether, it goes.
function buildEnvelope(localData) {
  const data = localData && typeof localData === 'object' ? localData : {};
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      conversations: validateLocalSection(data.conversations, 'Conversations') ?? [],
      settings: validateLocalSection(data.settings, 'Settings') ?? {},
      activityLog: validateLocalSection(data.activityLog, 'Activity log') ?? [],
      memories: validateLocalSection(data.memories, 'Memory') ?? [],
      approvedApps: exportApprovedApps(),
      customCommands: exportCommands(),
      workflows: exportWorkflows(),
      documents: exportDocuments(),
      routines: exportRoutines()
    }
  };
}

// Real counts pulled directly from the envelope -- used both for the export confirmation
// (counts of what's about to be written) and the restore confirmation (counts found in the
// chosen file, not the current state), matching the Day 26 design's requirement that neither
// confirmation ever shows a generic "your data" message.
function summarizeEnvelope(envelope) {
  const data = envelope?.data || {};
  return {
    conversations: Array.isArray(data.conversations) ? data.conversations.length : 0,
    memories: Array.isArray(data.memories) ? data.memories.length : 0,
    approvedApps: Array.isArray(data.approvedApps) ? data.approvedApps.length : 0,
    customCommands: Array.isArray(data.customCommands) ? data.customCommands.length : 0,
    workflows: Array.isArray(data.workflows) ? data.workflows.length : 0,
    documents: Array.isArray(data.documents) ? data.documents.length : 0,
    routines: Array.isArray(data.routines) ? data.routines.length : 0,
    activityLogEntries: Array.isArray(data.activityLog) ? data.activityLog.length : 0,
    hasSettings: !!(data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length)
  };
}

// A malformed file, a missing data section, or a formatVersion this build doesn't recognize
// fails closed here, before anything is ever applied to a real store -- current local data is
// never partially overwritten by a bad read.
function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') throw safeError('That file is not a valid Zen backup.', 'BACKUP_INVALID');
  if (envelope.formatVersion !== FORMAT_VERSION) throw safeError('That backup was made by an incompatible version of Zen.', 'BACKUP_UNSUPPORTED_VERSION');
  if (!envelope.data || typeof envelope.data !== 'object') throw safeError('That backup file is missing its data section.', 'BACKUP_INVALID');
  return envelope;
}

// Restore replaces, it does not merge (Day 26 decision). Every main-process-owned category is
// re-validated through its own store's normal creation/approval path -- never trusted as
// pre-approved just because it came from a file. Order matters: approved apps first (custom
// commands can reference them), then custom commands (workflows can reference them), then
// workflows, then documents (independent of the others). The four localStorage sections are
// handed back unchanged for the renderer to apply, since the main process cannot write
// localStorage itself.
function applyEnvelope(envelope) {
  const validated = validateEnvelope(envelope);
  const data = validated.data;
  const approvedApps = restoreApprovedApps(data.approvedApps);
  const customCommands = restoreCommands(data.customCommands);
  const workflows = restoreWorkflows(data.workflows);
  const documents = restoreDocuments(data.documents);
  const routines = restoreRoutines(data.routines);
  return {
    approvedApps,
    customCommands,
    workflows,
    documents,
    routines,
    localData: {
      conversations: Array.isArray(data.conversations) ? data.conversations : [],
      settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
      activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
      memories: Array.isArray(data.memories) ? data.memories : []
    }
  };
}

module.exports = { FORMAT_VERSION, buildEnvelope, summarizeEnvelope, validateEnvelope, applyEnvelope };
