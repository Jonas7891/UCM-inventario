const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadItems: () => ipcRenderer.invoke('items:load'),
  saveItems: (items) => ipcRenderer.invoke('items:save', items)
});
