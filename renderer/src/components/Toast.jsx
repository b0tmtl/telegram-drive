import React from 'react'
import { useAppStore } from '../store'

const COLORS = {
  success: { bg: 'var(--success-subtle)', border: 'var(--success)', text: 'var(--success)' },
  error:   { bg: 'var(--danger-subtle)',  border: 'var(--danger)',  text: 'var(--danger)' },
  warning: { bg: 'var(--warning-subtle)', border: 'var(--warning)', text: 'var(--warning)' },
  info:    { bg: 'var(--accent-subtle)',  border: 'var(--accent)',  text: 'var(--accent)' }
}
const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }

export default function Toast() {
  const { toast } = useAppStore()
  if (!toast) return null
  const c = COLORS[toast.type] || COLORS.info
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 8,
      background: c.bg, border: `1px solid ${c.border}`,
      boxShadow: 'var(--shadow-lg)', zIndex: 999,
      maxWidth: 420, whiteSpace: 'nowrap'
    }} className="fade-in">
      <span style={{ color: c.text, fontWeight: 700 }}>{ICONS[toast.type]}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{toast.msg}</span>
    </div>
  )
}
