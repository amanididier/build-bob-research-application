const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bob', {
  get: () => ipcRenderer.invoke('bob:get'),
  add: (kind, item) => ipcRenderer.invoke('bob:add', kind, item),
  remove: (kind, id) => ipcRenderer.invoke('bob:remove', kind, id),
  openWeb: (sub) => ipcRenderer.invoke('bob:openWeb', sub),
  info: () => ipcRenderer.invoke('bob:info'),
  onChange: (fn) => ipcRenderer.on('bob:changed', () => fn()),
})