const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('zen', {
  version: '0.1.0',
  mode: 'local-first'
});

