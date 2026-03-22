import React from 'react'
import { useAppStore } from '../store'
import { formatSize } from '../utils'

const STATUS_ICON = {
  active: <span className="spin" style={{ fontSize: 12, display: 'inline-block' }}>↻</span>,
  done:   <span style={{ color: 'var(--success)' }}>✓</span>,
  error:  <span style={{ color: 'var(--danger)' }}>✕</span>
}

const DIR_META = {
  upload:   { label: '↑ Upload',   color: 'var(--accent)' },
  download: { label: '↓ Download', color: 'var(--success)' },
  delete:   { label: '🗑 Delete',  color: 'var(--danger)' }
}

function ProgressBar({ pct }) {
  return (
    <div className="progress-bar-track" style={{ marginTop: 4 }}>
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function TransferQueue() {
  const { transfers, clearTransfers } = useAppStore()

  if (transfers.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 12 }}>
      <span style={{ fontSize: 22 }}>📋</span>
      <p>No recent activity</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Activity</span>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={clearTransfers}>Clear</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {transfers.map(t => {
          const dir = DIR_META[t.direction] || { label: t.direction, color: 'var(--text-secondary)' }
          const pct = t.totalBytes ? Math.round((t.bytesUploaded / t.totalBytes) * 100) : null
          const hasChunks = t.totalChunks > 1

          return (
            <div key={t.id} style={{ padding: '6px 6px', borderRadius: 5, marginBottom: 2, background: t.status === 'active' ? 'var(--bg-overlay)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ minWidth: 18 }}>{STATUS_ICON[t.status]}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={t.name}>{t.name}</span>
              </div>

              <div style={{ marginLeft: 22, fontSize: 11, color: dir.color }}>{dir.label}</div>

              {/* Chunk progress for active transfers */}
              {t.status === 'active' && hasChunks && (
                <div style={{ marginLeft: 22, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Part {t.chunk}/{t.totalChunks}
                </div>
              )}

              {t.status === 'active' && pct !== null && (
                <>
                  <div style={{ marginLeft: 22 }}>
                    <ProgressBar pct={pct} />
                  </div>
                  <div style={{ marginLeft: 22, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatSize(t.bytesUploaded)} / {formatSize(t.totalBytes)} ({pct}%)
                  </div>
                </>
              )}

              {t.status === 'active' && pct === null && t.direction === 'download' && t.totalChunks && (
                <div style={{ marginLeft: 22, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Downloading part {t.chunk}/{t.totalChunks}…
                </div>
              )}

              {t.error && (
                <div style={{ marginLeft: 22, fontSize: 11, color: 'var(--danger)', marginTop: 2, whiteSpace: 'normal', lineHeight: 1.4 }}>
                  {t.error}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
