import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // --- Auth ---
  creds: null,   // { apiId, apiHash }
  user: null,    // { id, firstName, username, phone }
  setCreds: (creds) => set({ creds }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ creds: null, user: null, tgPath: '', tgHistory: [], tgContents: [] }),

  // --- Telegram panel navigation ---
  tgPath: '',
  tgHistory: [],
  tgContents: [],
  loadingTg: false,

  setTgPath: (p) => {
    const history = get().tgHistory
    set({ tgPath: p, tgHistory: [...history, p] })
  },
  tgBack: () => {
    const history = get().tgHistory
    if (history.length <= 1) return
    const newHistory = history.slice(0, -1)
    const prev = newHistory[newHistory.length - 1] ?? ''
    set({ tgPath: prev, tgHistory: newHistory })
  },
  setTgContents: (c) => set({ tgContents: c }),
  setLoadingTg: (v) => set({ loadingTg: v }),

  // --- Local panel ---
  localPath: null,
  localContents: [],
  loadingLocal: false,
  setLocalPath: (p) => set({ localPath: p }),
  setLocalContents: (c) => set({ localContents: c }),
  setLoadingLocal: (v) => set({ loadingLocal: v }),

  // --- Transfers ---
  // Each transfer: { id, name, direction, status, progress, chunk, totalChunks, bytesUploaded, totalBytes }
  transfers: [],
  addTransfer: (t) => set((s) => ({ transfers: [t, ...s.transfers.slice(0, 49)] })),
  updateTransfer: (id, patch) => set((s) => ({
    transfers: s.transfers.map(t => t.id === id ? { ...t, ...patch } : t)
  })),
  clearTransfers: () => set({ transfers: [] }),

  // --- Toast ---
  toast: null,
  showToast: (msg, type = 'info') => {
    const id = Date.now()
    set({ toast: { id, msg, type } })
    setTimeout(() => set((s) => s.toast?.id === id ? { toast: null } : {}), 3500)
  }
}))
