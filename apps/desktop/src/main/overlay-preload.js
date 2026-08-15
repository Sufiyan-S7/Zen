const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenOverlay', {
  close: () => ipcRenderer.send('zen:overlay:close'),
  onShow: (callback) => ipcRenderer.on('zen:overlay:shown', () => callback())
});
