const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');

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
  'You currently only provide chat. Do not claim to control files, apps, or the browser.',
  'Never request or reveal sensitive personal information unless the user explicitly needs it.'
].join(' ');
const activeRequests = new Map();
const activeSpeech = new Map();

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

function runPiper(webContents, model, text, outputPath) {
  return new Promise((resolve, reject) => {
    const process = spawn(PIPER_CLI, ['-m', model, '-f', outputPath, '--', text], { windowsHide: true });
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

ipcMain.on('zen:chat:start', async (event, { requestId, messages, model } = {}) => {
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
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...validateMessages(messages)]
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
});

ipcMain.on('zen:chat:stop', (event, requestId) => {
  try {
    activeRequests.get(requestKey(event.sender, requestId))?.abort();
  } catch { }
});

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
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.handle('zen:status', () => ({ model: DEFAULT_MODEL }));
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
  ipcMain.handle('zen:voice:speak', async (event, text, voiceId) => {
    if (!voiceStatus().output.available) throw new Error('Local text-to-speech is not installed yet.');
    activeSpeech.get(event.sender.id)?.kill();
    const outputPath = path.join(app.getPath('temp'), `zen-speech-${crypto.randomUUID()}.wav`);
    try {
      await runPiper(event.sender, selectPiperVoice(voiceId).model, validateSpeechText(text), outputPath);
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
