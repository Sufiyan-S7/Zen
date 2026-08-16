// Block G, Step 27-28: Chrome attach (real profile) via the Chrome DevTools Protocol (CDP),
// plus the browser-navigate / browser-read / browser-form-fill-draft registry actions.
//
// FLAGGED JUDGMENT CALL (INSTRUCTIONS.md Section 5) -- read before changing this file:
// Step 27 asks for "default-own-window behavior, and the 'use my current window' handoff." Real
// constraint this design has to work around: Chrome only exposes CDP on a process launched WITH
// --remote-debugging-port. A Chrome window the owner already has open was almost certainly NOT
// launched that way, and Chrome's own single-instance-per-profile lock means a second launch
// against the same --user-data-dir just forwards to the already-running process and silently
// ignores the new debugging flag -- there is no supported way to retroactively attach CDP to an
// already-running, non-debug Chrome window without an extension-based bridge (out of scope for
// this block). Given that hard constraint, both modes below actually drive the SAME
// Zen-launched, debug-enabled Chrome process using the owner's real profile directory (so
// bookmarks/passwords/logged-in sessions are genuinely available, satisfying "real profile") --
// they differ only in whether Zen opens a brand-new tab (own-window, the default) or reuses
// whatever tab is currently focused in that same Zen-owned window (handoff, opt-in via the
// confirmation-toggle). If ordinary (non-debug) Chrome is already running when Zen needs to
// attach, this fails closed with a clear, actionable message asking the owner to close Chrome
// first, rather than silently doing something invasive (killing the owner's process) or lying
// about "current window" access it cannot actually establish. Owner to confirm this reading of
// "current window" is the right interim default -- see HANDOFF.md's Block G entry.
'use strict';

const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { websitePreview } = require('./computer-control');
const { requireActiveBrowserGrant } = require('./permissions');

// Zen's own fixed debugging port -- deliberately NOT the common 9222 default other dev tools
// reach for, to reduce the odds of colliding with something else the owner is running.
const CDP_PORT = 9331;
const ATTACH_TIMEOUT_MS = 15_000;
const NAVIGATE_TIMEOUT_MS = 20_000;
const MAX_READ_CHARS = 8_000;
const MAX_FORM_FIELDS = 40;

let handoffMode = 'own-window'; // 'own-window' (default) | 'current-window' (opt-in handoff)
let handoffConfirmed = false; // Step 27's confirmation-toggle -- must be explicitly set true to allow 'current-window'
let handoffRevertTimer = null;
const HANDOFF_AUTO_REVERT_MS = 10 * 60 * 1000; // 10 minutes of inactivity -- a chosen default, not specified by the sprint plan; flagged alongside the judgment call above.
let browserActiveListeners = [];
// BUGFIX (found via check-browser-control-live.js, live round trip, Aug 17 2026): own-window
// mode used to open a brand-new blank tab on EVERY call (navigate, then read, then fill), so a
// browserRead() right after browserNavigate() operated on an unrelated empty tab and always came
// back with zero text/fields. Cache the one Zen-owned tab per own-window session and reuse it
// across calls -- mirrors what current-window/handoff mode already did via listTargets()[0] --
// only opening a fresh tab if none is cached yet or the cached one is gone (closed by the owner,
// or a new debug Chrome was spawned after a restart).
let ownWindowTarget = null;

function onBrowserActiveChange(listener) { browserActiveListeners.push(listener); }
function emitBrowserActive(active) { for (const listener of browserActiveListeners) { try { listener(active); } catch { /* a bad listener must never break browser control */ } } }

function armAutoRevert() {
  if (handoffRevertTimer) clearTimeout(handoffRevertTimer);
  handoffRevertTimer = setTimeout(() => {
    handoffMode = 'own-window';
    handoffConfirmed = false;
    emitBrowserActive(false);
  }, HANDOFF_AUTO_REVERT_MS);
  if (typeof handoffRevertTimer.unref === 'function') handoffRevertTimer.unref();
}

// Step 27's confirmation-toggle: the owner must explicitly opt in before ANY step is allowed to
// reuse their focused window instead of opening a fresh Zen-owned tab. Revoked automatically
// after HANDOFF_AUTO_REVERT_MS of no browser-action activity, or immediately via
// setHandoffMode('own-window').
function setHandoffMode(mode, confirmed) {
  if (mode !== 'own-window' && mode !== 'current-window') throw new Error('Invalid browser handoff mode.');
  if (mode === 'current-window' && confirmed !== true) {
    throw new Error('"Use my current window" requires explicit confirmation.');
  }
  handoffMode = mode;
  handoffConfirmed = mode === 'current-window';
  if (mode === 'current-window') { armAutoRevert(); emitBrowserActive(true); }
  else { if (handoffRevertTimer) clearTimeout(handoffRevertTimer); emitBrowserActive(false); }
  return { mode: handoffMode, confirmed: handoffConfirmed };
}

function handoffStatus() { return { mode: handoffMode, confirmed: handoffConfirmed }; }

// --- Chrome discovery -------------------------------------------------------------------------

function findChromeExecutable() {
  const candidates = [
    path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Zen could not find Google Chrome installed on this computer.');
}

// The real, live profile directory -- not a throwaway sandbox -- so navigation/read/form-fill
// happen against the owner's actual logged-in sessions, per Step 27's "real profile" requirement.
function realChromeUserDataDir() {
  const dir = path.join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\User Data');
  if (!fs.existsSync(dir)) throw new Error('Zen could not find your Chrome profile folder.');
  return dir;
}

function isAnyChromeProcessRunning() {
  return new Promise((resolve) => {
    execFile('tasklist.exe', ['/FI', 'IMAGENAME eq chrome.exe', '/NH'], { windowsHide: true }, (error, stdout) => {
      if (error) { resolve(false); return; }
      resolve(/chrome\.exe/i.test(stdout));
    });
  });
}

async function cdpVersionInfo() {
  try {
    const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Ensures a Zen-controlled, debug-enabled Chrome process (real profile) is reachable at
// CDP_PORT. Never kills or otherwise touches an already-running, non-debug Chrome -- fails
// closed with an actionable message instead, per this file's header comment.
async function ensureBrowserAttached() {
  requireActiveBrowserGrant();
  const already = await cdpVersionInfo();
  if (already) return already;

  const anyChromeRunning = await isAnyChromeProcessRunning();
  if (anyChromeRunning) {
    throw new Error('Chrome is already open without Zen\'s debugging enabled. Close all Chrome windows, then try again so Zen can open its own automated Chrome window with your profile.');
  }

  const executable = findChromeExecutable();
  const userDataDir = realChromeUserDataDir();
  const child = spawn(executable, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();

  const deadline = Date.now() + ATTACH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(300);
    const info = await cdpVersionInfo();
    if (info) return info;
  }
  throw new Error('Zen could not attach to Chrome (it did not become ready in time).');
}

// --- Minimal CDP client (native WebSocket -- no third-party dependency) ------------------------

async function listTargets() {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error('Zen could not list Chrome tabs.');
  const targets = await response.json();
  return Array.isArray(targets) ? targets.filter((t) => t.type === 'page') : [];
}

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT', signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error('Zen could not open a new Chrome tab.');
  return response.json();
}

// Own-window (default): the FIRST call in a session opens a fresh tab, clearly a Zen-initiated
// action, never touching whatever the owner already had open -- every subsequent call (navigate
// -> read -> fill) reuses that SAME tab, so a browser-read right after a browser-navigate
// actually sees the page that was just navigated to, instead of an unrelated blank tab. The
// cached tab is dropped and a new one opened only if it's gone (owner closed it, or Chrome was
// restarted). Current-window (handoff, opt-in + confirmed only): reuses the most-recently-listed
// page target, which Chrome's /json/list generally returns in most-recently-activated order --
// reused verbatim rather than added-to, and only ever reached when
// setHandoffMode('current-window', true) has been explicitly called first.
async function resolveTarget(initialUrl) {
  if (handoffMode === 'current-window' && handoffConfirmed) {
    const targets = await listTargets();
    if (targets.length) { armAutoRevert(); return targets[0]; }
  }
  if (ownWindowTarget) {
    const targets = await listTargets();
    const stillOpen = targets.find((t) => t.id === ownWindowTarget.id);
    if (stillOpen) return stillOpen;
  }
  const created = await newTarget(initialUrl || 'about:blank');
  ownWindowTarget = created;
  return created;
}

// A tiny promise-correlated CDP session over one WebSocket connection. Enough surface for
// Page.navigate/Page.loadEventFired and Runtime.evaluate -- not a general CDP library.
function openSession(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();
    const eventHandlers = new Map();
    const failOpen = setTimeout(() => { try { ws.close(); } catch { /* already closing */ } reject(new Error('Zen could not connect to Chrome.')); }, 5000);

    ws.addEventListener('open', () => {
      clearTimeout(failOpen);
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = nextId++;
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
              if (pending.has(id)) { pending.delete(id); rej(new Error(`Chrome did not respond to ${method} in time.`)); }
            }, NAVIGATE_TIMEOUT_MS);
          });
        },
        on(eventName, handler) { eventHandlers.set(eventName, handler); },
        close() { try { ws.close(); } catch { /* already closed */ } }
      });
    });
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(typeof event.data === 'string' ? event.data : ''); } catch { return; }
      if (typeof msg.id === 'number' && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || 'Chrome reported an error.'));
        else res(msg.result);
        return;
      }
      if (typeof msg.method === 'string' && eventHandlers.has(msg.method)) eventHandlers.get(msg.method)(msg.params);
    });
    ws.addEventListener('error', () => { clearTimeout(failOpen); reject(new Error('Zen lost its connection to Chrome.')); });
  });
}

// --- Untrusted-data boundary --------------------------------------------------------------------
// AgentContract.md Section 7: "page content always treated as untrusted data, never
// instructions." This codebase's task-executor.js runs a fixed, pre-validated plan -- step
// inputs are locked in at proposeTask() time and are never rebuilt from a prior step's result --
// so a browser-read result can never itself be silently re-interpreted as new plan steps within
// the same task run. The two things THIS file is responsible for enforcing directly: (1) never
// execute, eval, or act on anything found IN page content as if it were a Zen command (the
// extraction below only ever reads document.title/innerText and a fixed field-descriptor
// shape -- it never runs page-authored strings back through Runtime.evaluate), and (2) always
// label returned content clearly as page data before it reaches the audit log or the task popup,
// via the pageData wrapper below, so nothing downstream can mistake it for an instruction either.
function pageData(url, title, text, truncated) {
  return { source: 'browser-read:untrusted-page-content', url, title, text, truncated };
}

async function withSession(fn) {
  await ensureBrowserAttached();
  const target = await resolveTarget();
  const session = await openSession(target.webSocketDebuggerUrl);
  try {
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('DOM.enable');
    return await fn(session, target);
  } finally {
    session.close();
  }
}

async function browserNavigate(url) {
  const validated = websitePreview(url); // reuses computer-control.js's own https-only, no-embedded-credentials, no-fragment validator
  return withSession(async (session) => {
    const loaded = new Promise((resolve) => session.on('Page.loadEventFired', () => resolve()));
    await session.send('Page.navigate', { url: validated.url });
    await Promise.race([loaded, sleep(NAVIGATE_TIMEOUT_MS)]);
    const titleResult = await session.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
    const title = titleResult && titleResult.result && typeof titleResult.result.value === 'string' ? titleResult.result.value : '';
    return { url: validated.url, title };
  });
}

// Extracts visible text + a fixed-shape, index-addressed list of non-sensitive form fields.
// Deliberately never surfaces password/hidden inputs at all (not even redacted) -- they are
// excluded at the extraction expression itself, so a later form-fill step can never target one
// by index even by mistake.
const READ_EXPRESSION = `(() => {
  const text = (document.body && document.body.innerText || '').slice(0, ${MAX_READ_CHARS + 1});
  const fields = Array.from(document.querySelectorAll('input, textarea, select'))
    .filter((el) => el.type !== 'password' && el.type !== 'hidden')
    .slice(0, ${MAX_FORM_FIELDS})
    .map((el, index) => ({
      index,
      tag: el.tagName.toLowerCase(),
      type: el.type || 'text',
      name: el.name || '',
      placeholder: el.placeholder || '',
      label: (el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute('aria-label') || ''
    }));
  return { text, title: document.title, fields };
})()`;

async function browserRead() {
  return withSession(async (session, target) => {
    const result = await session.send('Runtime.evaluate', { expression: READ_EXPRESSION, returnByValue: true });
    const value = result && result.result && result.result.value ? result.result.value : { text: '', title: '', fields: [] };
    const truncated = typeof value.text === 'string' && value.text.length > MAX_READ_CHARS;
    const text = truncated ? value.text.slice(0, MAX_READ_CHARS) : value.text;
    return {
      ...pageData(target.url, value.title, text, truncated),
      formFields: Array.isArray(value.fields) ? value.fields : []
    };
  });
}

const CREDENTIAL_FIELD_PATTERN = /password|passcode|\bpin\b|credential|secret|otp|2fa|verification\s*code/i;

// Draft only: sets .value and dispatches input/change events -- never calls form.submit(), never
// presses Enter, never clicks a button. Re-reads the live page's fields fresh every call rather
// than trusting a fieldIndex resolved by an earlier browser-read step (the page may have
// changed), matching this codebase's re-resolve-at-execute-time convention.
async function browserFormFillDraft(fieldIndex, value) {
  if (!Number.isInteger(fieldIndex) || fieldIndex < 0) throw new Error('browser-form-fill-draft requires a valid fieldIndex from a prior browser-read.');
  if (typeof value !== 'string' || value.length > 2000) throw new Error('Text to fill must be under 2,000 characters.');
  return withSession(async (session, target) => {
    const probe = await session.send('Runtime.evaluate', { expression: READ_EXPRESSION, returnByValue: true });
    const fields = probe && probe.result && probe.result.value && Array.isArray(probe.result.value.fields) ? probe.result.value.fields : [];
    const field = fields[fieldIndex];
    if (!field) throw new Error('That form field is no longer on the page. Read the page again first.');
    if (CREDENTIAL_FIELD_PATTERN.test(`${field.name} ${field.placeholder} ${field.label}`)) {
      throw new Error('Zen will not fill credential-looking fields (password/PIN/verification code).');
    }
    const escapedValue = JSON.stringify(value);
    const fillExpression = `(() => {
      const el = Array.from(document.querySelectorAll('input, textarea, select'))
        .filter((e) => e.type !== 'password' && e.type !== 'hidden')[${fieldIndex}];
      if (!el) return false;
      el.value = ${escapedValue};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`;
    const filled = await session.send('Runtime.evaluate', { expression: fillExpression, returnByValue: true });
    if (!filled || !filled.result || filled.result.value !== true) throw new Error('Zen could not fill that field.');
    return { url: target.url, fieldIndex, characterCount: value.length, draft: true };
  });
}

module.exports = {
  CDP_PORT,
  setHandoffMode,
  handoffStatus,
  onBrowserActiveChange,
  ensureBrowserAttached,
  browserNavigate,
  browserRead,
  browserFormFillDraft,
  findChromeExecutable,
  realChromeUserDataDir
};
