const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bob', {
  get: () => ipcRenderer.invoke('bob:get'),
  add: (kind, item) => ipcRenderer.invoke('bob:add', kind, item),
  remove: (kind, id) => ipcRenderer.invoke('bob:remove', kind, id),
  openWeb: (sub) => ipcRenderer.invoke('bob:openWeb', sub),
  downloadExtension: () => ipcRenderer.invoke('bob:downloadExtension'),
  requestExtensionPanel: () => ipcRenderer.invoke('bob:requestExtensionPanel'),
  extensionAlive: () => ipcRenderer.invoke('bob:extensionAlive'),
  info: () => ipcRenderer.invoke('bob:info'),
  getMemory: () => ipcRenderer.invoke('bob:getMemory'),
  saveMemory: (data) => ipcRenderer.invoke('bob:saveMemory', data),
  onChange: (fn) => {
    const handler = () => fn()
    ipcRenderer.on('bob:changed', handler)
    return () => ipcRenderer.removeListener('bob:changed', handler)
  },
  checkForUpdates: () => ipcRenderer.invoke('bob:checkUpdates'),
  getUpdateState: () => ipcRenderer.invoke('bob:getUpdateState'),
  checkExtensionConnection: () => ipcRenderer.invoke('bob:checkExtensionConnection'),
  syncProjects: (projects) => ipcRenderer.invoke('bob:syncProjects', projects),
  syncMessages: (messages) => ipcRenderer.invoke('bob:syncMessages', messages),
  setOnboardingCompleted: (val) => ipcRenderer.invoke('bob:setOnboardingCompleted', val),
  getOnboardingCompleted: () => ipcRenderer.invoke('bob:getOnboardingCompleted'),
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
