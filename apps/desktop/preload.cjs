const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bob', {
  workspaceStoreRead: () => ipcRenderer.invoke('bob:workspaceStore:read'),
  workspaceStoreWrite: (store, expectedRevision) => ipcRenderer.invoke('bob:workspaceStore:write', { store, expectedRevision }),
  localProjectStatus: () => ipcRenderer.invoke('bob:localProject:status'),
  selectLocalProjectFolder: () => ipcRenderer.invoke('bob:localProject:select'),
  disconnectLocalProject: () => ipcRenderer.invoke('bob:localProject:disconnect'),
  listLocalProjectFiles: (options) => ipcRenderer.invoke('bob:localProject:list', options || {}),
  readLocalProjectFile: (relativePath, options) => ipcRenderer.invoke('bob:localProject:read', relativePath, options || {}),
  searchLocalProject: (query) => ipcRenderer.invoke('bob:localProject:search', query),
  conversationProjectStatus: (projectId) => ipcRenderer.invoke('bob:conversationProject:status', projectId),
  selectConversationProjectFolder: (projectId) => ipcRenderer.invoke('bob:conversationProject:selectLocal', projectId),
  disconnectConversationProjectFolder: (projectId) => ipcRenderer.invoke('bob:conversationProject:disconnectLocal', projectId),
  listConversationProjectFiles: (projectId, options) => ipcRenderer.invoke('bob:conversationProject:listLocal', projectId, options || {}),
  readConversationProjectFile: (projectId, relativePath, options) => ipcRenderer.invoke('bob:conversationProject:readLocal', projectId, relativePath, options || {}),
  searchConversationProject: (projectId, query) => ipcRenderer.invoke('bob:conversationProject:searchLocal', projectId, query),
  attachGitHubRepository: (projectId, payload) => ipcRenderer.invoke('bob:conversationProject:attachGitHub', projectId, payload || {}),
  disconnectGitHubRepository: (projectId) => ipcRenderer.invoke('bob:conversationProject:disconnectGitHub', projectId),
  listGitHubProjectFiles: (projectId, relativePath) => ipcRenderer.invoke('bob:conversationProject:githubList', projectId, relativePath || ''),
  readGitHubProjectFile: (projectId, relativePath, options) => ipcRenderer.invoke('bob:conversationProject:githubRead', projectId, relativePath, options || {}),
  searchGitHubProject: (projectId, query) => ipcRenderer.invoke('bob:conversationProject:githubSearch', projectId, query),
  githubTokenStatus: () => ipcRenderer.invoke('bob:githubToken:status'),
  clearGitHubToken: () => ipcRenderer.invoke('bob:githubToken:clear'),
  get: () => ipcRenderer.invoke('bob:get'),
  setGeminiKey: (key) => ipcRenderer.invoke('bob:setGeminiKey', key),
  setVerifiedModel: (model) => ipcRenderer.invoke('bob:setVerifiedModel', model),
  setActiveGoal: (goal) => ipcRenderer.invoke('bob:setActiveGoal', goal),
  getSettings: () => ipcRenderer.invoke('bob:getSettings'),
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
  openExtensionFolder: () => ipcRenderer.invoke('bob:openExtensionFolder'),
  getExtensionPath: () => ipcRenderer.invoke('bob:getExtensionPath'),
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
