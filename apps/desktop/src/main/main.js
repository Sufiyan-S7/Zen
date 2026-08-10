const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const { configureApprovedApps, toolRegistryStatus, websitePreview, previewApp, previewBrowserWebApp, listApprovedApps, approveApp, approveBrowserWebApp, removeApprovedApp, approvedApp, validateBrowserWebAppLabel, validateSearchQuery, validateFolderPath, searchFolderNames } = require('./computer-control');
const { configureDocuments, previewDocuments, importDocuments, listDocuments, searchDocuments, documentPreview, prepareDocumentQuestion, verifyDocumentQuestion, removeDocument } = require('./documents');
const { configureCustomCommands, previewCommand, createCommand, listCommands, prepareCommandRun, removeCommand } = require('./custom-commands');
const { configureWorkflows, previewWorkflow, createWorkflow, listWorkflows, prepareWorkflowRun, removeWorkflow, resolveRoute } = require('./workflows');

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
  'Never say or imply that you opened, launched, navigated to, or completed any computer action. Chat cannot execute actions.',
  'If asked to open File Explorer, tell the user to use Activity → Choose what Zen may open. If asked to open a website or a browser-installed web app, direct them to Activity → Open a website. If asked to list or find files or folders, direct them to Activity → Search a folder.',
  'Do not claim to control files, apps, or the browser beyond those user-confirmed Activity actions.',
  'Never request or reveal sensitive personal information unless the user explicitly needs it.'
].join(' ');
const DOCUMENT_QA_SYSTEM_PROMPT = 'You are Zen, answering a question from user-approved local document excerpts. Answer only from the provided excerpts. If the excerpts do not contain the answer, say plainly that the answer is not contained in the excerpts. Do not infer unstated document content.';
const activeRequests = new Map();
const activeSpeech = new Map();
const pendingAppSelections = new Map();
const pendingBrowserWebAppSelections = new Map();
const pendingFolderSelections = new Map();
const pendingDocumentSelections = new Map();
const pendingDocumentQuestions = new Map();

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

async function startChatRequest(event, { requestId, messages, model, systemPrompt = SYSTEM_PROMPT } = {}) {
  let key;
  let controller;
  try {
    key = requestKey(event.sender, requestId);
    if (activeRequests.has(key)) throw new Error('This chat request is already running.');
    const selectedModel = validateModel(model);
    controller = new AbortController();
    activeRequests.set(key, controller);
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: selectedModel,
        stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...validateMessages(messages)]
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
  throw new Error('Unsupported step type.');
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

  window.loadFile(path.join(__dirname, '../renderer/index.html'));

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

app.whenReady().then(() => {
  configureApprovedApps(app.getPath('userData'));
  configureDocuments(app.getPath('userData'));
  configureCustomCommands(app.getPath('userData'));
  configureWorkflows(app.getPath('userData'));
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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
