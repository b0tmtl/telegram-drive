import React from 'react'
import { useAppStore } from '../store'

export default function Titlebar() {
  const { user, clearAuth, showToast } = useAppStore()

  async function handleSignOut() {
    await window.api.signOut()
    await window.api.deleteCreds()
    clearAuth()
    showToast('Signed out', 'info')
  }

  const isMac = navigator.platform.toLowerCase().includes('mac')

  const TgIcon = () => (
    <svg width="16" height="16" viewBox="0 0 240 240" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="120" cy="120" r="120" fill="#2ea6ff"/>
      <path d="M81 128.5l14.5 40.5 18-11.5" fill="#c8daea"/>
      <path d="M81 128.5L170 82l-74.5 87 14.5 40.5" fill="#a9c9dd"/>
      <path d="M170 82L95.5 169.5 81 128.5 170 82z" fill="#fff"/>
      <path d="M95.5 169.5l18-11.5-3.5-9.5" fill="#b5cfe4"/>
    </svg>
  )

  return (
    <div style={{ ...styles.bar, paddingLeft: isMac ? 80 : 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <TgIcon />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Telegram Drive
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
        {user && (
          <>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              {(user.firstName || user.username || '?')[0].toUpperCase()}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {user.firstName || user.username}
              {user.username && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>@{user.username}</span>}
            </span>
          </>
        )}
        <button className="btn btn-ghost" onClick={handleSignOut} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    background: 'var(--bg-overlay)',
    borderBottom: '1px solid var(--border)',
    paddingRight: 12,
    WebkitAppRegion: 'drag',
    flexShrink: 0,
    position: 'relative'
  }
}
