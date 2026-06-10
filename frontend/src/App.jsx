// ═══════════════════════════════════════════════════════════════
// LexAI App.jsx v4.0 — Complete Law Firm Portal
// Scroll fix + inquiry forms + member mgmt + leads inbox + reviews
// Uses all 18 backend endpoints
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const req = async (method, path, body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(API + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Federal']
const PRACTICE_AREAS = ['Criminal', 'Civil', 'Family', 'Corporate', 'Property', 'Banking', 'Labour', 'Tax', 'Constitutional']
const ROLES = ['owner', 'admin', 'partner', 'associate', 'intern']
const SUGGESTIONS = [
  "What are my rights if arrested in Pakistan?",
  "How do I file for Khula divorce?",
  "Punishment for theft under PPC?",
  "How to register a company in Pakistan?",
  "پاکستان میں وراثت کے قوانین کیا ہیں؟",
  "Bail rights under CrPC?",
]

const S = {
  app: { minHeight: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  authedApp: { display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: 'hidden' },
  landingNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 },
  brand: { fontSize: 22, fontWeight: 700, color: '#0a1628', margin: 0, cursor: 'pointer' },
  brandAccent: { color: '#3b82f6' },
  navLinks: { display: 'flex', gap: 18, alignItems: 'center' },
  navLink: { fontSize: 13, color: '#64748b', cursor: 'pointer', fontWeight: 500, background: 'none', border: 'none' },
  navBtn: (p) => ({ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: p ? 'none' : '1px solid #e2e8f0', background: p ? '#0a1628' : 'white', color: p ? 'white' : '#374151' }),
  hero: { maxWidth: 980, margin: '0 auto', padding: '48px 24px 32px', textAlign: 'center' },
  heroTitle: { fontSize: 38, fontWeight: 700, color: '#0a1628', margin: '0 0 12px', lineHeight: 1.15 },
  heroSubtitle: { fontSize: 16, color: '#64748b', maxWidth: 620, margin: '0 auto 28px', lineHeight: 1.6 },
  heroBadges: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 },
  heroBadge: { background: '#eff6ff', color: '#1e40af', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  chatCard: { maxWidth: 880, margin: '0 auto 60px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' },
  chatHeader: { padding: '14px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatStatus: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' },
  chatStatusDot: { width: 8, height: 8, background: '#16a34a', borderRadius: '50%' },
  chatMsgs: { padding: 24, minHeight: 320, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  chatEmpty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 20px', textAlign: 'center' },
  suggs: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8, maxWidth: 640, width: '100%' },
  suggBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#374151', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  userBubble: { maxWidth: '75%', background: '#0a1628', color: 'white', borderRadius: '14px 14px 3px 14px', padding: '11px 15px', fontSize: 13.5, lineHeight: 1.6 },
  botRow: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  botAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  botBubble: { flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px 14px 14px 14px', padding: 14, fontSize: 13.5, lineHeight: 1.7, color: '#1f2937' },
  ansText: { whiteSpace: 'pre-wrap', margin: '0 0 10px' },
  chatInputArea: { borderTop: '1px solid #e2e8f0', padding: '12px 22px', background: 'white' },
  filterRow: { display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' },
  inputRow: { display: 'flex', gap: 10 },
  inputBox: { flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', resize: 'none' },
  sendBtn: (d) => ({ background: d ? '#94a3b8' : '#0a1628', color: 'white', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13.5, cursor: d ? 'not-allowed' : 'pointer', fontWeight: 500 }),
  anonBanner: { background: '#fef9c3', color: '#854d0e', padding: '7px 14px', fontSize: 11.5, textAlign: 'center', borderTop: '1px solid #fde68a' },
  section: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px' },
  sectionTitle: { fontSize: 24, fontWeight: 600, color: '#0a1628', textAlign: 'center', marginBottom: 8 },
  sectionSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  featureCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 },
  featureIcon: { fontSize: 26, marginBottom: 10 },
  featureTitle: { fontSize: 15, fontWeight: 600, color: '#0a1628', margin: '0 0 6px' },
  featureDesc: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 },
  footer: { background: '#0a1628', color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '32px 24px', fontSize: 13, marginTop: 40 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  authModal: { background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  sidebar: { width: 240, background: '#0a1628', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarLogo: { padding: '22px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  sidebarUser: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 },
  sidebarAvatar: { width: 34, height: 34, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 13 },
  sidebarNav: { flex: 1, padding: '10px 8px', overflowY: 'auto' },
  sidebarSection: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', margin: '4px 0 0' },
  navItem: (a) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a ? 'white' : 'rgba(255,255,255,0.6)', background: a ? '#3b82f6' : 'transparent', border: 'none', width: '100%', textAlign: 'left' }),
  sidebarBottom: { padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left' },
  main: { flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' },
  topbar: { background: 'white', padding: '14px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  content: { padding: 28, overflowY: 'auto', flex: 1 },
  card: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 22, marginBottom: 20 },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white', fontFamily: 'inherit' },
  textarea: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 80 },
  btn: (v='primary') => ({ padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: v==='primary'?'#0a1628':v==='blue'?'#3b82f6':v==='red'?'#dc2626':v==='green'?'#16a34a':'#f1f5f9', color: v==='ghost'?'#374151':'white' }),
  badge: (c) => { const m={green:{bg:'#dcfce7',c:'#166534'},blue:{bg:'#dbeafe',c:'#1e40af'},yellow:{bg:'#fef9c3',c:'#854d0e'},red:{bg:'#fee2e2',c:'#991b1b'},gray:{bg:'#f1f5f9',c:'#475569'},purple:{bg:'#f3e8ff',c:'#6b21a8'}}; const s=m[c]||m.gray; return {background:s.bg,color:s.c,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:500,display:'inline-block'} },
  msgError: { color: '#dc2626', fontSize: 12, marginTop: 6 },
  msgSuccess: { color: '#16a34a', fontSize: 12, marginTop: 6 },
  statCard: (c) => ({ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, borderLeft: '4px solid ' + c }),
  statValue: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 },
  statLabel: { fontSize: 12, color: '#64748b', margin: '3px 0 0' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 },
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 20 },
  tab: (a) => ({ padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: a ? '#0a1628' : '#64748b', background: 'transparent', border: 'none', borderBottom: a ? '2px solid #3b82f6' : '2px solid transparent', marginBottom: -1 }),
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 500 },
  td: { padding: '12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' },
}

// ═════════════════════════════════════════════════════════════════
// AUTH MODAL
// ═════════════════════════════════════════════════════════════════
function AuthModal({ mode, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'client', phone: '', city: '' })
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)

  const submit = async () => {
    setErr(''); setLoading(true)
    try {
      if (isLogin) {
        const res = await fetch(API + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'username=' + encodeURIComponent(f.email) + '&password=' + encodeURIComponent(f.password)
        })
        const d = await res.json()
        if (d.access_token) { localStorage.setItem('lexai_token', d.access_token); onSuccess(d) }
        else setErr(d.detail || 'Invalid credentials')
      } else {
        if (!f.full_name || !f.email || !f.password) { setErr('Name, email, password required'); setLoading(false); return }
        const d = await req('POST', '/api/auth/register', f)
        localStorage.setItem('lexai_token', d.access_token); onSuccess(d)
      }
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.authModal} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 6px' }}>Lex<span style={{ color: '#3b82f6' }}>AI</span></h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: 24, fontSize: 13 }}>{isLogin ? 'Welcome back' : 'Create your account'}</p>
        {!isLogin && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {['client', 'lawyer'].map(r => (
              <div key={r} onClick={() => setF(p => ({ ...p, role: r }))} style={{ padding: 12, border: '2px solid ' + (f.role === r ? '#3b82f6' : '#e2e8f0'), borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: f.role === r ? '#eff6ff' : 'white' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{r === 'client' ? '👤' : '⚖️'}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: f.role === r ? '#3b82f6' : '#374151', textTransform: 'capitalize' }}>{r}</div>
              </div>
            ))}
          </div>
          <div style={S.formGroup}><label style={S.label}>Full name *</label><input style={S.input} value={f.full_name} onChange={set('full_name')} /></div>
        </>)}
        <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} type="email" value={f.email} onChange={set('email')} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <div style={S.formGroup}><label style={S.label}>Password *</label><input style={S.input} type="password" value={f.password} onChange={set('password')} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        {!isLogin && (<>
          <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={set('phone')} /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={f.city} onChange={set('city')} /></div>
        </>)}
        {err && <p style={S.msgError}>❌ {err}</p>}
        <button style={{ ...S.btn('primary'), width: '100%', padding: 12, marginTop: 6 }} onClick={submit} disabled={loading}>{loading ? '...' : (isLogin ? 'Sign in' : 'Create account')}</button>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#64748b' }}>{isLogin ? "No account? " : "Have an account? "}<span style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setIsLogin(!isLogin); setErr('') }}>{isLogin ? 'Register' : 'Sign in'}</span></p>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// CHATBOT
// ═════════════════════════════════════════════════════════════════
function Chatbot({ token, user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [province, setProvince] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const msgsRef = useRef(null)
  const userId = user?.id || user?.user_id || null

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages])

  async function send(queryText) {
    const q = queryText || input.trim()
    if (!q || loading) return
    setInput(''); setLoading(true)
    const uid = Date.now()
    setMessages(prev => [...prev, { id: uid, role: 'user', content: q }, { id: uid + 1, role: 'assistant', content: '', loading: true, sources: [], confidence: 'medium' }])
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(API + '/api/chat/stream', {
        method: 'POST', headers,
        body: JSON.stringify({ message: q, session_id: sessionId, user_id: userId, province_filter: province || null })
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'HTTP ' + res.status) }
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let full = '', sources = [], conf = 'medium'
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'meta') {
              if (d.session_id) setSessionId(d.session_id)
              if (d.sources) sources = d.sources
              if (d.confidence) conf = d.confidence
              setMessages(prev => prev.map(m => m.id === uid + 1 ? { ...m, sources, confidence: conf } : m))
            } else if (d.type === 'token') {
              full += d.content
              setMessages(prev => prev.map(m => m.id === uid + 1 ? { ...m, content: full, loading: false } : m))
            } else if (d.type === 'done') {
              setMessages(prev => prev.map(m => m.id === uid + 1 ? { ...m, loading: false } : m))
            } else if (d.type === 'error') throw new Error(d.content)
          } catch { }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === uid + 1 ? { ...m, content: '❌ ' + e.message, loading: false } : m))
    }
    setLoading(false)
  }

  return (
    <div style={S.chatCard}>
      <div style={S.chatHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚖️</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0a1628' }}>LexAI Legal Assistant</span>
        </div>
        <div style={S.chatStatus}><div style={S.chatStatusDot} /><span>Pakistani law · Urdu + English</span></div>
      </div>
      <div style={S.chatMsgs} ref={msgsRef}>
        {messages.length === 0 ? (
          <div style={S.chatEmpty}>
            <div style={{ fontSize: 42 }}>⚖️</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#0a1628', margin: 0 }}>Ask anything about Pakistani law</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Free to use · No signup required</p>
            <div style={S.suggs}>{SUGGESTIONS.map((s, i) => <button key={i} style={S.suggBtn} onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id}>
            {msg.role === 'user' ? <div style={S.userRow}><div style={S.userBubble}>{msg.content}</div></div> : (
              <div style={S.botRow}>
                <div style={S.botAvatar}>⚖️</div>
                <div style={S.botBubble}>
                  {msg.loading && !msg.content ? (
                    <div style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s ease-in-out ' + (i * 0.15) + 's infinite' }} />)}</div>
                  ) : (<>
                    <p style={S.ansText}>{msg.content}</p>
                    {!msg.loading && msg.sources?.length > 0 && <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>📄 {msg.sources.length} legal source{msg.sources.length > 1 ? 's' : ''} consulted</div>}
                  </>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={S.chatInputArea}>
        <div style={S.filterRow}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Province:</span>
          <select style={{ fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', background: 'white' }} value={province} onChange={e => setProvince(e.target.value)}>
            <option value="">All</option>
            {PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={S.inputRow}>
          <textarea style={S.inputBox} rows={2} placeholder="Type your legal question in English or اردو..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} disabled={loading} />
          <button style={S.sendBtn(loading || !input.trim())} onClick={() => send()} disabled={loading || !input.trim()}>{loading ? '...' : 'Ask'}</button>
        </div>
      </div>
      {!token && <div style={S.anonBanner}>💡 You're chatting as a guest — chat history won't be saved. <strong>Sign up free</strong> to save sessions.</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═════════════════════════════════════════════════════════════════
function LandingPage({ onOpenAuth }) {
  return (
    <div style={S.app}>
      <nav style={S.landingNav}>
        <h1 style={S.brand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lex<span style={S.brandAccent}>AI</span></h1>
        <div style={S.navLinks}>
          <button style={S.navLink} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button style={S.navLink} onClick={() => document.getElementById('firms')?.scrollIntoView({ behavior: 'smooth' })}>Law Firms</button>
          <button style={S.navBtn(false)} onClick={() => onOpenAuth('login')}>Sign in</button>
          <button style={S.navBtn(true)} onClick={() => onOpenAuth('register')}>Sign up</button>
        </div>
      </nav>
      <div style={S.hero}>
        <div style={S.heroBadges}>
          <span style={S.heroBadge}>🇵🇰 Pakistani Law</span>
          <span style={S.heroBadge}>🤖 AI-Powered</span>
          <span style={S.heroBadge}>📚 26GB Legal Library</span>
          <span style={S.heroBadge}>🆓 Free to Try</span>
        </div>
        <h1 style={S.heroTitle}>Where Law Meets Intelligence</h1>
        <p style={S.heroSubtitle}>Get instant answers about Pakistani law in English or Urdu. Connect with verified lawyers and law firms across Pakistan.</p>
      </div>
      <Chatbot token={null} user={null} />
      <section id="features" style={S.section}>
        <h2 style={S.sectionTitle}>Built for clients, lawyers & law firms</h2>
        <p style={S.sectionSub}>Everything you need to navigate Pakistani law in one platform</p>
        <div style={S.featureGrid}>
          {[
            { i: '⚖️', t: 'AI Legal Assistant', d: 'Ask questions about Pakistani law and get answers in seconds.' },
            { i: '🏛️', t: 'Find Lawyers', d: 'Browse verified lawyers by city, specialization, and rating.' },
            { i: '🏢', t: 'Law Firms', d: 'Discover top Pakistani law firms with full team profiles.' },
            { i: '📂', t: 'Case Management', d: 'Lawyers track cases, hearings, and documents.' },
            { i: '💬', t: 'Secure Messaging', d: 'Direct messaging between clients and lawyers.' },
            { i: '🇵🇰', t: 'Urdu Support', d: 'Ask in Urdu or English — AI responds in your language.' },
          ].map(f => <div key={f.t} style={S.featureCard}><div style={S.featureIcon}>{f.i}</div><h3 style={S.featureTitle}>{f.t}</h3><p style={S.featureDesc}>{f.d}</p></div>)}
        </div>
      </section>
      <section id="firms" style={{ ...S.section, background: 'white', maxWidth: '100%', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={S.sectionTitle}>For Law Firms</h2>
          <p style={S.sectionSub}>Modernize your practice with AI-powered tools and centralized case management</p>
          <div style={S.featureGrid}>
            {[
              { i: '🏢', t: 'Firm Profiles', d: 'Showcase your firm with a beautiful public profile.' },
              { i: '👥', t: 'Multi-Lawyer Teams', d: 'Invite lawyers, assign roles, track caseloads.' },
              { i: '📊', t: 'Firm Dashboard', d: 'Firm-wide analytics: cases, lawyers, pending leads.' },
              { i: '🎯', t: 'Lead Capture', d: 'Clients submit inquiries through your firm page.' },
              { i: '⭐', t: 'Reviews & Ratings', d: 'Build trust with verified client reviews.' },
              { i: '✓', t: 'Verification Badge', d: 'Get verified for higher search ranking.' },
            ].map(f => <div key={f.t} style={S.featureCard}><div style={S.featureIcon}>{f.i}</div><h3 style={S.featureTitle}>{f.t}</h3><p style={S.featureDesc}>{f.d}</p></div>)}
          </div>
        </div>
      </section>
      <footer style={S.footer}>© {new Date().getFullYear()} LexAI · Built for Pakistan · <span style={{ color: '#3b82f6' }}>Where Law Meets Intelligence</span></footer>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// FIRM MARKETPLACE
// ═════════════════════════════════════════════════════════════════
function FirmMarketplace({ onSelect }) {
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ q: '', city: '', province: '', practice_area: '', verified_only: false })

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
    req('GET', '/api/firms/?' + params).then(d => { setFirms(d.firms || []); setLoading(false) }).catch(() => setLoading(false))
  }, [filters])
  useEffect(() => { load() }, [])

  const setF = k => v => setFilters(p => ({ ...p, [k]: v }))

  return (
    <div style={S.content}>
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, alignItems: 'end', marginBottom: 10 }}>
          <div><label style={S.label}>Search</label><input style={S.input} placeholder="Name, city, description..." value={filters.q} onChange={e => setF('q')(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /></div>
          <div><label style={S.label}>City</label><input style={S.input} value={filters.city} onChange={e => setF('city')(e.target.value)} /></div>
          <div><label style={S.label}>Province</label><select style={S.select} value={filters.province} onChange={e => setF('province')(e.target.value)}><option value="">All</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label style={S.label}>Practice Area</label><select style={S.select} value={filters.practice_area} onChange={e => setF('practice_area')(e.target.value)}><option value="">All</option>{PRACTICE_AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={filters.verified_only} onChange={e => setF('verified_only')(e.target.checked)} /> Verified firms only
          </label>
          <button style={S.btn('primary')} onClick={load}>Search</button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {firms.length === 0 ? <p>No firms found.</p> : firms.map(f => (
            <div key={f.id} style={{ ...S.card, cursor: 'pointer', marginBottom: 0 }} onClick={() => onSelect(f.slug)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{f.name}</h3>
                {f.is_verified && <span style={S.badge('blue')}>✓ Verified</span>}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0' }}>{f.city || '—'} · {f.lawyer_count} lawyer{f.lawyer_count !== 1 ? 's' : ''}{f.rating_count > 0 && <> · ⭐ {f.rating_avg.toFixed(1)}</>}</p>
              {f.description && <p style={{ fontSize: 12, color: '#475569', margin: '8px 0', lineHeight: 1.5 }}>{f.description.slice(0, 110)}...</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>{(f.practice_areas || []).slice(0, 3).map(a => <span key={a} style={S.badge('gray')}>{a}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// INQUIRY FORM MODAL
// ═════════════════════════════════════════════════════════════════
function InquiryFormModal({ slug, firmName, user, onClose }) {
  const [f, setF] = useState({ name: user?.full_name || '', email: user?.email || '', phone: '', subject: '', message: '', practice_area: '' })
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!f.name || !f.email || !f.message) { setErr('Name, email, and message are required'); return }
    setLoading(true); setErr('')
    try { await req('POST', '/api/firms/' + slug + '/inquire', f); setDone(true) }
    catch (e) { setErr(e.message) }
    setLoading(false)
  }
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Contact {firmName}</h2>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 4px' }}>Inquiry sent!</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{firmName} will contact you soon.</p>
            <button style={{ ...S.btn('primary'), marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        ) : (<>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Submit your inquiry and the firm will get back to you.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={S.formGroup}><label style={S.label}>Your name *</label><input style={S.input} value={f.name} onChange={set('name')} /></div>
            <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} type="email" value={f.email} onChange={set('email')} /></div>
            <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={set('phone')} /></div>
            <div style={S.formGroup}><label style={S.label}>Practice Area</label><select style={S.select} value={f.practice_area} onChange={set('practice_area')}><option value="">Select...</option>{PRACTICE_AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
            <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Subject</label><input style={S.input} value={f.subject} onChange={set('subject')} /></div>
            <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Message *</label><textarea style={S.textarea} value={f.message} onChange={set('message')} placeholder="Describe your legal matter..." /></div>
          </div>
          {err && <p style={S.msgError}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
            <button style={S.btn('primary')} onClick={submit} disabled={loading}>{loading ? '...' : 'Send Inquiry'}</button>
          </div>
        </>)}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// FIRM REVIEWS SECTION
// ═════════════════════════════════════════════════════════════════
function FirmReviewsSection({ slug, reviews, token, onUpdate }) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    try { await req('POST', '/api/firms/' + slug + '/reviews', { rating, comment }, token); setShowForm(false); setComment(''); onUpdate() }
    catch (e) { setErr(e.message) }
  }

  if (!reviews) return <div style={S.card}><p>Loading reviews...</p></div>

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>⭐ {reviews.rating_avg.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>({reviews.rating_count} reviews)</span></p>
        </div>
        {token && <button style={S.btn('primary')} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '✍️ Write a Review'}</button>}
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ fontSize: 24, cursor: 'pointer', color: n <= rating ? '#fbbf24' : '#cbd5e1' }} onClick={() => setRating(n)}>★</span>)}
          </div>
          <textarea style={S.textarea} placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)} />
          {err && <p style={S.msgError}>{err}</p>}
          <button style={{ ...S.btn('primary'), marginTop: 8 }} onClick={submit}>Submit Review</button>
        </div>
      )}

      {reviews.reviews.length === 0 ? <p style={{ fontSize: 13, color: '#64748b' }}>No reviews yet. Be the first!</p> :
        reviews.reviews.map(r => (
          <div key={r.id} style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{r.user_name} {r.is_verified && <span style={S.badge('green')}>✓ Verified</span>}</p>
              <span style={{ fontSize: 11, color: '#64748b' }}>{fmt(r.created_at)}</span>
            </div>
            <p style={{ margin: '2px 0', color: '#fbbf24', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
            {r.comment && <p style={{ fontSize: 13, color: '#374151', margin: '4px 0 0', lineHeight: 1.5 }}>{r.comment}</p>}
          </div>
        ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// FIRM DETAIL
// ═════════════════════════════════════════════════════════════════
function FirmDetail({ slug, onBack, token, user }) {
  const [firm, setFirm] = useState(null)
  const [tab, setTab] = useState('about')
  const [reviews, setReviews] = useState(null)
  const [showInquiry, setShowInquiry] = useState(false)

  useEffect(() => { req('GET', '/api/firms/' + slug).then(setFirm).catch(() => {}) }, [slug])
  useEffect(() => { if (tab === 'reviews') req('GET', '/api/firms/' + slug + '/reviews').then(setReviews) }, [tab, slug])

  if (!firm) return <div style={S.content}>Loading firm...</div>

  return (
    <div style={S.content}>
      <button style={S.btn('ghost')} onClick={onBack}>← Back to firms</button>

      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{firm.name}</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0' }}>{firm.city}, {firm.province} · Est. {firm.established_year || '—'}{firm.rating_count > 0 && <> · ⭐ {firm.rating_avg.toFixed(1)} ({firm.rating_count} reviews)</>}</p>
            {firm.website && <p style={{ fontSize: 12, margin: '4px 0' }}><a href={firm.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{firm.website}</a></p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {firm.is_verified && <span style={S.badge('blue')}>✓ Verified</span>}
            <button style={S.btn('blue')} onClick={() => setShowInquiry(true)}>📩 Contact Firm</button>
          </div>
        </div>
        {firm.description && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginTop: 14 }}>{firm.description}</p>}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(firm.practice_areas || []).map(a => <span key={a} style={S.badge('gray')}>{a}</span>)}</div>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === 'about')} onClick={() => setTab('about')}>Team ({firm.lawyer_count})</button>
        <button style={S.tab(tab === 'reviews')} onClick={() => setTab('reviews')}>Reviews</button>
      </div>

      {tab === 'about' && (
        <div style={S.card}>
          {(firm.lawyers || []).length === 0 ? <p style={{ fontSize: 13, color: '#64748b' }}>No team members listed yet.</p> :
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {firm.lawyers.map(l => (
                <div key={l.id} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{l.full_name}</p>
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b' }}>{l.role_in_firm || l.role} · {l.experience_years} yrs</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>{(l.specializations || []).slice(0, 2).map(s => <span key={s} style={S.badge('blue')}>{s}</span>)}</div>
                </div>
              ))}
            </div>}
        </div>
      )}

      {tab === 'reviews' && <FirmReviewsSection slug={slug} reviews={reviews} token={token} onUpdate={() => req('GET', '/api/firms/' + slug + '/reviews').then(setReviews)} />}
      {showInquiry && <InquiryFormModal slug={slug} firmName={firm.name} user={user} onClose={() => setShowInquiry(false)} />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// FIRM DASHBOARD with tabs
// ═════════════════════════════════════════════════════════════════
function FirmDashboard({ token }) {
  const [myFirm, setMyFirm] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState('overview')
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(() => {
    req('GET', '/api/firms/my/firm', null, token)
      .then(d => { setMyFirm(d); setLoaded(true) })
      .catch(() => { setMyFirm(null); setLoaded(true) })
  }, [token])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (myFirm?.id) req('GET', '/api/firms/' + myFirm.id + '/dashboard', null, token).then(setDashboard).catch(() => {}) }, [myFirm, token, tab])

  if (!loaded) return <div style={S.content}><p>Loading...</p></div>

  if (!myFirm && !showCreate) {
    return (
      <div style={S.content}>
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40 }}>🏢</div>
          <h2 style={{ margin: '14px 0 6px' }}>No firm yet</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 18 }}>Create your law firm profile to manage your team and showcase your practice.</p>
          <button style={S.btn('primary')} onClick={() => setShowCreate(true)}>+ Create Firm</button>
        </div>
      </div>
    )
  }

  if (showCreate) return <CreateFirmForm token={token} onCancel={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refresh() }} />

  const canManage = ['owner', 'admin'].includes(myFirm.role)

  return (
    <div style={S.content}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>🏢 {myFirm.name}</h2>
        <p style={{ margin: '4px 0', color: '#64748b', fontSize: 13 }}>Your role: <span style={S.badge('blue')}>{myFirm.role}</span> {myFirm.role_in_firm && <>· {myFirm.role_in_firm}</>}</p>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === 'overview')} onClick={() => setTab('overview')}>📊 Overview</button>
        <button style={S.tab(tab === 'members')} onClick={() => setTab('members')}>👥 Members</button>
        <button style={S.tab(tab === 'inquiries')} onClick={() => setTab('inquiries')}>📩 Inquiries</button>
        {canManage && <button style={S.tab(tab === 'settings')} onClick={() => setTab('settings')}>⚙️ Settings</button>}
      </div>

      {tab === 'overview' && <FirmOverviewTab dashboard={dashboard} />}
      {tab === 'members' && <FirmMembersTab firm={myFirm} token={token} canManage={canManage} />}
      {tab === 'inquiries' && <FirmInquiriesTab firm={myFirm} token={token} />}
      {tab === 'settings' && canManage && <FirmSettingsTab firm={myFirm} token={token} onUpdate={refresh} />}
    </div>
  )
}

function FirmOverviewTab({ dashboard }) {
  if (!dashboard) return <p>Loading...</p>
  return (
    <>
      <div style={S.statsGrid}>
        <div style={S.statCard('#3b82f6')}><p style={S.statValue}>{dashboard.lawyer_count}</p><p style={S.statLabel}>Lawyers</p></div>
        <div style={S.statCard('#16a34a')}><p style={S.statValue}>{dashboard.total_cases}</p><p style={S.statLabel}>Total Cases</p></div>
        <div style={S.statCard('#f59e0b')}><p style={S.statValue}>{dashboard.cases_by_status?.active || 0}</p><p style={S.statLabel}>Active Cases</p></div>
        <div style={S.statCard('#8b5cf6')}><p style={S.statValue}>{dashboard.pending_inquiries}</p><p style={S.statLabel}>Pending Leads</p></div>
      </div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 14px' }}>Team Performance</h3>
        <table style={S.table}>
          <thead><tr>{['Lawyer', 'Role', 'Title', 'Total Cases', 'Active'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {(dashboard.lawyers || []).map(l => (
              <tr key={l.lawyer_id}>
                <td style={S.td}>{l.full_name}</td>
                <td style={S.td}><span style={S.badge('gray')}>{l.role}</span></td>
                <td style={S.td}>{l.role_in_firm || '—'}</td>
                <td style={S.td}>{l.total_cases}</td>
                <td style={S.td}>{l.active_cases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FirmMembersTab({ firm, token, canManage }) {
  const [members, setMembers] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: '', role: 'associate', role_in_firm: '', message: '' })
  const [inviteResult, setInviteResult] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => req('GET', '/api/firms/' + firm.id + '/members', null, token).then(setMembers).catch(() => {}), [firm.id, token])
  useEffect(() => { load() }, [load])

  const send = async () => {
    setErr('')
    try { const r = await req('POST', '/api/firms/' + firm.id + '/members/invite', invite, token); setInviteResult(r); setInvite({ email: '', role: 'associate', role_in_firm: '', message: '' }) }
    catch (e) { setErr(e.message) }
  }
  const updateRole = async (memberId, role) => {
    try { await req('PUT', '/api/firms/' + firm.id + '/members/' + memberId + '/role', { role }, token); load() }
    catch (e) { alert(e.message) }
  }
  const removeMember = async (memberId, name) => {
    if (!confirm('Remove ' + name + '?')) return
    try { await req('DELETE', '/api/firms/' + firm.id + '/members/' + memberId, null, token); load() }
    catch (e) { alert(e.message) }
  }

  return (
    <>
      {canManage && <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}><button style={S.btn('primary')} onClick={() => { setShowInvite(true); setInviteResult(null) }}>+ Invite Lawyer</button></div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>{['Name', 'Email', 'Role', 'Title', 'Joined', ''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td style={S.td}>{m.full_name}</td>
                <td style={S.td}>{m.email}</td>
                <td style={S.td}>
                  {canManage && m.role !== 'owner' ?
                    <select style={{ ...S.select, padding: '4px 8px', fontSize: 12, width: 'auto' }} value={m.role} onChange={e => updateRole(m.id, e.target.value)}>
                      {ROLES.filter(r => r !== 'owner').map(r => <option key={r}>{r}</option>)}
                    </select> : <span style={S.badge(m.role === 'owner' ? 'purple' : 'gray')}>{m.role}</span>}
                </td>
                <td style={S.td}>{m.role_in_firm || '—'}</td>
                <td style={S.td}>{fmt(m.joined_at)}</td>
                <td style={S.td}>{canManage && m.role !== 'owner' && <button style={S.btn('red')} onClick={() => removeMember(m.id, m.full_name)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div style={S.modalOverlay} onClick={() => setShowInvite(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Invite Lawyer</h2>
            {inviteResult ? (<>
              <div style={{ background: '#dcfce7', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>✅ Invite sent to <strong>{inviteResult.email}</strong></p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#166534' }}>Share this link with them:</p>
                <code style={{ display: 'block', fontSize: 11, background: 'white', padding: 6, borderRadius: 4, marginTop: 4, wordBreak: 'break-all' }}>{window.location.origin}/?invite={inviteResult.token}</code>
              </div>
              <button style={S.btn('primary')} onClick={() => setShowInvite(false)}>Done</button>
            </>) : (<>
              <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} /></div>
              <div style={S.formGroup}><label style={S.label}>Role *</label><select style={S.select} value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}>{ROLES.filter(r => r !== 'owner').map(r => <option key={r}>{r}</option>)}</select></div>
              <div style={S.formGroup}><label style={S.label}>Title (optional)</label><input style={S.input} placeholder="e.g. Senior Partner — Family Law" value={invite.role_in_firm} onChange={e => setInvite(p => ({ ...p, role_in_firm: e.target.value }))} /></div>
              <div style={S.formGroup}><label style={S.label}>Message (optional)</label><textarea style={S.textarea} value={invite.message} onChange={e => setInvite(p => ({ ...p, message: e.target.value }))} /></div>
              {err && <p style={S.msgError}>{err}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={S.btn('ghost')} onClick={() => setShowInvite(false)}>Cancel</button>
                <button style={S.btn('primary')} onClick={send}>Send Invite</button>
              </div>
            </>)}
          </div>
        </div>
      )}
    </>
  )
}

function FirmInquiriesTab({ firm, token }) {
  const [inquiries, setInquiries] = useState([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    const url = filter ? '/api/firms/' + firm.id + '/inquiries?status=' + filter : '/api/firms/' + firm.id + '/inquiries'
    req('GET', url, null, token).then(setInquiries).catch(() => {})
  }, [firm.id, token, filter])
  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    try { await req('PUT', '/api/firms/' + firm.id + '/inquiries/' + id, { status }, token); load(); setSelected(null) }
    catch (e) { alert(e.message) }
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {['', 'new', 'contacted', 'converted', 'closed'].map(s => (
          <button key={s} style={S.tab(filter === s)} onClick={() => setFilter(s)}>{s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div style={S.card}>
        {inquiries.length === 0 ? <p style={{ fontSize: 13, color: '#64748b' }}>No inquiries yet.</p> : (
          <table style={S.table}>
            <thead><tr>{['From', 'Email', 'Subject', 'Practice', 'Status', 'Received', ''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {inquiries.map(i => (
                <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(i)}>
                  <td style={S.td}>{i.name}</td>
                  <td style={S.td}>{i.email}</td>
                  <td style={S.td}>{i.subject || '—'}</td>
                  <td style={S.td}>{i.practice_area || '—'}</td>
                  <td style={S.td}><span style={S.badge(i.status === 'new' ? 'yellow' : i.status === 'converted' ? 'green' : 'gray')}>{i.status}</span></td>
                  <td style={S.td}>{fmtDT(i.created_at)}</td>
                  <td style={S.td}><button style={S.btn('ghost')}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={S.modalOverlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{selected.subject || 'Inquiry'}</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>From {selected.name} · {fmtDT(selected.created_at)}</p>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, margin: '4px 0' }}>📧 {selected.email}</p>
              {selected.phone && <p style={{ fontSize: 13, margin: '4px 0' }}>📞 {selected.phone}</p>}
              {selected.practice_area && <p style={{ fontSize: 13, margin: '4px 0' }}>⚖️ {selected.practice_area}</p>}
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['new', 'contacted', 'converted', 'closed'].map(s => (
                <button key={s} style={selected.status === s ? S.btn('primary') : S.btn('ghost')} onClick={() => updateStatus(selected.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FirmSettingsTab({ firm, token, onUpdate }) {
  const [form, setForm] = useState({})
  const [msg, setMsg] = useState('')

  useEffect(() => { req('GET', '/api/firms/' + firm.slug).then(setForm) }, [firm.slug])

  const save = async () => {
    setMsg('')
    try {
      await req('PUT', '/api/firms/' + firm.id, {
        name: form.name, description: form.description, website: form.website,
        email: form.email, phone: form.phone, address: form.address,
        city: form.city, province: form.province, established_year: form.established_year,
        practice_areas: form.practice_areas, services: form.services, languages: form.languages,
      }, token)
      setMsg('✅ Saved'); onUpdate()
    } catch (e) { setMsg('❌ ' + e.message) }
  }
  const deleteFirm = async () => {
    if (!confirm('Delete "' + firm.name + '"? This cannot be undone.')) return
    try { await req('DELETE', '/api/firms/' + firm.id, null, token); onUpdate() }
    catch (e) { alert(e.message) }
  }

  if (!form.id) return <p>Loading...</p>

  return (
    <div style={S.card}>
      <h3 style={{ margin: '0 0 16px' }}>Firm Settings</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Name</label><input style={S.input} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Description</label><textarea style={S.textarea} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={form.city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Province</label><select style={S.select} value={form.province || ''} onChange={e => setForm(p => ({ ...p, province: e.target.value }))}><option value="">Select...</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Website</label><input style={S.input} value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></div>
        <div style={S.formGroup}><label style={S.label}>Established Year</label><input style={S.input} type="number" value={form.established_year || ''} onChange={e => setForm(p => ({ ...p, established_year: parseInt(e.target.value) || null }))} /></div>
        <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Address</label><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
        <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
          <label style={S.label}>Practice Areas (Ctrl/Cmd-click)</label>
          <select multiple style={{ ...S.select, minHeight: 100 }} value={form.practice_areas || []} onChange={e => setForm(p => ({ ...p, practice_areas: Array.from(e.target.selectedOptions, o => o.value) }))}>
            {PRACTICE_AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {msg && <p style={msg.startsWith('✅') ? S.msgSuccess : S.msgError}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button style={S.btn('primary')} onClick={save}>Save Changes</button>
        {firm.role === 'owner' && <button style={S.btn('red')} onClick={deleteFirm}>Delete Firm</button>}
      </div>
    </div>
  )
}

function CreateFirmForm({ token, onCancel, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', city: '', province: '', practice_areas: [], services: [], languages: ['English', 'Urdu'] })
  const [err, setErr] = useState('')

  const create = async () => {
    if (!form.name) { setErr('Firm name required'); return }
    try { await req('POST', '/api/firms/', form, token); onCreated() }
    catch (e) { setErr(e.message) }
  }

  return (
    <div style={S.content}>
      <div style={S.card}>
        <h2 style={{ marginTop: 0 }}>Create your law firm</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Firm name *</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div style={{ ...S.formGroup, gridColumn: '1/-1' }}><label style={S.label}>Description</label><textarea style={S.textarea} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
          <div style={S.formGroup}><label style={S.label}>Province</label><select style={S.select} value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))}><option value="">Select...</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
            <label style={S.label}>Practice areas (Ctrl/Cmd-click to multi-select)</label>
            <select multiple style={{ ...S.select, minHeight: 100 }} value={form.practice_areas} onChange={e => setForm(p => ({ ...p, practice_areas: Array.from(e.target.selectedOptions, o => o.value) }))}>
              {PRACTICE_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {err && <p style={S.msgError}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={S.btn('ghost')} onClick={onCancel}>Cancel</button>
          <button style={S.btn('primary')} onClick={create}>Create</button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// INVITE ACCEPT BANNER
// ═════════════════════════════════════════════════════════════════
function InviteAcceptBanner({ token, onAccepted }) {
  const [inviteToken, setInviteToken] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('invite')
    if (t) setInviteToken(t)
  }, [])

  if (!inviteToken) return null

  const accept = async () => {
    setStatus('Processing...')
    try {
      const r = await req('POST', '/api/firms/invites/' + inviteToken + '/accept', null, token)
      setStatus('✅ Joined firm! Role: ' + r.role)
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => { setInviteToken(null); onAccepted() }, 2000)
    } catch (e) { setStatus('❌ ' + e.message) }
  }

  return (
    <div style={{ background: '#dbeafe', borderBottom: '1px solid #93c5fd', padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <p style={{ margin: 0, fontSize: 13 }}>📩 You have a pending firm invitation. {status}</p>
      {!status && <div style={{ display: 'flex', gap: 8 }}>
        <button style={S.btn('primary')} onClick={accept}>Accept</button>
        <button style={S.btn('ghost')} onClick={() => { setInviteToken(null); window.history.replaceState({}, '', window.location.pathname) }}>Dismiss</button>
      </div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═════════════════════════════════════════════════════════════════
function Dashboard({ token, user }) {
  return <div style={S.content}>
    <h2>Welcome back, {user.full_name?.split(' ')[0]} 👋</h2>
    <p style={{ color: '#64748b' }}>Your dashboard — use the sidebar to navigate.</p>
    <Chatbot token={token} user={user} />
  </div>
}

// ═════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('lexai_token'))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [selectedFirmSlug, setSelectedFirmSlug] = useState(null)

  useEffect(() => {
    if (token) {
      req('GET', '/api/auth/me', null, token)
        .then(u => setUser({ ...u, user_id: u.id }))
        .catch(() => { localStorage.removeItem('lexai_token'); setToken(null) })
    }
  }, [token])

  const onAuthSuccess = (data) => {
    setToken(data.access_token); setUser(data); setAuthMode(null); setPage('dashboard')
  }
  const logout = () => { localStorage.removeItem('lexai_token'); setToken(null); setUser(null); setPage('dashboard') }

  const globalStyles = `
    html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
  `

  if (!token || !user) {
    return (
      <>
        <style>{globalStyles}</style>
        <LandingPage onOpenAuth={setAuthMode} />
        {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSuccess={onAuthSuccess} />}
      </>
    )
  }

  const isLawyer = ['lawyer', 'firm_admin', 'admin'].includes(user.role)
  const NAV = [
    { section: 'Main' },
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'chatbot', label: 'Legal AI', icon: '⚖️' },
    { section: 'Legal Marketplace' },
    { id: 'firms', label: 'Law Firms', icon: '🏢' },
    ...(isLawyer ? [{ id: 'my_firm', label: 'My Firm', icon: '🏛️' }] : []),
  ]

  return (
    <div style={S.authedApp}>
      <style>{globalStyles}</style>
      <aside style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>Lex<span style={S.brandAccent}>AI</span></p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Where Law Meets Intelligence</p>
        </div>
        <div style={S.sidebarUser}>
          <div style={S.sidebarAvatar}>{user.full_name?.[0]?.toUpperCase()}</div>
          <div>
            <p style={{ fontSize: 13, color: 'white', margin: 0, fontWeight: 500 }}>{user.full_name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' }}>{user.role}</p>
          </div>
        </div>
        <nav style={S.sidebarNav}>
          {NAV.map((item, i) => {
            if (item.section) return <p key={i} style={S.sidebarSection}>{item.section}</p>
            return <button key={item.id} style={S.navItem(page === item.id)} onClick={() => { setPage(item.id); setSelectedFirmSlug(null) }}><span>{item.icon}</span> {item.label}</button>
          })}
        </nav>
        <div style={S.sidebarBottom}><button style={S.logoutBtn} onClick={logout}>🚪 Sign out</button></div>
      </aside>

      <div style={S.main}>
        <InviteAcceptBanner token={token} onAccepted={() => setPage('my_firm')} />
        <div style={S.topbar}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {selectedFirmSlug ? 'Firm Details' : page === 'dashboard' ? 'Dashboard' : page === 'chatbot' ? 'Legal AI' : page === 'firms' ? 'Law Firms' : page === 'my_firm' ? 'My Firm' : 'LexAI'}
          </h1>
          <span style={{ fontSize: 12, color: '#64748b' }}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        {selectedFirmSlug ? <FirmDetail slug={selectedFirmSlug} onBack={() => setSelectedFirmSlug(null)} token={token} user={user} /> :
          page === 'chatbot' ? <div style={S.content}><Chatbot token={token} user={user} /></div> :
          page === 'firms' ? <FirmMarketplace onSelect={setSelectedFirmSlug} /> :
          page === 'my_firm' ? <FirmDashboard token={token} /> :
          <Dashboard token={token} user={user} />}
      </div>
    </div>
  )
}
