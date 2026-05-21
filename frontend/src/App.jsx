// ═══════════════════════════════════════════════════════════════
// LexAI — Complete Merged App.jsx
// Full platform: Lawyer marketplace + Case management + AI chatbot
// Replace your entire frontend/src/App.jsx with this file
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const S = {
  app: { display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  page: { minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sidebar: { width: 240, background: '#0a1628', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarLogo: { padding: '22px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  sidebarLogoText: { fontSize: 24, fontWeight: 700, color: 'white', margin: 0 },
  sidebarTagline: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sidebarUser: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 },
  sidebarAvatar: { width: 34, height: 34, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  sidebarName: { fontSize: 13, fontWeight: 500, color: 'white', margin: 0 },
  sidebarRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' },
  sidebarNav: { flex: 1, padding: '10px 8px', overflowY: 'auto' },
  sidebarSection: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 4px', margin: '4px 0 0' },
  navItem: (a) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a ? 'white' : 'rgba(255,255,255,0.6)', background: a ? '#3b82f6' : 'transparent', border: 'none', width: '100%', textAlign: 'left' }),
  navAI: (a) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a ? '#fbbf24' : 'rgba(251,191,36,0.7)', background: a ? 'rgba(251,191,36,0.15)' : 'transparent', border: 'none', width: '100%', textAlign: 'left' }),
  sidebarBottom: { padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left' },
  main: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  topbar: { background: 'white', padding: '14px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  pageTitle: { fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 },
  content: { padding: 28, flex: 1 },
  card: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 22, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 14, marginTop: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 },
  statCard: (c) => ({ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, borderLeft: `4px solid ${c}` }),
  statValue: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 },
  statLabel: { fontSize: 12, color: '#64748b', margin: '3px 0 0' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  formGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'white', fontFamily: 'inherit' },
  textarea: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 72 },
  btn: (v='primary') => ({ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: v==='primary'?'#0a1628':v==='blue'?'#3b82f6':v==='green'?'#16a34a':v==='red'?'#dc2626':v==='amber'?'#d97706':'#f1f5f9', color: v==='ghost'?'#374151':'white' }),
  btnSm: (v='primary') => ({ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: v==='primary'?'#0a1628':v==='blue'?'#3b82f6':v==='green'?'#16a34a':v==='red'?'#dc2626':v==='amber'?'#d97706':'#f1f5f9', color: v==='ghost'?'#374151':'white' }),
  badge: (c) => { const m={green:{background:'#dcfce7',color:'#166534'},blue:{background:'#dbeafe',color:'#1e40af'},yellow:{background:'#fef9c3',color:'#854d0e'},red:{background:'#fee2e2',color:'#991b1b'},gray:{background:'#f1f5f9',color:'#475569'},purple:{background:'#ede9fe',color:'#5b21b6'},amber:{background:'#fef3c7',color:'#92400e'}}; return {...(m[c]||m.gray),padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:500,display:'inline-block'} },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '13px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f1f5f9' },
  listItem: { padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  authCard: { background: 'white', borderRadius: 16, padding: 38, width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  empty: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  msgSuccess: { color: '#16a34a', fontSize: 12, marginTop: 6 },
  msgError: { color: '#dc2626', fontSize: 12, marginTop: 6 },
  lawyerCard: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, display: 'flex', gap: 14, marginBottom: 10 },
}

const CSC = { open:'blue', active:'green', on_hold:'yellow', closed:'gray', won:'green', lost:'red' }
const HSC = { scheduled:'blue', completed:'green', adjourned:'yellow', cancelled:'red' }
const BSC = { pending:'yellow', confirmed:'green', cancelled:'red', completed:'gray' }
const fmt  = (dt) => dt ? new Date(dt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : '—'
const fmtDT= (dt) => dt ? new Date(dt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide=false }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
      <div style={{ background:'white',borderRadius:16,padding:28,width:wide?640:500,maxHeight:'82vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h3 style={{ margin:0,fontSize:16,fontWeight:600 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Spinner() { return <div style={{ textAlign:'center',padding:40,color:'#94a3b8',fontSize:13 }}>Loading...</div> }
function ConfBadge({ conf }) {
  const map = { high:{bg:'#dcfce7',c:'#166534',t:'High confidence'}, medium:{bg:'#fef9c3',c:'#854d0e',t:'Medium confidence'}, low:{bg:'#fee2e2',c:'#991b1b',t:'Low confidence'}, insufficient:{bg:'#f1f5f9',c:'#475569',t:'Insufficient data'} }
  const s = map[conf] || map.insufficient
  return <span style={{ background:s.bg,color:s.c,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:500 }}>{s.t}</span>
}

// ─────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  const go = async () => {
    if (!email||!pw){setErr('Fill all fields');return}
    setLoading(true);setErr('')
    try {
      const res=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`username=${encodeURIComponent(email)}&password=${encodeURIComponent(pw)}`})
      const d=await res.json()
      if(d.access_token){localStorage.setItem('lexai_token',d.access_token);onLogin(d)}
      else setErr(d.detail||'Invalid credentials')
    } catch { setErr('Cannot connect to backend') }
    setLoading(false)
  }
  return (
    <div style={S.page}>
      <div style={S.authCard}>
        <h1 style={{ fontSize:28,fontWeight:700,textAlign:'center',margin:'0 0 4px' }}>Lex<span style={{ color:'#3b82f6' }}>AI</span></h1>
        <p style={{ textAlign:'center',color:'#94a3b8',marginBottom:28,fontSize:13 }}>Where Law Meets Intelligence</p>
        <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} /></div>
        <div style={S.formGroup}><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} /></div>
        {err && <p style={S.msgError}>❌ {err}</p>}
        <button style={{ ...S.btn('primary'),width:'100%',padding:'12px',fontSize:14,marginTop:4 }} onClick={go} disabled={loading}>{loading?'Signing in...':'Sign in to LexAI'}</button>
        <p style={{ textAlign:'center',marginTop:16,fontSize:13,color:'#64748b' }}>No account? <span style={{ color:'#3b82f6',cursor:'pointer',fontWeight:500 }} onClick={onGoRegister}>Register here</span></p>
      </div>
    </div>
  )
}

function RegisterPage({ onLogin, onGoLogin }) {
  const [f,setF]=useState({ full_name:'',email:'',password:'',role:'client',phone:'',city:'' }); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  const go = async () => {
    if(!f.full_name||!f.email||!f.password){setErr('Name, email, password required');return}
    setLoading(true);setErr('')
    try { const d=await req('POST','/api/auth/register',f); localStorage.setItem('lexai_token',d.access_token); onLogin(d) }
    catch(e){ setErr(e.message) }
    setLoading(false)
  }
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}))
  return (
    <div style={S.page}>
      <div style={{ ...S.authCard,width:460 }}>
        <h1 style={{ fontSize:28,fontWeight:700,textAlign:'center',margin:'0 0 20px' }}>Lex<span style={{ color:'#3b82f6' }}>AI</span></h1>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16 }}>
          {['client','lawyer'].map(r=>(
            <div key={r} onClick={()=>setF(p=>({...p,role:r}))} style={{ padding:12,border:`2px solid ${f.role===r?'#3b82f6':'#e2e8f0'}`,borderRadius:10,cursor:'pointer',textAlign:'center',background:f.role===r?'#eff6ff':'white' }}>
              <div style={{ fontSize:22,marginBottom:4 }}>{r==='client'?'👤':'⚖️'}</div>
              <div style={{ fontSize:12,fontWeight:600,color:f.role===r?'#3b82f6':'#374151',textTransform:'capitalize' }}>{r}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div style={S.formGroup}><label style={S.label}>Full name *</label><input style={S.input} value={f.full_name} onChange={set('full_name')} /></div>
          <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={set('phone')} /></div>
          <div style={{ ...S.formGroup,gridColumn:'1/-1' }}><label style={S.label}>Email *</label><input style={S.input} type="email" value={f.email} onChange={set('email')} /></div>
          <div style={S.formGroup}><label style={S.label}>Password *</label><input style={S.input} type="password" value={f.password} onChange={set('password')} /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={f.city} onChange={set('city')} /></div>
        </div>
        {err && <p style={S.msgError}>❌ {err}</p>}
        <button style={{ ...S.btn('primary'),width:'100%',padding:'12px',fontSize:14 }} onClick={go} disabled={loading}>{loading?'Creating...':'Register'}</button>
        <p style={{ textAlign:'center',marginTop:14,fontSize:13,color:'#64748b' }}>Have account? <span style={{ color:'#3b82f6',cursor:'pointer',fontWeight:500 }} onClick={onGoLogin}>Sign in</span></p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AI CHATBOT PAGE — with memory (sessions)
// ─────────────────────────────────────────────────────────────
function LegalChatbot({ token, user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [province, setProvince] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const endRef = useRef(null)

  const suggestions = [
    'What are the fundamental rights in Pakistan\'s Constitution?',
    'Punishment for theft under Pakistan Penal Code?',
    'How to file Khula divorce in Pakistan?',
    'پاکستان میں وراثت کے قوانین کیا ہیں؟',
    'Bail rights under CrPC Pakistan?',
    'How to register a company in Pakistan?',
  ]

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    // Load previous sessions
    req('GET', '/api/chat/sessions', null, token)
      .then(setSessions).catch(() => {})
  }, [token])

  const loadSession = async (sid) => {
    const msgs = await req('GET', `/api/chat/sessions/${sid}/messages`, null, token)
    setMessages(msgs.map(m => ({ ...m, id: m.id })))
    setSessionId(sid)
    setShowSessions(false)
  }

  const newChat = () => {
    setMessages([])
    setSessionId(null)
    setShowSessions(false)
  }

  const send = async (queryText) => {
    const q = queryText || input.trim()
    if (!q || loading) return
    setInput('')
    setLoading(true)

    const uid = Date.now()
    setMessages(prev => [...prev,
      { id: uid, role: 'user', content: q },
      { id: uid+1, role: 'assistant', content: '', loading: true, sources: [], confidence: 'medium' }
    ])

    try {
      const res = await fetch(`${API}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: q, session_id: sessionId, province: province||null, language: 'auto' })
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = '', sources = [], conf = 'medium', sid = sessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'session') { sid = d.session_id; setSessionId(sid) }
            else if (d.type === 'token') {
              full += d.content
              setMessages(prev => prev.map(m => m.id===uid+1 ? {...m,content:full,loading:false} : m))
            }
            else if (d.type === 'sources') { sources = d.sources; setMessages(prev => prev.map(m => m.id===uid+1 ? {...m,sources} : m)) }
            else if (d.type === 'done') { conf = d.confidence||'medium'; setMessages(prev => prev.map(m => m.id===uid+1 ? {...m,confidence:conf,loading:false} : m)) }
          } catch {}
        }
      }
      // Refresh sessions list
      req('GET', '/api/chat/sessions', null, token).then(setSessions).catch(() => {})
    } catch(e) {
      setMessages(prev => prev.map(m => m.id===uid+1 ? {...m,content:`Error: ${e.message}`,loading:false} : m))
    }
    setLoading(false)
  }

  const stl = {
    wrap: { display:'flex',height:'calc(100vh - 65px)' },
    sessPanel: { width:220,background:'white',borderRight:'1px solid #e2e8f0',overflowY:'auto',flexShrink:0 },
    sessPanelHeader: { padding:'14px 14px 10px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center' },
    sessItem: (active) => ({ padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',background:active?'#eff6ff':'white',borderLeft:active?'3px solid #3b82f6':'3px solid transparent' }),
    chatArea: { flex:1,display:'flex',flexDirection:'column',background:'#f8fafc' },
    chatHeader: { background:'white',borderBottom:'1px solid #e2e8f0',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' },
    msgs: { flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16 },
    empty: { flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 },
    suggs: { display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12,maxWidth:560 },
    suggBtn: { background:'white',border:'1px solid #e2e8f0',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#374151',cursor:'pointer',textAlign:'left',lineHeight:1.4 },
    userRow: { display:'flex',justifyContent:'flex-end' },
    userBubble: { maxWidth:'70%',background:'#0a1628',color:'white',borderRadius:'14px 14px 3px 14px',padding:'11px 15px',fontSize:13,lineHeight:1.6 },
    botRow: { display:'flex',gap:10,alignItems:'flex-start' },
    botAvatar: { width:30,height:30,borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 },
    botBubble: { flex:1,background:'white',border:'1px solid #e2e8f0',borderRadius:'3px 14px 14px 14px',padding:14,fontSize:13,lineHeight:1.7,color:'#374151' },
    ansText: { whiteSpace:'pre-wrap',margin:'0 0 10px' },
    meta: { display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:8,paddingTop:8,borderTop:'1px solid #f1f5f9' },
    disclaimer: { fontSize:11,color:'#94a3b8',marginTop:6,fontStyle:'italic' },
    inputArea: { background:'white',borderTop:'1px solid #e2e8f0',padding:'10px 20px' },
    filterRow: { display:'flex',gap:8,marginBottom:8,alignItems:'center' },
    inputRow: { display:'flex',gap:8 },
    inputBox: { flex:1,border:'1px solid #e2e8f0',borderRadius:10,padding:'9px 14px',fontSize:13,outline:'none',fontFamily:'inherit',resize:'none' },
    sendBtn: (d) => ({ background:d?'#94a3b8':'#0a1628',color:'white',border:'none',borderRadius:10,padding:'9px 18px',fontSize:13,cursor:d?'not-allowed':'pointer',fontFamily:'inherit',fontWeight:500 }),
  }

  const SourcesToggle = ({ sources }) => {
    const [open,setOpen] = useState(false)
    if (!sources?.length) return null
    return (
      <div>
        <button onClick={()=>setOpen(!open)} style={{ fontSize:11,color:'#3b82f6',cursor:'pointer',background:'none',border:'none',padding:0 }}>
          {open?'Hide':'View'} {sources.length} source{sources.length>1?'s':''}
        </button>
        {open && (
          <div style={{ marginTop:6,background:'#f8fafc',borderRadius:6,padding:'8px 12px' }}>
            {sources.map((s,i) => (
              <div key={i} style={{ fontSize:11,color:'#64748b',padding:'2px 0' }}>
                📄 {s.filename}{s.province&&s.province!=='Unknown'?` (${s.province})`:''}{s.relevance_score?` — ${(s.relevance_score*100).toFixed(0)}%`:''}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={stl.wrap}>
      {/* Sessions sidebar */}
      <div style={stl.sessPanel}>
        <div style={stl.sessPanelHeader}>
          <span style={{ fontSize:13,fontWeight:600,color:'#0f172a' }}>History</span>
          <button onClick={newChat} style={{ ...S.btnSm('blue'),fontSize:11 }}>+ New</button>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding:14,fontSize:12,color:'#94a3b8' }}>No previous chats</div>
        ) : sessions.map(s => (
          <div key={s.id} style={stl.sessItem(s.id===sessionId)} onClick={()=>loadSession(s.id)}>
            <p style={{ margin:0,fontSize:12,fontWeight:500,color:'#374151',lineHeight:1.4 }}>{s.title||'Conversation'}</p>
            <p style={{ margin:'2px 0 0',fontSize:11,color:'#94a3b8' }}>{s.message_count} messages</p>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div style={stl.chatArea}>
        <div style={stl.chatHeader}>
          <div>
            <span style={{ fontSize:14,fontWeight:600,color:'#0f172a' }}>⚖️ LexAI Legal Assistant</span>
            <span style={{ fontSize:11,color:'#64748b',marginLeft:8 }}>26GB Pakistani law books · Urdu + English</span>
          </div>
          <div style={{ width:8,height:8,background:'#16a34a',borderRadius:'50%' }} />
        </div>

        <div style={stl.msgs}>
          {messages.length === 0 ? (
            <div style={stl.empty}>
              <div style={{ fontSize:44 }}>⚖️</div>
              <p style={{ fontSize:18,fontWeight:600,color:'#0f172a',margin:0 }}>Ask me anything about Pakistani law</p>
              <p style={{ fontSize:13,color:'#64748b',margin:0 }}>Ask in English or اردو · All provinces covered</p>
              <div style={stl.suggs}>
                {suggestions.map((s,i) => (
                  <button key={i} style={stl.suggBtn} onClick={()=>send(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : messages.map(msg => (
            <div key={msg.id}>
              {msg.role==='user' ? (
                <div style={stl.userRow}><div style={stl.userBubble}>{msg.content}</div></div>
              ) : (
                <div style={stl.botRow}>
                  <div style={stl.botAvatar}>⚖️</div>
                  <div style={stl.botBubble}>
                    {msg.loading && !msg.content ? (
                      <div style={{ display:'flex',gap:4 }}>
                        {[0,1,2].map(i=>(
                          <div key={i} style={{ width:6,height:6,background:'#94a3b8',borderRadius:'50%',animation:`bounce 1s ease-in-out ${i*0.15}s infinite` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <p style={stl.ansText}>{msg.content}</p>
                        {!msg.loading && (
                          <div style={stl.meta}>
                            {msg.confidence && <ConfBadge conf={msg.confidence} />}
                            <SourcesToggle sources={msg.sources} />
                          </div>
                        )}
                        {msg.disclaimer && <p style={stl.disclaimer}>{msg.disclaimer}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div style={stl.inputArea}>
          <div style={stl.filterRow}>
            <span style={{ fontSize:11,color:'#64748b' }}>Province:</span>
            <select style={{ fontSize:11,border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 8px',background:'white' }} value={province} onChange={e=>setProvince(e.target.value)}>
              <option value="">All provinces</option>
              {['Punjab','Sindh','KPK','Balochistan','Federal'].map(p=><option key={p}>{p}</option>)}
            </select>
            <span style={{ fontSize:11,color:'#94a3b8' }}>Ask in English or اردو</span>
          </div>
          <div style={stl.inputRow}>
            <textarea style={stl.inputBox} rows={2} placeholder="Ask a legal question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} disabled={loading} />
            <button style={stl.sendBtn(loading||!input.trim())} onClick={()=>send()} disabled={loading||!input.trim()}>{loading?'...':'Ask'}</button>
          </div>
          <p style={{ fontSize:11,color:'#94a3b8',margin:'5px 0 0' }}>Enter to send · Shift+Enter for new line · Legal information only, not advice</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LAWYER DASHBOARD
// ─────────────────────────────────────────────────────────────
function LawyerDashboard({ token, user }) {
  const [cases,setCases]=useState([]); const [hearings,setHearings]=useState([]); const [bookings,setBookings]=useState([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.all([
      req('GET','/api/cases',null,token).catch(()=>[]),
      req('GET','/api/hearings/upcoming?days=7',null,token).catch(()=>[]),
      req('GET','/api/bookings/my',null,token).catch(()=>[]),
    ]).then(([c,h,b])=>{setCases(Array.isArray(c)?c:[]);setHearings(Array.isArray(h)?h:[]);setBookings(Array.isArray(b)?b:[]);setLoading(false)})
  },[token])
  if(loading) return <Spinner/>
  return (
    <div style={S.content}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:0,fontSize:20,fontWeight:600 }}>Good day, {user.full_name?.split(' ')[0]} 👋</h2>
        <p style={{ margin:'3px 0 0',color:'#64748b',fontSize:13 }}>Here's your practice overview</p>
      </div>
      <div style={S.statsGrid}>
        {[{l:'Total Cases',v:cases.length,c:'#3b82f6',i:'⚖️'},{l:'Active Cases',v:cases.filter(c=>c.status==='active').length,c:'#16a34a',i:'📂'},{l:'Upcoming Hearings',v:hearings.length,c:'#f59e0b',i:'🏛️'},{l:'Pending Bookings',v:bookings.filter(b=>b.status==='pending').length,c:'#8b5cf6',i:'📅'}].map(s=>(
          <div key={s.l} style={S.statCard(s.c)}><div style={{ fontSize:22,marginBottom:6 }}>{s.i}</div><p style={S.statValue}>{s.v}</p><p style={S.statLabel}>{s.l}</p></div>
        ))}
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>📅 Upcoming hearings</h3>
          {hearings.length===0?<div style={S.empty}><p>No hearings this week</p></div>:hearings.map(h=>(
            <div key={h.id} style={S.listItem}><div><p style={{ margin:0,fontWeight:500,fontSize:13 }}>{h.court_name||'Court hearing'}</p><p style={{ margin:'2px 0 0',fontSize:11,color:'#64748b' }}>{fmtDT(h.date)}{h.purpose?` · ${h.purpose}`:''}</p></div><span style={S.badge(HSC[h.status]||'gray')}>{h.status}</span></div>
          ))}
        </div>
        <div style={S.card}>
          <h3 style={S.cardTitle}>📋 Pending consultations</h3>
          {bookings.filter(b=>b.status==='pending').length===0?<div style={S.empty}><p>No pending requests</p></div>:bookings.filter(b=>b.status==='pending').map(b=>(
            <div key={b.id} style={S.listItem}><div><p style={{ margin:0,fontWeight:500,fontSize:13 }}>Consultation request</p><p style={{ margin:'2px 0 0',fontSize:11,color:'#64748b' }}>{fmtDT(b.scheduled_at)} · {b.consultation_type}</p></div><span style={S.badge('yellow')}>pending</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LAWYER CASES
// ─────────────────────────────────────────────────────────────
function LawyerCases({ token, onSelectCase }) {
  const [cases,setCases]=useState([]); const [loading,setLoading]=useState(true); const [showNew,setShowNew]=useState(false); const [filter,setFilter]=useState(''); const [form,setForm]=useState({ title:'',description:'',case_type:'Criminal',court_name:'',client_id:'',opposing_party:'',judge_name:'',case_number:'' }); const [saving,setSaving]=useState(false); const [err,setErr]=useState('')
  const load=useCallback(()=>{ req('GET','/api/cases',null,token).then(d=>{setCases(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>setLoading(false)) },[token])
  useEffect(()=>load(),[load])
  const create=async()=>{
    if(!form.title||!form.case_type||!form.client_id){setErr('Title, type and client ID required');return}
    setSaving(true);setErr('')
    try{ await req('POST','/api/cases',form,token); setShowNew(false); setForm({ title:'',description:'',case_type:'Criminal',court_name:'',client_id:'',opposing_party:'',judge_name:'',case_number:'' }); load() }
    catch(e){ setErr(e.message) }
    setSaving(false)
  }
  const filtered=cases.filter(c=>!filter||c.status===filter)
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  return (
    <div style={S.content}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
        <div style={{ display:'flex',gap:6 }}>
          {['','open','active','on_hold','closed','won','lost'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{ ...S.btnSm(filter===s?'blue':'ghost'),textTransform:'capitalize' }}>{s||'All'}</button>
          ))}
        </div>
        <button style={S.btn('primary')} onClick={()=>setShowNew(true)}>+ New Case</button>
      </div>
      {loading?<Spinner/>:filtered.length===0?<div style={{ ...S.card,...S.empty }}><p>No cases found</p></div>:(
        <div style={S.card}>
          <table style={S.table}><thead><tr>{['Title','Type','Court','Filing Date','Next Hearing','Status',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(c=>(
              <tr key={c.id} style={{ cursor:'pointer' }} onClick={()=>onSelectCase(c)}>
                <td style={S.td}><span style={{ fontWeight:500,color:'#0f172a' }}>{c.title}</span>{c.case_number&&<span style={{ fontSize:11,color:'#94a3b8',marginLeft:6 }}>#{c.case_number}</span>}</td>
                <td style={S.td}>{c.case_type}</td>
                <td style={S.td}>{c.court_name||'—'}</td>
                <td style={S.td}>{fmt(c.filing_date)}</td>
                <td style={S.td}>{fmt(c.next_hearing_date)}</td>
                <td style={S.td}><span style={S.badge(CSC[c.status]||'gray')}>{c.status?.replace('_',' ')}</span></td>
                <td style={S.td}><button style={S.btnSm('blue')} onClick={e=>{e.stopPropagation();onSelectCase(c)}}>View</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {showNew&&(
        <Modal title="Create New Case" onClose={()=>setShowNew(false)}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div style={{ ...S.formGroup,gridColumn:'1/-1' }}><label style={S.label}>Case title *</label><input style={S.input} value={form.title} onChange={set('title')} /></div>
            <div style={S.formGroup}><label style={S.label}>Case type *</label><select style={S.select} value={form.case_type} onChange={set('case_type')}>{['Criminal','Civil','Family','Corporate','Property','Banking','Labour','Tax','Constitutional'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={S.formGroup}><label style={S.label}>Case number</label><input style={S.input} value={form.case_number} onChange={set('case_number')} /></div>
            <div style={S.formGroup}><label style={S.label}>Court name</label><input style={S.input} value={form.court_name} onChange={set('court_name')} /></div>
            <div style={S.formGroup}><label style={S.label}>Client user ID *</label><input style={S.input} value={form.client_id} onChange={set('client_id')} /></div>
            <div style={S.formGroup}><label style={S.label}>Opposing party</label><input style={S.input} value={form.opposing_party} onChange={set('opposing_party')} /></div>
            <div style={S.formGroup}><label style={S.label}>Judge name</label><input style={S.input} value={form.judge_name} onChange={set('judge_name')} /></div>
            <div style={{ ...S.formGroup,gridColumn:'1/-1' }}><label style={S.label}>Description</label><textarea style={S.textarea} value={form.description} onChange={set('description')} /></div>
          </div>
          {err&&<p style={S.msgError}>❌ {err}</p>}
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:6 }}>
            <button style={S.btn('ghost')} onClick={()=>setShowNew(false)}>Cancel</button>
            <button style={S.btn('primary')} onClick={create} disabled={saving}>{saving?'Creating...':'Create Case'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CASE DETAIL
// ─────────────────────────────────────────────────────────────
function CaseDetail({ caseData, token, onBack }) {
  const [tab,setTab]=useState('overview'); const [hearings,setHearings]=useState([]); const [docs,setDocs]=useState([]); const [status,setStatus]=useState(caseData.status); const [newUpdate,setNewUpdate]=useState(''); const [newH,setNewH]=useState({ date:'',court_name:'',purpose:'',notes:'' }); const [showHForm,setShowHForm]=useState(false)
  useEffect(()=>{
    req('GET',`/api/hearings/case/${caseData.id}`,null,token).then(d=>setHearings(Array.isArray(d)?d:[])).catch(()=>{})
    req('GET',`/api/documents/case/${caseData.id}`,null,token).then(d=>setDocs(Array.isArray(d)?d:[])).catch(()=>{})
  },[caseData.id,token])
  const postUpdate=async()=>{ if(!newUpdate.trim())return; try{ await req('POST',`/api/cases/${caseData.id}/updates`,{content:newUpdate,is_visible_to_client:true},token); setNewUpdate('') }catch(e){alert(e.message)} }
  const addHearing=async()=>{ if(!newH.date){alert('Date required');return}; try{ await req('POST','/api/hearings',{case_id:caseData.id,...newH},token); setNewH({date:'',court_name:'',purpose:'',notes:''}); setShowHForm(false); req('GET',`/api/hearings/case/${caseData.id}`,null,token).then(d=>setHearings(Array.isArray(d)?d:[])) }catch(e){alert(e.message)} }
  const updateStatus=async(s)=>{ try{ await req('PUT',`/api/cases/${caseData.id}`,{status:s},token); setStatus(s) }catch(e){alert(e.message)} }
  return (
    <div style={S.content}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:20 }}>
        <button onClick={onBack} style={{ ...S.btnSm('ghost'),marginTop:2 }}>← Back</button>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:600 }}>{caseData.title}</h2>
          <div style={{ display:'flex',gap:6,marginTop:5,alignItems:'center' }}>
            <span style={S.badge(CSC[status]||'gray')}>{status?.replace('_',' ')}</span>
            <span style={{ fontSize:12,color:'#64748b' }}>{caseData.case_type}</span>
            {caseData.case_number&&<span style={{ fontSize:12,color:'#94a3b8' }}>#{caseData.case_number}</span>}
          </div>
        </div>
        <select style={{ ...S.select,width:130,fontSize:12 }} value={status} onChange={e=>updateStatus(e.target.value)}>
          {['open','active','on_hold','closed','won','lost'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      <div style={{ display:'flex',borderBottom:'1px solid #e2e8f0',marginBottom:20 }}>
        {['overview','hearings','documents','updates'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 18px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:500,textTransform:'capitalize',color:tab===t?'#3b82f6':'#64748b',borderBottom:tab===t?'2px solid #3b82f6':'2px solid transparent',marginBottom:-1 }}>
            {t}{t==='hearings'&&hearings.length>0&&<span style={{ ...S.badge('blue'),marginLeft:6,fontSize:10 }}>{hearings.length}</span>}
            {t==='documents'&&docs.length>0&&<span style={{ ...S.badge('gray'),marginLeft:6,fontSize:10 }}>{docs.length}</span>}
          </button>
        ))}
      </div>
      {tab==='overview'&&(
        <div style={S.grid2}>
          <div>
            <div style={S.card}><h3 style={S.cardTitle}>Description</h3><p style={{ fontSize:13,color:'#374151',lineHeight:1.7,margin:0 }}>{caseData.description||'No description.'}</p></div>
            <div style={S.card}><h3 style={S.cardTitle}>Post update</h3><textarea style={S.textarea} placeholder="Write update for client..." value={newUpdate} onChange={e=>setNewUpdate(e.target.value)} /><button style={{ ...S.btn('primary'),marginTop:8 }} onClick={postUpdate}>Post</button></div>
          </div>
          <div>{[{l:'Court',v:caseData.court_name},{l:'Filing date',v:fmt(caseData.filing_date)},{l:'Next hearing',v:fmt(caseData.next_hearing_date)},{l:'Opposing party',v:caseData.opposing_party},{l:'Judge',v:caseData.judge_name}].filter(f=>f.v&&f.v!=='—').map(({l,v})=>(
            <div key={l} style={{ ...S.card,padding:14,marginBottom:8 }}><p style={{ fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px' }}>{l}</p><p style={{ fontSize:13,fontWeight:500,margin:0 }}>{v}</p></div>
          ))}</div>
        </div>
      )}
      {tab==='hearings'&&(
        <div>
          <div style={{ marginBottom:14 }}><button style={S.btn('primary')} onClick={()=>setShowHForm(!showHForm)}>+ Schedule hearing</button></div>
          {showHForm&&(
            <div style={{ ...S.card,marginBottom:16 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div style={S.formGroup}><label style={S.label}>Date & time *</label><input style={S.input} type="datetime-local" value={newH.date} onChange={e=>setNewH(p=>({...p,date:e.target.value}))} /></div>
                <div style={S.formGroup}><label style={S.label}>Court name</label><input style={S.input} value={newH.court_name} onChange={e=>setNewH(p=>({...p,court_name:e.target.value}))} /></div>
                <div style={S.formGroup}><label style={S.label}>Purpose</label><select style={S.select} value={newH.purpose} onChange={e=>setNewH(p=>({...p,purpose:e.target.value}))}><option value="">Select...</option>{['Arguments','Evidence','Witnesses','Judgment','Bail','Framing of charges'].map(p=><option key={p}>{p}</option>)}</select></div>
                <div style={S.formGroup}><label style={S.label}>Notes</label><input style={S.input} value={newH.notes} onChange={e=>setNewH(p=>({...p,notes:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex',gap:8 }}><button style={S.btn('primary')} onClick={addHearing}>Schedule</button><button style={S.btn('ghost')} onClick={()=>setShowHForm(false)}>Cancel</button></div>
            </div>
          )}
          {hearings.map(h=>(
            <div key={h.id} style={{ ...S.card,display:'flex',gap:14,padding:14,marginBottom:8 }}>
              <div style={{ background:'#fef9c3',borderRadius:8,padding:'8px 12px',textAlign:'center',minWidth:52 }}><div style={{ fontSize:18,fontWeight:700,color:'#854d0e' }}>{new Date(h.date).getDate()}</div><div style={{ fontSize:11,color:'#92400e' }}>{new Date(h.date).toLocaleDateString('en-PK',{month:'short'})}</div></div>
              <div style={{ flex:1 }}><div style={{ display:'flex',alignItems:'center',gap:8 }}><span style={{ fontWeight:500,fontSize:13 }}>{h.court_name||'Court'}</span><span style={S.badge(HSC[h.status]||'gray')}>{h.status}</span></div><p style={{ fontSize:12,color:'#64748b',margin:'2px 0 0' }}>{new Date(h.date).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}{h.purpose?` · ${h.purpose}`:''}</p></div>
            </div>
          ))}
        </div>
      )}
      {tab==='documents'&&(
        <div>
          <div style={{ ...S.card,marginBottom:14 }}>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={async e=>{ const file=e.target.files[0]; if(!file)return; const fd=new FormData(); fd.append('file',file); fd.append('case_id',caseData.id); try{ await fetch(API+'/api/documents/upload',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd}); req('GET',`/api/documents/case/${caseData.id}`,null,token).then(d=>setDocs(Array.isArray(d)?d:[])) }catch(e){alert(e.message)}; e.target.value='' }} />
          </div>
          {docs.map(d=>(
            <div key={d.id} style={{ ...S.card,display:'flex',alignItems:'center',gap:12,padding:12,marginBottom:6 }}>
              <span style={{ fontSize:22 }}>{d.file_type==='pdf'?'📄':'📝'}</span>
              <div style={{ flex:1 }}><p style={{ margin:0,fontWeight:500,fontSize:13 }}>{d.file_name}</p><p style={{ margin:'1px 0 0',fontSize:11,color:'#64748b' }}>{d.category||'General'} · {fmt(d.created_at)}</p></div>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ color:'#3b82f6',fontSize:12 }}>View</a>
            </div>
          ))}
        </div>
      )}
      {tab==='updates'&&(
        <div>
          <div style={S.card}><textarea style={S.textarea} placeholder="Write update..." value={newUpdate} onChange={e=>setNewUpdate(e.target.value)} /><button style={{ ...S.btn('primary'),marginTop:8 }} onClick={postUpdate}>Post update</button></div>
          <div style={S.card}>{(caseData.updates||[]).length===0?<div style={S.empty}><p>No updates yet</p></div>:(caseData.updates||[]).map(u=>(
            <div key={u.id} style={{ display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid #f1f5f9' }}><div style={{ width:7,height:7,borderRadius:'50%',background:'#3b82f6',marginTop:5,flexShrink:0 }} /><div><p style={{ fontSize:13,color:'#374151',margin:0 }}>{u.content}</p><p style={{ fontSize:11,color:'#94a3b8',margin:'3px 0 0' }}>{fmtDT(u.created_at)}</p></div></div>
          ))}</div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HEARINGS PAGE
// ─────────────────────────────────────────────────────────────
function LawyerHearings({ token }) {
  const [hearings,setHearings]=useState([]); const [loading,setLoading]=useState(true); const [days,setDays]=useState(30)
  useEffect(()=>{ req('GET',`/api/hearings/upcoming?days=${days}`,null,token).then(d=>{setHearings(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>setLoading(false)) },[token,days])
  return (
    <div style={S.content}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
        <h2 style={{ margin:0,fontSize:18,fontWeight:600 }}>Court hearings</h2>
        <div style={{ display:'flex',gap:6 }}>{[7,14,30,60].map(d=><button key={d} onClick={()=>setDays(d)} style={S.btnSm(days===d?'blue':'ghost')}>Next {d} days</button>)}</div>
      </div>
      {loading?<Spinner/>:hearings.length===0?<div style={{ ...S.card,...S.empty }}><p>No hearings in this period</p></div>:hearings.map(h=>(
        <div key={h.id} style={{ ...S.card,display:'flex',gap:14,padding:18,marginBottom:10 }}>
          <div style={{ background:'#dbeafe',borderRadius:10,padding:'10px 14px',textAlign:'center',minWidth:60 }}><div style={{ fontSize:20,fontWeight:700,color:'#1e40af' }}>{new Date(h.date).getDate()}</div><div style={{ fontSize:11,color:'#3b82f6' }}>{new Date(h.date).toLocaleDateString('en-PK',{month:'short'})}</div></div>
          <div style={{ flex:1 }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}><div><p style={{ margin:0,fontWeight:600,fontSize:14 }}>{h.court_name||'Court hearing'}</p><p style={{ margin:'2px 0',fontSize:12,color:'#64748b' }}>{new Date(h.date).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}{h.purpose?` · ${h.purpose}`:''}</p></div><span style={S.badge(HSC[h.status]||'gray')}>{h.status}</span></div></div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────
function Bookings({ token, isLawyer }) {
  const [bookings,setBookings]=useState([]); const [loading,setLoading]=useState(true)
  const load=()=>req('GET','/api/bookings/my',null,token).then(d=>{setBookings(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>setLoading(false))
  useEffect(()=>load(),[token])
  const updateStatus=async(id,status,meetLink=null)=>{ try{ let url=`/api/bookings/${id}/status?status=${status}`; if(meetLink)url+=`&meet_link=${encodeURIComponent(meetLink)}`; await req('PUT',url,null,token); load() }catch(e){alert(e.message)} }
  return (
    <div style={S.content}>
      <h2 style={{ margin:'0 0 20px',fontSize:18,fontWeight:600 }}>Consultation bookings</h2>
      {loading?<Spinner/>:bookings.length===0?<div style={{ ...S.card,...S.empty }}><p>No bookings yet</p></div>:(
        <div style={S.card}>
          <table style={S.table}><thead><tr>{['Date & time','Type','Duration','Fee','Notes','Status','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{bookings.map(b=>(
              <tr key={b.id}>
                <td style={S.td}>{fmtDT(b.scheduled_at)}</td>
                <td style={S.td}>{b.consultation_type?.replace('_',' ')}</td>
                <td style={S.td}>{b.duration_minutes} min</td>
                <td style={S.td}>{b.fee?`PKR ${b.fee.toLocaleString()}`:'—'}</td>
                <td style={S.td}><span style={{ fontSize:12,color:'#64748b' }}>{b.notes?b.notes.slice(0,40)+'...':'—'}</span></td>
                <td style={S.td}><span style={S.badge(BSC[b.status]||'gray')}>{b.status}</span></td>
                <td style={S.td}>
                  {isLawyer&&b.status==='pending'&&(<div style={{ display:'flex',gap:5 }}><button style={S.btnSm('green')} onClick={()=>{ const l=prompt('Meeting link (optional):'); updateStatus(b.id,'confirmed',l) }}>Confirm</button><button style={S.btnSm('red')} onClick={()=>updateStatus(b.id,'cancelled')}>Decline</button></div>)}
                  {b.status==='confirmed'&&b.meet_link&&<a href={b.meet_link} target="_blank" rel="noopener noreferrer" style={{ color:'#3b82f6',fontSize:12 }}>Join</a>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────
function Messages({ token, user }) {
  const [threads,setThreads]=useState([]); const [selected,setSelected]=useState(null); const [msgs,setMsgs]=useState([]); const [newMsg,setNewMsg]=useState(''); const [loading,setLoading]=useState(true)
  useEffect(()=>{ req('GET','/api/messages/threads',null,token).then(d=>{setThreads(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>setLoading(false)) },[token])
  const loadMsgs=(t)=>{ setSelected(t); req('GET',`/api/messages/threads/${t.id}/messages`,null,token).then(d=>setMsgs(Array.isArray(d)?d:[])).catch(()=>{}) }
  const sendMsg=async()=>{ if(!newMsg.trim()||!selected)return; try{ await fetch(`${API}/api/messages/threads/${selected.id}/messages?content=${encodeURIComponent(newMsg)}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); setNewMsg(''); loadMsgs(selected) }catch(e){alert(e.message)} }
  return (
    <div style={{ display:'flex',height:'calc(100vh - 65px)' }}>
      <div style={{ width:260,borderRight:'1px solid #e2e8f0',overflowY:'auto',background:'white' }}>
        <div style={{ padding:'14px 16px',borderBottom:'1px solid #e2e8f0',fontWeight:600,fontSize:14 }}>Messages</div>
        {loading?<Spinner/>:threads.length===0?<div style={{ ...S.empty,padding:20 }}><p style={{ fontSize:12 }}>No conversations yet</p></div>:threads.map(t=>(
          <div key={t.id} style={{ padding:'12px 14px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',background:selected?.id===t.id?'#eff6ff':'white',borderLeft:selected?.id===t.id?'3px solid #3b82f6':'3px solid transparent' }} onClick={()=>loadMsgs(t)}>
            <p style={{ margin:0,fontSize:13,fontWeight:500 }}>Thread</p>
            <p style={{ margin:'1px 0 0',fontSize:11,color:'#94a3b8' }}>{fmt(t.created_at)}</p>
          </div>
        ))}
      </div>
      <div style={{ flex:1,display:'flex',flexDirection:'column',background:'white' }}>
        {!selected?<div style={{ ...S.empty,flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column' }}><p>Select a conversation</p></div>:(
          <>
            <div style={{ padding:'12px 18px',borderBottom:'1px solid #e2e8f0',fontWeight:500,fontSize:13 }}>Conversation</div>
            <div style={{ flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10 }}>
              {msgs.length===0?<p style={{ textAlign:'center',color:'#94a3b8',fontSize:12 }}>No messages yet</p>:msgs.map(m=>(
                <div key={m.id} style={{ maxWidth:'70%',padding:'9px 13px',borderRadius:m.sender_id===user.user_id?'13px 13px 3px 13px':'13px 13px 13px 3px',background:m.sender_id===user.user_id?'#0a1628':'#f1f5f9',color:m.sender_id===user.user_id?'white':'#374151',alignSelf:m.sender_id===user.user_id?'flex-end':'flex-start',fontSize:13 }}>
                  <p style={{ margin:0 }}>{m.content}</p><p style={{ margin:'3px 0 0',fontSize:10,opacity:0.6 }}>{fmtDT(m.created_at)}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 16px',borderTop:'1px solid #e2e8f0',display:'flex',gap:8 }}>
              <input style={{ ...S.input,margin:0 }} placeholder="Type a message..." value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} />
              <button style={S.btn('blue')} onClick={sendMsg}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CLIENT DASHBOARD
// ─────────────────────────────────────────────────────────────
function ClientDashboard({ token, user }) {
  const [cases,setCases]=useState([]); const [bookings,setBookings]=useState([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{ Promise.all([req('GET','/api/cases',null,token).catch(()=>[]),req('GET','/api/bookings/my',null,token).catch(()=>[])]).then(([c,b])=>{ setCases(Array.isArray(c)?c:[]); setBookings(Array.isArray(b)?b:[]); setLoading(false) }) },[token])
  if(loading) return <Spinner/>
  return (
    <div style={S.content}>
      <div style={{ marginBottom:20 }}><h2 style={{ margin:0,fontSize:20,fontWeight:600 }}>Welcome, {user.full_name?.split(' ')[0]} 👋</h2><p style={{ margin:'3px 0 0',color:'#64748b',fontSize:13 }}>Track your cases and consultations</p></div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22 }}>
        {[{l:'My cases',v:cases.length,c:'#3b82f6',i:'⚖️'},{l:'Active cases',v:cases.filter(c=>c.status==='active').length,c:'#16a34a',i:'📂'},{l:'My bookings',v:bookings.length,c:'#f59e0b',i:'📅'}].map(s=>(
          <div key={s.l} style={S.statCard(s.c)}><div style={{ fontSize:22,marginBottom:6 }}>{s.i}</div><p style={S.statValue}>{s.v}</p><p style={S.statLabel}>{s.l}</p></div>
        ))}
      </div>
      <div style={S.grid2}>
        <div style={S.card}><h3 style={S.cardTitle}>⚖️ My cases</h3>{cases.length===0?<div style={S.empty}><p>No cases yet</p></div>:cases.slice(0,5).map(c=>(
          <div key={c.id} style={S.listItem}><div><p style={{ margin:0,fontWeight:500,fontSize:13 }}>{c.title}</p><p style={{ margin:'2px 0 0',fontSize:11,color:'#64748b' }}>{c.case_type}{c.court_name?` · ${c.court_name}`:''}</p></div><span style={S.badge(CSC[c.status]||'gray')}>{c.status?.replace('_',' ')}</span></div>
        ))}</div>
        <div style={S.card}><h3 style={S.cardTitle}>📅 My bookings</h3>{bookings.length===0?<div style={S.empty}><p>No bookings yet</p></div>:bookings.slice(0,5).map(b=>(
          <div key={b.id} style={S.listItem}><div><p style={{ margin:0,fontWeight:500,fontSize:13 }}>Consultation</p><p style={{ margin:'2px 0 0',fontSize:11,color:'#64748b' }}>{fmtDT(b.scheduled_at)} · {b.consultation_type?.replace('_',' ')}</p></div><span style={S.badge(BSC[b.status]||'gray')}>{b.status}</span></div>
        ))}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LAWYER SEARCH
// ─────────────────────────────────────────────────────────────
function LawyerSearch({ token }) {
  const [lawyers,setLawyers]=useState([]); const [loading,setLoading]=useState(false); const [filters,setFilters]=useState({ city:'',specialization:'',q:'' }); const [booking,setBooking]=useState(null); const [bookForm,setBookForm]=useState({ scheduled_at:'',consultation_type:'video',notes:'',duration_minutes:30 }); const [bookMsg,setBookMsg]=useState('')
  const search=async()=>{ setLoading(true); const p=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v))); try{ const d=await req('GET',`/api/lawyers/search?${p}`,null,token); setLawyers(d.lawyers||[]) }catch{ setLawyers([]) }; setLoading(false) }
  useEffect(()=>search(),[])
  const bookConsultation=async()=>{ if(!bookForm.scheduled_at){setBookMsg('Please select date/time');return}; try{ await req('POST','/api/bookings',{...bookForm,lawyer_id:booking.id,duration_minutes:Number(bookForm.duration_minutes)},token); setBookMsg('✅ Booking request sent!'); setTimeout(()=>{setBooking(null);setBookMsg('')},3000) }catch(e){setBookMsg('❌ '+e.message)} }
  return (
    <div style={S.content}>
      <div style={{ ...S.card,display:'flex',gap:10,alignItems:'flex-end' }}>
        <div style={{ flex:2 }}><label style={S.label}>Search</label><input style={S.input} placeholder="Search lawyers..." value={filters.q} onChange={e=>setFilters(p=>({...p,q:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&search()} /></div>
        <div style={{ flex:1 }}><label style={S.label}>Specialization</label><select style={S.select} value={filters.specialization} onChange={e=>setFilters(p=>({...p,specialization:e.target.value}))}><option value="">All</option>{['Criminal','Civil','Family','Corporate','Property','Banking','Labour','Tax'].map(s=><option key={s}>{s}</option>)}</select></div>
        <div style={{ flex:1 }}><label style={S.label}>City</label><select style={S.select} value={filters.city} onChange={e=>setFilters(p=>({...p,city:e.target.value}))}><option value="">All cities</option>{['Lahore','Karachi','Islamabad','Rawalpindi','Peshawar','Quetta','Multan'].map(c=><option key={c}>{c}</option>)}</select></div>
        <button style={S.btn('primary')} onClick={search}>Search</button>
      </div>
      <p style={{ color:'#64748b',fontSize:12,margin:'0 0 14px' }}>{lawyers.length} lawyers found</p>
      {loading?<Spinner/>:lawyers.map(l=>(
        <div key={l.id} style={S.lawyerCard}>
          <div style={{ width:52,height:52,borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>⚖️</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
              <div><h3 style={{ margin:0,fontSize:14,fontWeight:600 }}>{l.user?.full_name||'Lawyer'}</h3><p style={{ margin:'2px 0',fontSize:12,color:'#64748b' }}>{l.experience_years} years · {l.city}</p></div>
              <div style={{ textAlign:'right' }}><span style={{ color:'#f59e0b' }}>★</span><span style={{ fontSize:13,fontWeight:500,marginLeft:3 }}>{l.rating_avg?.toFixed(1)||'New'}</span><p style={{ margin:'3px 0 0',fontWeight:600,color:'#16a34a',fontSize:13 }}>{l.consultation_fee?`PKR ${l.consultation_fee.toLocaleString()}/session`:'Free'}</p></div>
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5,margin:'8px 0' }}>{(l.specializations||[]).map(s=><span key={s} style={S.badge('blue')}>{s}</span>)}</div>
            {l.bio&&<p style={{ fontSize:12,color:'#64748b',margin:'0 0 8px' }}>{l.bio}</p>}
            <button style={S.btnSm('primary')} onClick={()=>setBooking(l)}>Book consultation</button>
          </div>
        </div>
      ))}
      {booking&&(
        <Modal title={`Book with ${booking.user?.full_name||'Lawyer'}`} onClose={()=>{setBooking(null);setBookMsg('')}}>
          <div style={S.formGroup}><label style={S.label}>Type</label><select style={S.select} value={bookForm.consultation_type} onChange={e=>setBookForm(p=>({...p,consultation_type:e.target.value}))}><option value="video">Video call</option><option value="phone">Phone call</option><option value="in_person">In person</option></select></div>
          <div style={S.formGroup}><label style={S.label}>Date & time *</label><input style={S.input} type="datetime-local" value={bookForm.scheduled_at} onChange={e=>setBookForm(p=>({...p,scheduled_at:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Duration</label><select style={S.select} value={bookForm.duration_minutes} onChange={e=>setBookForm(p=>({...p,duration_minutes:e.target.value}))}><option value={30}>30 min</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option></select></div>
          <div style={S.formGroup}><label style={S.label}>Describe your issue</label><textarea style={S.textarea} value={bookForm.notes} onChange={e=>setBookForm(p=>({...p,notes:e.target.value}))} /></div>
          {booking.consultation_fee>0&&<p style={{ fontSize:13,color:'#16a34a',fontWeight:500 }}>Fee: PKR {booking.consultation_fee?.toLocaleString()}</p>}
          {bookMsg&&<p style={bookMsg.includes('✅')?S.msgSuccess:S.msgError}>{bookMsg}</p>}
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:8 }}>
            <button style={S.btn('ghost')} onClick={()=>{setBooking(null);setBookMsg('')}}>Cancel</button>
            <button style={S.btn('primary')} onClick={bookConsultation}>Send booking request</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION CONFIG
// ─────────────────────────────────────────────────────────────
const LAWYER_NAV = [
  { section: 'Practice' },
  { id: 'dashboard', label: 'Dashboard',   icon: '🏠' },
  { id: 'cases',     label: 'Cases',        icon: '⚖️' },
  { id: 'hearings',  label: 'Hearings',     icon: '🏛️' },
  { section: 'Clients' },
  { id: 'messages',  label: 'Messages',     icon: '💬' },
  { id: 'bookings',  label: 'Bookings',     icon: '📅' },
  { section: 'AI Tools' },
  { id: 'chatbot',   label: 'Legal AI',     icon: '⚖️', ai: true },
]

const CLIENT_NAV = [
  { section: 'My Legal Matters' },
  { id: 'dashboard',    label: 'Dashboard',    icon: '🏠' },
  { id: 'cases',        label: 'My Cases',     icon: '📂' },
  { id: 'bookings',     label: 'My Bookings',  icon: '📅' },
  { id: 'messages',     label: 'Messages',     icon: '💬' },
  { section: 'Find Help' },
  { id: 'find_lawyers', label: 'Find Lawyers', icon: '🔍' },
  { section: 'AI Tools' },
  { id: 'chatbot',      label: 'Legal AI',     icon: '⚖️', ai: true },
]

const TITLES = {
  dashboard: 'Dashboard', cases: 'Cases', hearings: 'Hearings',
  messages: 'Messages', bookings: 'Bookings', find_lawyers: 'Find Lawyers',
  chatbot: 'Legal AI Assistant',
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [authPage, setAuthPage] = useState('login')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('lexai_token'))
  const [page, setPage] = useState('dashboard')
  const [selectedCase, setSelectedCase] = useState(null)

  useEffect(() => {
    if (token) {
      req('GET', '/api/auth/me', null, token)
        .then(u => setUser({ ...u, user_id: u.id }))
        .catch(() => { localStorage.removeItem('lexai_token'); setToken(null) })
    }
  }, [token])

  const handleLogin = (data) => {
    setToken(data.access_token)
    setUser(data)
    setPage('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('lexai_token')
    setToken(null); setUser(null); setPage('dashboard')
  }

  if (!token || !user) {
    return authPage === 'login'
      ? <LoginPage onLogin={handleLogin} onGoRegister={() => setAuthPage('register')} />
      : <RegisterPage onLogin={handleLogin} onGoLogin={() => setAuthPage('login')} />
  }

  const isLawyer = user.role === 'lawyer'
  const navItems = isLawyer ? LAWYER_NAV : CLIENT_NAV

  const renderPage = () => {
    if (selectedCase && page === 'cases' && isLawyer)
      return <CaseDetail caseData={selectedCase} token={token} onBack={() => setSelectedCase(null)} />
    if (page === 'chatbot')      return <LegalChatbot token={token} user={user} />
    if (page === 'dashboard')    return isLawyer ? <LawyerDashboard token={token} user={user} /> : <ClientDashboard token={token} user={user} />
    if (page === 'cases')        return isLawyer ? <LawyerCases token={token} onSelectCase={c => setSelectedCase(c)} /> : <ClientDashboard token={token} user={user} />
    if (page === 'hearings')     return <LawyerHearings token={token} />
    if (page === 'messages')     return <Messages token={token} user={user} />
    if (page === 'bookings')     return <Bookings token={token} isLawyer={isLawyer} />
    if (page === 'find_lawyers') return <LawyerSearch token={token} />
    return isLawyer ? <LawyerDashboard token={token} user={user} /> : <ClientDashboard token={token} user={user} />
  }

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>
      <div style={S.app}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <div style={S.sidebarLogo}>
            <p style={S.sidebarLogoText}>Lex<span style={{ color:'#3b82f6' }}>AI</span></p>
            <p style={S.sidebarTagline}>Where Law Meets Intelligence</p>
          </div>
          <div style={S.sidebarUser}>
            <div style={S.sidebarAvatar}>{user.full_name?.[0]?.toUpperCase()}</div>
            <div><p style={S.sidebarName}>{user.full_name}</p><p style={S.sidebarRole}>{user.role}</p></div>
          </div>
          <nav style={S.sidebarNav}>
            {navItems.map((item, i) => {
              if (item.section) return <p key={i} style={S.sidebarSection}>{item.section}</p>
              const active = page === item.id && !selectedCase
              return (
                <button key={item.id} style={item.ai ? S.navAI(active) : S.navItem(active)}
                  onClick={() => { setPage(item.id); setSelectedCase(null) }}>
                  <span>{item.icon}</span> {item.label}
                  {item.ai && <span style={{ marginLeft:'auto',fontSize:9,background:'rgba(251,191,36,0.2)',color:'#fbbf24',padding:'1px 6px',borderRadius:10 }}>AI</span>}
                </button>
              )
            })}
          </nav>
          <div style={S.sidebarBottom}>
            <button style={S.logoutBtn} onClick={handleLogout}>🚪 Sign out</button>
          </div>
        </aside>

        {/* Main content */}
        <div style={S.main}>
          {page !== 'chatbot' && (
            <div style={S.topbar}>
              <h1 style={S.pageTitle}>{selectedCase ? `Case: ${selectedCase.title}` : TITLES[page] || 'Dashboard'}</h1>
              <div style={{ fontSize:12,color:'#64748b' }}>{new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
          )}
          {renderPage()}
        </div>
      </div>
    </>
  )
}
