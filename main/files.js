const fs = require('fs')
const path = require('path')

function setupFileHandlers(ipcMain, mainWindow, dialog) {

  ipcMain.handle('files:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('files:select-save', async (_, filename) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      properties: ['createDirectory']
    })
    if (result.canceled) return null
    return result.filePath
  })

  ipcMain.handle('files:list-dir', async (_, dirPath) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return {
        ok: true,
        contents: entries
          .filter(e => !e.name.startsWith('.'))
          .map(e => ({
            name: e.name,
            path: path.join(dirPath, e.name),
            type: e.isDirectory() ? 'dir' : 'file',
            size: e.isFile() ? fs.statSync(path.join(dirPath, e.name)).size : 0
          }))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
            return a.name.localeCompare(b.name)
          })
      }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}

module.exports = { setupFileHandlers }
