/**
 * telegram.js
 * Handles all Telegram MTProto operations via GramJS.
 */

const { TelegramClient } = require('telegram')
const { StringSession } = require('telegram/sessions')
const { Api } = require('telegram/tl')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Max chunk size: 1.9 GB (safely under Telegram's 2 GB user limit)
const CHUNK_SIZE = 1900 * 1024 * 1024

// Manifest message marker
const MANIFEST_MARKER = '🗂 TELEGRAM_DRIVE_MANIFEST_V1'

let client = null
let manifestCache = null

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

function sessionPath() {
  return path.join(os.homedir(), '.telegram-drive-session')
}

function loadSession() {
  try {
    if (fs.existsSync(sessionPath())) {
      return fs.readFileSync(sessionPath(), 'utf8').trim()
    }
  } catch (_) {}
  return ''
}

function saveSession(str) {
  try { fs.writeFileSync(sessionPath(), str, 'utf8') } catch (_) {}
}

function deleteSession() {
  try { if (fs.existsSync(sessionPath())) fs.unlinkSync(sessionPath()) } catch (_) {}
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

async function getClient(apiId, apiHash) {
  if (client && client.connected) return client

  const session = new StringSession(loadSession())
  client = new TelegramClient(session, parseInt(apiId), apiHash, {
    connectionRetries: 5,
    useWSS: false,
  })
  await client.connect()
  return client
}

// ---------------------------------------------------------------------------
// Manifest helpers — stored as a regular message in Saved Messages
// ---------------------------------------------------------------------------

async function loadManifest(c) {
  if (manifestCache) return manifestCache

  // Search Saved Messages for our manifest marker
  try {
    const search = await c.invoke(new Api.messages.Search({
      peer: new Api.InputPeerSelf(),
      q: '🗂 TELEGRAM_DRIVE_MANIFEST_V1',
      filter: new Api.InputMessagesFilterEmpty(),
      minDate: 0,
      maxDate: 0,
      offsetId: 0,
      addOffset: 0,
      limit: 5,
      maxId: 0,
      minId: 0,
      hash: BigInt(0)
    }))

    for (const msg of (search.messages || [])) {
      if (msg.message && msg.message.startsWith(MANIFEST_MARKER)) {
        try {
          const json = msg.message.slice(MANIFEST_MARKER.length).trim()
          manifestCache = JSON.parse(json)
          manifestCache._messageId = msg.id
          return manifestCache
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Brand new manifest
  manifestCache = { files: {} }
  return manifestCache
}

async function saveManifest(c) {
  const { _messageId, ...data } = manifestCache
  const text = `${MANIFEST_MARKER}\n${JSON.stringify(data, null, 2)}`

  if (_messageId) {
    try {
      await c.invoke(new Api.messages.EditMessage({
        peer: new Api.InputPeerSelf(),
        id: _messageId,
        message: text,
        noWebpage: true
      }))
      return
    } catch (_) {
      // Fall through to create new
    }
  }

  // Send new manifest message
  const sent = await c.sendMessage('me', { message: text })
  manifestCache._messageId = sent.id
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

function setupTelegramHandlers(ipcMain, mainWindow) {

  // ----- Auth: step 1 — send code -----
  ipcMain.handle('tg:send-code', async (_, { apiId, apiHash, phone }) => {
    try {
      const c = await getClient(apiId, apiHash)
      const result = await c.invoke(new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: parseInt(apiId),
        apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: false,
          currentNumber: false,
          allowAppHash: true
        })
      }))
      return { ok: true, phoneCodeHash: result.phoneCodeHash, type: result.type.className }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Auth: step 2 — submit code -----
  ipcMain.handle('tg:sign-in', async (_, { apiId, apiHash, phone, code, phoneCodeHash }) => {
    try {
      const c = await getClient(apiId, apiHash)
      await c.invoke(new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code
      }))
      saveSession(c.session.save())
      const me = await c.getMe()
      return { ok: true, user: { id: me.id.toString(), firstName: me.firstName, username: me.username, phone: me.phone } }
    } catch (e) {
      if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        return { ok: false, need2fa: true }
      }
      return { ok: false, error: e.message }
    }
  })

  // ----- Auth: step 3 (optional) — 2FA password -----
  ipcMain.handle('tg:check-password', async (_, { password }) => {
    try {
      const srp = await client.invoke(new Api.account.GetPassword())
      const { computeCheck } = require('telegram/client/2fa')
      const check = await computeCheck(srp, password)
      await client.invoke(new Api.auth.CheckPassword({ password: check }))
      saveSession(client.session.save())
      const me = await client.getMe()
      return { ok: true, user: { id: me.id.toString(), firstName: me.firstName, username: me.username, phone: me.phone } }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Auth: restore from saved session -----
  ipcMain.handle('tg:restore-session', async (_, { apiId, apiHash }) => {
    try {
      if (!apiId || !apiHash) return { ok: false }
      const saved = loadSession()
      if (!saved) return { ok: false }
      const c = await getClient(apiId, apiHash)
      if (!await c.isUserAuthorized()) return { ok: false }
      const me = await c.getMe()
      return { ok: true, user: { id: me.id.toString(), firstName: me.firstName, username: me.username, phone: me.phone } }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Auth: sign out -----
  ipcMain.handle('tg:sign-out', async () => {
    try {
      if (client) {
        await client.invoke(new Api.auth.LogOut())
        client = null
      }
      deleteSession()
      manifestCache = null
      return { ok: true }
    } catch (e) {
      deleteSession()
      client = null
      manifestCache = null
      return { ok: true }
    }
  })

  // ----- List files -----
  ipcMain.handle('tg:list-files', async (_, { folder = '' }) => {
    try {
      // Always reload manifest fresh on list
      manifestCache = null
      const manifest = await loadManifest(client)
      const files = Object.values(manifest.files)

      const prefix = folder ? folder + '/' : ''

      // Files directly in this folder (no further slash after prefix)
      const inFolder = files.filter(f => {
        const rel = prefix ? (f.path.startsWith(prefix) ? f.path.slice(prefix.length) : null) : f.path
        return rel !== null && rel !== '' && !rel.includes('/')
      })

      const contents = [
        ...inFolder.sort((a, b) => a.name.localeCompare(b.name)).map(f => ({
          name: f.name,
          path: f.path,
          type: 'file',
          size: f.size,
          uploadedAt: f.uploadedAt,
          chunks: f.chunks.length
        }))
      ]

      return { ok: true, contents }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Upload file (with chunking for files > 1.9 GB) -----
  ipcMain.handle('tg:upload-file', async (_, { localPath, remotePath, name }) => {
    try {
      const { CustomFile } = require('telegram/client/uploads')
      const stats = fs.statSync(localPath)
      const totalSize = stats.size
      const numChunks = Math.ceil(totalSize / CHUNK_SIZE)
      const tmpDir = os.tmpdir()
      const chunks = []

      for (let i = 0; i < numChunks; i++) {
        const chunkSize = Math.min(CHUNK_SIZE, totalSize - i * CHUNK_SIZE)
        const chunkName = numChunks > 1 ? `${name}.part${i + 1}of${numChunks}` : name
        const caption = numChunks > 1
          ? `📦 TGDrive chunk ${i + 1}/${numChunks} | ${remotePath}`
          : `📦 TGDrive file | ${remotePath}`

        let uploadPath = localPath

        // For multi-chunk files, write each chunk to a temp file first
        if (numChunks > 1) {
          uploadPath = path.join(tmpDir, `tgdrive_upload_${Date.now()}_${i}`)
          const buf = Buffer.alloc(chunkSize)
          const fd = fs.openSync(localPath, 'r')
          fs.readSync(fd, buf, 0, chunkSize, i * CHUNK_SIZE)
          fs.closeSync(fd)
          fs.writeFileSync(uploadPath, buf)
        }

        mainWindow?.webContents.send('tg:upload-progress', {
          remotePath, chunk: i + 1, totalChunks: numChunks,
          bytesUploaded: i * CHUNK_SIZE, totalBytes: totalSize
        })

        const customFile = new CustomFile(chunkName, chunkSize, uploadPath)

        const uploadedFile = await client.uploadFile({
          file: customFile,
          workers: 4,
          onProgress: (progress) => {
            mainWindow?.webContents.send('tg:upload-progress', {
              remotePath, chunk: i + 1, totalChunks: numChunks,
              bytesUploaded: i * CHUNK_SIZE + Math.floor(progress * chunkSize),
              totalBytes: totalSize
            })
          }
        })

        const sent = await client.sendFile('me', {
          file: uploadedFile,
          caption,
          forceDocument: true,
          workers: 4
        })

        chunks.push({ messageId: sent.id, size: chunkSize, index: i })

        // Clean up temp chunk file
        if (numChunks > 1 && fs.existsSync(uploadPath)) {
          fs.unlinkSync(uploadPath)
        }
      }

      // Reload manifest fresh before updating (avoid stale cache overwriting)
      manifestCache = null
      const manifest = await loadManifest(client)
      manifest.files[remotePath] = {
        name,
        path: remotePath,
        size: totalSize,
        uploadedAt: new Date().toISOString(),
        chunks
      }
      await saveManifest(client)

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Download file (with reassembly) -----
  ipcMain.handle('tg:download-file', async (_, { remotePath, savePath }) => {
    try {
      const manifest = await loadManifest(client)
      const entry = manifest.files[remotePath]
      if (!entry) return { ok: false, error: 'File not found in manifest' }

      const sortedChunks = [...entry.chunks].sort((a, b) => a.index - b.index)
      const tmpDir = os.tmpdir()
      const tmpFiles = []

      for (let i = 0; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i]

        mainWindow?.webContents.send('tg:download-progress', {
          remotePath,
          chunk: i + 1,
          totalChunks: sortedChunks.length
        })

        const msgs = await client.invoke(new Api.messages.GetMessages({
          id: [new Api.InputMessageID({ id: chunk.messageId })]
        }))

        const msg = msgs.messages?.[0]
        if (!msg || !msg.media) throw new Error(`Chunk ${i} message not found`)

        const tmpFile = path.join(tmpDir, `tgdrive_chunk_${Date.now()}_${i}`)
        await client.downloadMedia(msg.media, { outputFile: tmpFile })
        tmpFiles.push(tmpFile)
      }

      // Reassemble
      const dir = path.dirname(savePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const outFd = fs.openSync(savePath, 'w')
      for (const tmpFile of tmpFiles) {
        const data = fs.readFileSync(tmpFile)
        fs.writeSync(outFd, data)
        fs.unlinkSync(tmpFile)
      }
      fs.closeSync(outFd)

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Delete file -----
  ipcMain.handle('tg:delete-file', async (_, { remotePath }) => {
    try {
      const manifest = await loadManifest(client)
      const entry = manifest.files[remotePath]
      if (!entry) return { ok: false, error: 'File not found in manifest' }

      const ids = entry.chunks.map(c => c.messageId)
      if (ids.length > 0) {
        await client.invoke(new Api.messages.DeleteMessages({
          id: ids,
          revoke: true
        }))
      }

      delete manifest.files[remotePath]
      await saveManifest(client)

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // ----- Get file info -----
  ipcMain.handle('tg:get-file-info', async (_, { remotePath }) => {
    try {
      const manifest = await loadManifest(client)
      const entry = manifest.files[remotePath]
      if (!entry) return { ok: false }
      return { ok: true, entry }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}

module.exports = { setupTelegramHandlers }
