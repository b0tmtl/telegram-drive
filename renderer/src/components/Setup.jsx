import React, { useState } from 'react'
import { useAppStore } from '../store'

const STEP = { CREDS: 'creds', PHONE: 'phone', CODE: 'code', PASSWORD: 'password' }

export default function Setup() {
  const { setCreds, setUser } = useAppStore()

  const [step, setStep]               = useState(STEP.CREDS)
  const [apiId, setApiId]             = useState('')
  const [apiHash, setApiHash]         = useState('')
  const [phone, setPhone]             = useState('')
  const [code, setCode]               = useState('')
  const [password, setPassword]       = useState('')
  const [phoneCodeHash, setPhcHash]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleCredsContinue() {
    if (!apiId.trim() || !apiHash.trim()) return
    setLoading(true); setError('')
    // Just persist and advance — we'll validate on phone send
    await window.api.setCreds({ apiId: apiId.trim(), apiHash: apiHash.trim() })
    setCreds({ apiId: apiId.trim(), apiHash: apiHash.trim() })
    setStep(STEP.PHONE)
    setLoading(false)
  }

  async function handleSendCode() {
    if (!phone.trim()) return
    setLoading(true); setError('')
    const res = await window.api.sendCode({ apiId, apiHash, phone: phone.trim() })
    if (res.ok) {
      setPhcHash(res.phoneCodeHash)
      setStep(STEP.CODE)
    } else {
      setError(res.error || 'Failed to send code.')
    }
    setLoading(false)
  }

  async function handleSignIn() {
    if (!code.trim()) return
    setLoading(true); setError('')
    const res = await window.api.signIn({ apiId, apiHash, phone, code: code.trim(), phoneCodeHash })
    if (res.ok) {
      setUser(res.user)
    } else if (res.need2fa) {
      setStep(STEP.PASSWORD)
    } else {
      setError(res.error || 'Invalid code.')
    }
    setLoading(false)
  }

  async function handleCheckPassword() {
    if (!password.trim()) return
    setLoading(true); setError('')
    const res = await window.api.checkPassword({ password: password.trim() })
    if (res.ok) {
      setUser(res.user)
    } else {
      setError(res.error || 'Wrong password.')
    }
    setLoading(false)
  }

  // Telegram paper-plane SVG logo
  const TgLogo = () => (
    <svg width="48" height="48" viewBox="0 0 240 240" fill="none">
      <circle cx="120" cy="120" r="120" fill="#2ea6ff"/>
      <path d="M81 128.5l14.5 40.5 18-11.5" fill="#c8daea"/>
      <path d="M81 128.5L170 82l-74.5 87 14.5 40.5" fill="#a9c9dd"/>
      <path d="M170 82L95.5 169.5 81 128.5 170 82z" fill="#fff"/>
      <path d="M95.5 169.5l18-11.5-3.5-9.5" fill="#b5cfe4"/>
    </svg>
  )

  return (
    <div style={s.outer}>
      <div style={s.card} className="fade-in">

        <div style={s.logo}><TgLogo /></div>
        <h1 style={s.title}>Telegram Drive</h1>
        <p style={s.subtitle}>Use your Telegram account as unlimited personal cloud storage.</p>

        {/* Step indicator */}
        <div style={s.steps}>
          {[STEP.CREDS, STEP.PHONE, STEP.CODE].map((st, i) => (
            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: step === st ? 'var(--accent)' : (
                  [STEP.CREDS, STEP.PHONE, STEP.CODE].indexOf(step) > i ? 'var(--success)' : 'var(--bg-active)'
                ),
                color: [STEP.CREDS, STEP.PHONE, STEP.CODE].indexOf(step) > i ? '#fff' : step === st ? '#fff' : 'var(--text-muted)'
              }}>
                {[STEP.CREDS, STEP.PHONE, STEP.CODE].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: step === st ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {['API credentials', 'Phone number', 'Verify code'][i]}
              </span>
              {i < 2 && <span style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — API creds */}
        {step === STEP.CREDS && (
          <div className="fade-in">
            <div style={s.hint}>
              <span style={{ fontSize: 13 }}>ℹ️</span>
              <span>Go to <a href="#" onClick={e => { e.preventDefault(); window.api.openExternal('https://my.telegram.org/apps') }}>my.telegram.org/apps</a> → create an app → copy <strong>App api_id</strong> and <strong>App api_hash</strong>.</span>
            </div>
            <label style={s.label}>App api_id</label>
            <input style={s.input} placeholder="12345678" value={apiId} onChange={e => setApiId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCredsContinue()} autoFocus />
            <label style={s.label}>App api_hash</label>
            <input style={s.input} placeholder="0123456789abcdef0123456789abcdef" value={apiHash}
              onChange={e => setApiHash(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCredsContinue()} />
            {error && <p style={s.err}>{error}</p>}
            <button className="btn btn-primary" style={s.btn} onClick={handleCredsContinue}
              disabled={loading || !apiId.trim() || !apiHash.trim()}>
              {loading ? <span className="spin">↻</span> : 'Continue →'}
            </button>
          </div>
        )}

        {/* STEP 2 — Phone */}
        {step === STEP.PHONE && (
          <div className="fade-in">
            <div style={s.hint}>
              <span style={{ fontSize: 13 }}>📱</span>
              <span>Enter your Telegram phone number with country code (e.g. <strong>+15551234567</strong>).</span>
            </div>
            <label style={s.label}>Phone number</label>
            <input style={s.input} placeholder="+15551234567" value={phone}
              onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendCode()} autoFocus />
            {error && <p style={s.err}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 0 }} onClick={() => { setStep(STEP.CREDS); setError('') }}>← Back</button>
              <button className="btn btn-primary" style={{ ...s.btn, flex: 1 }} onClick={handleSendCode}
                disabled={loading || !phone.trim()}>
                {loading ? <span className="spin">↻</span> : 'Send Code'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Code */}
        {step === STEP.CODE && (
          <div className="fade-in">
            <div style={s.hint}>
              <span style={{ fontSize: 13 }}>💬</span>
              <span>A code was sent to your Telegram app. Enter it below.</span>
            </div>
            <label style={s.label}>Verification code</label>
            <input style={{ ...s.input, letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
              placeholder="12345" value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()} autoFocus maxLength={10} />
            {error && <p style={s.err}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 0 }} onClick={() => { setStep(STEP.PHONE); setCode(''); setError('') }}>← Back</button>
              <button className="btn btn-primary" style={{ ...s.btn, flex: 1 }} onClick={handleSignIn}
                disabled={loading || !code.trim()}>
                {loading ? <span className="spin">↻</span> : 'Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — 2FA */}
        {step === STEP.PASSWORD && (
          <div className="fade-in">
            <div style={s.hint}>
              <span style={{ fontSize: 13 }}>🔐</span>
              <span>Your account has two-step verification enabled. Enter your cloud password.</span>
            </div>
            <label style={s.label}>Cloud password</label>
            <input style={s.input} type="password" placeholder="••••••••••" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCheckPassword()} autoFocus />
            {error && <p style={s.err}>{error}</p>}
            <button className="btn btn-primary" style={s.btn} onClick={handleCheckPassword}
              disabled={loading || !password.trim()}>
              {loading ? <span className="spin">↻</span> : 'Verify Password'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  outer:    { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: 24 },
  card:     { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '36px 40px', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' },
  logo:     { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  title:    { textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 8 },
  subtitle: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 },
  steps:    { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 8, border: '1px solid var(--border-subtle)' },
  hint:     { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 },
  label:    { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:    { display: 'block', width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 14 },
  btn:      { width: '100%', justifyContent: 'center', padding: '9px 18px', fontSize: 13, marginTop: 4 },
  err:      { color: 'var(--danger)', fontSize: 12, marginBottom: 12, marginTop: -8 }
}
