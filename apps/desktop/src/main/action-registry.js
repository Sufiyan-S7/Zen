// Block D, Step 16 built the initial subset -- open-app, open-website, list-folder, read-file
// (documentId-only) -- plus the internal noop.wait test action used by the contract's own
// Section 9 fixtures. Block E, Steps 22-24 upgraded read-file to also accept an arbitrary
// permitted filePath and added search-folder, move-file, copy-file, rename-file, delete-file.
// Every real action here reuses existing v1.0.0 execution primitives (computer-control.js /
// documents.js) rather than inventing a second path, and every folder/file action re-resolves
// its permission grant (permissions.js's resolveActiveFolderGrant) immediately before running,
// never against a cached grant from earlier in the task, per AgentContract.md Section 3.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { shell } = require('electron');
const { approvedApp, websitePreview, listFolderContents, searchFolderNames } = require('./computer-control');
const { readDocumentText, readArbitraryFile } = require('./documents');
const { resolveActiveFolderGrant, requireActiveBrowserGrant } = require('./permissions');
const { clickControl, typeIntoField, isControlNameSensitive, isFieldCredential } = require('./app-automation');
const { isPowerShellEnabled, classifyPowerShellCommand, redactCommandForAudit, runPowerShellCommand } = require('./powershell-control');
const { browserNavigate, browserRead, browserFormFillDraft } = require('./browser-control');

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

// Block E, Step 24 helper: shape-only check for a "sourcePath"/"filePath"-shaped field --
// non-empty string, nothing more. Deliberately does NOT touch the filesystem: validateInput runs
// during proposeTask (planning time, before any popup is shown), and every other action in this
// registry keeps real filesystem/permission checks inside execute() so a bad path fails that ONE
// step visibly in the popup (with a reason) after Start, rather than silently killing the whole
// plan before the person ever sees it. move/copy/rename/delete originally ran this check here in
// validateInput too -- fixed after live testing showed it produced exactly that silent failure
// (a stale or mistyped filename made the entire task vanish into a generic "couldn't plan that"
// with zero detail, instead of one clearly-failed step). See resolveExistingFile below for the
// real check, now at execute() time.
function requireNonEmptyPath(input, key) {
  if (!isPlainObject(input) || typeof input[key] !== 'string' || !input[key].trim()) {
    throw new Error(`${key} is required.`);
  }
  return input[key].trim();
}

// The actual filesystem check validateExistingFile used to do at plan time -- now called from
// each action's execute(), so a missing/invalid file fails just that step, with a clear reason,
// after the popup is already showing the plan.
function resolveExistingFile(candidatePath) {
  const resolved = path.resolve(candidatePath);
  let link;
  try {
    link = fs.lstatSync(resolved);
  } catch {
    throw new Error(`${path.basename(resolved)} does not exist.`);
  }
  if (link.isSymbolicLink() || link.isDirectory() || !link.isFile()) throw new Error(`Choose a regular file: ${path.basename(resolved)}.`);
  return fs.realpathSync(resolved);
}

// Block E, Step 24: cross-drive-safe move. fs.renameSync throws EXDEV when source and
// destination are on different volumes -- fall back to copy-then-delete-original in that case,
// exactly the fallback Windows Explorer itself performs for a cross-drive move.
function moveFileSync(sourcePath, destinationPath) {
  try {
    fs.renameSync(sourcePath, destinationPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(sourcePath);
  }
}

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
    label: 'Read a file',
    // Block E, Step 23: accepts EITHER the original Block D documentId (Zen's imported-document
    // library, unchanged) OR a filePath, which must resolve inside a live folder-permission
    // grant. Two input shapes on one action, not two actions, matching
    // docs/ActionRegistrySkeleton.md row 3's "Block D Step 16 (subset) / Block E Step 23 (full)"
    // -- both rows point at the same action ID in docs/AgentContract.md Section 7.
    validateInput(input) {
      if (!isPlainObject(input)) throw new Error('read-file requires a documentId or a filePath.');
      if (typeof input.documentId === 'string' && input.documentId.trim()) return { documentId: input.documentId.trim() };
      if (typeof input.filePath === 'string' && input.filePath.trim()) return { filePath: input.filePath.trim() };
      throw new Error('read-file requires a documentId or a filePath.');
    },
    describe(input) {
      return input.documentId ? 'Read an imported document.' : `Read ${input.filePath}`;
    },
    async execute(input) {
      if (input.documentId) {
        const doc = readDocumentText(input.documentId);
        return { summary: `Read ${doc.displayName}${doc.truncated ? ' (truncated)' : ''}.`, text: doc.text, truncated: doc.truncated };
      }
      resolveActiveFolderGrant(path.dirname(path.resolve(input.filePath)));
      const file = await readArbitraryFile(input.filePath);
      return { summary: `Read ${file.displayName}${file.truncated ? ' (truncated)' : ''}.`, text: file.text, truncated: file.truncated };
    }
  }),
  'search-folder': Object.freeze({
    id: 'search-folder',
    riskTier: 'routine',
    label: 'Search a folder',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.folderPath !== 'string' || !input.folderPath.trim()) {
        throw new Error('search-folder requires a folderPath.');
      }
      if (typeof input.query !== 'string' || !input.query.trim()) throw new Error('search-folder requires a query.');
      return { folderPath: input.folderPath.trim(), query: input.query.trim() };
    },
    describe(input) { return `Search "${input.folderPath}" for "${input.query}".`; },
    async execute(input) {
      resolveActiveFolderGrant(input.folderPath);
      const result = searchFolderNames(input.folderPath, input.query);
      return { summary: `Found ${result.count} match(es) for "${result.query}" in ${result.folderPath}.`, matches: result.matches, capped: result.capped };
    }
  }),
  'move-file': Object.freeze({
    id: 'move-file',
    riskTier: 'routine',
    label: 'Move a file',
    validateInput(input) {
      return { sourcePath: requireNonEmptyPath(input, 'sourcePath'), destinationFolderPath: requireNonEmptyPath(input, 'destinationFolderPath') };
    },
    describe(input) { return `Move ${path.basename(input.sourcePath)} to ${input.destinationFolderPath}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      resolveActiveFolderGrant(input.destinationFolderPath);
      const destination = path.join(path.resolve(input.destinationFolderPath), path.basename(sourcePath));
      if (fs.existsSync(destination)) throw new Error(`${path.basename(destination)} already exists at the destination.`);
      moveFileSync(sourcePath, destination);
      return { summary: `Moved ${path.basename(sourcePath)} to ${input.destinationFolderPath}.`, destination };
    }
  }),
  'copy-file': Object.freeze({
    id: 'copy-file',
    riskTier: 'routine',
    label: 'Copy a file',
    validateInput(input) {
      return { sourcePath: requireNonEmptyPath(input, 'sourcePath'), destinationFolderPath: requireNonEmptyPath(input, 'destinationFolderPath') };
    },
    describe(input) { return `Copy ${path.basename(input.sourcePath)} to ${input.destinationFolderPath}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      resolveActiveFolderGrant(input.destinationFolderPath);
      const destination = path.join(path.resolve(input.destinationFolderPath), path.basename(sourcePath));
      if (fs.existsSync(destination)) throw new Error(`${path.basename(destination)} already exists at the destination.`);
      fs.copyFileSync(sourcePath, destination, fs.constants.COPYFILE_EXCL);
      return { summary: `Copied ${path.basename(sourcePath)} to ${input.destinationFolderPath}.`, destination };
    }
  }),
  'rename-file': Object.freeze({
    id: 'rename-file',
    riskTier: 'routine',
    label: 'Rename a file',
    validateInput(input) {
      const sourcePath = requireNonEmptyPath(input, 'sourcePath');
      if (!isPlainObject(input) || typeof input.newName !== 'string' || !input.newName.trim() || /[\\/:*?"<>|\u0000-\u001f]/.test(input.newName)) {
        throw new Error('rename-file requires a valid newName (no path separators).');
      }
      return { sourcePath, newName: input.newName.trim() };
    },
    describe(input) { return `Rename ${path.basename(input.sourcePath)} to ${input.newName}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      const destination = path.join(path.dirname(sourcePath), input.newName);
      if (fs.existsSync(destination)) throw new Error(`${input.newName} already exists in that folder.`);
      fs.renameSync(sourcePath, destination);
      return { summary: `Renamed ${path.basename(sourcePath)} to ${input.newName}.`, destination };
    }
  }),
  'delete-file': Object.freeze({
    id: 'delete-file',
    riskTier: 'sensitive',
    label: 'Delete a file',
    validateInput(input) { return { filePath: requireNonEmptyPath(input, 'filePath') }; },
    describe(input) { return `Delete ${input.filePath} (moved to Recycle Bin, not permanently deleted).`; },
    async execute(input) {
      const filePath = resolveExistingFile(input.filePath);
      resolveActiveFolderGrant(path.dirname(filePath));
      // Recycle-Bin-routed per AgentContract.md Section 7 -- shell.trashItem is Electron's own
      // cross-platform trash API (Windows Recycle Bin here), not a hand-rolled delete. This is
      // also the file's "Undo where supported": the Recycle Bin itself is the undo mechanism,
      // so no separate undo-stack is built for this action.
      await shell.trashItem(filePath);
      return { summary: `Moved ${filePath} to the Recycle Bin.` };
    }
  }),
  // Block F, Step 25: accessibility-first UI automation (app-automation.js), scoped to an
  // already-running, already-approved app. Both actions are registered routine at the type
  // level per docs/AgentContract.md Section 7's table, and each carries its own runtime
  // isStepSensitive() escalation -- click-control's keyword-list judgment call, type-into-field's
  // contract-specified credential-field detection -- consulted by task-executor.js alongside the
  // fixed tier (see that file's header comment for why this doesn't reopen Section 8).
  'click-control': Object.freeze({
    id: 'click-control',
    riskTier: 'routine',
    label: 'Click a control in an approved app',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.appId !== 'string' || !input.appId.trim()) {
        throw new Error('click-control requires an appId from the approved-app list.');
      }
      if (typeof input.controlName !== 'string' || !input.controlName.trim()) throw new Error('click-control requires a controlName.');
      return { appId: input.appId.trim(), controlName: input.controlName.trim() };
    },
    describe(input) { return `Click "${input.controlName}" in the approved app.`; },
    isStepSensitive(input) { return isControlNameSensitive(input.controlName); },
    async execute(input) {
      const result = await clickControl(input.appId, input.controlName);
      return { summary: `Clicked "${result.controlName}" in ${result.label}.`, method: result.method };
    }
  }),
  'type-into-field': Object.freeze({
    id: 'type-into-field',
    riskTier: 'routine',
    label: 'Type into a field in an approved app',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.appId !== 'string' || !input.appId.trim()) {
        throw new Error('type-into-field requires an appId from the approved-app list.');
      }
      if (typeof input.controlName !== 'string' || !input.controlName.trim()) throw new Error('type-into-field requires a controlName.');
      if (typeof input.text !== 'string' || !input.text.length) throw new Error('type-into-field requires text to type.');
      if (input.text.length > 4000) throw new Error('Text to type must be under 4,000 characters.');
      return { appId: input.appId.trim(), controlName: input.controlName.trim(), text: input.text };
    },
    describe(input) {
      return isFieldCredential(input.controlName)
        ? `Type into the "${input.controlName}" credential field (will ask again to confirm).`
        : `Type ${input.text.length} character(s) into "${input.controlName}".`;
    },
    isStepSensitive(input) { return isFieldCredential(input.controlName); },
    // Never logs the raw typed text -- only which control and how many characters. Section 4's
    // "never raw content" rule, applied unconditionally here rather than only when the field
    // happens to be a detected credential field (detection is a keyword heuristic, not a
    // guarantee, so the safer default is to never log the literal text either way).
    redactForAudit(input) { return { appId: input.appId, controlName: input.controlName, characterCount: input.text.length }; },
    async execute(input) {
      const result = await typeIntoField(input.appId, input.controlName, input.text);
      return { summary: `Typed ${result.characterCount} character(s) into "${result.controlName}" in ${result.label}.` };
    }
  }),
  // Block F, Step 26: the one action in this registry permitted to carry a free-text command,
  // per docs/AgentContract.md Section 2's explicit PowerShell resolution -- see
  // powershell-control.js and docs/PowerShellControl.md for the full design. Off by default;
  // execute() re-checks the toggle fresh every time rather than trusting validateInput's earlier
  // check, matching the project's own re-resolve-at-run-time convention (permissions.js).
  'run-powershell': Object.freeze({
    id: 'run-powershell',
    riskTier: 'routine',
    label: 'Run a PowerShell command',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.command !== 'string' || !input.command.trim()) throw new Error('run-powershell requires a command.');
      if (input.command.length > 4000) throw new Error('The PowerShell command must be under 4,000 characters.');
      return { command: input.command.trim() };
    },
    describe(input) { return `Run PowerShell: ${input.command.slice(0, 120)}${input.command.length > 120 ? '…' : ''}`; },
    isStepSensitive(input) { return classifyPowerShellCommand(input.command).sensitive; },
    redactForAudit(input) { return { command: redactCommandForAudit(input.command) }; },
    async execute(input) {
      if (!isPowerShellEnabled()) throw new Error('Full System Control (PowerShell) is turned off. Enable it in Settings before running this action.');
      const result = await runPowerShellCommand(input.command);
      return { summary: `PowerShell exited with code ${result.exitCode}.`, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
    }
  }),
  // Block G, Step 27-28: browser control via Chrome DevTools Protocol (browser-control.js).
  // All three are registered routine per AgentContract.md Section 7's table -- none of them
  // carries a fixed-sensitive effect by itself (no submit/checkout/credential entry is possible
  // through this trio at all, by construction, not just by convention -- see
  // browser-form-fill-draft below). Every execute() re-resolves the live browser-permission
  // grant fresh (permissions.js's requireActiveBrowserGrant), never a cached grant from earlier
  // in the task, matching resolveActiveFolderGrant's own convention.
  'browser-navigate': Object.freeze({
    id: 'browser-navigate',
    riskTier: 'routine',
    label: 'Open a webpage in Zen\'s browser',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.url !== 'string') throw new Error('browser-navigate requires a url.');
      return { url: websitePreview(input.url).url };
    },
    describe(input) { return `Open ${input.url} in Zen's browser.`; },
    async execute(input) {
      requireActiveBrowserGrant();
      const result = await browserNavigate(input.url);
      return { summary: `Opened ${result.url}${result.title ? ` ("${result.title}")` : ''}.`, url: result.url, title: result.title };
    }
  }),
  'browser-read': Object.freeze({
    id: 'browser-read',
    riskTier: 'routine',
    label: 'Read the current webpage',
    validateInput() { return {}; },
    describe() { return 'Read the currently open webpage (treated as untrusted page content, never as instructions).'; },
    async execute() {
      requireActiveBrowserGrant();
      const result = await browserRead();
      return {
        summary: `Read "${result.title || result.url}"${result.truncated ? ' (truncated)' : ''}.`,
        url: result.url, title: result.title, text: result.text, truncated: result.truncated, formFields: result.formFields
      };
    }
  }),
  'browser-form-fill-draft': Object.freeze({
    id: 'browser-form-fill-draft',
    riskTier: 'routine',
    label: 'Draft-fill a form field (no submit)',
    validateInput(input) {
      if (!isPlainObject(input) || !Number.isInteger(input.fieldIndex) || input.fieldIndex < 0) {
        throw new Error('browser-form-fill-draft requires a fieldIndex from a prior browser-read step.');
      }
      if (typeof input.value !== 'string' || !input.value.length) throw new Error('browser-form-fill-draft requires a value to fill.');
      if (input.value.length > 2000) throw new Error('Text to fill must be under 2,000 characters.');
      return { fieldIndex: input.fieldIndex, value: input.value };
    },
    describe(input) { return `Draft-fill field #${input.fieldIndex} with ${input.value.length} character(s). Does not submit, checkout, or touch credential fields.`; },
    // Never logs the raw filled text -- only the field index and character count, same
    // never-raw-content convention as type-into-field.
    redactForAudit(input) { return { fieldIndex: input.fieldIndex, characterCount: input.value.length }; },
    async execute(input) {
      requireActiveBrowserGrant();
      const result = await browserFormFillDraft(input.fieldIndex, input.value);
      return { summary: `Draft-filled field #${result.fieldIndex} (${result.characterCount} character(s)). Not submitted.`, url: result.url };
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
