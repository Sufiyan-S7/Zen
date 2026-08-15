// Block D, Step 16: the initial subset of docs/AgentContract.md Section 7's action registry --
// open-app, open-website, list-folder, read-file -- plus the internal noop.wait test action
// used by the contract's own Section 9 fixtures. Every real action here reuses existing v1.0.0
// execution primitives (computer-control.js / documents.js) rather than inventing a second path.
//
// read-file (this Block D subset) is scoped to Zen's existing imported-document library
// (documents.js) rather than an arbitrary file path, because the persistent folder/app
// permission grant described in AgentContract.md Section 3 does not exist yet -- that lands in
// Block E Step 22, and the full recursive-search read-file (arbitrary path inside a permitted
// folder) is Block E Step 23 per docs/ActionRegistrySkeleton.md row 3. This is a deliberate
// interim scope, not a shortcut on the contract -- flagged per INSTRUCTIONS.md Section 5.
const { spawn } = require('node:child_process');
const { shell } = require('electron');
const { approvedApp, websitePreview, listFolderContents } = require('./computer-control');
const { readDocumentText } = require('./documents');

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

const ACTIONS = Object.freeze({
  'noop.wait': Object.freeze({
    id: 'noop.wait',
    riskTier: 'routine',
    label: 'Wait (internal test action)',
    validateInput(input) {
      if (!isPlainObject(input) || !Number.isInteger(input.seconds) || input.seconds < 0 || input.seconds > 30) {
        throw new Error('noop.wait requires an integer "seconds" between 0 and 30.');
      }
      return { seconds: input.seconds };
    },
    async execute(input) {
      await new Promise((resolve) => setTimeout(resolve, input.seconds * 1000));
      return { summary: `Waited ${input.seconds}s.` };
    }
  }),
  'open-app': Object.freeze({
    id: 'open-app',
    riskTier: 'routine',
    label: 'Open an approved app',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.appId !== 'string' || !input.appId.trim()) {
        throw new Error('open-app requires an appId from the approved-app list.');
      }
      return { appId: input.appId.trim() };
    },
    async execute(input) {
      const entry = approvedApp(input.appId);
      const child = spawn(entry.executable, entry.arguments || [], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { summary: `Opened ${entry.label}.` };
    }
  }),
  'open-website': Object.freeze({
    id: 'open-website',
    riskTier: 'routine',
    label: 'Open a website',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.url !== 'string') throw new Error('open-website requires a url.');
      return { url: websitePreview(input.url).url };
    },
    async execute(input) {
      await shell.openExternal(input.url);
      return { summary: `Opened ${input.url}.` };
    }
  }),
  'list-folder': Object.freeze({
    id: 'list-folder',
    riskTier: 'routine',
    label: 'List a folder',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.folderPath !== 'string' || !input.folderPath.trim()) {
        throw new Error('list-folder requires a folderPath.');
      }
      return { folderPath: input.folderPath.trim() };
    },
    async execute(input) {
      const result = listFolderContents(input.folderPath);
      return { summary: `Listed ${result.count} item(s) in ${result.folderPath}.`, items: result.items, capped: result.capped };
    }
  }),
  'read-file': Object.freeze({
    id: 'read-file',
    riskTier: 'routine',
    label: 'Read an imported document',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.documentId !== 'string' || !input.documentId.trim()) {
        throw new Error("read-file requires a documentId from Zen's imported-document list.");
      }
      return { documentId: input.documentId.trim() };
    },
    async execute(input) {
      const doc = readDocumentText(input.documentId);
      return { summary: `Read ${doc.displayName}${doc.truncated ? ' (truncated)' : ''}.`, text: doc.text, truncated: doc.truncated };
    }
  })
});

function getAction(actionId) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, actionId) ? ACTIONS[actionId] : null;
}

// Excludes noop.wait -- that action exists only for AgentContract.md Section 9's own fixtures,
// never something the planner should place into a real plan.
function listActionsForPlanner() {
  return Object.values(ACTIONS).filter((action) => action.id !== 'noop.wait').map(({ id, label }) => ({ id, label }));
}

module.exports = { ACTIONS, getAction, listActionsForPlanner };
