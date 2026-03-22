import React, { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../store'
import { fileIcon, joinPath, uniqueId } from '../utils'
import FileItem from './FileItem'

export default function TelegramPanel() {
  const {
    tgPath, tgContents, setTgPath, tgBack, setTgContents,
    loadingTg, setLoadingTg,
    localPath,
    showToast, addTransfer, updateTransfer
  } = useAppStore()

  const [selected, setSelected]           = useState([])
  const [dragOverPanel, setDragOverPanel] = useState(false)
  const panelRef = useRef()

  useEffect(() => { loadContents(tgPath) }, [tgPath])

  async function loadContents(folder) {
    setLoadingTg(true); setSelected([])
    const result = await window.api.listFiles({ folder })
    if (result.ok) {
      setTgContents(result.contents.map(c => ({ ...c, _icon: fileIcon(c.name, c.type) })))
    } else {
      showToast(result.error, 'error')
    }
    setLoadingTg(false)
  }

  function handleItemClick(item, e) {
    const multi = e.ctrlKey || e.metaKey
    if (multi) {
      setSelected(sel => sel.includes(item.path) ? sel.filter(p => p !== item.path) : [...sel, item.path])
    } else {
      setSelected([item.path])
    }
  }

  const selectedItems = tgContents.filter(c => selected.includes(c.path))
  const selectedFiles = selectedItems.filter(i => i.type === 'file')

  async function uploadLocalFiles(localItems) {
    for (const item of localItems) {
      if (item.type === 'dir') { showToast('Directory upload not supported — upload files individually', 'warning'); continue }
      await uploadFile(item)
    }
    await loadContents(tgPath)
  }

  async function uploadFile(localItem) {
    const name = localItem.name
    const remotePath = joinPath(tgPath, name)
    const id = uniqueId()

    addTransfer({ id, name, direction: 'upload', status: 'active', bytesUploaded: 0, totalBytes: localItem.size, chunk: 1, totalChunks: 1 })

    const unsub = window.api.onUploadProgress((data) => {
      if (data.remotePath === remotePath) {
        updateTransfer(id, {
          bytesUploaded: data.bytesUploaded,
          totalBytes: data.totalBytes,
          chunk: data.chunk,
          totalChunks: data.totalChunks
        })
      }
    })

    const result = await window.api.uploadFile({ localPath: localItem.path, remotePath, name })
    unsub()

    if (result.ok) {
      updateTransfer(id, { status: 'done' })
      showToast(`Uploaded: ${name}`, 'success')
    } else {
      updateTransfer(id, { status: 'error', error: result.error })
      showToast(`Upload failed: ${result.error}`, 'error')
    }
  }

  async function downloadSelected() {
    if (selectedFiles.length === 0) return
    if (!localPath) { showToast('Open a local folder on the left first', 'warning'); return }

    for (const f of selectedFiles) {
      const id = uniqueId()
      const savePath = localPath.replace(/\\/g, '/') + '/' + f.name
      addTransfer({ id, name: f.name, direction: 'download', status: 'active', chunk: 1, totalChunks: f.chunks || 1 })

      const unsub = window.api.onDownloadProgress((data) => {
        if (data.remotePath === f.path) {
          updateTransfer(id, { chunk: data.chunk, totalChunks: data.totalChunks })
        }
      })

      const result = await window.api.downloadFile({ remotePath: f.path, savePath })
      unsub()

      if (result.ok) {
        updateTransfer(id, { status: 'done' })
        showToast(`Downloaded: ${f.name}`, 'success')
      } else {
        updateTransfer(id, { status: 'error', error: result.error })
        showToast(`Download failed: ${result.error}`, 'error')
      }
    }
  }

  async function deleteSelected() {
    if (selectedFiles.length === 0) return
    for (const item of selectedFiles) {
      const id = uniqueId()
      addTransfer({ id, name: item.name, direction: 'delete', status: 'active' })
      const result = await window.api.deleteFile({ remotePath: item.path })
      if (result.ok) {
        updateTransfer(id, { status: 'done' })
        showToast(`Deleted: ${item.name}`, 'success')
      } else {
        updateTransfer(id, { status: 'error', error: result.error })
        showToast(`Delete failed: ${result.error}`, 'error')
      }
    }
    setSelected([])
    await loadContents(tgPath)
  }

  function handlePanelDragOver(e) {
    if (e.dataTransfer.types.includes('application/tg-drive-local')) {
      e.preventDefault(); setDragOverPanel(true)
    }
  }
  function handlePanelDragLeave(e) {
    if (!panelRef.current?.contains(e.relatedTarget)) setDragOverPanel(false)
  }
  async function handlePanelDrop(e) {
    e.preventDefault(); setDragOverPanel(false)
    const data = e.dataTransfer.getData('application/tg-drive-local')
    if (data) await uploadLocalFiles(JSON.parse(data))
  }

  const TgIcon = () => (
    <svg width="14" height="14" viewBox="0 0 240 240" fill="none">
      <circle cx="120" cy="120" r="120" fill="#2ea6ff"/>
      <path d="M81 128.5l14.5 40.5 18-11.5" fill="#c8daea"/>
      <path d="M81 128.5L170 82l-74.5 87 14.5 40.5" fill="#a9c9dd"/>
      <path d="M170 82L95.5 169.5 81 128.5 170 82z" fill="#fff"/>
      <path d="M95.5 169.5l18-11.5-3.5-9.5" fill="#b5cfe4"/>
    </svg>
  )

  return (
    <div
      ref={panelRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid', borderColor: dragOverPanel ? 'var(--accent)' : 'var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)', minHeight: 42 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <TgIcon />
          <span style={{ fontWeight: 600 }}>Saved Messages</span>
          {selected.length > 1 && (
            <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '1px 7px', borderRadius: 10 }}>
              {selected.length} selected
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => loadContents(tgPath)} title="Refresh" style={{ fontSize: 14 }}>↻</button>
          {selectedFiles.length > 0 && (
            <>
              <button className="btn btn-default" style={{ fontSize: 11 }} onClick={downloadSelected}>
                ↓ {selectedFiles.length > 1 ? `Download (${selectedFiles.length})` : 'Download'}
              </button>
              <button className="btn btn-danger" style={{ fontSize: 11 }} onClick={deleteSelected}>
                {selectedFiles.length > 1 ? `Delete (${selectedFiles.length})` : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loadingTg ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-secondary)' }}>
            <span className="spin" style={{ fontSize: 20 }}>↻</span><p>Loading…</p>
          </div>
        ) : tgContents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <p style={{ marginBottom: 4 }}>This folder is empty</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drag files from the left panel to upload</p>
          </div>
        ) : (
          tgContents.map(item => (
            <FileItem
              key={item.path}
              item={item}
              selected={selected.includes(item.path)}
              badge={item.type === 'file' && item.chunks > 1 ? `${item.chunks} parts` : null}
              onClick={e => handleItemClick(item, e)}
              onDoubleClick={() => {}}
              onDragStart={e => {
                const toDrag = selected.includes(item.path) ? selectedItems : [item]
                e.dataTransfer.setData('application/tg-drive-remote', JSON.stringify(toDrag))
              }}
              onDrop={e => { e.preventDefault(); e.stopPropagation() }}
            />
          ))
        )}
      </div>

      {/* Drop overlay */}
      {dragOverPanel && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(46,166,255,0.08)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--accent)', fontWeight: 600, fontSize: 14, pointerEvents: 'none' }}>
          <span style={{ fontSize: 28 }}>⬆</span>
          <p>Drop to upload</p>
        </div>
      )}
    </div>
  )
}
