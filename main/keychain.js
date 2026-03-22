const SERVICE = 'telegram-drive'
const ACCOUNT = 'api-credentials'

let keytar
try {
  keytar = require('keytar')
} catch (e) {
  console.warn('keytar not available, falling back to in-memory storage')
  keytar = null
}

let memStore = null

function setupKeychainHandlers(ipcMain) {
  ipcMain.handle('keychain:get-creds', async () => {
    try {
      const raw = keytar ? await keytar.getPassword(SERVICE, ACCOUNT) : memStore
      if (!raw) return null
      return JSON.parse(raw)
    } catch (e) {
      return null
    }
  })

  ipcMain.handle('keychain:set-creds', async (_, creds) => {
    try {
      const raw = JSON.stringify(creds)
      if (keytar) await keytar.setPassword(SERVICE, ACCOUNT, raw)
      else memStore = raw
      return { ok: true }
    } catch (e) {
      memStore = JSON.stringify(creds)
      return { ok: true }
    }
  })

  ipcMain.handle('keychain:delete-creds', async () => {
    try {
      if (keytar) await keytar.deletePassword(SERVICE, ACCOUNT)
      memStore = null
      return { ok: true }
    } catch (e) {
      memStore = null
      return { ok: true }
    }
  })
}

module.exports = { setupKeychainHandlers }
