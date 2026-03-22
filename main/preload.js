const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Credentials (api_id + api_hash stored in keychain)
  getCreds:       ()       => ipcRenderer.invoke('keychain:get-creds'),
  setCreds:       (creds)  => ipcRenderer.invoke('keychain:set-creds', creds),
  deleteCreds:    ()       => ipcRenderer.invoke('keychain:delete-creds'),

  // Telegram auth flow
  sendCode:       (params) => ipcRenderer.invoke('tg:send-code', params),
  signIn:         (params) => ipcRenderer.invoke('tg:sign-in', params),
  checkPassword:  (params) => ipcRenderer.invoke('tg:check-password', params),
  restoreSession: (params) => ipcRenderer.invoke('tg:restore-session', params),
  signOut:        ()       => ipcRenderer.invoke('tg:sign-out'),

  // File operations
  listFiles:      (params) => ipcRenderer.invoke('tg:list-files', params),
  uploadFile:     (params) => ipcRenderer.invoke('tg:upload-file', params),
  downloadFile:   (params) => ipcRenderer.invoke('tg:download-file', params),
  deleteFile:     (params) => ipcRenderer.invoke('tg:delete-file', params),
  getFileInfo:    (params) => ipcRenderer.invoke('tg:get-file-info', params),

  // Local filesystem
  selectLocalFolder:   ()           => ipcRenderer.invoke('files:select-folder'),
  selectSaveLocation:  (filename)   => ipcRenderer.invoke('files:select-save', filename),
  listLocalDir:        (dirPath)    => ipcRenderer.invoke('files:list-dir', dirPath),

  // Progress events
  onUploadProgress:   (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('tg:upload-progress', handler)
    return () => ipcRenderer.removeListener('tg:upload-progress', handler)
  },
  onDownloadProgress: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('tg:download-progress', handler)
    return () => ipcRenderer.removeListener('tg:download-progress', handler)
  },

  openExternal: (url) => ipcRenderer.invoke('open-external', url)
})
