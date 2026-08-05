const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zen', {
  version: '0.1.0',
  mode: 'local-first',
  chat: (messages) => ipcRenderer.invoke('zen:chat', messages),
  getStatus: () => ipcRenderer.invoke('zen:status')
});
