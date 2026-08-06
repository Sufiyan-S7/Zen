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
  getModels: () => ipcRenderer.invoke('zen:models')
});
