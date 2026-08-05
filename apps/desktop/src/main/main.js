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

ipcMain.handle('zen:chat', async (_event, messages) => {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      stream: false,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...validateMessages(messages)]
    })
  });

  if (!response.ok) throw new Error(`Ollama could not respond (${response.status}).`);
  const data = await response.json();
  if (typeof data?.message?.content !== 'string' || !data.message.content.trim()) {
    throw new Error('Ollama returned an empty response.');
  }
  return data.message.content.trim();
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
