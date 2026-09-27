const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bob', {
  get: () => ipcRenderer.invoke('bob:get'),
  add: (kind, item) => ipcRenderer.invoke('bob:add', kind, item),
  remove: (kind, id) => ipcRenderer.invoke('bob:remove', kind, id),
  openWeb: (sub) => ipcRenderer.invoke('bob:openWeb', sub),
  info: () => ipcRenderer.invoke('bob:info'),
  getMemory: () => ipcRenderer.invoke('bob:getMemory'),
  saveMemory: (data) => ipcRenderer.invoke('bob:saveMemory', data),
  onChange: (fn) => ipcRenderer.on('bob:changed', () => fn()),
  checkForUpdates: () => ipcRenderer.invoke('bob:checkUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('bob:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('bob:installUpdate'),
  onUpdateStatus: (fn) => {
    const handler = (_event, status) => fn(status)
    ipcRenderer.on('bob:updateStatus', handler)
    return () => ipcRenderer.removeListener('bob:updateStatus', handler)
  },
  minimize: () => ipcRenderer.invoke('bob:minimize'),
  maximize: () => ipcRenderer.invoke('bob:maximize'),
  close: () => ipcRenderer.invoke('bob:close'),
  isMaximized: () => ipcRenderer.invoke('bob:isMaximized'),
})
