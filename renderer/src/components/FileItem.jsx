import React from 'react'
import { formatSize } from '../utils'

const ICONS = {
  folder:      '📁',
  code:        '📄',
  braces:      '📋',
  image:       '🖼',
  video:       '🎬',
  music:       '🎵',
  archive:     '📦',
  package:     '📦',
  terminal:    '⚡',
  disc:        '💿',
  'file-text': '📝',
  file:        '📄'
}

export default function FileItem({ item, selected, onClick, onDoubleClick, onDragStart, onDrop, dragOver, badge }) {
  const icon = ICONS[item._icon || 'file'] || ICONS.file

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px', borderRadius: 5,
        border: '1px solid',
        borderColor: selected ? 'var(--accent)' : dragOver ? 'var(--accent)' : 'transparent',
        background: selected ? 'var(--accent-subtle)' : dragOver ? 'var(--bg-active)' : undefined,
        cursor: 'pointer', transition: 'background 0.1s', marginBottom: 1,
        outline: dragOver ? '1px dashed var(--accent)' : undefined
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <span style={{ fontSize: 15, lineHeight: 1, minWidth: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
      {badge && (
        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--bg-active)', color: 'var(--text-muted)', flexShrink: 0 }}>
          {badge}
        </span>
      )}
      <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
        {item.type === 'file' ? formatSize(item.size) : ''}
      </span>
    </div>
  )
}
