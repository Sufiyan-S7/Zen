const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const DEFAULT_MODEL = 'llama3.2:3b';
const SYSTEM_PROMPT = [
  'You are Zen, a private local desktop assistant.',
  'Be concise, practical, and honest about what you can do.',
  'You currently only provide chat. Do not claim to control files, apps, or the browser.',
  'Never request or reveal sensitive personal information unless the user explicitly needs it.'
].join(' ');
const activeRequests = new Map();

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

ipcMain.on('zen:chat:start', async (event, { requestId, messages } = {}) => {
  let key;
  let controller;
  try {
    key = requestKey(event.sender, requestId);
    if (activeRequests.has(key)) throw new Error('This chat request is already running.');
    controller = new AbortController();
    activeRequests.set(key, controller);
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        stream: true,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...validateMessages(messages)]
      })
    });
    if (!response.ok) throw new Error(`Ollama could not respond (${response.status}). Check that ${DEFAULT_MODEL} is installed.`);
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

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.handle('zen:status', () => ({ model: DEFAULT_MODEL }));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
