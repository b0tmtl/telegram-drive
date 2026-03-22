export function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function fileIcon(name, type) {
  if (type === 'dir') return 'folder'
  const ext = name.split('.').pop()?.toLowerCase()
  const map = {
    js: 'code', jsx: 'code', ts: 'code', tsx: 'code', py: 'code', rs: 'code',
    go: 'code', java: 'code', c: 'code', cpp: 'code', cs: 'code', php: 'code',
    html: 'code', css: 'code', scss: 'code', vue: 'code', svelte: 'code',
    json: 'braces', yaml: 'braces', yml: 'braces', toml: 'braces', xml: 'braces',
    md: 'file-text', txt: 'file-text', pdf: 'file-text', doc: 'file-text', docx: 'file-text',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video',
    mp3: 'music', wav: 'music', flac: 'music', m4a: 'music',
    zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive',
    exe: 'package', msi: 'package', dmg: 'package', deb: 'package', rpm: 'package',
    sh: 'terminal', bat: 'terminal', ps1: 'terminal', cmd: 'terminal',
    iso: 'disc', img: 'disc',
  }
  return map[ext] || 'file'
}

export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function joinPath(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}

export function formatProgress(bytesUploaded, totalBytes) {
  if (!totalBytes) return ''
  const pct = Math.round((bytesUploaded / totalBytes) * 100)
  return `${pct}% — ${formatSize(bytesUploaded)} / ${formatSize(totalBytes)}`
}
