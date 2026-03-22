import React, { useEffect, useState } from 'react'
import { useAppStore } from './store'
import Setup from './components/Setup'
import Titlebar from './components/Titlebar'
import TelegramPanel from './components/TelegramPanel'
import LocalPanel from './components/LocalPanel'
import TransferQueue from './components/TransferQueue'
import Toast from './components/Toast'

export default function App() {
  const { creds, user, setCreds, setUser } = useAppStore()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    async function boot() {
      const saved = await window.api.getCreds()
      if (saved) {
        setCreds(saved)
        const result = await window.api.restoreSession({ apiId: saved.apiId, apiHash: saved.apiHash })
        if (result.ok) setUser(result.user)
      }
      setBooting(false)
    }
    boot()
  }, [])

  if (booting) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', flexDirection: 'column', gap: 12 }}>
        <svg width="32" height="32" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="120" fill="#2ea6ff"/>
          <path d="M81 128.5l14.5 40.5 18-11.5" fill="#c8daea"/>
          <path d="M81 128.5L170 82l-74.5 87 14.5 40.5" fill="#a9c9dd"/>
          <path d="M170 82L95.5 169.5 81 128.5 170 82z" fill="#fff"/>
        </svg>
        <span className="spin" style={{ fontSize: 20, color: 'var(--text-secondary)' }}>↻</span>
      </div>
    )
  }

  if (!user) return <Setup />

  return (
    <div style={styles.root}>
      <Titlebar />
      <div style={styles.body}>
        <div style={styles.panelWrapper}>
          <LocalPanel />
        </div>
        <div style={styles.divider}>
          <div style={styles.arrowHint}>
            <span style={{ color: 'var(--accent)', fontSize: 13 }}>→</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>upload</span>
          </div>
          <div style={styles.arrowHint}>
            <span style={{ color: 'var(--success)', fontSize: 13 }}>←</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>download</span>
          </div>
        </div>
        <div style={styles.panelWrapper}>
          <TelegramPanel />
        </div>
        <div style={styles.sidebar}>
          <TransferQueue />
        </div>
      </div>
      <Toast />
    </div>
  )
}

const styles = {
  root:         { height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)', overflow: 'hidden' },
  body:         { flex: 1, display: 'flex', padding: '10px', overflow: 'hidden', gap: 8 },
  panelWrapper: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  divider:      { width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, flexShrink: 0 },
  arrowHint:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  sidebar:      { width: 190, flexShrink: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
}
