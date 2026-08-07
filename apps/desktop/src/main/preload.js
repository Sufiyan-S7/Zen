const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('zen', {
  version: '0.1.0',
  mode: 'local-first',
  startChat: (requestId, messages, model) => ipcRenderer.send('zen:chat:start', { requestId, messages, model }),
  stopChat: (requestId) => ipcRenderer.send('zen:chat:stop', requestId),
  onChatDelta: (callback) => subscribe('zen:chat:delta', callback),
  onChatComplete: (callback) => subscribe('zen:chat:complete', callback),
  onChatError: (callback) => subscribe('zen:chat:error', callback),
  onChatCancelled: (callback) => subscribe('zen:chat:cancelled', callback),
  getStatus: () => ipcRenderer.invoke('zen:status'),
  getToolStatus: () => ipcRenderer.invoke('zen:tools:status'),
  previewWebsite: (url) => ipcRenderer.invoke('zen:tools:preview-website', url),
  openWebsite: (url) => ipcRenderer.invoke('zen:tools:open-website', url),
  listApprovedApps: () => ipcRenderer.invoke('zen:tools:list-approved-apps'),
  chooseApprovedApp: () => ipcRenderer.invoke('zen:tools:choose-app'),
  approveApp: (token) => ipcRenderer.invoke('zen:tools:approve-app', token),
  chooseBrowserWebApp: (label, url) => ipcRenderer.invoke('zen:tools:choose-browser-web-app', label, url),
  approveBrowserWebApp: (token) => ipcRenderer.invoke('zen:tools:approve-browser-web-app', token),
  removeApprovedApp: (appId) => ipcRenderer.invoke('zen:tools:remove-approved-app', appId),
  openApprovedApp: (appId) => ipcRenderer.invoke('zen:tools:open-approved-app', appId),
  previewSearchQuery: (query) => ipcRenderer.invoke('zen:tools:preview-search-query', query),
  chooseSearchFolder: () => ipcRenderer.invoke('zen:tools:choose-folder'),
  searchFolder: (token, query) => ipcRenderer.invoke('zen:tools:search-folder', token, query),
  getModels: () => ipcRenderer.invoke('zen:models'),
  getVoiceStatus: () => ipcRenderer.invoke('zen:voice-status'),
  transcribeVoice: (audio) => ipcRenderer.invoke('zen:voice:transcribe', audio),
  onVoiceShortcut: (callback) => subscribe('zen:voice-shortcut', callback),
  speakVoice: (text, voiceId, speed) => ipcRenderer.invoke('zen:voice:speak', text, voiceId, speed),
  stopVoiceSpeech: () => ipcRenderer.send('zen:voice:stop-speaking')
});
