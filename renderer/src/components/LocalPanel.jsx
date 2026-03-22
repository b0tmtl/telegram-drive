import React, { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../store'
import { fileIcon, uniqueId } from '../utils'
import FileItem from './FileItem'

export default function LocalPanel() {
  const {
    localPath, localContents, setLocalPath, setLocalContents,
    loadingLocal, setLoadingLocal,
    tgPath, tgContents,
    showToast, addTransfer, updateTransfer
  } = useAppStore()

  const [selected, setSelected]         = useState([])
  const [history, setHistory]           = useState([])
  const [dragOverPanel, setDragOverPanel] = useState(false)
  const [editingPath, setEditingPath]   = useState(false)
  const [pathInput, setPathInput]       = useState('')
  const panelRef   = useRef()
  const pathInputRef = useRef()

  useEffect(() => { if (localPath) loadDir(localPath) }, [localPath])

  async function openFolder() {
    const folder = await window.api.selectLocalFolder()
    if (folder) { setHistory([]); setLocalPath(folder) }
  }

  async function loadDir(dir) {
    setLoadingLocal(true); setSelected([])
    const result = await window.api.listLocalDir(dir)
    if (result.ok) setLocalContents(result.contents.map(c => ({ ...c, _icon: fileIcon(c.name, c.type) })))
    else showToast(result.error, 'error')
    setLoadingLocal(false)
  }

  function navigate(item) {
    if (item.type === 'dir') { setHistory(h => [...h, localPath]); setLocalPath(item.path) }
  }

  function goBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1)); setLocalPath(prev)
  }

  function handleItemClick(item, e) {
    const multi = e.ctrlKey || e.metaKey
    if (multi) {
      setSelected(sel => sel.includes(item.path) ? sel.filter(p => p !== item.path) : [...sel, item.path])
    } else {
      setSelected([item.path])
    }
  }

  function startEditPath() {
    setPathInput(localPath || ''); setEditingPath(true)
    setTimeout(() => pathInputRef.current?.select(), 50)
  }

  async function commitPathEdit() {
    setEditingPath(false)
    const trimmed = pathInput.trim()
    if (!trimmed || trimmed === localPath) return
    const result = await window.api.listLocalDir(trimmed)
    if (result.ok) { setHistory(h => localPath ? [...h, localPath] : h); setLocalPath(trimmed) }
    else showToast('Path not found or not accessible', 'error')
  }

  // Handle drop of Telegram items → download them here
  async function handleTgDrop(items) {
    if (!localPath) { showToast('Open a local folder first', 'warning'); return }
    for (const item of items) {
      if (item.type === 'dir') { showToast('Folder download not supported — download files individually', 'warning'); continue }
      await downloadToLocal(item)
    }
    await loadDir(localPath)
  }

  async function downloadToLocal(tgItem) {
    const id = uniqueId()
    const savePath = localPath.replace(/\\/g, '/') + '/' + tgItem.name
    addTransfer({ id, name: tgItem.name, direction: 'download', status: 'active', chunk: 1, totalChunks: tgItem.chunks || 1 })

    // Subscribe to download progress for this file
    const unsub = window.api.onDownloadProgress((data) => {
      if (data.remotePath === tgItem.path) {
        updateTransfer(id, { chunk: data.chunk, totalChunks: data.totalChunks })
      }
    })

    const result = await window.api.downloadFile({ remotePath: tgItem.path, savePath })
    unsub()

    if (result.ok) {
      updateTransfer(id, { status: 'done' })
      showToast(`Downloaded: ${tgItem.name}`, 'success')
    } else {
      updateTransfer(id, { status: 'error', error: result.error })
      showToast(`Download failed: ${result.error}`, 'error')
    }
  }

  function handlePanelDragOver(e) {
    if (e.dataTransfer.types.includes('application/tg-drive-remote')) {
      e.preventDefault(); setDragOverPanel(true)
    }
  }
  function handlePanelDragLeave(e) {
    if (!panelRef.current?.contains(e.relatedTarget)) setDragOverPanel(false)
  }
  async function handlePanelDrop(e) {
    e.preventDefault(); setDragOverPanel(false)
    const data = e.dataTransfer.getData('application/tg-drive-remote')
    if (data) await handleTgDrop(JSON.parse(data))
  }

  const selectedItems = localContents.filter(c => selected.includes(c.path))
  const folderName = localPath ? localPath.replace(/\\/g, '/').split('/').pop() : null

  return (
    <div
      ref={panelRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid', borderColor: dragOverPanel ? 'var(--success)' : 'var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)', minHeight: 42 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15 }}>💻</span>
          <span style={{ fontWeight: 600 }}>{folderName || 'Local'}</span>
          {selected.length > 1 && (
            <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '1px 7px', borderRadius: 10 }}>
              {selected.length} selected
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {localPath && <button className="btn btn-ghost" onClick={() => loadDir(localPath)} title="Refresh" style={{ fontSize: 14 }}>↻</button>}
          {history.length > 0 && <button className="btn btn-ghost" onClick={goBack} style={{ fontSize: 11 }}>← back</button>}
          <button className="btn btn-default" style={{ fontSize: 11 }} onClick={openFolder}>
            📂 {localPath ? 'Change' : 'Open Folder'}
          </button>
        </div>
      </div>

      {/* Path bar */}
      {localPath && (
        <div
          style={{ padding: '3px 10px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)', minHeight: 26, display: 'flex', alignItems: 'center', cursor: editingPath ? 'text' : 'pointer' }}
          onClick={() => { if (!editingPath) startEditPath() }}
          title="Click to edit path"
        >
          {editingPath ? (
            <input
              ref={pathInputRef}
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              onBlur={commitPathEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitPathEdit(); if (e.key === 'Escape') setEditingPath(false) }}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none' }}
              autoFocus
            />
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
              {localPath}
            </span>
          )}
        </div>
      )}

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {!localPath ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>
            <span style={{ fontSize: 32 }}>📂</span>
            <p>No folder open</p>
            <button className="btn btn-default" style={{ marginTop: 8 }} onClick={openFolder}>Open Folder</button>
          </div>
        ) : loadingLocal ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-secondary)' }}>
            <span className="spin" style={{ fontSize: 20 }}>↻</span><p>Loading...</p>
          </div>
        ) : localContents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            <span style={{ fontSize: 32 }}>📭</span><p>Empty folder</p>
          </div>
        ) : (
          localContents.map(item => (
            <FileItem
              key={item.path}
              item={item}
              selected={selected.includes(item.path)}
              onClick={e => handleItemClick(item, e)}
              onDoubleClick={() => navigate(item)}
              onDragStart={e => {
                const toDrag = selected.includes(item.path) ? selectedItems : [item]
                e.dataTransfer.setData('application/tg-drive-local', JSON.stringify(toDrag))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onDrop={e => {
                e.preventDefault(); e.stopPropagation()
                const data = e.dataTransfer.getData('application/tg-drive-remote')
                if (data) handleTgDrop(JSON.parse(data))
              }}
            />
          ))
        )}
      </div>

      {/* Drop overlay */}
      {dragOverPanel && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(69,200,120,0.08)', border: '2px dashed var(--success)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--success)', fontWeight: 600, fontSize: 14, pointerEvents: 'none' }}>
          <span style={{ fontSize: 28 }}>⬇</span>
          <p>Drop to download here</p>
        </div>
      )}
    </div>
  )
}
