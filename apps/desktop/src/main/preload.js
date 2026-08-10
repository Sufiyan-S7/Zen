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
  listDocuments: () => ipcRenderer.invoke('zen:documents:list'),
  searchDocuments: (query) => ipcRenderer.invoke('zen:documents:search', query),
  previewDocument: (id, query, occurrence) => ipcRenderer.invoke('zen:documents:preview', id, query, occurrence),
  prepareDocumentQuestion: (query, question) => ipcRenderer.invoke('zen:documents:prepare-question', query, question),
  startDocumentQuestion: (token, requestId, messages, model) => ipcRenderer.send('zen:documents:start-question', { token, requestId, messages, model }),
  chooseDocuments: () => ipcRenderer.invoke('zen:documents:choose'),
  importDocuments: (token) => ipcRenderer.invoke('zen:documents:import', token),
  removeDocument: (id) => ipcRenderer.invoke('zen:documents:remove', id),
  listCommands: () => ipcRenderer.invoke('zen:commands:list'),
  previewCommand: (name, steps) => ipcRenderer.invoke('zen:commands:preview', name, steps),
  createCommand: (name, steps) => ipcRenderer.invoke('zen:commands:create', name, steps),
  removeCommand: (id) => ipcRenderer.invoke('zen:commands:remove', id),
  prepareCommandRun: (id) => ipcRenderer.invoke('zen:commands:prepare-run', id),
  runCommand: (id) => ipcRenderer.invoke('zen:commands:run', id),
  listWorkflows: () => ipcRenderer.invoke('zen:workflows:list'),
  previewWorkflow: (name, steps) => ipcRenderer.invoke('zen:workflows:preview', name, steps),
  createWorkflow: (name, steps) => ipcRenderer.invoke('zen:workflows:create', name, steps),
  removeWorkflow: (id) => ipcRenderer.invoke('zen:workflows:remove', id),
  prepareWorkflowRun: (id) => ipcRenderer.invoke('zen:workflows:prepare-run', id),
  runWorkflow: (id) => ipcRenderer.invoke('zen:workflows:run', id),
  getModels: () => ipcRenderer.invoke('zen:models'),
  getVoiceStatus: () => ipcRenderer.invoke('zen:voice-status'),
  transcribeVoice: (audio) => ipcRenderer.invoke('zen:voice:transcribe', audio),
  onVoiceShortcut: (callback) => subscribe('zen:voice-shortcut', callback),
  speakVoice: (text, voiceId, speed) => ipcRenderer.invoke('zen:voice:speak', text, voiceId, speed),
  stopVoiceSpeech: () => ipcRenderer.send('zen:voice:stop-speaking')
});
