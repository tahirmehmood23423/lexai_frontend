import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

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
const PRACTICE_AREAS = ['Criminal', 'Civil', 'Family', 'Corporate', 'Property', 'Banking', 'Labour', 'Tax', 'Constitutional', 'Immigration', 'Human Rights']
const CASE_TYPES = ['Criminal', 'Civil', 'Family', 'Corporate', 'Property', 'Labour', 'Tax', 'Constitutional', 'Other']
const ROLES = ['owner', 'admin', 'partner', 'associate', 'intern']
const SUGGESTIONS = [
  "What are my rights if arrested in Pakistan?",
  "How do I file for Khula divorce?",
  "Punishment for theft under PPC?",
  "How to register a company in Pakistan?",
  "پاکستان میں وراثت کے قوانین کیا ہیں؟",
  "Bail rights under CrPC?",
]

const STATUS_COLOR = { open:'yellow', active:'blue', on_hold:'gray', closed:'gray', won:'green', lost:'red', pending:'yellow', confirmed:'green', cancelled:'red', completed:'green', scheduled:'blue', adjourned:'yellow', new:'yellow', contacted:'blue', converted:'green' }

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  // shell
  landingWrap: { minHeight:'100vh', background:'#f8fafc', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflowY:'auto' },
  authedApp:   { display:'flex', height:'100vh', background:'#f8fafc', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflow:'hidden' },
  sidebar:     { width:232, background:'#0a1628', display:'flex', flexDirection:'column', flexShrink:0 },
  sidebarLogo: { padding:'20px 18px 14px', borderBottom:'1px solid rgba(255,255,255,.1)' },
  sidebarUser: { padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', gap:10 },
  sidebarAvatar: { width:34, height:34, borderRadius:'50%', background:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 },
  sidebarNav:  { flex:1, padding:'8px 8px', overflowY:'auto' },
  sidebarSect: { fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', padding:'10px 12px 4px', margin:'6px 0 0' },
  navItem: a => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:2, cursor:'pointer', fontSize:13, fontWeight:500, color: a?'white':'rgba(255,255,255,.65)', background: a?'#3b82f6':'transparent', border:'none', width:'100%', textAlign:'left' }),
  sidebarBot:  { padding:10, borderTop:'1px solid rgba(255,255,255,.1)' },
  logoutBtn:   { display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', fontSize:13, color:'rgba(255,255,255,.5)', background:'transparent', border:'none', width:'100%', textAlign:'left' },
  main:        { flex:1, overflow:'hidden', minHeight:0, display:'flex', flexDirection:'column' },
  topbar:      { background:'white', padding:'14px 28px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  content:     { padding:'24px 28px', overflowY:'auto', flex:1 },

  // landing nav
  landingNav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', background:'white', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:10 },
  brand:      { fontSize:22, fontWeight:700, color:'#0a1628', margin:0, cursor:'pointer' },
  acc:        { color:'#3b82f6' },
  navLinks:   { display:'flex', gap:18, alignItems:'center' },
  navLink:    { fontSize:13, color:'#64748b', cursor:'pointer', fontWeight:500, background:'none', border:'none' },
  navBtn: p => ({ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border: p?'none':'1px solid #e2e8f0', background: p?'#0a1628':'white', color: p?'white':'#374151' }),

  // hero
  hero:        { maxWidth:980, margin:'0 auto', padding:'52px 24px 36px', textAlign:'center' },
  heroTitle:   { fontSize:40, fontWeight:800, color:'#0a1628', margin:'0 0 12px', lineHeight:1.15 },
  heroSub:     { fontSize:16, color:'#64748b', maxWidth:600, margin:'0 auto 28px', lineHeight:1.6 },
  heroBadges:  { display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:28 },
  heroBadge:   { background:'#eff6ff', color:'#1e40af', padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500 },
  section:     { maxWidth:1100, margin:'0 auto', padding:'40px 24px' },
  secTitle:    { fontSize:24, fontWeight:600, color:'#0a1628', textAlign:'center', marginBottom:8 },
  secSub:      { fontSize:14, color:'#64748b', textAlign:'center', marginBottom:32 },
  featureGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 },
  featureCard: { background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:22 },
  footer:      { background:'#0a1628', color:'rgba(255,255,255,.6)', textAlign:'center', padding:'32px 24px', fontSize:13, marginTop:40 },

  // cards / forms
  card:      { background:'white', borderRadius:12, border:'1px solid #e2e8f0', padding:22, marginBottom:20 },
  cardSm:    { background:'white', borderRadius:10, border:'1px solid #e2e8f0', padding:16 },
  formGroup: { marginBottom:14 },
  label:     { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5 },
  input:     { width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  select:    { width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box', background:'white', fontFamily:'inherit' },
  textarea:  { width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'10px 13px', fontSize:13, outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', minHeight:80 },

  // buttons
  btn: (v='primary') => ({ padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background: v==='primary'?'#0a1628':v==='blue'?'#3b82f6':v==='red'?'#dc2626':v==='green'?'#16a34a':v==='yellow'?'#f59e0b':'#f1f5f9', color: v==='ghost'?'#374151':'white' }),
  btnSm: (v='ghost') => ({ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', background: v==='primary'?'#0a1628':v==='blue'?'#3b82f6':v==='red'?'#dc2626':v==='green'?'#16a34a':'#f1f5f9', color: v==='ghost'?'#374151':'white' }),

  // badges
  badge: c => { const m={green:{bg:'#dcfce7',c:'#166534'},blue:{bg:'#dbeafe',c:'#1e40af'},yellow:{bg:'#fef9c3',c:'#854d0e'},red:{bg:'#fee2e2',c:'#991b1b'},gray:{bg:'#f1f5f9',c:'#475569'},purple:{bg:'#f3e8ff',c:'#6b21a8'},orange:{bg:'#fff7ed',c:'#9a3412'}}; const s=m[c]||m.gray; return {background:s.bg,color:s.c,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,display:'inline-block',whiteSpace:'nowrap'} },

  // layout helpers
  row:    { display:'flex', gap:12, alignItems:'center' },
  rowBtw: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  grid2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },

  // stats
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 },
  statCard: c => ({ background:'white', borderRadius:12, border:'1px solid #e2e8f0', padding:'18px 20px', borderLeft:'4px solid '+c }),
  statVal:   { fontSize:28, fontWeight:700, color:'#0f172a', margin:0 },
  statLbl:   { fontSize:12, color:'#64748b', margin:'3px 0 0' },

  // tables
  table: { width:'100%', borderCollapse:'collapse' },
  th:    { textAlign:'left', padding:'10px 14px', fontSize:11, color:'#64748b', borderBottom:'1px solid #e2e8f0', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' },
  td:    { padding:'13px 14px', fontSize:13, borderBottom:'1px solid #f1f5f9', color:'#0f172a' },

  // tabs
  tabs: { display:'flex', gap:2, borderBottom:'1px solid #e2e8f0', marginBottom:20 },
  tab: a => ({ padding:'10px 16px', fontSize:13, fontWeight:500, cursor:'pointer', color: a?'#0a1628':'#64748b', background:'transparent', border:'none', borderBottom: a?'2px solid #3b82f6':'2px solid transparent', marginBottom:-1 }),

  // lawyer cards (Fiverr-style)
  lawyerGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:18 },
  lawyerCard: { background:'white', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'box-shadow .2s' },
  lawyerTop:  { background:'linear-gradient(135deg,#0a1628 0%,#1e3a5f 100%)', padding:'28px 20px 18px', textAlign:'center' },
  lawyerAv:   { width:68, height:68, borderRadius:'50%', background:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:24, margin:'0 auto 10px', border:'3px solid rgba(255,255,255,.2)' },
  lawyerBody: { padding:16 },

  // messages
  msgLayout:  { display:'flex', height:'100%', overflow:'hidden' },
  threadList: { width:300, borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0, background:'white', overflowY:'auto' },
  threadItem: a => ({ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', background: a?'#eff6ff':'white', borderLeft: a?'3px solid #3b82f6':'3px solid transparent' }),
  chatArea:   { flex:1, display:'flex', flexDirection:'column', background:'#f8fafc' },
  chatMsgList:{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:10 },
  myBubble:   { alignSelf:'flex-end', maxWidth:'68%', background:'#0a1628', color:'white', borderRadius:'14px 14px 3px 14px', padding:'10px 14px', fontSize:13, lineHeight:1.6 },
  theirBubble:{ alignSelf:'flex-start', maxWidth:'68%', background:'white', border:'1px solid #e2e8f0', borderRadius:'3px 14px 14px 14px', padding:'10px 14px', fontSize:13, lineHeight:1.6, color:'#0f172a' },
  chatInput:  { borderTop:'1px solid #e2e8f0', padding:'12px 16px', background:'white', display:'flex', gap:10 },

  // chatbot
  chatCard:      { maxWidth:880, margin:'0 auto 60px', background:'white', border:'1px solid #e2e8f0', borderRadius:16, boxShadow:'0 4px 24px rgba(0,0,0,.04)', overflow:'hidden' },
  chatHeader:    { padding:'14px 22px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center' },
  chatMsgs:      { padding:24, minHeight:320, maxHeight:500, overflowY:'auto', display:'flex', flexDirection:'column', gap:16 },
  chatEmpty:     { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'40px 20px', textAlign:'center' },
  suggs:         { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginTop:8, maxWidth:640, width:'100%' },
  suggBtn:       { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:12.5, color:'#374151', cursor:'pointer', textAlign:'left', lineHeight:1.4 },
  userRow:       { display:'flex', justifyContent:'flex-end' },
  userBubble:    { maxWidth:'75%', background:'#0a1628', color:'white', borderRadius:'14px 14px 3px 14px', padding:'11px 15px', fontSize:13.5, lineHeight:1.6 },
  botRow:        { display:'flex', gap:10, alignItems:'flex-start' },
  botAvatar:     { width:32, height:32, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 },
  botBubble:     { flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'3px 14px 14px 14px', padding:14, fontSize:13.5, lineHeight:1.7, color:'#1f2937' },
  chatInputArea: { borderTop:'1px solid #e2e8f0', padding:'12px 22px', background:'white' },
  inputRow:      { display:'flex', gap:10 },
  inputBox:      { flex:1, border:'1px solid #e2e8f0', borderRadius:10, padding:'11px 16px', fontSize:13.5, outline:'none', fontFamily:'inherit', resize:'none' },
  sendBtn: d => ({ background: d?'#94a3b8':'#0a1628', color:'white', border:'none', borderRadius:10, padding:'11px 22px', fontSize:13.5, cursor: d?'not-allowed':'pointer', fontWeight:500 }),
  anonBanner: { background:'#fef9c3', color:'#854d0e', padding:'7px 14px', fontSize:11.5, textAlign:'center', borderTop:'1px solid #fde68a' },

  // modals
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  modal:   { background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.2)' },
  authModal:{ background:'white', borderRadius:16, padding:32, width:'100%', maxWidth:460, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.2)' },

  // misc
  msgError:   { color:'#dc2626', fontSize:12, marginTop:6 },
  msgSuccess: { color:'#16a34a', fontSize:12, marginTop:6 },
  pageTitle:  { fontSize:22, fontWeight:700, color:'#0f172a', margin:'0 0 4px' },
  pageSub:    { fontSize:13, color:'#64748b', margin:'0 0 20px' },
  divider:    { borderTop:'1px solid #e2e8f0', margin:'16px 0' },
}

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
function Spinner() { return <p style={{color:'#64748b',padding:'32px 0',textAlign:'center'}}>Loading...</p> }
function Empty({ icon='📭', title, sub, cta, onCta }) {
  return (
    <div style={{textAlign:'center',padding:'48px 24px'}}>
      <div style={{fontSize:44,marginBottom:12}}>{icon}</div>
      <p style={{fontSize:16,fontWeight:600,color:'#0f172a',margin:'0 0 6px'}}>{title}</p>
      {sub && <p style={{fontSize:13,color:'#64748b',margin:'0 0 16px'}}>{sub}</p>}
      {cta && <button style={S.btn('primary')} onClick={onCta}>{cta}</button>}
    </div>
  )
}
function StatusBadge({ s }) {
  return <span style={S.badge(STATUS_COLOR[s]||'gray')}>{(s||'').replace(/_/g,' ')}</span>
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [f, setF] = useState({ full_name:'', email:'', password:'', role:'client', phone:'', city:'' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const ROLES_UI = [
    { id:'client',     icon:'👤', label:'Client',   desc:'Find & hire lawyers' },
    { id:'lawyer',     icon:'⚖️', label:'Lawyer',   desc:'Manage your practice' },
    { id:'firm_admin', icon:'🏢', label:'Law Firm', desc:'Run your firm' },
  ]

  const submit = async () => {
    setErr(''); setLoading(true)
    try {
      if (isLogin) {
        const res = await fetch(API + '/api/auth/login', {
          method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'username='+encodeURIComponent(f.email)+'&password='+encodeURIComponent(f.password)
        })
        const d = await res.json()
        if (d.access_token) { localStorage.setItem('lexai_token', d.access_token); onSuccess(d) }
        else setErr(d.detail || 'Invalid credentials')
      } else {
        if (!f.full_name || !f.email || !f.password) { setErr('Name, email and password are required'); setLoading(false); return }
        const d = await req('POST', '/api/auth/register', f)
        localStorage.setItem('lexai_token', d.access_token); onSuccess(d)
      }
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }
  const set = k => e => setF(p => ({...p,[k]:e.target.value}))

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.authModal} onClick={e => e.stopPropagation()}>
        <h2 style={{fontSize:24,fontWeight:700,textAlign:'center',margin:'0 0 6px'}}>Lex<span style={{color:'#3b82f6'}}>AI</span></h2>
        <p style={{textAlign:'center',color:'#94a3b8',marginBottom:22,fontSize:13}}>{isLogin?'Welcome back':'Create your account'}</p>

        {!isLogin && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
            {ROLES_UI.map(r => (
              <div key={r.id} onClick={()=>setF(p=>({...p,role:r.id}))} style={{padding:'12px 8px',border:'2px solid '+(f.role===r.id?'#3b82f6':'#e2e8f0'),borderRadius:10,cursor:'pointer',textAlign:'center',background:f.role===r.id?'#eff6ff':'white'}}>
                <div style={{fontSize:20,marginBottom:4}}>{r.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:f.role===r.id?'#3b82f6':'#374151'}}>{r.label}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{r.desc}</div>
              </div>
            ))}
          </div>
          <div style={S.formGroup}><label style={S.label}>Full name *</label><input style={S.input} value={f.full_name} onChange={set('full_name')} placeholder="Your full name" /></div>
        </>}

        <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} type="email" value={f.email} onChange={set('email')} onKeyDown={e=>e.key==='Enter'&&submit()} /></div>
        <div style={S.formGroup}><label style={S.label}>Password *</label><input style={S.input} type="password" value={f.password} onChange={set('password')} onKeyDown={e=>e.key==='Enter'&&submit()} /></div>
        {!isLogin && <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={set('phone')} /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={f.city} onChange={set('city')} /></div>
        </div>}

        {err && <p style={S.msgError}>❌ {err}</p>}
        <button style={{...S.btn('primary'),width:'100%',padding:12,marginTop:8,fontSize:14}} onClick={submit} disabled={loading}>
          {loading?'...':(isLogin?'Sign in':'Create account')}
        </button>
        <p style={{textAlign:'center',marginTop:14,fontSize:13,color:'#64748b'}}>
          {isLogin?'No account? ':'Have an account? '}
          <span style={{color:'#3b82f6',cursor:'pointer',fontWeight:500}} onClick={()=>{setIsLogin(!isLogin);setErr('')}}>
            {isLogin?'Register':'Sign in'}
          </span>
        </p>
      </div>
    </div>
  )
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
function Chatbot({ token, user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [province, setProvince] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const msgsRef = useRef(null)

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages])

  async function send(queryText) {
    const q = queryText || input.trim()
    if (!q || loading) return
    setInput(''); setLoading(true)
    const uid = Date.now()
    setMessages(prev => [...prev, {id:uid,role:'user',content:q}, {id:uid+1,role:'assistant',content:'',loading:true,sources:[]}])
    try {
      const headers = {'Content-Type':'application/json'}
      if (token) headers['Authorization'] = 'Bearer '+token
      const res = await fetch(API+'/api/chat/stream', { method:'POST', headers, body: JSON.stringify({message:q,session_id:sessionId,user_id:user?.id||null,province_filter:province||null}) })
      if (!res.ok) throw new Error('HTTP '+res.status)
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let full='', sources=[]
      while (true) {
        const {done,value} = await reader.read(); if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type==='meta') { if (d.session_id) setSessionId(d.session_id); if (d.sources) sources=d.sources }
            else if (d.type==='token') { full+=d.content; setMessages(prev=>prev.map(m=>m.id===uid+1?{...m,content:full,loading:false}:m)) }
            else if (d.type==='done') setMessages(prev=>prev.map(m=>m.id===uid+1?{...m,loading:false}:m))
            else if (d.type==='error') throw new Error(d.content)
          } catch {}
        }
      }
      setMessages(prev=>prev.map(m=>m.id===uid+1?{...m,sources}:m))
    } catch(e) { setMessages(prev=>prev.map(m=>m.id===uid+1?{...m,content:'❌ '+e.message,loading:false}:m)) }
    setLoading(false)
  }

  return (
    <div style={S.chatCard}>
      <div style={S.chatHeader}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>⚖️</span>
          <span style={{fontWeight:600,fontSize:14,color:'#0a1628'}}>LexAI Legal Assistant</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#64748b'}}>
          <div style={{width:8,height:8,background:'#16a34a',borderRadius:'50%'}}/>
          Pakistani law · Urdu + English
        </div>
      </div>
      <div style={S.chatMsgs} ref={msgsRef}>
        {messages.length===0 ? (
          <div style={S.chatEmpty}>
            <div style={{fontSize:42}}>⚖️</div>
            <p style={{fontSize:17,fontWeight:600,color:'#0a1628',margin:0}}>Ask anything about Pakistani law</p>
            <p style={{fontSize:13,color:'#64748b',margin:0}}>Free to use · No signup required</p>
            <div style={S.suggs}>{SUGGESTIONS.map((s,i)=><button key={i} style={S.suggBtn} onClick={()=>send(s)}>{s}</button>)}</div>
          </div>
        ) : messages.map(msg=>(
          <div key={msg.id}>
            {msg.role==='user'
              ? <div style={S.userRow}><div style={S.userBubble}>{msg.content}</div></div>
              : <div style={S.botRow}>
                  <div style={S.botAvatar}>⚖️</div>
                  <div style={S.botBubble}>
                    {msg.loading && !msg.content
                      ? <div style={{display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,background:'#94a3b8',borderRadius:'50%',animation:`bounce 1s ease-in-out ${i*0.15}s infinite`}}/>)}</div>
                      : <><p style={{whiteSpace:'pre-wrap',margin:'0 0 10px'}}>{msg.content}</p>
                          {!msg.loading && msg.sources?.length>0 && <div style={{fontSize:11,color:'#64748b',marginTop:8,paddingTop:8,borderTop:'1px solid #e2e8f0'}}>📄 {msg.sources.length} legal source{msg.sources.length>1?'s':''} consulted</div>}
                        </>}
                  </div>
                </div>}
          </div>
        ))}
      </div>
      <div style={S.chatInputArea}>
        <div style={{display:'flex',gap:10,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#64748b'}}>Province:</span>
          <select style={{fontSize:11,border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 8px',background:'white'}} value={province} onChange={e=>setProvince(e.target.value)}>
            <option value="">All</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={S.inputRow}>
          <textarea style={S.inputBox} rows={2} placeholder="Type your legal question in English or اردو..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} disabled={loading}/>
          <button style={S.sendBtn(loading||!input.trim())} onClick={()=>send()} disabled={loading||!input.trim()}>{loading?'...':'Ask'}</button>
        </div>
      </div>
      {!token && <div style={S.anonBanner}>💡 Chatting as guest — <strong>Sign up free</strong> to save sessions.</div>}
    </div>
  )
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({ onOpenAuth }) {
  const FEATURES = [
    {i:'⚖️',t:'AI Legal Assistant',d:'Instant answers about Pakistani law in English or Urdu.'},
    {i:'🏛️',t:'Find Lawyers',d:'Browse verified lawyers by city, specialty and rating.'},
    {i:'🏢',t:'Law Firms',d:'Discover top Pakistani law firms with full team profiles.'},
    {i:'📂',t:'Case Management',d:'Track cases, hearings, and documents in one place.'},
    {i:'💬',t:'Secure Messaging',d:'Direct encrypted messaging between clients and lawyers.'},
    {i:'🇵🇰',t:'Urdu Support',d:'Ask in Urdu or English — AI responds in your language.'},
  ]
  return (
    <div style={S.landingWrap}>
      <nav style={S.landingNav}>
        <h1 style={S.brand}>Lex<span style={S.acc}>AI</span></h1>
        <div style={S.navLinks}>
          <button style={S.navLink} onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}>Features</button>
          <button style={S.navLink} onClick={()=>document.getElementById('firms')?.scrollIntoView({behavior:'smooth'})}>Law Firms</button>
          <button style={S.navBtn(false)} onClick={()=>onOpenAuth('login')}>Sign in</button>
          <button style={S.navBtn(true)} onClick={()=>onOpenAuth('register')}>Get started</button>
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
        <p style={S.heroSub}>Instant legal answers, verified lawyers, and complete case management — built for Pakistan.</p>
      </div>
      <Chatbot token={null} user={null} />
      <section id="features" style={S.section}>
        <h2 style={S.secTitle}>Built for clients, lawyers &amp; firms</h2>
        <p style={S.secSub}>Everything you need to navigate Pakistani law in one platform</p>
        <div style={S.featureGrid}>{FEATURES.map(f=><div key={f.t} style={S.featureCard}><div style={{fontSize:26,marginBottom:10}}>{f.i}</div><h3 style={{fontSize:15,fontWeight:600,color:'#0a1628',margin:'0 0 6px'}}>{f.t}</h3><p style={{fontSize:13,color:'#64748b',margin:0,lineHeight:1.6}}>{f.d}</p></div>)}</div>
      </section>
      <footer style={S.footer}>© {new Date().getFullYear()} LexAI · Built for Pakistan · <span style={{color:'#3b82f6'}}>Where Law Meets Intelligence</span></footer>
    </div>
  )
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDashboard({ token, user, onNav }) {
  const [summary, setSummary] = useState(null)
  const [cases, setCases] = useState([])

  useEffect(() => {
    req('GET','/api/dashboard/summary',null,token).then(setSummary).catch(()=>{})
    req('GET','/api/cases/',null,token).then(d=>setCases((d.cases||[]).slice(0,4))).catch(()=>{})
  }, [token])

  const QUICK = [
    {icon:'👨‍⚖️',label:'Find a Lawyer',page:'find_lawyer',color:'#3b82f6'},
    {icon:'📂',label:'My Cases',page:'my_cases',color:'#16a34a'},
    {icon:'💬',label:'Messages',page:'messages',color:'#8b5cf6'},
    {icon:'📅',label:'Bookings',page:'bookings',color:'#f59e0b'},
  ]

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>Welcome back, {user.full_name?.split(' ')[0]} 👋</p>
      <p style={S.pageSub}>Here is what is happening with your legal matters.</p>

      {summary && (
        <div style={S.statsGrid}>
          <div style={S.statCard('#3b82f6')}><p style={S.statVal}>{summary.active_cases}</p><p style={S.statLbl}>Active Cases</p></div>
          <div style={S.statCard('#16a34a')}><p style={S.statVal}>{summary.total_cases}</p><p style={S.statLbl}>Total Cases</p></div>
          <div style={S.statCard('#f59e0b')}><p style={S.statVal}>{summary.pending_bookings}</p><p style={S.statLbl}>Pending Bookings</p></div>
          <div style={S.statCard('#8b5cf6')}><p style={S.statVal}>{summary.unread_messages}</p><p style={S.statLbl}>Unread Messages</p></div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {QUICK.map(q=>(
          <div key={q.page} onClick={()=>onNav(q.page)} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px 16px',textAlign:'center',cursor:'pointer',borderTop:'3px solid '+q.color}}>
            <div style={{fontSize:28,marginBottom:8}}>{q.icon}</div>
            <div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{q.label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{...S.rowBtw,marginBottom:16}}>
          <p style={{margin:0,fontWeight:600,fontSize:15}}>Recent Cases</p>
          <button style={S.btnSm('primary')} onClick={()=>onNav('my_cases')}>View all</button>
        </div>
        {cases.length===0
          ? <Empty icon="📂" title="No cases yet" sub="Cases you open with lawyers appear here." cta="Find a Lawyer" onCta={()=>onNav('find_lawyer')} />
          : <table style={S.table}>
              <thead><tr>{['Case','Type','Status','Lawyer','Next Hearing'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{cases.map(c=>(
                <tr key={c.id} style={{cursor:'pointer'}} onClick={()=>onNav('case_detail',c.id)}>
                  <td style={S.td}><span style={{fontWeight:600}}>{c.title}</span><br/><span style={{fontSize:11,color:'#64748b'}}>{c.case_number}</span></td>
                  <td style={S.td}>{c.case_type}</td>
                  <td style={S.td}><StatusBadge s={c.status}/></td>
                  <td style={S.td}>{c.lawyer_name}</td>
                  <td style={S.td}>{c.next_hearing_date?fmt(c.next_hearing_date):'—'}</td>
                </tr>
              ))}</tbody>
            </table>}
      </div>
      <div style={S.card}>
        <p style={{margin:'0 0 14px',fontWeight:600,fontSize:15}}>Legal AI</p>
        <Chatbot token={token} user={user}/>
      </div>
    </div>
  )
}

// ─── FIND A LAWYER ────────────────────────────────────────────────────────────
function FindLawyerPage({ token, user, onStartMessage }) {
  const [lawyers, setLawyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({city:'',specialization:'',min_rating:0})
  const [selected, setSelected] = useState(null)
  const [bookTarget, setBookTarget] = useState(null)

  const load = useCallback(()=>{
    setLoading(true)
    const p = new URLSearchParams()
    if (filters.city) p.set('city',filters.city)
    if (filters.specialization) p.set('specialization',filters.specialization)
    if (filters.min_rating>0) p.set('min_rating',String(filters.min_rating))
    req('GET','/api/lawyers?'+p).then(d=>{setLawyers(d.lawyers||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[filters])

  useEffect(()=>{ load() },[])

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>Find a Lawyer</p>
      <p style={S.pageSub}>Browse verified Pakistani lawyers by specialty, city and rating.</p>

      <div style={{...S.card,marginBottom:20}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
          <div><label style={S.label}>City</label><input style={S.input} placeholder="Lahore, Karachi..." value={filters.city} onChange={e=>setFilters(p=>({...p,city:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&load()} /></div>
          <div><label style={S.label}>Specialization</label>
            <select style={S.select} value={filters.specialization} onChange={e=>setFilters(p=>({...p,specialization:e.target.value}))}>
              <option value="">All areas</option>{PRACTICE_AREAS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Min Rating</label>
            <select style={S.select} value={filters.min_rating} onChange={e=>setFilters(p=>({...p,min_rating:Number(e.target.value)}))}>
              <option value={0}>Any</option><option value={3}>3+</option><option value={4}>4+</option><option value={4.5}>4.5+</option>
            </select>
          </div>
          <button style={{...S.btn('primary'),alignSelf:'flex-end'}} onClick={load}>Search</button>
        </div>
      </div>

      {loading ? <Spinner/> : lawyers.length===0
        ? <Empty icon="👨‍⚖️" title="No lawyers found" sub="Try adjusting your filters." />
        : <div style={S.lawyerGrid}>
            {lawyers.map(l=><LawyerCard key={l.id} lawyer={l} onView={()=>setSelected(l)} onBook={()=>setBookTarget(l)} />)}
          </div>}

      {selected && <LawyerProfileModal lawyer={selected} token={token} user={user} onClose={()=>setSelected(null)} onBook={l=>{setSelected(null);setBookTarget(l)}} onStartMessage={onStartMessage} />}
      {bookTarget && <BookingModal lawyer={bookTarget} token={token} onClose={()=>setBookTarget(null)} />}
    </div>
  )
}

function LawyerCard({ lawyer, onView, onBook }) {
  const initials = (lawyer.full_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={S.lawyerCard} onClick={onView}>
      <div style={S.lawyerTop}>
        <div style={S.lawyerAv}>{initials}</div>
        <p style={{color:'white',fontWeight:700,fontSize:15,margin:'0 0 2px'}}>{lawyer.full_name}</p>
        <p style={{color:'rgba(255,255,255,.6)',fontSize:12,margin:0}}>{lawyer.city||'Pakistan'} · {lawyer.experience_years||0} yrs exp</p>
      </div>
      <div style={S.lawyerBody}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginBottom:10}}>
          <span style={{color:'#f59e0b',fontSize:13}}>{'★'.repeat(Math.round(lawyer.rating_avg||0))}{'☆'.repeat(5-Math.round(lawyer.rating_avg||0))}</span>
          <span style={{fontSize:12,color:'#64748b'}}>{(lawyer.rating_avg||0).toFixed(1)} ({lawyer.rating_count||0})</span>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,justifyContent:'center',marginBottom:12}}>
          {(lawyer.specializations||[]).slice(0,3).map(s=><span key={s} style={S.badge('blue')}>{s}</span>)}
        </div>
        <p style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#0a1628',margin:'0 0 12px'}}>
          {lawyer.consultation_fee>0?`PKR ${Number(lawyer.consultation_fee).toLocaleString()} / session`:'Free consultation'}
        </p>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn('primary'),flex:1,padding:'8px 12px',fontSize:12}} onClick={e=>{e.stopPropagation();onView()}}>View Profile</button>
          <button style={{...S.btn('blue'),flex:1,padding:'8px 12px',fontSize:12}} onClick={e=>{e.stopPropagation();onBook()}}>Book Now</button>
        </div>
      </div>
    </div>
  )
}

function LawyerProfileModal({ lawyer, token, user, onClose, onBook, onStartMessage }) {
  const [full, setFull] = useState(null)
  useEffect(()=>{ req('GET','/api/lawyers/'+lawyer.id).then(setFull).catch(()=>setFull(lawyer)) },[lawyer.id])
  const l = full||lawyer
  const initials = (l.full_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:620}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:18}}>
          <div style={{...S.lawyerAv,width:60,height:60,fontSize:20,flexShrink:0}}>{initials}</div>
          <div style={{flex:1}}>
            <h2 style={{margin:'0 0 4px',fontSize:20}}>{l.full_name}</h2>
            <p style={{margin:'0 0 8px',fontSize:13,color:'#64748b'}}>{l.city||'Pakistan'} · {l.experience_years||0} yrs exp · Bar No: {l.bar_council_no||'—'}</p>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(l.specializations||[]).map(s=><span key={s} style={S.badge('blue')}>{s}</span>)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontWeight:700,fontSize:16,margin:'0 0 4px',color:'#0a1628'}}>{l.consultation_fee>0?`PKR ${Number(l.consultation_fee).toLocaleString()}`:'Free'}</p>
            <p style={{fontSize:11,color:'#64748b',margin:0}}>per session</p>
            {l.is_verified && <span style={{...S.badge('green'),marginTop:6,display:'block'}}>✓ Verified</span>}
          </div>
        </div>
        {l.bio && <p style={{fontSize:13,color:'#374151',lineHeight:1.7,marginBottom:14,background:'#f8fafc',padding:12,borderRadius:8}}>{l.bio}</p>}
        <div style={S.grid2}>
          {l.office_address && <div style={{marginBottom:10}}><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>OFFICE</p><p style={{fontSize:13,margin:0}}>{l.office_address}</p></div>}
          {(l.languages||[]).length>0 && <div style={{marginBottom:10}}><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>LANGUAGES</p><p style={{fontSize:13,margin:0}}>{l.languages.join(', ')}</p></div>}
          {(l.court_types||[]).length>0 && <div style={{marginBottom:10}}><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>COURTS</p><p style={{fontSize:13,margin:0}}>{l.court_types.join(', ')}</p></div>}
        </div>
        <div style={S.divider}/>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:16}}>
          <span style={{color:'#f59e0b',fontSize:15}}>{'★'.repeat(Math.round(l.rating_avg||0))}</span>
          <span style={{fontSize:13,color:'#64748b'}}>{(l.rating_avg||0).toFixed(1)} ({l.rating_count||0} reviews)</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button style={{...S.btn('primary'),flex:1}} onClick={()=>onBook(l)}>📅 Book Consultation</button>
          {token && onStartMessage && user?.role==='client' && <button style={{...S.btn('ghost'),flex:1}} onClick={()=>{onStartMessage(l.user_id);onClose()}}>💬 Message</button>}
          <button style={S.btn('ghost')} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function BookingModal({ lawyer, token, onClose }) {
  const [f, setF] = useState({scheduled_at:'',consultation_type:'video',duration_minutes:30,notes:''})
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const submit = async () => {
    if (!f.scheduled_at) { setMsg('Please select a date and time'); return }
    try { await req('POST','/api/bookings/',{...f,lawyer_id:lawyer.id,scheduled_at:new Date(f.scheduled_at).toISOString()},token); setDone(true) }
    catch(e) { setMsg(e.message) }
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 4px',fontSize:18,fontWeight:700}}>Book with {lawyer.full_name}</h2>
        {done ? <div style={{textAlign:'center',padding:'24px 0'}}>
          <div style={{fontSize:48}}>✅</div>
          <p style={{fontWeight:600,margin:'12px 0 4px'}}>Booking requested!</p>
          <p style={{fontSize:13,color:'#64748b',margin:'0 0 16px'}}>The lawyer will confirm shortly.</p>
          <button style={S.btn('primary')} onClick={onClose}>Done</button>
        </div> : <>
          <p style={{fontSize:13,color:'#64748b',margin:'0 0 16px'}}>Fee: <strong>PKR {Number(lawyer.consultation_fee||0).toLocaleString()}</strong></p>
          <div style={S.formGroup}><label style={S.label}>Date &amp; Time *</label><input style={S.input} type="datetime-local" value={f.scheduled_at} onChange={e=>setF(p=>({...p,scheduled_at:e.target.value}))} /></div>
          <div style={S.grid2}>
            <div style={S.formGroup}><label style={S.label}>Type</label>
              <select style={S.select} value={f.consultation_type} onChange={e=>setF(p=>({...p,consultation_type:e.target.value}))}>
                <option value="video">Video Call</option><option value="phone">Phone</option><option value="in_person">In Person</option>
              </select>
            </div>
            <div style={S.formGroup}><label style={S.label}>Duration</label>
              <select style={S.select} value={f.duration_minutes} onChange={e=>setF(p=>({...p,duration_minutes:Number(e.target.value)}))}>
                <option value={30}>30 min</option><option value={60}>1 hour</option><option value={90}>90 min</option>
              </select>
            </div>
          </div>
          <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={S.textarea} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Describe your matter briefly..." /></div>
          {msg && <p style={S.msgError}>{msg}</p>}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
            <button style={S.btn('primary')} onClick={submit}>Confirm Booking</button>
          </div>
        </>}
      </div>
    </div>
  )
}

// ─── CLIENT CASES PAGE ────────────────────────────────────────────────────────
function ClientCasesPage({ token, onDetail }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [lawyers, setLawyers] = useState([])

  const load = useCallback(()=>{
    setLoading(true)
    const p = statusFilter?'?status='+statusFilter:''
    req('GET','/api/cases/'+p,null,token).then(d=>{setCases(d.cases||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[token,statusFilter])

  useEffect(()=>{ load() },[load])
  useEffect(()=>{ req('GET','/api/lawyers').then(d=>setLawyers(d.lawyers||[])).catch(()=>{}) },[])

  return (
    <div style={S.content} className="page-enter">
      <div style={{...S.rowBtw,marginBottom:20}}>
        <div><p style={S.pageTitle}>My Cases</p><p style={S.pageSub}>Track all your legal matters.</p></div>
        <button style={S.btn('primary')} onClick={()=>setShowCreate(true)}>+ Open a Case</button>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {['','open','active','on_hold','closed','won','lost'].map(s=><button key={s} style={S.tab(statusFilter===s)} onClick={()=>setStatusFilter(s)}>{s===''?'All':s.replace('_',' ')}</button>)}
      </div>
      {loading ? <Spinner/> : cases.length===0
        ? <Empty icon="📂" title="No cases" sub="Open a case to get started." cta="Open a Case" onCta={()=>setShowCreate(true)} />
        : <div style={S.card}><table style={S.table}>
            <thead><tr>{['Case','Type','Lawyer','Status','Next Hearing',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{cases.map(c=>(
              <tr key={c.id}>
                <td style={S.td}><span style={{fontWeight:600}}>{c.title}</span><br/><span style={{fontSize:11,color:'#64748b'}}>{c.case_number}</span></td>
                <td style={S.td}>{c.case_type}</td><td style={S.td}>{c.lawyer_name}</td>
                <td style={S.td}><StatusBadge s={c.status}/></td>
                <td style={S.td}>{c.next_hearing_date?fmt(c.next_hearing_date):'—'}</td>
                <td style={S.td}><button style={S.btnSm('primary')} onClick={()=>onDetail(c.id)}>View</button></td>
              </tr>
            ))}</tbody>
          </table></div>}
      {showCreate && <CreateCaseModal token={token} lawyers={lawyers} role="client" onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load()}} />}
    </div>
  )
}

function CreateCaseModal({ token, lawyers, role, onClose, onCreated }) {
  const [f, setF] = useState({title:'',case_type:'Civil',lawyer_id:'',client_id:'',description:'',court_name:'',opposing_party:''})
  const [err, setErr] = useState('')
  const submit = async () => {
    if (!f.title) { setErr('Case title is required'); return }
    if (role==='client' && !f.lawyer_id) { setErr('Please select a lawyer'); return }
    if (role!=='client' && !f.client_id) { setErr('Client user ID is required'); return }
    try { await req('POST','/api/cases/',f,token); onCreated() } catch(e) { setErr(e.message) }
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700}}>Open New Case</h2>
        <div style={S.formGroup}><label style={S.label}>Case Title *</label><input style={S.input} value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} placeholder="Brief description of your legal matter" /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Case Type *</label>
            <select style={S.select} value={f.case_type} onChange={e=>setF(p=>({...p,case_type:e.target.value}))}>
              {CASE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          {role==='client'
            ? <div style={S.formGroup}><label style={S.label}>Assign Lawyer *</label>
                <select style={S.select} value={f.lawyer_id} onChange={e=>setF(p=>({...p,lawyer_id:e.target.value}))}>
                  <option value="">Select lawyer...</option>
                  {lawyers.map(l=><option key={l.id} value={l.id}>{l.full_name} — {l.city||'PK'}</option>)}
                </select>
              </div>
            : <div style={S.formGroup}><label style={S.label}>Client User ID *</label><input style={S.input} value={f.client_id} onChange={e=>setF(p=>({...p,client_id:e.target.value}))} placeholder="Paste client user ID" /></div>}
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Court</label><input style={S.input} value={f.court_name} onChange={e=>setF(p=>({...p,court_name:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Opposing Party</label><input style={S.input} value={f.opposing_party} onChange={e=>setF(p=>({...p,opposing_party:e.target.value}))} /></div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Description</label><textarea style={S.textarea} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} /></div>
        {err && <p style={S.msgError}>{err}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
          <button style={S.btn('primary')} onClick={submit}>Create Case</button>
        </div>
      </div>
    </div>
  )
}

// ─── CASE DETAIL (shared: client + lawyer) ────────────────────────────────────
function CaseDetailPage({ token, user, caseId, onBack }) {
  const [c, setC] = useState(null)
  const [hearings, setHearings] = useState([])
  const [docs, setDocs] = useState([])
  const [tab, setTab] = useState('overview')
  const [showAddHearing, setShowAddHearing] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const isLawyer = ['lawyer','firm_admin','admin'].includes(user?.role)

  const load = useCallback(()=>{
    req('GET','/api/cases/'+caseId,null,token).then(setC).catch(()=>{})
    req('GET','/api/cases/'+caseId+'/hearings',null,token).then(d=>setHearings(d.hearings||[])).catch(()=>{})
    req('GET','/api/cases/'+caseId+'/documents',null,token).then(d=>setDocs(d.documents||[])).catch(()=>{})
  },[caseId,token])

  useEffect(()=>{ load() },[load])

  const updateStatus = async () => {
    try { await req('PUT','/api/cases/'+caseId,{status:editStatus},token); setStatusMsg('Saved'); load() }
    catch(e) { setStatusMsg(e.message) }
  }

  if (!c) return <div style={S.content}><Spinner/></div>

  return (
    <div style={S.content} className="page-enter">
      <button style={{...S.btnSm('ghost'),marginBottom:16}} onClick={onBack}>← Back to cases</button>

      <div style={S.card}>
        <div style={{...S.rowBtw,marginBottom:12}}>
          <div>
            <h2 style={{margin:'0 0 4px',fontSize:20}}>{c.title}</h2>
            <p style={{margin:0,fontSize:13,color:'#64748b'}}>{c.case_number} · {c.case_type} · {c.court_name||'No court set'}</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <StatusBadge s={c.status}/>
            {isLawyer && <select style={{...S.select,width:'auto',padding:'6px 10px',fontSize:12}} value={editStatus||c.status} onChange={e=>setEditStatus(e.target.value)}>
              {['open','active','on_hold','closed','won','lost'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>}
            {isLawyer && editStatus && editStatus!==c.status && <button style={S.btnSm('green')} onClick={updateStatus}>Save</button>}
          </div>
        </div>
        {statusMsg && <p style={S.msgSuccess}>{statusMsg}</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
          <div><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>CLIENT</p><p style={{fontSize:13,margin:0,fontWeight:500}}>{c.client_name}</p><p style={{fontSize:12,color:'#64748b',margin:0}}>{c.client_email}</p></div>
          <div><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>LAWYER</p><p style={{fontSize:13,margin:0,fontWeight:500}}>{c.lawyer_name}</p></div>
          {c.opposing_party && <div><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>OPPOSING PARTY</p><p style={{fontSize:13,margin:0}}>{c.opposing_party}</p></div>}
          {c.judge_name && <div><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>JUDGE</p><p style={{fontSize:13,margin:0}}>{c.judge_name}</p></div>}
          <div><p style={{fontSize:11,fontWeight:600,color:'#64748b',margin:'0 0 2px'}}>NEXT HEARING</p><p style={{fontSize:13,margin:0,color:c.next_hearing_date?'#0f172a':'#64748b'}}>{c.next_hearing_date?fmt(c.next_hearing_date):'Not scheduled'}</p></div>
        </div>
        {c.description && <><div style={S.divider}/><p style={{fontSize:13,color:'#374151',lineHeight:1.7,margin:0}}>{c.description}</p></>}
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab==='overview')} onClick={()=>setTab('overview')}>Hearings ({hearings.length})</button>
        <button style={S.tab(tab==='docs')} onClick={()=>setTab('docs')}>Documents ({docs.length})</button>
        {c.notes && <button style={S.tab(tab==='notes')} onClick={()=>setTab('notes')}>Notes</button>}
      </div>

      {tab==='overview' && (
        <div style={S.card}>
          {isLawyer && <div style={{marginBottom:16,display:'flex',justifyContent:'flex-end'}}><button style={S.btn('primary')} onClick={()=>setShowAddHearing(true)}>+ Add Hearing</button></div>}
          {hearings.length===0 ? <Empty icon="📅" title="No hearings yet" sub={isLawyer?'Add the first hearing date.':''} />
            : hearings.map(h=>(
              <div key={h.id} style={{display:'flex',gap:16,padding:'14px 0',borderBottom:'1px solid #f1f5f9',alignItems:'flex-start'}}>
                <div style={{width:52,textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:700,color:'#0a1628',lineHeight:1}}>{new Date(h.date).getDate()}</div>
                  <div style={{fontSize:11,color:'#64748b',textTransform:'uppercase'}}>{new Date(h.date).toLocaleDateString('en-PK',{month:'short'})}</div>
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:'0 0 2px',fontWeight:600,fontSize:14}}>{h.purpose||'Hearing'}</p>
                  <p style={{margin:'0 0 4px',fontSize:12,color:'#64748b'}}>{h.court_name||c.court_name||''} {h.court_room?'· Room '+h.court_room:''}</p>
                  {h.outcome && <p style={{margin:0,fontSize:12,color:'#374151'}}>Outcome: {h.outcome}</p>}
                </div>
                <StatusBadge s={h.status}/>
              </div>
            ))}
        </div>
      )}

      {tab==='docs' && (
        <div style={S.card}>
          {docs.length===0 ? <Empty icon="📄" title="No documents" sub="Documents shared on this case appear here." />
            : <table style={S.table}>
                <thead><tr>{['File','Category','Uploaded'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{docs.map(d=>(
                  <tr key={d.id}>
                    <td style={S.td}><a href={d.file_url} target="_blank" rel="noreferrer" style={{color:'#3b82f6',fontWeight:500}}>{d.file_name}</a></td>
                    <td style={S.td}>{d.category||'—'}</td>
                    <td style={S.td}>{fmt(d.uploaded_at)}</td>
                  </tr>
                ))}</tbody>
              </table>}
        </div>
      )}

      {tab==='notes' && <div style={S.card}><p style={{fontSize:13,lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{c.notes}</p></div>}

      {showAddHearing && <AddHearingModal caseId={caseId} token={token} onClose={()=>setShowAddHearing(false)} onAdded={()=>{setShowAddHearing(false);load()}} />}
    </div>
  )
}

function AddHearingModal({ caseId, token, onClose, onAdded }) {
  const [f, setF] = useState({date:'',court_room:'',court_name:'',purpose:'',notes:''})
  const [err, setErr] = useState('')
  const submit = async () => {
    if (!f.date) { setErr('Date is required'); return }
    try { await req('POST','/api/cases/'+caseId+'/hearings',{...f,date:new Date(f.date).toISOString()},token); onAdded() }
    catch(e) { setErr(e.message) }
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700}}>Add Hearing</h2>
        <div style={S.formGroup}><label style={S.label}>Date &amp; Time *</label><input style={S.input} type="datetime-local" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))} /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Court Name</label><input style={S.input} value={f.court_name} onChange={e=>setF(p=>({...p,court_name:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Court Room</label><input style={S.input} value={f.court_room} onChange={e=>setF(p=>({...p,court_room:e.target.value}))} /></div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Purpose</label><input style={S.input} value={f.purpose} onChange={e=>setF(p=>({...p,purpose:e.target.value}))} placeholder="e.g. Bail hearing, Arguments, Evidence" /></div>
        <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={S.textarea} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} /></div>
        {err && <p style={S.msgError}>{err}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
          <button style={S.btn('primary')} onClick={submit}>Add Hearing</button>
        </div>
      </div>
    </div>
  )
}

// ─── LAWYER DASHBOARD ─────────────────────────────────────────────────────────
function LawyerDashboard({ token, user, onNav }) {
  const [summary, setSummary] = useState(null)
  const [hearings, setHearings] = useState([])
  const [cases, setCases] = useState([])

  useEffect(()=>{
    req('GET','/api/dashboard/summary',null,token).then(setSummary).catch(()=>{})
    req('GET','/api/cases/hearings/upcoming',null,token).then(d=>setHearings((d.hearings||[]).slice(0,5))).catch(()=>{})
    req('GET','/api/cases/',null,token).then(d=>setCases((d.cases||[]).slice(0,5))).catch(()=>{})
  },[token])

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>Lawyer Dashboard</p>
      <p style={S.pageSub}>Welcome back, {user.full_name?.split(' ')[0]}. Here is your practice overview.</p>

      {summary && (
        <div style={S.statsGrid}>
          <div style={S.statCard('#3b82f6')}><p style={S.statVal}>{summary.active_cases}</p><p style={S.statLbl}>Active Cases</p></div>
          <div style={S.statCard('#16a34a')}><p style={S.statVal}>{summary.total_cases}</p><p style={S.statLbl}>Total Cases</p></div>
          <div style={S.statCard('#f59e0b')}><p style={S.statVal}>{summary.pending_bookings}</p><p style={S.statLbl}>Pending Bookings</p></div>
          <div style={S.statCard('#8b5cf6')}><p style={S.statVal}>{summary.unread_messages}</p><p style={S.statLbl}>Unread Messages</p></div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={S.card}>
          <div style={{...S.rowBtw,marginBottom:14}}>
            <p style={{margin:0,fontWeight:600,fontSize:15}}>Upcoming Hearings</p>
            <button style={S.btnSm('primary')} onClick={()=>onNav('hearings')}>View all</button>
          </div>
          {hearings.length===0 ? <Empty icon="📅" title="No upcoming hearings" />
            : hearings.map(h=>(
              <div key={h.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid #f1f5f9',alignItems:'center'}}>
                <div style={{width:44,textAlign:'center',background:'#eff6ff',borderRadius:8,padding:'6px 4px',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#1e40af',lineHeight:1}}>{new Date(h.date).getDate()}</div>
                  <div style={{fontSize:9,color:'#64748b',textTransform:'uppercase'}}>{new Date(h.date).toLocaleDateString('en-PK',{month:'short'})}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:'0 0 1px',fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.case_title}</p>
                  <p style={{margin:0,fontSize:12,color:'#64748b'}}>{h.purpose||'Hearing'} · {h.court_name||'—'}</p>
                </div>
              </div>
            ))}
        </div>

        <div style={S.card}>
          <div style={{...S.rowBtw,marginBottom:14}}>
            <p style={{margin:0,fontWeight:600,fontSize:15}}>Recent Cases</p>
            <button style={S.btnSm('primary')} onClick={()=>onNav('lawyer_cases')}>View all</button>
          </div>
          {cases.length===0 ? <Empty icon="📂" title="No cases yet" />
            : cases.map(c=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f1f5f9',alignItems:'center',cursor:'pointer'}} onClick={()=>onNav('case_detail',c.id)}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:'0 0 1px',fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</p>
                  <p style={{margin:0,fontSize:12,color:'#64748b'}}>{c.client_name} · {c.case_type}</p>
                </div>
                <StatusBadge s={c.status}/>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ─── LAWYER CASES ─────────────────────────────────────────────────────────────
function LawyerCasesPage({ token, user, onDetail }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(()=>{
    setLoading(true)
    const p = statusFilter?'?status='+statusFilter:''
    req('GET','/api/cases/'+p,null,token).then(d=>{setCases(d.cases||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[token,statusFilter])
  useEffect(()=>{ load() },[load])

  return (
    <div style={S.content} className="page-enter">
      <div style={{...S.rowBtw,marginBottom:20}}>
        <div><p style={S.pageTitle}>My Cases</p><p style={S.pageSub}>Manage all cases assigned to you.</p></div>
        <button style={S.btn('primary')} onClick={()=>setShowCreate(true)}>+ New Case</button>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {['','open','active','on_hold','closed','won','lost'].map(s=><button key={s} style={S.tab(statusFilter===s)} onClick={()=>setStatusFilter(s)}>{s===''?'All':s.replace('_',' ')}</button>)}
      </div>
      {loading ? <Spinner/> : cases.length===0
        ? <Empty icon="📂" title="No cases" sub="Cases assigned to you appear here." />
        : <div style={S.card}><table style={S.table}>
            <thead><tr>{['Case','Client','Type','Status','Next Hearing','Hearings',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{cases.map(c=>(
              <tr key={c.id}>
                <td style={S.td}><span style={{fontWeight:600}}>{c.title}</span><br/><span style={{fontSize:11,color:'#64748b'}}>{c.case_number}</span></td>
                <td style={S.td}>{c.client_name}<br/><span style={{fontSize:11,color:'#64748b'}}>{c.client_email}</span></td>
                <td style={S.td}>{c.case_type}</td>
                <td style={S.td}><StatusBadge s={c.status}/></td>
                <td style={S.td}>{c.next_hearing_date?fmt(c.next_hearing_date):'—'}</td>
                <td style={S.td}>{c.hearing_count||0}</td>
                <td style={S.td}><button style={S.btnSm('primary')} onClick={()=>onDetail(c.id)}>View</button></td>
              </tr>
            ))}</tbody>
          </table></div>}
      {showCreate && <CreateCaseModal token={token} lawyers={[]} role="lawyer" onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load()}} />}
    </div>
  )
}

// ─── LAWYER HEARINGS ──────────────────────────────────────────────────────────
function LawyerHearingsPage({ token, onDetail }) {
  const [hearings, setHearings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    req('GET','/api/cases/hearings/upcoming',null,token).then(d=>{setHearings(d.hearings||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[token])

  const grouped = hearings.reduce((acc,h)=>{
    const day = new Date(h.date).toDateString()
    if (!acc[day]) acc[day]=[]
    acc[day].push(h)
    return acc
  },{})

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>Upcoming Hearings</p>
      <p style={S.pageSub}>All scheduled hearings across your cases.</p>
      {loading ? <Spinner/> : hearings.length===0
        ? <Empty icon="📅" title="No upcoming hearings" sub="Add hearings to your cases to see them here." />
        : Object.entries(grouped).map(([day,hs])=>(
          <div key={day} style={{marginBottom:20}}>
            <p style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 10px'}}>{day}</p>
            <div style={S.card}>
              {hs.map((h,i)=>(
                <div key={h.id} style={{display:'flex',gap:16,padding:'14px 0',borderBottom: i<hs.length-1?'1px solid #f1f5f9':'none',alignItems:'flex-start'}}>
                  <div style={{width:52,textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:700,color:'#0a1628',lineHeight:1}}>{new Date(h.date).getDate()}</div>
                    <div style={{fontSize:11,color:'#64748b',textTransform:'uppercase'}}>{new Date(h.date).toLocaleDateString('en-PK',{month:'short'})}</div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{new Date(h.date).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:'0 0 2px',fontWeight:600,fontSize:14}}>{h.case_title}</p>
                    <p style={{margin:'0 0 4px',fontSize:12,color:'#64748b'}}>{h.purpose||'Hearing'} · Client: {h.client_name}</p>
                    <p style={{margin:0,fontSize:12,color:'#64748b'}}>{h.court_name||'—'}{h.court_room?' · Room '+h.court_room:''}</p>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                    <StatusBadge s={h.status}/>
                    <button style={S.btnSm('primary')} onClick={()=>onDetail(h.case_id)}>View Case</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

// ─── BOOKINGS PAGE (shared) ───────────────────────────────────────────────────
function BookingsPage({ token, user }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(()=>{
    setLoading(true)
    const p = filter?'?status='+filter:''
    req('GET','/api/bookings/'+p,null,token).then(d=>{setBookings(d.bookings||[]);setLoading(false)}).catch(()=>setLoading(false))
  },[token,filter])
  useEffect(()=>{ load() },[load])

  const isLawyer = ['lawyer','firm_admin','admin'].includes(user?.role)

  const updateStatus = async (id, status) => {
    try { await req('PUT','/api/bookings/'+id,{status},token); load() } catch(e) { alert(e.message) }
  }

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>{isLawyer?'Client Bookings':'My Bookings'}</p>
      <p style={S.pageSub}>{isLawyer?'Manage consultation requests from clients.':'Your scheduled consultations.'}</p>
      <div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
        {['','pending','confirmed','completed','cancelled'].map(s=><button key={s} style={S.tab(filter===s)} onClick={()=>setFilter(s)}>{s===''?'All':s}</button>)}
      </div>
      {loading ? <Spinner/> : bookings.length===0
        ? <Empty icon="📅" title="No bookings" sub={isLawyer?'Client booking requests appear here.':'Book a consultation with a lawyer.'} />
        : <div style={S.card}><table style={S.table}>
            <thead><tr>{[isLawyer?'Client':'Lawyer','Type','Date & Time','Duration','Status','Fee',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{bookings.map(b=>(
              <tr key={b.id}>
                <td style={S.td}><span style={{fontWeight:500}}>{isLawyer?b.client_name:b.lawyer_name}</span></td>
                <td style={S.td}>{b.consultation_type?.replace('_',' ')}</td>
                <td style={S.td}>{fmtDT(b.scheduled_at)}</td>
                <td style={S.td}>{b.duration_minutes} min</td>
                <td style={S.td}><StatusBadge s={b.status}/></td>
                <td style={S.td}>{b.fee?`PKR ${Number(b.fee).toLocaleString()}`:'—'}</td>
                <td style={S.td}>
                  {isLawyer && b.status==='pending' && <div style={{display:'flex',gap:6}}>
                    <button style={S.btnSm('green')} onClick={()=>updateStatus(b.id,'confirmed')}>Confirm</button>
                    <button style={S.btnSm('red')} onClick={()=>updateStatus(b.id,'cancelled')}>Decline</button>
                  </div>}
                  {isLawyer && b.status==='confirmed' && <button style={S.btnSm('primary')} onClick={()=>updateStatus(b.id,'completed')}>Mark Done</button>}
                  {!isLawyer && b.status==='pending' && <button style={S.btnSm('red')} onClick={()=>updateStatus(b.id,'cancelled')}>Cancel</button>}
                  {b.meet_link && <a href={b.meet_link} target="_blank" rel="noreferrer" style={{...S.btnSm('blue'),textDecoration:'none',marginLeft:6}}>Join</a>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>}
    </div>
  )
}

// ─── LAWYER PROFILE (edit own) ────────────────────────────────────────────────
function LawyerProfilePage({ token }) {
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    req('GET','/api/lawyers/me',null,token).then(d=>{ setF(d||{specializations:[],languages:['English','Urdu'],court_types:[],education:[]}); setLoading(false) }).catch(()=>setLoading(false))
  },[token])

  const save = async () => {
    setMsg('')
    try { await req('POST','/api/lawyers/me',f,token); setMsg('Profile saved successfully!') } catch(e) { setMsg('Error: '+e.message) }
  }
  const toggleArr = (field, val) => setF(p=>({...p,[field]: (p[field]||[]).includes(val)?(p[field]||[]).filter(x=>x!==val):[...(p[field]||[]),val]}))

  if (loading) return <div style={S.content}><Spinner/></div>

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>My Lawyer Profile</p>
      <p style={S.pageSub}>This is how clients see you. Keep it updated to attract more cases.</p>
      <div style={S.card}>
        <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:600}}>Professional Info</h3>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Years of Experience</label><input style={S.input} type="number" value={f?.experience_years||0} onChange={e=>setF(p=>({...p,experience_years:Number(e.target.value)}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Consultation Fee (PKR)</label><input style={S.input} type="number" value={f?.consultation_fee||0} onChange={e=>setF(p=>({...p,consultation_fee:Number(e.target.value)}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Bar Council No.</label><input style={S.input} value={f?.bar_council_no||''} onChange={e=>setF(p=>({...p,bar_council_no:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Title in Firm</label><input style={S.input} value={f?.role_in_firm||''} onChange={e=>setF(p=>({...p,role_in_firm:e.target.value}))} placeholder="e.g. Senior Partner" /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={f?.city||''} onChange={e=>setF(p=>({...p,city:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Province</label>
            <select style={S.select} value={f?.province||''} onChange={e=>setF(p=>({...p,province:e.target.value}))}>
              <option value="">Select...</option>{PROVINCES.map(pr=><option key={pr}>{pr}</option>)}
            </select>
          </div>
          <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Office Address</label><input style={S.input} value={f?.office_address||''} onChange={e=>setF(p=>({...p,office_address:e.target.value}))} /></div>
          <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Bio</label><textarea style={{...S.textarea,minHeight:100}} value={f?.bio||''} onChange={e=>setF(p=>({...p,bio:e.target.value}))} placeholder="Tell clients about your background and expertise..." /></div>
        </div>

        <h3 style={{margin:'16px 0 12px',fontSize:15,fontWeight:600}}>Specializations</h3>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
          {PRACTICE_AREAS.map(a=><label key={a} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,padding:'6px 12px',background:(f?.specializations||[]).includes(a)?'#eff6ff':'#f8fafc',border:'1px solid '+(f?.specializations||[]).includes(a)?'#3b82f6':'#e2e8f0',borderRadius:20}}>
            <input type="checkbox" checked={(f?.specializations||[]).includes(a)} onChange={()=>toggleArr('specializations',a)} style={{accentColor:'#3b82f6'}} />{a}
          </label>)}
        </div>

        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600}}>Languages</h3>
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          {['English','Urdu','Punjabi','Sindhi','Pashto','Balochi'].map(l=><label key={l} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13}}>
            <input type="checkbox" checked={(f?.languages||[]).includes(l)} onChange={()=>toggleArr('languages',l)} />{l}
          </label>)}
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={f?.is_available!==false} onChange={e=>setF(p=>({...p,is_available:e.target.checked}))} />
            Available for new cases
          </label>
        </div>

        {msg && <p style={msg.startsWith('Error')?S.msgError:S.msgSuccess}>{msg}</p>}
        <div style={{marginTop:16}}><button style={S.btn('primary')} onClick={save}>Save Profile</button></div>
      </div>
    </div>
  )
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
function MessagesPage({ token, user, initialOtherUserId }) {
  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)

  const loadThreads = useCallback(()=>{
    req('GET','/api/messages/threads',null,token).then(d=>setThreads(d.threads||[])).catch(()=>{})
  },[token])

  useEffect(()=>{ loadThreads() },[loadThreads])

  useEffect(()=>{
    if (initialOtherUserId && threads.length===0) {
      // Will create thread on first message send
    }
  },[initialOtherUserId, threads])

  const openThread = (thread) => {
    setActiveThread(thread)
    req('GET','/api/messages/threads/'+thread.id,null,token).then(d=>setMessages(d.messages||[])).catch(()=>{})
  }

  useEffect(()=>{ if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight },[messages])

  const send = async () => {
    if (!input.trim()) return
    const content = input.trim(); setInput(''); setLoading(true)
    try {
      const payload = activeThread
        ? {thread_id:activeThread.id, content}
        : {other_user_id:initialOtherUserId, content}
      const res = await req('POST','/api/messages/send',payload,token)
      if (!activeThread) {
        loadThreads()
        setActiveThread({id:res.thread_id})
      }
      setMessages(prev=>[...prev,{id:res.id,content,is_mine:true,created_at:res.created_at}])
    } catch(e) { setInput(content) }
    setLoading(false)
  }

  return (
    <div style={{...S.msgLayout, height:'100%'}}>
      {/* Thread list */}
      <div style={S.threadList}>
        <div style={{padding:'16px',borderBottom:'1px solid #e2e8f0'}}>
          <p style={{margin:0,fontWeight:700,fontSize:15}}>Messages</p>
        </div>
        {threads.length===0
          ? <div style={{padding:24,textAlign:'center',color:'#64748b',fontSize:13}}>No conversations yet.</div>
          : threads.map(t=>(
            <div key={t.id} style={S.threadItem(activeThread?.id===t.id)} onClick={()=>openThread(t)}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontWeight:600,fontSize:13}}>{t.other_user?.full_name}</span>
                {t.unread>0 && <span style={{...S.badge('blue'),padding:'1px 7px',fontSize:10}}>{t.unread}</span>}
              </div>
              <p style={{margin:0,fontSize:12,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {t.last_message?`${t.last_message.is_mine?'You: ':''}${t.last_message.content}`:'Start a conversation'}
              </p>
              {t.last_message?.created_at && <p style={{margin:'2px 0 0',fontSize:10,color:'#94a3b8'}}>{fmtDT(t.last_message.created_at)}</p>}
            </div>
          ))}
      </div>

      {/* Chat area */}
      <div style={S.chatArea}>
        {!activeThread && !initialOtherUserId
          ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'#64748b'}}>
              <div style={{fontSize:40}}>💬</div>
              <p style={{margin:0,fontSize:15,fontWeight:500}}>Select a conversation</p>
            </div>
          : <>
              {activeThread && <div style={{padding:'14px 20px',background:'white',borderBottom:'1px solid #e2e8f0',fontWeight:600,fontSize:14}}>
                {threads.find(t=>t.id===activeThread.id)?.other_user?.full_name||'Conversation'}
              </div>}
              <div style={S.chatMsgList} ref={msgsRef}>
                {messages.map(m=>(
                  <div key={m.id} style={m.is_mine?S.myBubble:S.theirBubble}>
                    <p style={{margin:'0 0 2px'}}>{m.content}</p>
                    <p style={{margin:0,fontSize:10,opacity:.6}}>{m.created_at?fmtDT(m.created_at):''}</p>
                  </div>
                ))}
              </div>
              <div style={S.chatInput}>
                <input style={{...S.input,flex:1}} placeholder="Type a message..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} disabled={loading} />
                <button style={S.btn('primary')} onClick={send} disabled={loading||!input.trim()}>Send</button>
              </div>
            </>}
      </div>
    </div>
  )
}

// ─── FIRM MARKETPLACE ─────────────────────────────────────────────────────────
function FirmMarketplace({ onSelect }) {
  const [firms, setFirms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ q:'', city:'', province:'', practice_area:'', verified_only:false })

  const load = useCallback(()=>{
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k,v])=>{ if (v) params.append(k,v) })
    req('GET','/api/firms/?'+params).then(d=>{ setFirms(d.firms||[]); setLoading(false) }).catch(()=>setLoading(false))
  },[filters])
  useEffect(()=>{ load() },[])

  const setF = k => v => setFilters(p=>({...p,[k]:v}))

  return (
    <div style={S.content}>
      <div style={S.card}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:10,marginBottom:10}}>
          <div><label style={S.label}>Search</label><input style={S.input} placeholder="Name, city..." value={filters.q} onChange={e=>setF('q')(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} /></div>
          <div><label style={S.label}>City</label><input style={S.input} value={filters.city} onChange={e=>setF('city')(e.target.value)} /></div>
          <div><label style={S.label}>Province</label><select style={S.select} value={filters.province} onChange={e=>setF('province')(e.target.value)}><option value="">All</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label style={S.label}>Practice Area</label><select style={S.select} value={filters.practice_area} onChange={e=>setF('practice_area')(e.target.value)}><option value="">All</option>{PRACTICE_AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <label style={{fontSize:13,color:'#374151',display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={filters.verified_only} onChange={e=>setF('verified_only')(e.target.checked)} /> Verified firms only</label>
          <button style={S.btn('primary')} onClick={load}>Search</button>
        </div>
      </div>
      {loading ? <Spinner/> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {firms.length===0 ? <Empty icon="🏢" title="No firms found" sub="Try adjusting your filters." />
            : firms.map(f=>(
              <div key={f.id} style={{...S.card,cursor:'pointer',marginBottom:0}} onClick={()=>onSelect(f.slug)}>
                <div style={{...S.rowBtw,marginBottom:8}}>
                  <h3 style={{margin:0,fontSize:15,fontWeight:600}}>{f.name}</h3>
                  {f.is_verified && <span style={S.badge('blue')}>✓ Verified</span>}
                </div>
                <p style={{fontSize:12,color:'#64748b',margin:'4px 0'}}>{f.city||'—'} · {f.lawyer_count} lawyer{f.lawyer_count!==1?'s':''}{f.rating_count>0&&<> · ⭐ {f.rating_avg?.toFixed(1)}</>}</p>
                {f.description && <p style={{fontSize:12,color:'#475569',margin:'8px 0',lineHeight:1.5}}>{f.description.slice(0,110)}...</p>}
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>{(f.practice_areas||[]).slice(0,3).map(a=><span key={a} style={S.badge('gray')}>{a}</span>)}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function InquiryFormModal({ slug, firmName, user, onClose }) {
  const [f, setF] = useState({name:user?.full_name||'',email:user?.email||'',phone:'',subject:'',message:'',practice_area:''})
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!f.name||!f.email||!f.message) { setErr('Name, email and message are required'); return }
    setLoading(true); setErr('')
    try { await req('POST','/api/firms/'+slug+'/inquire',f); setDone(true) } catch(e) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 6px',fontSize:18,fontWeight:700}}>Contact {firmName}</h2>
        {done ? <div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:48}}>✅</div><p style={{fontWeight:600,margin:'12px 0 4px'}}>Inquiry sent!</p><button style={{...S.btn('primary'),marginTop:16}} onClick={onClose}>Close</button></div>
          : <>
            <div style={S.grid2}>
              <div style={S.formGroup}><label style={S.label}>Name *</label><input style={S.input} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} /></div>
              <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} /></div>
              <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} /></div>
              <div style={S.formGroup}><label style={S.label}>Practice Area</label><select style={S.select} value={f.practice_area} onChange={e=>setF(p=>({...p,practice_area:e.target.value}))}><option value="">Select...</option>{PRACTICE_AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
              <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Subject</label><input style={S.input} value={f.subject} onChange={e=>setF(p=>({...p,subject:e.target.value}))} /></div>
              <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Message *</label><textarea style={S.textarea} value={f.message} onChange={e=>setF(p=>({...p,message:e.target.value}))} /></div>
            </div>
            {err && <p style={S.msgError}>{err}</p>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={S.btn('ghost')} onClick={onClose}>Cancel</button>
              <button style={S.btn('primary')} onClick={submit} disabled={loading}>{loading?'...':'Send Inquiry'}</button>
            </div>
          </>}
      </div>
    </div>
  )
}

function FirmReviewsSection({ slug, reviews, token, onUpdate }) {
  const [showForm, setShowForm] = useState(false); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [err, setErr] = useState('')
  const submit = async () => {
    try { await req('POST','/api/firms/'+slug+'/reviews',{rating,comment},token); setShowForm(false); setComment(''); onUpdate() } catch(e) { setErr(e.message) }
  }
  if (!reviews) return <div style={S.card}><Spinner/></div>
  return (
    <div style={S.card}>
      <div style={{...S.rowBtw,marginBottom:16}}>
        <p style={{fontSize:20,fontWeight:700,margin:0}}>⭐ {reviews.rating_avg?.toFixed(1)} <span style={{fontSize:13,fontWeight:400,color:'#64748b'}}>({reviews.rating_count} reviews)</span></p>
        {token && <button style={S.btn('primary')} onClick={()=>setShowForm(!showForm)}>{showForm?'Cancel':'Write a Review'}</button>}
      </div>
      {showForm && <div style={{background:'#f8fafc',padding:16,borderRadius:10,marginBottom:16}}>
        <div style={{display:'flex',gap:6,marginBottom:10}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:24,cursor:'pointer',color:n<=rating?'#fbbf24':'#cbd5e1'}} onClick={()=>setRating(n)}>★</span>)}</div>
        <textarea style={S.textarea} placeholder="Share your experience..." value={comment} onChange={e=>setComment(e.target.value)} />
        {err && <p style={S.msgError}>{err}</p>}
        <button style={{...S.btn('primary'),marginTop:8}} onClick={submit}>Submit</button>
      </div>}
      {reviews.reviews?.length===0 ? <p style={{fontSize:13,color:'#64748b'}}>No reviews yet.</p>
        : reviews.reviews?.map(r=>(
          <div key={r.id} style={{padding:12,borderBottom:'1px solid #f1f5f9'}}>
            <div style={{...S.rowBtw,marginBottom:4}}>
              <p style={{margin:0,fontWeight:600,fontSize:13}}>{r.user_name}</p>
              <span style={{fontSize:11,color:'#64748b'}}>{fmt(r.created_at)}</span>
            </div>
            <p style={{margin:'2px 0',color:'#fbbf24',fontSize:14}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</p>
            {r.comment && <p style={{fontSize:13,color:'#374151',margin:'4px 0 0',lineHeight:1.5}}>{r.comment}</p>}
          </div>
        ))}
    </div>
  )
}

function FirmDetail({ slug, onBack, token, user }) {
  const [firm, setFirm] = useState(null); const [tab, setTab] = useState('about'); const [reviews, setReviews] = useState(null); const [showInquiry, setShowInquiry] = useState(false)
  useEffect(()=>{ req('GET','/api/firms/'+slug).then(setFirm).catch(()=>{}) },[slug])
  useEffect(()=>{ if (tab==='reviews') req('GET','/api/firms/'+slug+'/reviews').then(setReviews) },[tab,slug])
  if (!firm) return <div style={S.content}><Spinner/></div>
  return (
    <div style={S.content}>
      <button style={{...S.btnSm('ghost'),marginBottom:16}} onClick={onBack}>← Back to firms</button>
      <div style={{...S.card,marginTop:8}}>
        <div style={{...S.rowBtw,gap:16}}>
          <div style={{flex:1}}>
            <h2 style={{margin:'0 0 4px',fontSize:22,fontWeight:700}}>{firm.name}</h2>
            <p style={{fontSize:13,color:'#64748b',margin:'6px 0'}}>{firm.city}, {firm.province} · Est. {firm.established_year||'—'}{firm.rating_count>0&&<> · ⭐ {firm.rating_avg?.toFixed(1)} ({firm.rating_count} reviews)</>}</p>
            {firm.website && <a href={firm.website} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#3b82f6'}}>{firm.website}</a>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
            {firm.is_verified && <span style={S.badge('blue')}>✓ Verified</span>}
            <button style={S.btn('blue')} onClick={()=>setShowInquiry(true)}>📩 Contact Firm</button>
          </div>
        </div>
        {firm.description && <p style={{fontSize:13,color:'#374151',lineHeight:1.7,marginTop:14}}>{firm.description}</p>}
        <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:6}}>{(firm.practice_areas||[]).map(a=><span key={a} style={S.badge('gray')}>{a}</span>)}</div>
      </div>
      <div style={S.tabs}>
        <button style={S.tab(tab==='about')} onClick={()=>setTab('about')}>Team ({firm.lawyer_count})</button>
        <button style={S.tab(tab==='reviews')} onClick={()=>setTab('reviews')}>Reviews</button>
      </div>
      {tab==='about' && <div style={S.card}>
        {(firm.lawyers||[]).length===0 ? <p style={{fontSize:13,color:'#64748b'}}>No team members listed.</p>
          : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
              {firm.lawyers.map(l=>(
                <div key={l.id} style={{padding:14,border:'1px solid #e2e8f0',borderRadius:10}}>
                  <p style={{margin:'0 0 2px',fontWeight:600,fontSize:14}}>{l.full_name}</p>
                  <p style={{margin:'0 0 6px',fontSize:12,color:'#64748b'}}>{l.role_in_firm||l.role} · {l.experience_years} yrs</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{(l.specializations||[]).slice(0,2).map(s=><span key={s} style={S.badge('blue')}>{s}</span>)}</div>
                </div>
              ))}
            </div>}
      </div>}
      {tab==='reviews' && <FirmReviewsSection slug={slug} reviews={reviews} token={token} onUpdate={()=>req('GET','/api/firms/'+slug+'/reviews').then(setReviews)} />}
      {showInquiry && <InquiryFormModal slug={slug} firmName={firm.name} user={user} onClose={()=>setShowInquiry(false)} />}
    </div>
  )
}

// ─── FIRM DASHBOARD ───────────────────────────────────────────────────────────
function FirmDashboard({ token }) {
  const [myFirm, setMyFirm] = useState(null); const [dashboard, setDashboard] = useState(null); const [showCreate, setShowCreate] = useState(false); const [tab, setTab] = useState('overview'); const [loaded, setLoaded] = useState(false)
  const refresh = useCallback(()=>{ req('GET','/api/firms/my/firm',null,token).then(d=>{setMyFirm(d);setLoaded(true)}).catch(()=>{setMyFirm(null);setLoaded(true)}) },[token])
  useEffect(()=>{ refresh() },[refresh])
  useEffect(()=>{ if (myFirm?.id) req('GET','/api/firms/'+myFirm.id+'/dashboard',null,token).then(setDashboard).catch(()=>{}) },[myFirm,token,tab])
  if (!loaded) return <div style={S.content}><Spinner/></div>
  if (!myFirm && !showCreate) return (
    <div style={S.content}>
      <div style={{...S.card,textAlign:'center',padding:48}}>
        <div style={{fontSize:40}}>🏢</div>
        <h2 style={{margin:'14px 0 6px'}}>No firm yet</h2>
        <p style={{color:'#64748b',fontSize:13,marginBottom:18}}>Create your law firm profile to manage your team and showcase your practice.</p>
        <button style={S.btn('primary')} onClick={()=>setShowCreate(true)}>+ Create Firm</button>
      </div>
    </div>
  )
  if (showCreate) return <CreateFirmForm token={token} onCancel={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);refresh()}} />
  const canManage = ['owner','admin'].includes(myFirm.role)
  return (
    <div style={S.content}>
      <div style={{marginBottom:16}}>
        <h2 style={{margin:'0 0 4px',fontSize:22}}>🏢 {myFirm.name}</h2>
        <p style={{margin:0,color:'#64748b',fontSize:13}}>Your role: <span style={S.badge('blue')}>{myFirm.role}</span>{myFirm.role_in_firm&&<> · {myFirm.role_in_firm}</>}</p>
      </div>
      <div style={S.tabs}>
        <button style={S.tab(tab==='overview')} onClick={()=>setTab('overview')}>📊 Overview</button>
        <button style={S.tab(tab==='members')} onClick={()=>setTab('members')}>👥 Members</button>
        <button style={S.tab(tab==='inquiries')} onClick={()=>setTab('inquiries')}>📩 Inquiries</button>
        {canManage && <button style={S.tab(tab==='settings')} onClick={()=>setTab('settings')}>⚙️ Settings</button>}
      </div>
      {tab==='overview' && <FirmOverviewTab dashboard={dashboard}/>}
      {tab==='members' && <FirmMembersTab firm={myFirm} token={token} canManage={canManage}/>}
      {tab==='inquiries' && <FirmInquiriesTab firm={myFirm} token={token}/>}
      {tab==='settings' && canManage && <FirmSettingsTab firm={myFirm} token={token} onUpdate={refresh}/>}
    </div>
  )
}

function FirmOverviewTab({ dashboard }) {
  if (!dashboard) return <Spinner/>
  return (<>
    <div style={S.statsGrid}>
      <div style={S.statCard('#3b82f6')}><p style={S.statVal}>{dashboard.lawyer_count}</p><p style={S.statLbl}>Lawyers</p></div>
      <div style={S.statCard('#16a34a')}><p style={S.statVal}>{dashboard.total_cases}</p><p style={S.statLbl}>Total Cases</p></div>
      <div style={S.statCard('#f59e0b')}><p style={S.statVal}>{dashboard.cases_by_status?.active||0}</p><p style={S.statLbl}>Active Cases</p></div>
      <div style={S.statCard('#8b5cf6')}><p style={S.statVal}>{dashboard.pending_inquiries}</p><p style={S.statLbl}>Pending Leads</p></div>
    </div>
    <div style={S.card}>
      <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600}}>Team Performance</h3>
      <table style={S.table}>
        <thead><tr>{['Lawyer','Role','Title','Total Cases','Active'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{(dashboard.lawyers||[]).map(l=>(
          <tr key={l.lawyer_id}>
            <td style={S.td}>{l.full_name}</td>
            <td style={S.td}><span style={S.badge('gray')}>{l.role}</span></td>
            <td style={S.td}>{l.role_in_firm||'—'}</td>
            <td style={S.td}>{l.total_cases}</td>
            <td style={S.td}>{l.active_cases}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>)
}

function FirmMembersTab({ firm, token, canManage }) {
  const [members, setMembers] = useState([]); const [showInvite, setShowInvite] = useState(false); const [invite, setInvite] = useState({email:'',role:'associate',role_in_firm:'',message:''}); const [inviteResult, setInviteResult] = useState(null); const [err, setErr] = useState('')
  const load = useCallback(()=>req('GET','/api/firms/'+firm.id+'/members',null,token).then(setMembers).catch(()=>{}),[firm.id,token])
  useEffect(()=>{ load() },[load])
  const send = async () => {
    setErr('')
    try { const r=await req('POST','/api/firms/'+firm.id+'/members/invite',invite,token); setInviteResult(r); setInvite({email:'',role:'associate',role_in_firm:'',message:''}) } catch(e) { setErr(e.message) }
  }
  const updateRole = async (mid,role) => { try { await req('PUT','/api/firms/'+firm.id+'/members/'+mid+'/role',{role},token); load() } catch(e) { alert(e.message) } }
  const remove = async (mid,name) => { if (!confirm('Remove '+name+'?')) return; try { await req('DELETE','/api/firms/'+firm.id+'/members/'+mid,null,token); load() } catch(e) { alert(e.message) } }
  return (<>
    {canManage && <div style={{marginBottom:16,display:'flex',justifyContent:'flex-end'}}><button style={S.btn('primary')} onClick={()=>{setShowInvite(true);setInviteResult(null)}}>+ Invite Lawyer</button></div>}
    <div style={S.card}><table style={S.table}>
      <thead><tr>{['Name','Email','Role','Title','Joined',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>{members.map(m=>(
        <tr key={m.id}>
          <td style={S.td}>{m.full_name}</td><td style={S.td}>{m.email}</td>
          <td style={S.td}>{canManage&&m.role!=='owner'?<select style={{...S.select,padding:'4px 8px',fontSize:12,width:'auto'}} value={m.role} onChange={e=>updateRole(m.id,e.target.value)}>{ROLES.filter(r=>r!=='owner').map(r=><option key={r}>{r}</option>)}</select>:<span style={S.badge(m.role==='owner'?'purple':'gray')}>{m.role}</span>}</td>
          <td style={S.td}>{m.role_in_firm||'—'}</td><td style={S.td}>{fmt(m.joined_at)}</td>
          <td style={S.td}>{canManage&&m.role!=='owner'&&<button style={S.btnSm('red')} onClick={()=>remove(m.id,m.full_name)}>Remove</button>}</td>
        </tr>
      ))}</tbody>
    </table></div>
    {showInvite && <div style={S.overlay} onClick={()=>setShowInvite(false)}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 16px',fontSize:18}}>Invite Lawyer</h2>
        {inviteResult ? <>
          <div style={{background:'#dcfce7',padding:12,borderRadius:8,marginBottom:12}}>
            <p style={{margin:0,fontSize:13,color:'#166534'}}>✅ Invite sent to <strong>{inviteResult.email}</strong></p>
            <code style={{display:'block',fontSize:11,background:'white',padding:6,borderRadius:4,marginTop:6,wordBreak:'break-all'}}>{window.location.origin}/?invite={inviteResult.token}</code>
          </div>
          <button style={S.btn('primary')} onClick={()=>setShowInvite(false)}>Done</button>
        </> : <>
          <div style={S.formGroup}><label style={S.label}>Email *</label><input style={S.input} value={invite.email} onChange={e=>setInvite(p=>({...p,email:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Role</label><select style={S.select} value={invite.role} onChange={e=>setInvite(p=>({...p,role:e.target.value}))}>{ROLES.filter(r=>r!=='owner').map(r=><option key={r}>{r}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Title</label><input style={S.input} placeholder="e.g. Senior Partner — Family Law" value={invite.role_in_firm} onChange={e=>setInvite(p=>({...p,role_in_firm:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Message</label><textarea style={S.textarea} value={invite.message} onChange={e=>setInvite(p=>({...p,message:e.target.value}))} /></div>
          {err && <p style={S.msgError}>{err}</p>}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button style={S.btn('ghost')} onClick={()=>setShowInvite(false)}>Cancel</button><button style={S.btn('primary')} onClick={send}>Send Invite</button></div>
        </>}
      </div>
    </div>}
  </>)
}

function FirmInquiriesTab({ firm, token }) {
  const [inquiries, setInquiries] = useState([]); const [filter, setFilter] = useState(''); const [selected, setSelected] = useState(null)
  const load = useCallback(()=>{ const url=filter?'/api/firms/'+firm.id+'/inquiries?status='+filter:'/api/firms/'+firm.id+'/inquiries'; req('GET',url,null,token).then(setInquiries).catch(()=>{}) },[firm.id,token,filter])
  useEffect(()=>{ load() },[load])
  const updateStatus = async (id,status)=>{ try { await req('PUT','/api/firms/'+firm.id+'/inquiries/'+id,{status},token); load(); setSelected(null) } catch(e) { alert(e.message) } }
  return (<>
    <div style={{marginBottom:16,display:'flex',gap:6,flexWrap:'wrap'}}>
      {['','new','contacted','converted','closed'].map(s=><button key={s} style={S.tab(filter===s)} onClick={()=>setFilter(s)}>{s===''?'All':s.charAt(0).toUpperCase()+s.slice(1)}</button>)}
    </div>
    <div style={S.card}>
      {inquiries.length===0 ? <Empty icon="📩" title="No inquiries yet" /> : <table style={S.table}>
        <thead><tr>{['From','Email','Subject','Status','Received',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{inquiries.map(i=>(
          <tr key={i.id} style={{cursor:'pointer'}} onClick={()=>setSelected(i)}>
            <td style={S.td}>{i.name}</td><td style={S.td}>{i.email}</td><td style={S.td}>{i.subject||'—'}</td>
            <td style={S.td}><StatusBadge s={i.status}/></td>
            <td style={S.td}>{fmtDT(i.created_at)}</td>
            <td style={S.td}><button style={S.btnSm('primary')}>View</button></td>
          </tr>
        ))}</tbody>
      </table>}
    </div>
    {selected && <div style={S.overlay} onClick={()=>setSelected(null)}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{margin:'0 0 4px',fontSize:18}}>{selected.subject||'Inquiry'}</h2>
        <p style={{margin:'0 0 16px',fontSize:12,color:'#64748b'}}>From {selected.name} · {fmtDT(selected.created_at)}</p>
        <p style={{fontSize:13,margin:'4px 0'}}>📧 {selected.email}{selected.phone&&<> · 📞 {selected.phone}</>}</p>
        {selected.practice_area && <p style={{fontSize:13,margin:'4px 0'}}>⚖️ {selected.practice_area}</p>}
        <div style={{background:'#f8fafc',padding:12,borderRadius:8,margin:'12px 0'}}><p style={{fontSize:13,margin:0,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{selected.message}</p></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {['new','contacted','converted','closed'].map(s=><button key={s} style={selected.status===s?S.btn('primary'):S.btn('ghost')} onClick={()=>updateStatus(selected.id,s)}>{s}</button>)}
        </div>
      </div>
    </div>}
  </>)
}

function FirmSettingsTab({ firm, token, onUpdate }) {
  const [form, setForm] = useState({}); const [msg, setMsg] = useState('')
  useEffect(()=>{ req('GET','/api/firms/'+firm.slug).then(setForm) },[firm.slug])
  const save = async () => {
    setMsg('')
    try { await req('PUT','/api/firms/'+firm.id,{name:form.name,description:form.description,website:form.website,email:form.email,phone:form.phone,address:form.address,city:form.city,province:form.province,established_year:form.established_year,practice_areas:form.practice_areas},token); setMsg('✅ Saved'); onUpdate() } catch(e) { setMsg('❌ '+e.message) }
  }
  const deleteFirm = async () => {
    if (!confirm('Delete "'+firm.name+'"? This cannot be undone.')) return
    try { await req('DELETE','/api/firms/'+firm.id,null,token); onUpdate() } catch(e) { alert(e.message) }
  }
  if (!form.id) return <Spinner/>
  return (
    <div style={S.card}>
      <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:600}}>Firm Settings</h3>
      <div style={S.grid2}>
        <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Name</label><input style={S.input} value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
        <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Description</label><textarea style={S.textarea} value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
        <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={form.city||''} onChange={e=>setForm(p=>({...p,city:e.target.value}))} /></div>
        <div style={S.formGroup}><label style={S.label}>Province</label><select style={S.select} value={form.province||''} onChange={e=>setForm(p=>({...p,province:e.target.value}))}><option value="">Select...</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select></div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} value={form.email||''} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
        <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={form.phone||''} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></div>
        <div style={S.formGroup}><label style={S.label}>Website</label><input style={S.input} value={form.website||''} onChange={e=>setForm(p=>({...p,website:e.target.value}))} /></div>
        <div style={S.formGroup}><label style={S.label}>Established Year</label><input style={S.input} type="number" value={form.established_year||''} onChange={e=>setForm(p=>({...p,established_year:parseInt(e.target.value)||null}))} /></div>
        <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Practice Areas (Ctrl+click for multiple)</label><select multiple style={{...S.select,minHeight:100}} value={form.practice_areas||[]} onChange={e=>setForm(p=>({...p,practice_areas:Array.from(e.target.selectedOptions,o=>o.value)}))}>{PRACTICE_AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
      </div>
      {msg && <p style={msg.startsWith('✅')?S.msgSuccess:S.msgError}>{msg}</p>}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button style={S.btn('primary')} onClick={save}>Save Changes</button>
        {firm.role==='owner' && <button style={S.btn('red')} onClick={deleteFirm}>Delete Firm</button>}
      </div>
    </div>
  )
}

function CreateFirmForm({ token, onCancel, onCreated }) {
  const [form, setForm] = useState({name:'',description:'',city:'',province:'',practice_areas:[],languages:['English','Urdu']}); const [err, setErr] = useState('')
  const create = async () => {
    if (!form.name) { setErr('Firm name required'); return }
    try { await req('POST','/api/firms/',form,token); onCreated() } catch(e) { setErr(e.message) }
  }
  return (
    <div style={S.content}>
      <div style={S.card}>
        <h2 style={{marginTop:0,fontSize:20}}>Create Your Law Firm</h2>
        <div style={S.grid2}>
          <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Firm name *</label><input style={S.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Description</label><textarea style={S.textarea} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} /></div>
          <div style={S.formGroup}><label style={S.label}>Province</label><select style={S.select} value={form.province} onChange={e=>setForm(p=>({...p,province:e.target.value}))}><option value="">Select...</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select></div>
          <div style={{...S.formGroup,gridColumn:'1/-1'}}><label style={S.label}>Practice Areas (Ctrl+click)</label><select multiple style={{...S.select,minHeight:100}} value={form.practice_areas} onChange={e=>setForm(p=>({...p,practice_areas:Array.from(e.target.selectedOptions,o=>o.value)}))}>{PRACTICE_AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
        </div>
        {err && <p style={S.msgError}>{err}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:14}}>
          <button style={S.btn('ghost')} onClick={onCancel}>Cancel</button>
          <button style={S.btn('primary')} onClick={create}>Create Firm</button>
        </div>
      </div>
    </div>
  )
}

function InviteAcceptBanner({ token, onAccepted }) {
  const [inviteToken, setInviteToken] = useState(null); const [status, setStatus] = useState('')
  useEffect(()=>{ const t=new URLSearchParams(window.location.search).get('invite'); if (t) setInviteToken(t) },[])
  if (!inviteToken) return null
  const accept = async () => {
    setStatus('Processing...')
    try { const r=await req('POST','/api/firms/invites/'+inviteToken+'/accept',null,token); setStatus('✅ Joined! Role: '+r.role); window.history.replaceState({},'',window.location.pathname); setTimeout(()=>{setInviteToken(null);onAccepted()},2000) }
    catch(e) { setStatus('❌ '+e.message) }
  }
  return (
    <div style={{background:'#dbeafe',borderBottom:'1px solid #93c5fd',padding:'12px 28px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <p style={{margin:0,fontSize:13}}>📩 You have a pending firm invitation. {status}</p>
      {!status && <div style={{display:'flex',gap:8}}>
        <button style={S.btn('primary')} onClick={accept}>Accept</button>
        <button style={S.btn('ghost')} onClick={()=>{setInviteToken(null);window.history.replaceState({},'',window.location.pathname)}}>Dismiss</button>
      </div>}
    </div>
  )
}

// ─── LAWYER CLIENTS ───────────────────────────────────────────────────────────
function LawyerClientsPage({ token, onStartMessage }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    req('GET','/api/cases/',null,token).then(d=>setCases(d.cases||[])).catch(()=>{}).finally(()=>setLoading(false))
  },[token])

  const clients = Object.values(
    cases.reduce((acc,c)=>{
      if (!acc[c.client_id]) acc[c.client_id]={id:c.client_id,name:c.client_name,email:c.client_email,cases:[]}
      acc[c.client_id].cases.push(c)
      return acc
    },{})
  )

  return (
    <div style={S.content} className="page-enter">
      <p style={S.pageTitle}>My Clients</p>
      <p style={S.pageSub}>All clients across your active and closed cases.</p>
      {loading ? <Spinner/> : clients.length===0
        ? <Empty icon="👥" title="No clients yet" sub="Clients appear here once you have assigned cases." />
        : <div style={S.card}><table style={S.table}>
            <thead><tr>{['Client','Email','Total Cases','Active Cases',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{clients.map(cl=>{
              const active = cl.cases.filter(c=>['open','active'].includes(c.status)).length
              return (
                <tr key={cl.id}>
                  <td style={S.td}><span style={{fontWeight:600}}>{cl.name}</span></td>
                  <td style={S.td}>{cl.email||'—'}</td>
                  <td style={S.td}>{cl.cases.length}</td>
                  <td style={S.td}>{active>0?<StatusBadge s="active"/>:'—'} {active>0?active:''}</td>
                  <td style={S.td}><button style={S.btnSm('primary')} onClick={()=>onStartMessage(cl.id)}>Message</button></td>
                </tr>
              )
            })}</tbody>
          </table></div>}
    </div>
  )
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('lexai_token'))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [caseDetailId, setCaseDetailId] = useState(null)
  const [selectedFirmSlug, setSelectedFirmSlug] = useState(null)
  const [msgInitUserId, setMsgInitUserId] = useState(null)
  const [needsFirmSetup, setNeedsFirmSetup] = useState(false)

  useEffect(()=>{
    if (token) {
      req('GET','/api/auth/me',null,token)
        .then(u=>setUser({...u,user_id:u.id}))
        .catch(()=>{ localStorage.removeItem('lexai_token'); setToken(null) })
    }
  },[token])

  const onAuthSuccess = d => {
    setToken(d.access_token)
    setUser(d)
    setAuthMode(null)
    if (d.role==='firm_admin') setNeedsFirmSetup(true)
    else setPage('dashboard')
  }

  const logout = () => { localStorage.removeItem('lexai_token'); setToken(null); setUser(null); setPage('dashboard'); setCaseDetailId(null) }

  const navigate = (pg, id=null) => {
    setPage(pg)
    setCaseDetailId(pg==='case_detail'?id:null)
    setSelectedFirmSlug(pg==='firm_detail'?id:null)
    if (pg!=='messages') setMsgInitUserId(null)
  }

  const startMessage = (otherUserId) => {
    setMsgInitUserId(otherUserId)
    setPage('messages')
  }

  if (!token || !user) {
    return (
      <>
        <LandingPage onOpenAuth={setAuthMode} />
        {authMode && <AuthModal mode={authMode} onClose={()=>setAuthMode(null)} onSuccess={onAuthSuccess} />}
      </>
    )
  }

  // Firm admin just signed up → show firm creation first
  if (needsFirmSetup) {
    return (
      <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
        <div style={{maxWidth:640,margin:'0 auto',paddingTop:48}}>
          <h2 style={{textAlign:'center',margin:'0 0 8px'}}>🏢 Set up your Law Firm</h2>
          <p style={{textAlign:'center',color:'#64748b',marginBottom:32}}>Create your firm profile to get started.</p>
          <CreateFirmForm token={token} onCancel={()=>setNeedsFirmSetup(false)} onCreated={()=>{setNeedsFirmSetup(false);setPage('my_firm')}} />
        </div>
      </div>
    )
  }

  const isLawyer = ['lawyer','firm_admin','admin'].includes(user.role)
  const isFirmAdmin = ['firm_admin','admin'].includes(user.role)

  const CLIENT_NAV = [
    {section:'Main'},
    {id:'dashboard',label:'Dashboard',icon:'🏠'},
    {id:'chatbot',label:'Legal AI',icon:'⚖️'},
    {section:'My Legal Matters'},
    {id:'find_lawyer',label:'Find a Lawyer',icon:'👨‍⚖️'},
    {id:'my_cases',label:'My Cases',icon:'📂'},
    {id:'bookings',label:'Bookings',icon:'📅'},
    {id:'messages',label:'Messages',icon:'💬'},
    {section:'Marketplace'},
    {id:'firms',label:'Law Firms',icon:'🏢'},
  ]

  const LAWYER_NAV = [
    {section:'Main'},
    {id:'dashboard',label:'Dashboard',icon:'🏠'},
    {id:'chatbot',label:'Legal AI',icon:'⚖️'},
    {section:'Practice'},
    {id:'lawyer_cases',label:'My Cases',icon:'📂'},
    {id:'hearings',label:'Hearings',icon:'📅'},
    {id:'bookings',label:'Bookings',icon:'🗓️'},
    {id:'clients',label:'Clients',icon:'👥'},
    {id:'messages',label:'Messages',icon:'💬'},
    {section:'Profile'},
    {id:'lawyer_profile',label:'My Profile',icon:'👤'},
    ...(isFirmAdmin?[{id:'my_firm',label:'My Firm',icon:'🏢'}]:[]),
    {section:'Marketplace'},
    {id:'firms',label:'Law Firms',icon:'🏛️'},
  ]

  const NAV = isLawyer ? LAWYER_NAV : CLIENT_NAV
  const PAGE_TITLES = { dashboard:'Dashboard', chatbot:'Legal AI', find_lawyer:'Find a Lawyer', my_cases:'My Cases', bookings:'Bookings', messages:'Messages', firms:'Law Firms', my_firm:'My Firm', lawyer_cases:'My Cases', hearings:'Hearings', clients:'My Clients', lawyer_profile:'My Profile', case_detail:'Case Detail', firm_detail:'Firm Details' }

  const renderPage = () => {
    if (caseDetailId) return <CaseDetailPage token={token} user={user} caseId={caseDetailId} onBack={()=>{ setCaseDetailId(null); setPage(isLawyer?'lawyer_cases':'my_cases') }} />
    if (selectedFirmSlug) return <FirmDetail slug={selectedFirmSlug} onBack={()=>setSelectedFirmSlug(null)} token={token} user={user} />
    if (page==='chatbot') return <div style={S.content}><Chatbot token={token} user={user}/></div>
    if (page==='firms') return <FirmMarketplace onSelect={slug=>{setSelectedFirmSlug(slug);setPage('firm_detail')}} />
    if (page==='my_firm') return <FirmDashboard token={token}/>
    if (page==='messages') return <MessagesPage token={token} user={user} initialOtherUserId={msgInitUserId}/>
    if (page==='bookings') return <BookingsPage token={token} user={user}/>
    if (isLawyer) {
      if (page==='dashboard') return <LawyerDashboard token={token} user={user} onNav={navigate}/>
      if (page==='lawyer_cases') return <LawyerCasesPage token={token} user={user} onDetail={id=>navigate('case_detail',id)}/>
      if (page==='hearings') return <LawyerHearingsPage token={token} onDetail={id=>navigate('case_detail',id)}/>
      if (page==='lawyer_profile') return <LawyerProfilePage token={token}/>
      if (page==='clients') return <LawyerClientsPage token={token} onStartMessage={startMessage}/>
    } else {
      if (page==='dashboard') return <ClientDashboard token={token} user={user} onNav={navigate}/>
      if (page==='find_lawyer') return <FindLawyerPage token={token} user={user} onStartMessage={startMessage}/>
      if (page==='my_cases') return <ClientCasesPage token={token} onDetail={id=>navigate('case_detail',id)}/>
    }
    return <div style={S.content}><p>Page not found.</p></div>
  }

  const activePage = caseDetailId?'case_detail':selectedFirmSlug?'firm_detail':page

  return (
    <div style={S.authedApp}>
      <aside style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <p style={{fontSize:22,fontWeight:700,color:'white',margin:0}}>Lex<span style={{color:'#3b82f6'}}>AI</span></p>
          <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>Where Law Meets Intelligence</p>
        </div>
        <div style={S.sidebarUser}>
          <div style={S.sidebarAvatar}>{user.full_name?.[0]?.toUpperCase()}</div>
          <div style={{minWidth:0}}>
            <p style={{fontSize:13,color:'white',margin:0,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.full_name}</p>
            <p style={{fontSize:11,color:'rgba(255,255,255,.5)',margin:0,textTransform:'capitalize'}}>{user.role?.replace('_',' ')}</p>
          </div>
        </div>
        <nav style={S.sidebarNav}>
          {NAV.map((item,i)=>{
            if (item.section) return <p key={i} style={S.sidebarSect}>{item.section}</p>
            return <button key={item.id} style={S.navItem(activePage===item.id)} onClick={()=>navigate(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          })}
        </nav>
        <div style={S.sidebarBot}><button style={S.logoutBtn} onClick={logout}>🚪 Sign out</button></div>
      </aside>

      <div style={S.main}>
        <InviteAcceptBanner token={token} onAccepted={()=>setPage('my_firm')}/>
        <div style={S.topbar}>
          <h1 style={{margin:0,fontSize:18,fontWeight:600}}>{PAGE_TITLES[activePage]||'LexAI'}</h1>
          <span style={{fontSize:12,color:'#64748b'}}>{new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long'})}</span>
        </div>
        {page==='messages' ? <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>{renderPage()}</div> : renderPage()}
      </div>
    </div>
  )
}
