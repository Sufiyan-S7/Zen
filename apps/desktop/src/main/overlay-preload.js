const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenOverlay', {
  close: () => ipcRenderer.send('zen:overlay:close'),
  submit: (text) => ipcRenderer.send('zen:overlay:submit', text),
  onShow: (callback) => ipcRenderer.on('zen:overlay:shown', () => callback()),
  // Reuses the exact same main-process channels the main window's own voice controls call
  // (registered once in main.js's whenReady) -- no separate transcription code path for the
  // overlay, so whisper.cpp behavior/limits/cleanup stay identical between the two surfaces.
  getVoiceStatus: () => ipcRenderer.invoke('zen:voice-status'),
  transcribeVoice: (audio) => ipcRenderer.invoke('zen:voice:transcribe', audio)
});
