const { contextBridge, ipcRenderer } = require('electron');

// Block D, Step 19: the plan popup's bridge -- isolated from window.zen (main window) and
// window.zenOverlay (Block B/C), same isolation pattern used for each new surface so far.
contextBridge.exposeInMainWorld('zenTaskPopup', {
  onTask: (callback) => ipcRenderer.on('zen:task:update', (_event, task) => callback(task)),
  approve: (taskId) => ipcRenderer.invoke('zen:task:approve', taskId),
  pause: (taskId) => ipcRenderer.invoke('zen:task:pause', taskId),
  resume: (taskId) => ipcRenderer.invoke('zen:task:resume', taskId),
  cancel: (taskId) => ipcRenderer.invoke('zen:task:cancel', taskId),
  // Block E, Step 24: Approve/Deny for a sensitive step's fresh re-confirmation (delete-file).
  confirmSensitive: (taskId, approved) => ipcRenderer.invoke('zen:task:confirm-sensitive', taskId, approved),
  close: () => ipcRenderer.send('zen:task:popup-close')
});
