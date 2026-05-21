// ═══════════════════════════════════════════════════════════════
// LexAI Frontend — Complete React App
// Stack: React 18 + Vite + Tailwind CSS + React Router + Zustand
// Deploy free: vercel.com (connect GitHub, zero config)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// FILE: src/lib/api.js — Axios client with auth token injection
// ─────────────────────────────────────────────────────────────
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_BASE })

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lexai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lexai_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── API helper functions ──
export const authAPI = {
  register:  (data) => api.post('/api/auth/register', data),
  login:     (email, password) => api.post('/api/auth/login', new URLSearchParams({ username: email, password })),
  me:        () => api.get('/api/auth/me'),
  updateMe:  (data) => api.put('/api/auth/me', data),
}

export const lawyersAPI = {
  search:         (params) => api.get('/api/lawyers/search', { params }),
  get:            (id) => api.get(`/api/lawyers/${id}`),
  createProfile:  (data) => api.post('/api/lawyers/profile', data),
  updateProfile:  (data) => api.put('/api/lawyers/profile', data),
  getReviews:     (id) => api.get(`/api/reviews/lawyer/${id}`),
}

export const casesAPI = {
  list:        (params) => api.get('/api/cases', { params }),
  get:         (id) => api.get(`/api/cases/${id}`),
  create:      (data) => api.post('/api/cases', data),
  update:      (id, data) => api.put(`/api/cases/${id}`, data),
  postUpdate:  (id, data) => api.post(`/api/cases/${id}/updates`, data),
}

export const hearingsAPI = {
  forCase:   (caseId) => api.get(`/api/hearings/case/${caseId}`),
  upcoming:  (days) => api.get('/api/hearings/upcoming', { params: { days } }),
  create:    (data) => api.post('/api/hearings', data),
  update:    (id, data) => api.put(`/api/hearings/${id}`, data),
}

export const documentsAPI = {
  forCase: (caseId) => api.get(`/api/documents/case/${caseId}`),
  upload:  (formData) => api.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete:  (id) => api.delete(`/api/documents/${id}`),
}

export const messagesAPI = {
  threads:       () => api.get('/api/messages/threads'),
  getMessages:   (threadId) => api.get(`/api/messages/threads/${threadId}/messages`),
  send:          (threadId, content) => api.post(`/api/messages/threads/${threadId}/messages`, null, { params: { content } }),
}

export const bookingsAPI = {
  create: (data) => api.post('/api/bookings', data),
  my:     () => api.get('/api/bookings/my'),
  updateStatus: (id, status, meetLink) => api.put(`/api/bookings/${id}/status`, null, { params: { status, meet_link: meetLink } }),
}

export const reviewsAPI = {
  create: (data) => api.post('/api/reviews', data),
}


// ─────────────────────────────────────────────────────────────
// FILE: src/store/authStore.js — Zustand global auth state
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { authAPI } from '../lib/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('lexai_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    const res = await authAPI.login(email, password)
    const { access_token, user_id, role, full_name } = res.data
    localStorage.setItem('lexai_token', access_token)
    set({ token: access_token, user: { id: user_id, role, full_name }, isLoading: false })
    return role
  },

  register: async (data) => {
    set({ isLoading: true })
    const res = await authAPI.register(data)
    const { access_token, user_id, role, full_name } = res.data
    localStorage.setItem('lexai_token', access_token)
    set({ token: access_token, user: { id: user_id, role, full_name }, isLoading: false })
    return role
  },

  logout: () => {
    localStorage.removeItem('lexai_token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    if (!get().token) return
    try {
      const res = await authAPI.me()
      set({ user: res.data })
    } catch { get().logout() }
  },
}))


// ─────────────────────────────────────────────────────────────
// FILE: src/App.jsx — Router setup
// ─────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'

// Pages
import LandingPage        from './pages/LandingPage'
import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import LawyerSearch       from './pages/LawyerSearch'
import LawyerProfile      from './pages/LawyerProfile'
import BookingPage        from './pages/BookingPage'

// Client pages
import ClientDashboard    from './pages/client/Dashboard'
import ClientCases        from './pages/client/Cases'
import ClientCaseDetail   from './pages/client/CaseDetail'
import ClientMessages     from './pages/client/Messages'
import ClientBookings     from './pages/client/Bookings'

// Lawyer pages
import LawyerDashboard    from './pages/lawyer/Dashboard'
import LawyerCases        from './pages/lawyer/Cases'
import LawyerCaseDetail   from './pages/lawyer/CaseDetail'
import LawyerNewCase      from './pages/lawyer/NewCase'
import LawyerHearings     from './pages/lawyer/Hearings'
import LawyerMessages     from './pages/lawyer/Messages'
import LawyerSetupProfile from './pages/lawyer/SetupProfile'
import LawyerBookings     from './pages/lawyer/Bookings'

import Layout from './components/Layout'

function ProtectedRoute({ children, allowedRole }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRole && user?.role !== allowedRole) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe)
  useEffect(() => { fetchMe() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/lawyers"       element={<LawyerSearch />} />
        <Route path="/lawyers/:id"   element={<LawyerProfile />} />
        <Route path="/book/:lawyerId" element={<BookingPage />} />

        {/* Client routes */}
        <Route path="/client" element={<ProtectedRoute allowedRole="client"><Layout /></ProtectedRoute>}>
          <Route index               element={<ClientDashboard />} />
          <Route path="cases"        element={<ClientCases />} />
          <Route path="cases/:id"    element={<ClientCaseDetail />} />
          <Route path="messages"     element={<ClientMessages />} />
          <Route path="bookings"     element={<ClientBookings />} />
        </Route>

        {/* Lawyer routes */}
        <Route path="/lawyer" element={<ProtectedRoute allowedRole="lawyer"><Layout /></ProtectedRoute>}>
          <Route index               element={<LawyerDashboard />} />
          <Route path="setup"        element={<LawyerSetupProfile />} />
          <Route path="cases"        element={<LawyerCases />} />
          <Route path="cases/new"    element={<LawyerNewCase />} />
          <Route path="cases/:id"    element={<LawyerCaseDetail />} />
          <Route path="hearings"     element={<LawyerHearings />} />
          <Route path="messages"     element={<LawyerMessages />} />
          <Route path="bookings"     element={<LawyerBookings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}


// ─────────────────────────────────────────────────────────────
// FILE: src/components/Layout.jsx — Sidebar + top nav shell
// ─────────────────────────────────────────────────────────────
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const clientNav = [
  { to: '/client',          label: 'Dashboard',   icon: '🏠' },
  { to: '/client/cases',    label: 'My Cases',     icon: '⚖️' },
  { to: '/client/messages', label: 'Messages',     icon: '💬' },
  { to: '/client/bookings', label: 'Bookings',     icon: '📅' },
  { to: '/lawyers',         label: 'Find Lawyers', icon: '🔍' },
]

const lawyerNav = [
  { to: '/lawyer',           label: 'Dashboard',  icon: '🏠' },
  { to: '/lawyer/cases',     label: 'Cases',      icon: '⚖️' },
  { to: '/lawyer/hearings',  label: 'Hearings',   icon: '🏛️' },
  { to: '/lawyer/messages',  label: 'Messages',   icon: '💬' },
  { to: '/lawyer/bookings',  label: 'Bookings',   icon: '📅' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const navItems = user?.role === 'lawyer' ? lawyerNav : clientNav

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a1628] text-white flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white">Lex<span className="text-blue-400">AI</span></h1>
          <p className="text-xs text-white/50 mt-0.5">Where Law Meets Intelligence</p>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-white/50 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/client' || to === '/lawyer'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// FILE: src/pages/lawyer/Dashboard.jsx — Lawyer home screen
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { casesAPI, hearingsAPI, bookingsAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function LawyerDashboard() {
  const { user } = useAuthStore()
  const [cases, setCases] = useState([])
  const [hearings, setHearings] = useState([])
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    casesAPI.list({ status: 'active' }).then(r => setCases(r.data.slice(0, 5)))
    hearingsAPI.upcoming(7).then(r => setHearings(r.data.slice(0, 5)))
    bookingsAPI.my().then(r => setBookings(r.data.filter(b => b.status === 'pending').slice(0, 5)))
  }, [])

  const stats = [
    { label: 'Active Cases', value: cases.length, icon: '⚖️', color: 'bg-blue-50 text-blue-700' },
    { label: 'Upcoming Hearings', value: hearings.length, icon: '🏛️', color: 'bg-amber-50 text-amber-700' },
    { label: 'Pending Bookings', value: bookings.length, icon: '📅', color: 'bg-green-50 text-green-700' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Good morning, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your practice today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl ${color} mb-3`}>
              {icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming hearings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming hearings</h2>
            <Link to="/lawyer/hearings" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {hearings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hearings in the next 7 days</p>
          ) : (
            <div className="space-y-3">
              {hearings.map(h => (
                <div key={h.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl">🏛️</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{h.court_name || 'Court hearing'}</p>
                    <p className="text-xs text-amber-700">{new Date(h.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    {h.purpose && <p className="text-xs text-gray-500">{h.purpose}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending bookings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending consultations</h2>
            <Link to="/lawyer/bookings" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending consultation requests</p>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">New booking request</p>
                    <p className="text-xs text-gray-500">{new Date(b.scheduled_at).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{b.consultation_type}</span>
                  </div>
                  <Link to="/lawyer/bookings" className="text-sm text-blue-600 hover:underline">Review</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <div className="mt-6">
        <Link
          to="/lawyer/cases/new"
          className="inline-flex items-center gap-2 bg-[#0a1628] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium"
        >
          + Create new case
        </Link>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// FILE: src/pages/lawyer/CaseDetail.jsx — Full case management view
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { casesAPI, hearingsAPI, documentsAPI } from '../../lib/api'

const STATUS_COLORS = {
  open:     'bg-blue-100 text-blue-700',
  active:   'bg-green-100 text-green-700',
  on_hold:  'bg-yellow-100 text-yellow-700',
  closed:   'bg-gray-100 text-gray-600',
  won:      'bg-emerald-100 text-emerald-700',
  lost:     'bg-red-100 text-red-700',
}

export default function LawyerCaseDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [caseData, setCaseData] = useState(null)
  const [hearings, setHearings] = useState([])
  const [documents, setDocuments] = useState([])
  const [newUpdate, setNewUpdate] = useState('')
  const [newHearing, setNewHearing] = useState({ date: '', court_name: '', purpose: '', notes: '' })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    casesAPI.get(id).then(r => setCaseData(r.data))
    hearingsAPI.forCase(id).then(r => setHearings(r.data))
    documentsAPI.forCase(id).then(r => setDocuments(r.data))
  }, [id])

  const postUpdate = async () => {
    if (!newUpdate.trim()) return
    await casesAPI.postUpdate(id, { content: newUpdate, is_visible_to_client: true })
    setNewUpdate('')
    casesAPI.get(id).then(r => setCaseData(r.data))
  }

  const addHearing = async (e) => {
    e.preventDefault()
    await hearingsAPI.create({ case_id: id, ...newHearing })
    setNewHearing({ date: '', court_name: '', purpose: '', notes: '' })
    hearingsAPI.forCase(id).then(r => setHearings(r.data))
  }

  const uploadDocument = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('case_id', id)
    await documentsAPI.upload(formData)
    setUploading(false)
    setUploadFile(null)
    documentsAPI.forCase(id).then(r => setDocuments(r.data))
  }

  if (!caseData) return <div className="p-8 text-gray-500">Loading case...</div>

  const tabs = ['overview', 'hearings', 'documents', 'updates']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{caseData.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[caseData.status]}`}>
                {caseData.status?.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500">{caseData.case_type}</span>
              {caseData.case_number && <span className="text-sm text-gray-400">#{caseData.case_number}</span>}
            </div>
          </div>
          <select
            value={caseData.status}
            onChange={async (e) => {
              await casesAPI.update(id, { status: e.target.value })
              setCaseData(prev => ({ ...prev, status: e.target.value }))
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            {['open', 'active', 'on_hold', 'closed', 'won', 'lost'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'hearings' && hearings.length > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{hearings.length}</span>
            )}
            {tab === 'documents' && documents.length > 0 && (
              <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{documents.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-medium text-gray-900 mb-3">Case description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{caseData.description || 'No description added.'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-medium text-gray-900 mb-3">Post update for client</h3>
              <textarea
                value={newUpdate}
                onChange={e => setNewUpdate(e.target.value)}
                placeholder="Write a case update visible to your client..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={postUpdate} className="mt-2 bg-[#0a1628] text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-900 transition-colors">
                Post update
              </button>
            </div>
            {/* Case timeline */}
            {caseData.updates?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Case timeline</h3>
                <div className="space-y-4">
                  {caseData.updates.map(u => (
                    <div key={u.id} className="flex gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{u.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(u.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side info */}
          <div className="space-y-4">
            {[
              { label: 'Court', value: caseData.court_name },
              { label: 'Filing date', value: caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString('en-PK') : null },
              { label: 'Next hearing', value: caseData.next_hearing_date ? new Date(caseData.next_hearing_date).toLocaleDateString('en-PK') : null },
              { label: 'Opposing party', value: caseData.opposing_party },
              { label: 'Opposing lawyer', value: caseData.opposing_lawyer },
              { label: 'Judge', value: caseData.judge_name },
            ].filter(f => f.value).map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Hearings */}
      {activeTab === 'hearings' && (
        <div className="space-y-6">
          {/* Add hearing form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Schedule a hearing</h3>
            <form onSubmit={addHearing} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date & time *</label>
                <input type="datetime-local" required value={newHearing.date}
                  onChange={e => setNewHearing(p => ({ ...p, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Court name</label>
                <input type="text" placeholder="e.g. Lahore High Court" value={newHearing.court_name}
                  onChange={e => setNewHearing(p => ({ ...p, court_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Purpose</label>
                <select value={newHearing.purpose}
                  onChange={e => setNewHearing(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {['Arguments', 'Evidence', 'Witnesses', 'Judgment', 'Bail', 'Framing of charges', 'Other'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <input type="text" placeholder="Additional notes" value={newHearing.notes}
                  onChange={e => setNewHearing(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <button type="submit" className="bg-[#0a1628] text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-900 transition-colors">
                  Schedule hearing (client will be notified)
                </button>
              </div>
            </form>
          </div>

          {/* Hearings list */}
          <div className="space-y-3">
            {hearings.map(h => (
              <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                <div className="bg-amber-50 text-amber-700 rounded-lg p-2 text-center min-w-[60px]">
                  <p className="text-lg font-bold leading-none">{new Date(h.date).getDate()}</p>
                  <p className="text-xs mt-0.5">{new Date(h.date).toLocaleDateString('en-PK', { month: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{h.court_name || 'Court hearing'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      h.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      h.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{h.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{new Date(h.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} {h.purpose && `· ${h.purpose}`}</p>
                  {h.outcome && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">Outcome: {h.outcome}</p>}
                </div>
                <select
                  value={h.status}
                  onChange={async e => {
                    await hearingsAPI.update(h.id, { status: e.target.value })
                    hearingsAPI.forCase(id).then(r => setHearings(r.data))
                  }}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                >
                  {['scheduled', 'completed', 'adjourned', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Upload document</h3>
            <form onSubmit={uploadDocument} className="flex items-center gap-4">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={e => setUploadFile(e.target.files[0])}
                className="flex-1 text-sm" />
              <button type="submit" disabled={!uploadFile || uploading}
                className="bg-[#0a1628] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-blue-900 transition-colors">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>

          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="text-2xl">{doc.file_type === 'pdf' ? '📄' : doc.file_type?.includes('doc') ? '📝' : '🖼️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400">{doc.category || 'General'} · {(doc.file_size / 1024).toFixed(0)} KB · {new Date(doc.created_at).toLocaleDateString('en-PK')}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline">
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// FILE: src/pages/LawyerSearch.jsx — Public lawyer directory
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { lawyersAPI } from '../lib/api'

const SPECIALIZATIONS = ['Criminal', 'Civil', 'Family', 'Corporate', 'Property', 'Banking', 'Labour', 'Tax', 'Constitutional']
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad']

export default function LawyerSearch() {
  const [lawyers, setLawyers] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ specialization: '', city: '', q: '' })
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    const res = await lawyersAPI.search(filters)
    setLawyers(res.data.lawyers)
    setTotal(res.data.total)
    setLoading(false)
  }

  useEffect(() => { search() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Find a Lawyer in Pakistan</h1>
          <p className="text-white/60 mb-8">Connect with verified legal professionals across all provinces</p>
          <div className="flex gap-3">
            <input type="text" placeholder="Search by name or keyword..."
              value={filters.q} onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-400" />
            <button onClick={search} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 flex gap-8">
        {/* Filters sidebar */}
        <aside className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Filter</h3>

            <div className="mb-5">
              <label className="text-xs text-gray-500 uppercase mb-2 block">Specialization</label>
              <select value={filters.specialization} onChange={e => setFilters(p => ({ ...p, specialization: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">All areas</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mb-5">
              <label className="text-xs text-gray-500 uppercase mb-2 block">City</label>
              <select value={filters.city} onChange={e => setFilters(p => ({ ...p, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">All cities</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button onClick={search} className="w-full bg-[#0a1628] text-white py-2 rounded-lg text-sm hover:bg-blue-900 transition-colors">
              Apply filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-4">{total} lawyers found</p>
          {loading ? (
            <div className="text-center py-16 text-gray-400">Searching...</div>
          ) : (
            <div className="space-y-4">
              {lawyers.map(l => (
                <div key={l.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex gap-5 hover:border-blue-200 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {l.profile_photo_url ? <img src={l.profile_photo_url} alt="" className="w-full h-full rounded-full object-cover" /> : '⚖️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{l.user?.full_name}</h3>
                        <p className="text-sm text-gray-500">{l.experience_years} yrs experience · {l.city}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-amber-400">★</span>
                          <span className="text-sm font-medium">{l.rating_avg?.toFixed(1) || 'New'}</span>
                          <span className="text-xs text-gray-400">({l.rating_count})</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-1">PKR {l.consultation_fee?.toLocaleString()}/session</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(l.specializations || []).map(s => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    {l.bio && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{l.bio}</p>}
                    <div className="flex gap-3 mt-4">
                      <Link to={`/lawyers/${l.id}`} className="text-sm text-blue-600 hover:underline">View profile</Link>
                      <Link to={`/book/${l.id}`} className="text-sm bg-[#0a1628] text-white px-4 py-1.5 rounded-lg hover:bg-blue-900 transition-colors">
                        Book consultation
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
