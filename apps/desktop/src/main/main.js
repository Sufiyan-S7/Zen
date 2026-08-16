const { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, nativeImage, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const { configureApprovedApps, toolRegistryStatus, websitePreview, previewApp, previewBrowserWebApp, listApprovedApps, approveApp, approveBrowserWebApp, removeApprovedApp, approvedApp, validateBrowserWebAppLabel, validateSearchQuery, validateFolderPath, searchFolderNames } = require('./computer-control');
const { configureDocuments, previewDocuments, importDocuments, listDocuments, searchDocuments, documentPreview, prepareDocumentQuestion, verifyDocumentQuestion, removeDocument } = require('./documents');
const { configureCustomCommands, previewCommand, createCommand, listCommands, prepareCommandRun, removeCommand } = require('./custom-commands');
const { configureWorkflows, previewWorkflow, createWorkflow, listWorkflows, prepareWorkflowRun, removeWorkflow, resolveRoute } = require('./workflows');
const { buildEnvelope, summarizeEnvelope, validateEnvelope, applyEnvelope } = require('./backup');
const { proposeTask, listActiveTasks, approveTask, requestPause, requestResume, requestCancel, getTask } = require('./task-executor');
const { planTask } = require('./task-planner');
const { configureAuditLog, appendAuditRecord, pruneAuditLog } = require('./audit-log');
const {
  configurePermissions, grantFolderPermission, revokeFolderPermission, listPermissions,
  grantBrowserPermission, revokeBrowserPermission, listBrowserPermissions
} = require('./permissions');
const { configurePowerShellControl, powerShellToggleStatus, enablePowerShell, disablePowerShell } = require('./powershell-control');
const { setHandoffMode, handoffStatus, onBrowserActiveChange } = require('./browser-control');

let mainWindow = null;
let overlayWindow = null;
let taskPopupWindow = null;
let tray = null;
let isQuitting = false;

// Block B, Step 8: single-instance lock. A second launch (e.g. the desktop shortcut clicked
// again while Zen is already running in the tray) hands off to the running instance instead of
// opening a duplicate app.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  // app.quit() only requests an async shutdown -- 'ready' can still fire before it completes,
  // which would let this second process register the tray/hotkey/IPC handlers anyway. Exiting
  // the process immediately is the reliable way to guarantee it never does.
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

const TRAY_ICON_PATH = path.resolve(__dirname, '../../../../assets/zen-icon.ico');
const OVERLAY_HOTKEY = 'Ctrl+Alt+Space';
// Block D, Step 20: global emergency-stop shortcut, distinct from the invocation hotkey above.
// Not specified by the sprint plan's prose -- flagged per INSTRUCTIONS.md Section 5 as a chosen
// default (Ctrl+Alt+Esc mirrors the reach-for-it-in-a-hurry familiarity of Ctrl+Alt+Del).
const EMERGENCY_STOP_HOTKEY = 'Ctrl+Alt+Escape';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const DEFAULT_MODEL = 'llama3.2:3b';
const VOICE_POLICY = {
  processing: 'local-only',
  listening: 'push-to-talk',
  microphone: 'requested-on-record',
  retainAudio: false,
  cloudFallback: false
};
const VOICE_RUNTIME = path.resolve(__dirname, '../../../../vendor/whisper-runtime');
const WHISPER_CLI = path.join(VOICE_RUNTIME, 'bin', 'Release', 'whisper-cli.exe');
const WHISPER_MODEL = path.join(VOICE_RUNTIME, 'models', 'ggml-base.en.bin');
const PIPER_RUNTIME = path.resolve(__dirname, '../../../../vendor/piper-runtime');
const PIPER_CLI = path.join(PIPER_RUNTIME, 'venv', 'Scripts', 'piper.exe');
const PIPER_VOICES = {
  'en_US-lessac-medium': { label: 'Lessac', model: path.join(PIPER_RUNTIME, 'voices', 'en_US-lessac-medium.onnx') },
  'en_US-amy-medium': { label: 'Amy', model: path.join(PIPER_RUNTIME, 'voices', 'en_US-amy-medium.onnx') },
  'en_US-ryan-medium': { label: 'Ryan', model: path.join(PIPER_RUNTIME, 'voices', 'en_US-ryan-medium.onnx') },
  'en_US-bryce-medium': { label: 'Bryce', model: path.join(PIPER_RUNTIME, 'voices', 'en_US-bryce-medium.onnx') }
};
const SYSTEM_PROMPT = [
  'You are Zen, a private local desktop assistant.',
  'Be concise, practical, and honest about what you can do.',
  'You are only ever generating a reply, not executing anything -- if a request to open an approved app or an HTTPS website was going to be acted on, that happens in a separate step before your reply generation, with its own confirmation dialog, and you would not be generating a conversational reply about it at all. So never say or imply, in your own generated text, that you opened, launched, navigated to, or completed any computer action, are about to, or are asking permission to -- you cannot do any of that yourself, and doing so would be fabricating an outcome that did not happen.',
  'If asked to open an app that is not yet approved, tell the user to approve it first in Activity → Choose what Zen may open. If asked to list or find files or folders, that is also detected and handled outside your reply generation the same way, with its own folder picker and confirmation -- never claim to have already listed or searched files yourself in your own generated text, for the same reason as above.',
  'Do not claim to control files or the browser beyond user-approved apps, user-approved websites, and user-confirmed Activity actions.',
  'You have not been given the contents of any imported document in this reply -- if this conversation does not already show document excerpts above, do not guess, answer from general knowledge, or imply you checked the document. Instead say you don\'t have that document\'s content in this reply and suggest asking again using an exact word or phrase from the document, or using Documents → Ask.',
  'Never request or reveal sensitive personal information unless the user explicitly needs it.'
].join(' ');
const DOCUMENT_QA_SYSTEM_PROMPT = 'You are Zen, answering a question from user-approved local document excerpts. Answer only from the provided excerpts. If the excerpts do not contain the answer, say plainly that the answer is not contained in the excerpts. Do not infer unstated document content.';
const activeRequests = new Map();
const activeSpeech = new Map();
const pendingAppSelections = new Map();
const pendingBrowserWebAppSelections = new Map();
const pendingFolderSelections = new Map();
const pendingDocumentSelections = new Map();
// Block E, Step 24: taskId -> the confirmSensitiveStep Promise's resolve function, while a task
// is "blocked" awaiting fresh confirmation on a sensitive step (currently only delete-file).
const pendingSensitiveConfirmations = new Map();
const pendingDocumentQuestions = new Map();
const pendingBackupRestores = new Map();

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
    throw new Error('Please send a short conversation with up to 30 messages.');
  }

  return messages.map((message) => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      throw new Error('The chat message format is invalid.');
    }
    const content = message.content.trim();
    if (!content || content.length > 4_000) throw new Error('Each message must be between 1 and 4,000 characters.');
    return { role: message.role, content };
  });
}

function validateModel(model) {
  if (model === undefined) return DEFAULT_MODEL;
  if (typeof model !== 'string' || !/^[a-zA-Z0-9._:-]{1,120}$/.test(model)) {
    throw new Error('The selected model is invalid.');
  }
  return model;
}

function requestKey(webContents, requestId) {
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(requestId)) {
    throw new Error('The chat request is invalid.');
  }
  return `${webContents.id}:${requestId}`;
}

function sendStreamEvent(webContents, channel, payload) {
  if (!webContents.isDestroyed()) webContents.send(channel, payload);
}

function localModelError(error) {
  if (error.name === 'AbortError') return null;
  if (error instanceof TypeError) return 'Ollama is not running. Start the Ollama app, then try again.';
  return error.message || 'The local model could not complete that response.';
}

function voiceInputReady() { return fs.existsSync(WHISPER_CLI) && fs.existsSync(WHISPER_MODEL); }

function voiceStatus() {
  const inputAvailable = voiceInputReady();
  const voices = Object.entries(PIPER_VOICES).filter(([, voice]) => fs.existsSync(voice.model)).map(([id, voice]) => ({ id, label: voice.label }));
  const outputAvailable = fs.existsSync(PIPER_CLI) && voices.length > 0;
  return {
    available: inputAvailable || outputAvailable,
    input: {
      available: inputAvailable,
      engine: 'whisper.cpp',
      reason: inputAvailable ? '' : 'Local speech-to-text is not installed yet.'
    },
    output: { available: outputAvailable, engine: 'Piper', voices, reason: outputAvailable ? '' : 'Local text-to-speech is not installed yet.' },
    policy: VOICE_POLICY
  };
}

function runWhisper(inputPath, outputBase) {
  return new Promise((resolve, reject) => {
    const process = spawn(WHISPER_CLI, ['-m', WHISPER_MODEL, '-f', inputPath, '-nt', '-otxt', '-of', outputBase], { windowsHide: true });
    let stderr = '';
    process.stderr.on('data', (chunk) => { stderr += chunk; });
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Local transcription stopped (${code}).`)));
  });
}

function validateSpeechSpeed(speed) {
  const parsed = Number(speed);
  if (![0.8, 1, 1.2, 1.4].includes(parsed)) throw new Error('The selected speech speed is invalid.');
  return parsed;
}

function runPiper(webContents, model, text, outputPath, speed) {
  return new Promise((resolve, reject) => {
    const lengthScale = (1 / speed).toFixed(3);
    const process = spawn(PIPER_CLI, ['-m', model, '-f', outputPath, '--length-scale', lengthScale, '--', text], { windowsHide: true });
    activeSpeech.set(webContents.id, process);
    let stderr = '';
    process.stderr.on('data', (chunk) => { stderr += chunk; });
    process.on('error', reject);
    process.on('close', (code) => {
      if (activeSpeech.get(webContents.id) === process) activeSpeech.delete(webContents.id);
      code === 0 ? resolve() : reject(new Error(stderr.trim() || 'Local read aloud was stopped.'));
    });
  });
}

function validateSpeechText(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 4_000) throw new Error('The text for read aloud is invalid.');
  return text.trim();
}

function selectPiperVoice(voiceId) {
  const voice = PIPER_VOICES[voiceId];
  if (!voice || !fs.existsSync(voice.model)) throw new Error('The selected local voice is unavailable.');
  return voice;
}

// Memory text only ever reaches Ollama through this one path (regular chat), same rule Day 10's
// design doc set for the future recall feature: capped well below the per-message limit, and
// never trusted as pre-sanitized just because it came from local storage.
function validateMemoryContext(memoryContext) {
  if (memoryContext === undefined || memoryContext === null || memoryContext === '') return '';
  if (typeof memoryContext !== 'string') throw new Error('Memory context is invalid.');
  return memoryContext.slice(0, 4_000);
}

async function startChatRequest(event, { requestId, messages, model, systemPrompt = SYSTEM_PROMPT, memoryContext } = {}) {
  let key;
  let controller;
  try {
    key = requestKey(event.sender, requestId);
    if (activeRequests.has(key)) throw new Error('This chat request is already running.');
    const selectedModel = validateModel(model);
    const safeMemoryContext = validateMemoryContext(memoryContext);
    const finalSystemPrompt = safeMemoryContext
      ? `${systemPrompt}\n\nThe user has saved these facts about themselves in Zen's local Memory page. Use them naturally when relevant (for example, if asked their name), but don't recite the raw list unless asked to:\n${safeMemoryContext}`
      : systemPrompt;
    controller = new AbortController();
    activeRequests.set(key, controller);
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: selectedModel,
        stream: true,
        messages: [{ role: 'system', content: finalSystemPrompt }, ...validateMessages(messages)]
      })
    });
    if (!response.ok) throw new Error(`Ollama could not respond (${response.status}). Check that ${selectedModel} is installed.`);
    if (!response.body) throw new Error('Ollama did not provide a response stream.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedContent = false;
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (typeof chunk?.message?.content === 'string' && chunk.message.content) {
          receivedContent = true;
          sendStreamEvent(event.sender, 'zen:chat:delta', { requestId, content: chunk.message.content });
        }
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const chunk = JSON.parse(buffer);
      if (typeof chunk?.message?.content === 'string' && chunk.message.content) {
        receivedContent = true;
        sendStreamEvent(event.sender, 'zen:chat:delta', { requestId, content: chunk.message.content });
      }
    }
    if (!receivedContent) throw new Error('Ollama returned an empty response.');
    sendStreamEvent(event.sender, 'zen:chat:complete', { requestId });
  } catch (error) {
    const message = localModelError(error);
    sendStreamEvent(event.sender, message ? 'zen:chat:error' : 'zen:chat:cancelled', { requestId, message });
  } finally {
    if (key && activeRequests.get(key) === controller) activeRequests.delete(key);
  }
}

ipcMain.on('zen:chat:start', (event, request) => startChatRequest(event, request));

ipcMain.on('zen:chat:stop', (event, requestId) => {
  try {
    activeRequests.get(requestKey(event.sender, requestId))?.abort();
  } catch { }
});

// Runs one already-resolved step. Shared by custom-command execution and workflow
// execution, so a "run custom command" workflow step takes the exact same code path as
// running that command directly from the Custom commands card -- no second execution
// primitive is introduced for workflows.
async function executeStep(step) {
  if (step.type === 'open-approved-app') {
    const entry = approvedApp(step.appId);
    const child = spawn(entry.executable, entry.arguments || [], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return;
  }
  if (step.type === 'open-website') {
    await shell.openExternal(step.url);
    return;
  }
  if (step.type === 'run-custom-command') {
    const prepared = prepareCommandRun(step.commandId);
    const outcome = await runCommandSteps(prepared);
    if (!outcome.completed) throw new Error('The referenced custom command did not complete.');
    return;
  }
  throw new Error("Zen does not recognize this step's action type.");
}

// Executes a prepared custom command's steps in order, stopping immediately on the first
// failure (Day 19 behavior, unchanged). Shared by the zen:commands:run handler and by any
// workflow step that runs a saved custom command.
async function runCommandSteps(prepared) {
  const results = [];
  for (const step of prepared.steps) {
    try {
      await executeStep(step);
      results.push({ type: step.type, label: step.label, destination: step.destination, status: 'completed' });
    } catch {
      results.push({ type: step.type, label: step.label, destination: step.destination, status: 'failed', errorCode: 'STEP_EXECUTION_FAILED' });
      break;
    }
  }
  return { id: prepared.id, name: prepared.name, results, completed: results.length === prepared.steps.length && results.every((result) => result.status === 'completed') };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#07130f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow = window;
  window.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Block B, Step 7: hide-on-close. The X button keeps Zen running in the tray; only the tray's
  // "Quit Zen" item (or an OS-level quit) sets isQuitting and lets the window actually close.
  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  let holdShortcutActive = false;
  window.webContents.on('before-input-event', (event, input) => {
    const key = typeof input.key === 'string' ? input.key.toLowerCase() : '';
    if (input.type === 'keyDown' && key === 'f8' && !input.isAutoRepeat) {
      event.preventDefault();
      holdShortcutActive = true;
      sendStreamEvent(window.webContents, 'zen:voice-shortcut', { action: 'hold', type: 'down' });
      return;
    }
    if (holdShortcutActive && input.type === 'keyUp' && key === 'f8') {
      event.preventDefault();
      holdShortcutActive = false;
      sendStreamEvent(window.webContents, 'zen:voice-shortcut', { action: 'hold', type: 'up' });
      return;
    }
    if (input.type === 'keyDown' && key === 'f9' && !input.isAutoRepeat) {
      event.preventDefault();
      sendStreamEvent(window.webContents, 'zen:voice-shortcut', { action: 'locked', type: 'down' });
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
}

// Block B, Step 7: system tray. Left-click / "Open Zen" shows-or-creates the main window;
// "Quit Zen" is the one path that actually exits (sets isQuitting so the hide-on-close handler
// above lets the window close for real).
function createTray() {
  const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Zen');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Zen', click: () => { if (!mainWindow) createWindow(); else { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit Zen', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', () => {
    if (!mainWindow) createWindow();
    else if (mainWindow.isVisible()) mainWindow.focus();
    else mainWindow.show();
  });
}

// Block B, Step 10: compact command overlay, sized like a capture bar rather than the full app
// window. Created once and reused (show/hide) so repeated hotkey presses are instant.
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 640,
    height: 76,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#07130f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'overlay-preload.js')
    }
  });
  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  // Clicking away closes the overlay, same as Escape -- it is a transient capture bar, not a
  // window the owner is expected to alt-tab back to.
  overlayWindow.on('blur', () => hideOverlay());
  overlayWindow.on('closed', () => { overlayWindow = null; });
}

// Block G, Step 27: the required visible "Zen is active" indicator while the owner has opted
// into "use my current window" handoff. A small, click-through, always-on-top badge -- never
// interactive itself (no preload, no IPC surface) since its only job is passive visibility, not
// control. Shown/hidden by browser-control.js's onBrowserActiveChange callback, registered once
// at startup below.
let browserIndicatorWindow = null;

function createBrowserIndicatorWindow() {
  browserIndicatorWindow = new BrowserWindow({
    width: 220,
    height: 40,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    backgroundColor: '#3a1f00',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  browserIndicatorWindow.setIgnoreMouseEvents(true);
  browserIndicatorWindow.loadFile(path.join(__dirname, '../renderer/browser-indicator.html'));
  browserIndicatorWindow.on('closed', () => { browserIndicatorWindow = null; });
}

function positionBrowserIndicator() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  browserIndicatorWindow.setPosition(Math.round(x + width - 220 - 16), Math.round(y + 16));
}

function showBrowserIndicator() {
  if (!browserIndicatorWindow) createBrowserIndicatorWindow();
  positionBrowserIndicator();
  browserIndicatorWindow.show();
}

function hideBrowserIndicator() {
  if (browserIndicatorWindow) browserIndicatorWindow.hide();
}

function positionOverlay() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width } = display.workArea;
  const winWidth = 640;
  overlayWindow.setPosition(
    Math.round(x + (width - winWidth) / 2),
    Math.round(y + display.workArea.height * 0.22)
  );
}

function showOverlay() {
  if (!overlayWindow) createOverlayWindow();
  positionOverlay();
  overlayWindow.show();
  overlayWindow.focus();
  overlayWindow.webContents.send('zen:overlay:shown');
}

function hideOverlay() {
  if (overlayWindow && overlayWindow.isVisible()) overlayWindow.hide();
}

function toggleOverlay() {
  if (overlayWindow && overlayWindow.isVisible()) hideOverlay();
  else showOverlay();
}

// Block D, Step 19: small, fixed-position popup for plan review + approve/pause/cancel --
// distinct from the overlay (Block B/C, capture bar, top-center, closes on blur). This one
// stays up through a running task even if focus moves elsewhere, so it does not hide on blur.
// Placed top-right of the nearest display, matching the Windows-toast-notification corner --
// not specified by the sprint plan beyond "a specific place on screen"; flagged per
// INSTRUCTIONS.md Section 5 as a chosen default.
const TASK_POPUP_WIDTH = 340;
const TASK_POPUP_HEIGHT = 320;

function createTaskPopupWindow() {
  taskPopupWindow = new BrowserWindow({
    width: TASK_POPUP_WIDTH,
    height: TASK_POPUP_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#07130f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'task-popup-preload.js')
    }
  });
  taskPopupWindow.loadFile(path.join(__dirname, '../renderer/task-popup.html'));
  taskPopupWindow.on('closed', () => { taskPopupWindow = null; });
}

function positionTaskPopup() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width } = display.workArea;
  const margin = 16;
  taskPopupWindow.setPosition(Math.round(x + width - TASK_POPUP_WIDTH - margin), Math.round(y + margin));
}

function showTaskPopup(task) {
  if (!taskPopupWindow) createTaskPopupWindow();
  positionTaskPopup();
  taskPopupWindow.show();
  taskPopupWindow.webContents.once('did-finish-load', () => taskPopupWindow.webContents.send('zen:task:update', task));
  if (!taskPopupWindow.webContents.isLoadingMainFrame()) taskPopupWindow.webContents.send('zen:task:update', task);
}

function hideTaskPopup() {
  if (taskPopupWindow && taskPopupWindow.isVisible()) taskPopupWindow.hide();
}

function pushTaskUpdate(task) {
  if (taskPopupWindow && !taskPopupWindow.isDestroyed()) taskPopupWindow.webContents.send('zen:task:update', task);
}

// Block B, Step 9: global hotkey with conflict detection. register() returns false rather than
// throwing when another application already owns the accelerator, so a failed registration is
// surfaced (tray tooltip + log) instead of silently doing nothing when the owner later presses
// Ctrl+Alt+Space and nothing happens.
function registerHotkey() {
  const ok = globalShortcut.register(OVERLAY_HOTKEY, toggleOverlay);
  if (!ok) {
    console.error(`Zen could not register the ${OVERLAY_HOTKEY} global hotkey -- another application may already be using it.`);
    if (tray) tray.setToolTip('Zen (hotkey unavailable: Ctrl+Alt+Space already in use)');
  }
  return ok;
}

// Block D, Step 20: global emergency-stop shortcut. Cancels whichever task is currently
// running/paused/blocked (Section 5's guarantees are enforced by task-executor.js itself --
// this handler only signals the request). If no task is active, it is a harmless no-op.
function registerEmergencyStopHotkey() {
  const ok = globalShortcut.register(EMERGENCY_STOP_HOTKEY, () => {
    for (const task of listActiveTasks()) requestCancel(task.id);
  });
  if (!ok) console.error(`Zen could not register the ${EMERGENCY_STOP_HOTKEY} emergency-stop hotkey -- another application may already be using it.`);
  return ok;
}

app.whenReady().then(() => {
  configureApprovedApps(app.getPath('userData'));
  configureDocuments(app.getPath('userData'));
  configureCustomCommands(app.getPath('userData'));
  configureWorkflows(app.getPath('userData'));
  configureAuditLog(app.getPath('userData'));
  configurePermissions(app.getPath('userData'));
  configurePowerShellControl(app.getPath('userData'));
  // Block G, Step 27: the "Zen is active" indicator's show/hide is driven entirely by
  // browser-control.js's own handoff state (set/cleared/auto-reverted there) -- main.js only
  // reacts to the callback, it never toggles the indicator directly.
  onBrowserActiveChange((active) => { if (active) showBrowserIndicator(); else hideBrowserIndicator(); });
  pruneAuditLog();
  ipcMain.handle('zen:status', () => ({ model: DEFAULT_MODEL }));
  ipcMain.handle('zen:tools:status', () => toolRegistryStatus());
  ipcMain.handle('zen:tools:preview-website', (_event, url) => websitePreview(url));
  ipcMain.handle('zen:tools:open-website', async (_event, url) => {
    const preview = websitePreview(url);
    await shell.openExternal(preview.url);
    return preview;
  });
  ipcMain.handle('zen:tools:list-approved-apps', () => listApprovedApps());
  ipcMain.handle('zen:tools:choose-app', async (event) => {
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose an app to approve in Zen', properties: ['openFile'], filters: [{ name: 'Windows applications', extensions: ['exe'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const preview = previewApp(result.filePaths[0]);
    const token = crypto.randomUUID();
    pendingAppSelections.set(token, { webContentsId: event.sender.id, executable: preview.executable, expiresAt: Date.now() + 5 * 60_000 });
    return { token, ...preview };
  });
  ipcMain.handle('zen:tools:approve-app', (event, token) => {
    const selection = pendingAppSelections.get(token);
    pendingAppSelections.delete(token);
    if (!selection || selection.webContentsId !== event.sender.id || selection.expiresAt < Date.now()) throw new Error('Choose the app again before approving it.');
    return approveApp(selection.executable);
  });
  ipcMain.handle('zen:tools:choose-browser-web-app', async (event, label, url) => {
    validateBrowserWebAppLabel(label);
    websitePreview(url);
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose Chrome, Edge, or a browser web-app launcher', properties: ['openFile'], filters: [{ name: 'Windows applications', extensions: ['exe'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const preview = previewBrowserWebApp(result.filePaths[0], label, url);
    const token = crypto.randomUUID();
    pendingBrowserWebAppSelections.set(token, { webContentsId: event.sender.id, executable: preview.executable, label: preview.label, url: preview.url, expiresAt: Date.now() + 5 * 60_000 });
    return { token, ...preview };
  });
  ipcMain.handle('zen:tools:approve-browser-web-app', (event, token) => {
    const selection = pendingBrowserWebAppSelections.get(token);
    pendingBrowserWebAppSelections.delete(token);
    if (!selection || selection.webContentsId !== event.sender.id || selection.expiresAt < Date.now()) throw new Error('Choose the browser launcher again before approving it.');
    return approveBrowserWebApp(selection.executable, selection.label, selection.url);
  });
  ipcMain.handle('zen:tools:remove-approved-app', (_event, appId) => removeApprovedApp(appId));
  ipcMain.handle('zen:tools:open-approved-app', (_event, appId) => {
    const appEntry = approvedApp(appId);
    const process = spawn(appEntry.executable, appEntry.arguments || [], { detached: true, stdio: 'ignore', windowsHide: true });
    process.unref();
    return { id: appEntry.id, label: appEntry.label, destination: appEntry.url || appEntry.executable, kind: appEntry.kind || 'app' };
  });
  ipcMain.handle('zen:tools:preview-search-query', (_event, query) => ({ query: validateSearchQuery(query) }));
  ipcMain.handle('zen:tools:choose-folder', async (event) => {
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose a folder for Zen to search', properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const folderPath = validateFolderPath(result.filePaths[0]);
    const token = crypto.randomUUID();
    pendingFolderSelections.set(token, { webContentsId: event.sender.id, folderPath, expiresAt: Date.now() + 5 * 60_000 });
    return { token, folderPath };
  });
  ipcMain.handle('zen:tools:search-folder', (event, token, query) => {
    const selection = pendingFolderSelections.get(token);
    pendingFolderSelections.delete(token);
    if (!selection || selection.webContentsId !== event.sender.id || selection.expiresAt < Date.now()) {
      throw new Error('Choose the folder again before searching.');
    }
    return searchFolderNames(selection.folderPath, query);
  });
  ipcMain.handle('zen:documents:list', () => listDocuments());
  ipcMain.handle('zen:documents:search', (_event, query) => searchDocuments(query));
  ipcMain.handle('zen:documents:preview', (_event, id, query, occurrence) => documentPreview(id, query, occurrence));
  ipcMain.handle('zen:documents:prepare-question', (event, query, question) => {
    const context = prepareDocumentQuestion(query, question);
    const token = crypto.randomUUID();
    pendingDocumentQuestions.set(token, { webContentsId: event.sender.id, context, expiresAt: Date.now() + 5 * 60_000 });
    return { token, question: context.question, excerpts: context.excerpts.map(({ id, displayName, text }) => ({ id, displayName, text })), characterCount: context.characterCount, truncated: context.truncated };
  });
  ipcMain.on('zen:documents:start-question', (event, { token, requestId, messages, model } = {}) => {
    const pending = pendingDocumentQuestions.get(token);
    pendingDocumentQuestions.delete(token);
    try {
      if (!pending || pending.webContentsId !== event.sender.id || pending.expiresAt < Date.now()) throw new Error('Review the document excerpts again before asking Zen.');
      const validatedMessages = validateMessages(messages);
      if (validatedMessages.at(-1)?.role !== 'user' || validatedMessages.at(-1).content !== pending.context.question) throw new Error('The document question changed. Review the excerpts again before asking Zen.');
      const context = verifyDocumentQuestion(pending.context);
      const sourceText = context.excerpts.map((excerpt) => `Document: ${excerpt.displayName}\nExcerpt:\n${excerpt.text}`).join('\n\n---\n\n');
      startChatRequest(event, { requestId, messages: validatedMessages, model, systemPrompt: `${DOCUMENT_QA_SYSTEM_PROMPT}\n\nApproved excerpts:\n${sourceText}` });
    } catch (error) {
      sendStreamEvent(event.sender, 'zen:chat:error', { requestId, message: error.message || 'Zen could not start that document question.' });
    }
  });
  ipcMain.handle('zen:documents:choose', async (event) => {
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), { title: 'Choose documents to import into Zen', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Supported documents', extensions: ['txt', 'md', 'csv', 'json', 'pdf'] }] });
    if (result.canceled || !result.filePaths.length) return null;
    const preview = previewDocuments(result.filePaths);
    const token = crypto.randomUUID();
    pendingDocumentSelections.set(token, { webContentsId: event.sender.id, filePaths: result.filePaths, expiresAt: Date.now() + 5 * 60_000 });
    return { token, documents: preview };
  });
  ipcMain.handle('zen:documents:import', (event, token) => {
    const selection = pendingDocumentSelections.get(token);
    pendingDocumentSelections.delete(token);
    if (!selection || selection.webContentsId !== event.sender.id || selection.expiresAt < Date.now()) throw new Error('Choose the documents again before importing.');
    return importDocuments(selection.filePaths);
  });
  ipcMain.handle('zen:documents:remove', (_event, id) => removeDocument(id));
  ipcMain.handle('zen:commands:list', () => listCommands());
  ipcMain.handle('zen:commands:preview', (_event, name, steps) => previewCommand(name, steps));
  ipcMain.handle('zen:commands:create', (_event, name, steps) => createCommand(name, steps));
  ipcMain.handle('zen:commands:remove', (_event, id) => removeCommand(id));
  ipcMain.handle('zen:commands:prepare-run', (_event, id) => prepareCommandRun(id));
  ipcMain.handle('zen:commands:run', async (_event, id) => {
    // Re-validate fresh right before executing rather than trusting an earlier prepare-run
    // call; a step could have been invalidated in between (e.g. approval removed).
    const prepared = prepareCommandRun(id);
    return runCommandSteps(prepared);
  });
  ipcMain.handle('zen:workflows:list', () => listWorkflows());
  ipcMain.handle('zen:workflows:preview', (_event, name, steps) => previewWorkflow(name, steps));
  ipcMain.handle('zen:workflows:create', (_event, name, steps) => createWorkflow(name, steps));
  ipcMain.handle('zen:workflows:remove', (_event, id) => removeWorkflow(id));
  ipcMain.handle('zen:workflows:prepare-run', (_event, id) => prepareWorkflowRun(id));
  ipcMain.handle('zen:workflows:run', async (_event, id) => {
    // Re-validate fresh right before executing, exactly like custom commands above -- a step
    // (an app approval, a website, or a referenced custom command) could have been
    // invalidated since the workflow was last previewed.
    const prepared = prepareWorkflowRun(id);
    const visitedPath = [];
    let cursor = 0;
    while (cursor !== 'stop') {
      if (cursor >= prepared.steps.length) break; // running off the end behaves identically to "stop"
      const step = prepared.steps[cursor];
      const currentIndex = cursor;
      let outcome;
      let target;
      try {
        await executeStep(step);
        outcome = 'completed';
        target = resolveRoute(step.onSuccess, currentIndex, prepared.steps.length);
      } catch {
        outcome = 'failed';
        target = resolveRoute(step.onFailure, currentIndex, prepared.steps.length);
      }
      visitedPath.push({
        index: currentIndex,
        type: step.type,
        label: step.label,
        destination: step.destination,
        outcome,
        note: outcome === 'completed'
          ? (target === 'stop' ? `Step ${currentIndex + 1} completed. Workflow stopped.` : `Step ${currentIndex + 1} completed. Continuing to step ${target + 1}.`)
          : (target === 'stop' ? `Step ${currentIndex + 1} failed. onFailure stopped the workflow.` : `Step ${currentIndex + 1} failed. onFailure routed to step ${target + 1}.`)
      });
      cursor = target;
    }
    return {
      id: prepared.id,
      name: prepared.name,
      path: visitedPath,
      completed: visitedPath.length > 0 && visitedPath.every((entry) => entry.outcome === 'completed')
    };
  });
  // Day 26/27 backup & export. Real counts are pulled live in every case -- never a generic
  // "your data" message -- and restore always shows counts found *in the chosen file*, never
  // the current in-app state, so the confirmation reflects what will actually happen.
  ipcMain.handle('zen:backup:store-counts', () => summarizeEnvelope(buildEnvelope({})));
  ipcMain.handle('zen:backup:export', async (event, localData) => {
    const envelope = buildEnvelope(localData);
    const result = await require('electron').dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Save Zen backup',
      defaultPath: `zen-backup-${envelope.exportedAt.slice(0, 10)}.json`,
      filters: [{ name: 'Zen backup', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fsp.writeFile(result.filePath, JSON.stringify(envelope, null, 2), 'utf8');
    return { path: result.filePath, summary: summarizeEnvelope(envelope) };
  });
  ipcMain.handle('zen:backup:choose-file', async (event) => {
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose a Zen backup to restore', properties: ['openFile'], filters: [{ name: 'Zen backup', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    let envelope;
    try {
      envelope = JSON.parse(await fsp.readFile(result.filePaths[0], 'utf8'));
    } catch {
      throw new Error('That file is not valid JSON.');
    }
    // Fails closed here -- before any token is issued, and long before any store is touched --
    // on a malformed file or an unrecognized formatVersion.
    validateEnvelope(envelope);
    const token = crypto.randomUUID();
    pendingBackupRestores.set(token, { webContentsId: event.sender.id, envelope, expiresAt: Date.now() + 5 * 60_000 });
    return { token, summary: summarizeEnvelope(envelope) };
  });
  ipcMain.handle('zen:backup:restore', (event, token) => {
    const pending = pendingBackupRestores.get(token);
    pendingBackupRestores.delete(token);
    if (!pending || pending.webContentsId !== event.sender.id || pending.expiresAt < Date.now()) {
      throw new Error('Choose the backup file again before restoring.');
    }
    // Re-validated fresh again here rather than trusting the earlier choose-file call --
    // consistent with every other prepare/run pair in this file (commands, workflows).
    return applyEnvelope(pending.envelope);
  });
  ipcMain.handle('zen:voice-status', () => voiceStatus());
  ipcMain.handle('zen:voice:transcribe', async (_event, audio) => {
    if (!voiceInputReady()) throw new Error('Local speech-to-text is not installed yet.');
    if (!(audio instanceof Uint8Array) || audio.byteLength < 44 || audio.byteLength > 12_000_000) {
      throw new Error('The voice recording is invalid or too long.');
    }
    const id = crypto.randomUUID();
    const inputPath = path.join(app.getPath('temp'), `zen-voice-${id}.wav`);
    const outputBase = path.join(app.getPath('temp'), `zen-voice-${id}`);
    const outputPath = `${outputBase}.txt`;
    try {
      await fsp.writeFile(inputPath, audio);
      await runWhisper(inputPath, outputBase);
      const text = (await fsp.readFile(outputPath, 'utf8')).trim();
      if (!text) throw new Error('Zen could not detect speech in that recording.');
      return text;
    } finally {
      await Promise.allSettled([fsp.unlink(inputPath), fsp.unlink(outputPath)]);
    }
  });
  ipcMain.handle('zen:voice:speak', async (event, text, voiceId, speed) => {
    if (!voiceStatus().output.available) throw new Error('Local text-to-speech is not installed yet.');
    activeSpeech.get(event.sender.id)?.kill();
    const outputPath = path.join(app.getPath('temp'), `zen-speech-${crypto.randomUUID()}.wav`);
    try {
      await runPiper(event.sender, selectPiperVoice(voiceId).model, validateSpeechText(text), outputPath, validateSpeechSpeed(speed));
      return new Uint8Array(await fsp.readFile(outputPath));
    } finally {
      await fsp.unlink(outputPath).catch(() => {});
    }
  });
  ipcMain.on('zen:voice:stop-speaking', (event) => activeSpeech.get(event.sender.id)?.kill());
  ipcMain.handle('zen:models', async () => {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    if (!response.ok) throw new Error(`Ollama could not list models (${response.status}).`);
    const data = await response.json();
    return Array.isArray(data?.models)
      ? data.models.map((model) => model?.name).filter((model) => typeof model === 'string')
      : [];
  });
  ipcMain.on('zen:overlay:close', () => hideOverlay());
  // Block C, Step 12: the overlay hands typed/transcribed text off to the main window's
  // existing chat pipeline rather than running a second message-send code path -- website/app
  // intent detection, memory auto-save, and document-question routing all stay single-sourced.
  ipcMain.on('zen:overlay:submit', (_event, text) => {
    if (typeof text !== 'string' || !text.trim() || text.length > 4_000) return;
    if (!mainWindow) createWindow();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('zen:overlay:message', text.trim());
    hideOverlay();
  });
  ipcMain.handle('zen:task:propose', async (_event, goal) => {
    if (typeof goal !== 'string' || !goal.trim()) throw new Error('A task needs a non-empty goal.');
    const grantedFolders = listPermissions().filter((entry) => !entry.revokedAt).map((entry) => entry.scope);
    const browserGranted = listBrowserPermissions().some((entry) => !entry.revokedAt);
    const plan = await planTask(goal.trim(), { model: DEFAULT_MODEL, approvedApps: listApprovedApps(), documents: listDocuments(), grantedFolders, browserGranted });
    if (!plan.isTask) return { isTask: false };
    // Defense-in-depth: proposeTask's validateInput is shape-only for every action now (see
    // action-registry.js), so this should rarely fire -- but if the model ever names an
    // unregistered actionId or sends a malformed input object, this still turns that into the
    // same graceful "couldn't turn that into a plan" outcome as any other planner miss, rather
    // than a raw IPC error string reaching the renderer.
    let task;
    try {
      task = proposeTask(goal.trim(), plan.steps);
    } catch {
      return { isTask: false };
    }
    showTaskPopup(task);
    return { isTask: true, task };
  });
  ipcMain.handle('zen:task:approve', (_event, taskId) => {
    const task = approveTask(taskId, {
      auditFn: appendAuditRecord,
      onUpdate: pushTaskUpdate,
      // Block E, Step 24: delete-file is the first sensitive action to actually exercise this.
      // The Promise resolves via zen:task:confirm-sensitive below (popup Approve/Deny), or via
      // zen:task:cancel resolving it as a denial if the owner cancels while blocked.
      confirmSensitiveStep: async () => new Promise((resolve) => {
        pendingSensitiveConfirmations.set(taskId, resolve);
      })
    });
    return task;
  });
  ipcMain.handle('zen:task:confirm-sensitive', (_event, taskId, approved) => {
    const resolve = pendingSensitiveConfirmations.get(taskId);
    if (!resolve) return null;
    pendingSensitiveConfirmations.delete(taskId);
    const confirmationId = approved ? `confirm_${crypto.randomUUID()}` : null;
    resolve(confirmationId);
    return confirmationId;
  });
  ipcMain.handle('zen:task:pause', (_event, taskId) => requestPause(taskId));
  ipcMain.handle('zen:task:resume', (_event, taskId) => requestResume(taskId));
  ipcMain.handle('zen:task:cancel', (_event, taskId) => {
    const task = requestCancel(taskId);
    // Unblock a task currently awaiting sensitive confirmation -- otherwise Cancel while
    // "blocked" would set cancelRequested but the executor stays parked on the awaited Promise
    // until the popup separately answers Deny, defeating the point of a single Cancel control.
    const resolve = pendingSensitiveConfirmations.get(taskId);
    if (resolve) { pendingSensitiveConfirmations.delete(taskId); resolve(null); }
    return task;
  });
  ipcMain.on('zen:task:popup-close', () => hideTaskPopup());
  ipcMain.handle('zen:permissions:choose-folder', async (event) => {
    const result = await require('electron').dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Grant Zen access to a folder', properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return grantFolderPermission(result.filePaths[0], 'native-picker');
  });
  ipcMain.handle('zen:permissions:list', () => listPermissions());
  ipcMain.handle('zen:permissions:revoke', (_event, id) => revokeFolderPermission(id));
  // Block F, Step 26: off-by-default PowerShell toggle. enablePowerShell itself validates the
  // typed acknowledgment (throws if it doesn't match exactly) -- this handler does not do a
  // second, looser check. Deliberately NOT part of backup.js's export/restore scope; see
  // docs/PowerShellControl.md.
  ipcMain.handle('zen:powershell:status', () => powerShellToggleStatus());
  ipcMain.handle('zen:powershell:enable', (_event, typedAcknowledgment) => enablePowerShell(typedAcknowledgment));
  ipcMain.handle('zen:powershell:disable', () => disablePowerShell());

  // Block G, Step 27: browser-access permission (a simple persistent on/off consent, unlike
  // folder grants) and the own-window/current-window handoff toggle. grantBrowserPermission
  // only ever accepts 'agent-permissions-page' as its source -- see permissions.js.
  ipcMain.handle('zen:browser:permission-status', () => listBrowserPermissions());
  ipcMain.handle('zen:browser:grant', () => grantBrowserPermission('agent-permissions-page'));
  ipcMain.handle('zen:browser:revoke', (_event, id) => revokeBrowserPermission(id));
  ipcMain.handle('zen:browser:handoff-status', () => handoffStatus());
  // confirmed must be explicitly true for 'current-window' -- setHandoffMode itself throws
  // otherwise, so this handler does not add a second, looser check.
  ipcMain.handle('zen:browser:set-handoff', (_event, mode, confirmed) => setHandoffMode(mode, confirmed));

  createWindow();
  createTray();
  registerHotkey();
  registerEmergencyStopHotkey();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Block B, Step 9: release the global hotkey on quit -- Electron does not do this automatically,
// and a leaked registration would keep Ctrl+Alt+Space bound to a dead process handle.
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
