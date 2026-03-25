import { useState, useEffect } from 'react'
import { auth, db } from './firebaseClient'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  collection, doc, setDoc, getDoc, getDocs,
  addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, updateDoc
} from 'firebase/firestore'

const roleColors = { Dom: '#c9a84c', Sub: '#8b5cf6', Switch: '#06b6d4' }

function Checkins({ connId }) {
  const [checkins, setCheckins] = useState([])
  useEffect(() => {
    const q = query(collection(db, 'checkins'), where('connId', '==', connId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [connId])
  return (
    <>
      <p style={{ fontSize: '13px', color: '#666', fontFamily: 'sans-serif', marginBottom: '16px' }}>Your sub's mood check-ins:</p>
      {checkins.length === 0 && <div style={{ color: '#444', fontFamily: 'sans-serif', fontSize: '13px' }}>No check-ins yet.</div>}
      {checkins.map(c => (
        <div key={c.id} style={{ background: '#13131a', borderRadius: '8px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontFamily: 'sans-serif' }}>{c.mood}</span>
          <span style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>
            {c.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [screen, setScreen] = useState('onboarding')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({ name: '', age: '', role: 'Sub', bio: '' })
  const [connections, setConnections] = useState([])
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [disciplineLog, setDisciplineLog] = useState([])
  const [newNote, setNewNote] = useState('')
  const [mood, setMood] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePin, setInvitePin] = useState('')
  const [enterPin, setEnterPin] = useState('')
  const [activeTab, setActiveTab] = useState('messages')
  const [notification, setNotification] = useState('')

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000) }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const snap = await getDoc(doc(db, 'profiles', u.uid))
        if (snap.exists()) {
          setProfile(snap.data())
          setScreen('home')
          loadConnections(u.uid, snap.data().role)
        } else {
          setScreen('create')
        }
      } else {
        setUser(null)
        setProfile(null)
        setScreen('onboarding')
      }
    })
    return () => unsub()
  }, [])

  const loadConnections = async (uid, role) => {
    const field = role === 'Dom' ? 'domId' : 'subId'
    const q = query(collection(db, 'connections'), where(field, '==', uid), where('status', '==', 'active'))
    const snap = await getDocs(q)
    const conns = []
    for (const d of snap.docs) {
      const data = d.data()
      const otherId = role === 'Dom' ? data.subId : data.domId
      const otherSnap = await getDoc(doc(db, 'profiles', otherId))
      if (otherSnap.exists()) {
        conns.push({ connId: d.id, ...data, otherProfile: { id: otherId, ...otherSnap.data() } })
      }
    }
    setConnections(conns)
  }

  const handleAuth = async () => {
    setLoading(true)
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e) { notify(e.message) }
    setLoading(false)
  }

  const handleCreateProfile = async () => {
    if (!form.name || !form.age || form.age < 18) return notify('Please fill all fields. Must be 18+')
    setLoading(true)
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...form, age: parseInt(form.age),
        email: user.email, createdAt: serverTimestamp()
      })
      setProfile(form)
      setScreen('home')
      loadConnections(user.uid, form.role)
    } catch (e) { notify(e.message) }
    setLoading(false)
  }

  const generatePin = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const handleSendInvite = async () => {
    if (!inviteEmail) return notify('Enter an email address')
    setLoading(true)
    try {
      const pin = generatePin()
      await addDoc(collection(db, 'invites'), {
        fromId: user.uid, fromName: profile.name,
        fromRole: profile.role, toEmail: inviteEmail,
        pin, status: 'pending', createdAt: serverTimestamp()
      })
      setInvitePin(pin)
      notify('Invite created! Share this PIN with them.')
    } catch (e) { notify(e.message) }
    setLoading(false)
  }

  const handleAcceptInvite = async () => {
    if (!enterPin) return notify('Enter the PIN')
    setLoading(true)
    try {
      const q = query(collection(db, 'invites'), where('pin', '==', enterPin.toUpperCase()), where('status', '==', 'pending'))
      const snap = await getDocs(q)
      if (snap.empty) return notify('Invalid or expired PIN')
      const invite = snap.docs[0]
      const inviteData = invite.data()
      const isDomInviting = inviteData.fromRole === 'Dom'
      const domId = isDomInviting ? inviteData.fromId : user.uid
      const subId = isDomInviting ? user.uid : inviteData.fromId
      await addDoc(collection(db, 'connections'), { domId, subId, status: 'active', createdAt: serverTimestamp() })
      await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' })
      notify('🎉 Connection established!')
      setEnterPin('')
      loadConnections(user.uid, profile.role)
      setScreen('home')
    } catch (e) { notify(e.message) }
    setLoading(false)
  }

  const openConnection = async (conn) => {
    setSelectedConnection(conn)
    setActiveTab('messages')
    setScreen('dynamic')
    const chatId = [conn.domId, conn.subId].sort().join('_')
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId), orderBy('createdAt'))
    onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const tSnap = await getDocs(query(collection(db, 'tasks'), where('connId', '==', conn.connId)))
    setTasks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    const dSnap = await getDocs(query(collection(db, 'disciplineLog'), where('connId', '==', conn.connId), orderBy('createdAt')))
    setDisciplineLog(dSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    const chatId = [selectedConnection.domId, selectedConnection.subId].sort().join('_')
    await addDoc(collection(db, 'messages'), {
      chatId, senderId: user.uid, senderName: profile.name,
      text: newMessage.trim(), createdAt: serverTimestamp()
    })
    setNewMessage('')
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    const ref = await addDoc(collection(db, 'tasks'), {
      connId: selectedConnection.connId, text: newTask.trim(),
      completed: false, createdBy: user.uid, createdAt: serverTimestamp()
    })
    setTasks(t => [...t, { id: ref.id, text: newTask.trim(), completed: false }])
    setNewTask('')
  }

  const toggleTask = async (task) => {
    await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed })
    setTasks(t => t.map(x => x.id === task.id ? { ...x, completed: !x.completed } : x))
  }

  const addDisciplineNote = async () => {
    if (!newNote.trim()) return
    const ref = await addDoc(collection(db, 'disciplineLog'), {
      connId: selectedConnection.connId, note: newNote.trim(),
      addedBy: user.uid, addedByName: profile.name, createdAt: serverTimestamp()
    })
    setDisciplineLog(d => [...d, { id: ref.id, note: newNote.trim(), addedByName: profile.name }])
    setNewNote('')
  }

  const submitMood = async () => {
    if (!mood) return notify('Select a mood first')
    await addDoc(collection(db, 'checkins'), {
      connId: selectedConnection.connId, subId: user.uid,
      mood, createdAt: serverTimestamp()
    })
    notify('Check-in submitted ✓')
    setMood('')
  }

  const s = {
    app: { minHeight: '100vh', background: '#0f0f14', color: '#e8e8e0', fontFamily: 'Georgia, serif' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1e1e2a', position: 'sticky', top: 0, background: '#0f0f14', zIndex: 10 },
    logo: { fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em' },
    accent: { color: '#c9a84c' },
    body: { maxWidth: 480, margin: '0 auto', padding: '0 0 80px' },
    center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '88vh', padding: '0 28px', textAlign: 'center' },
    input: { width: '100%', background: '#13131a', border: '1px solid #1e1e2c', borderRadius: '6px', padding: '12px 14px', color: '#e8e8e0', fontSize: '15px', fontFamily: 'Georgia, serif', marginBottom: '14px', boxSizing: 'border-box', outline: 'none' },
    btn: (bg, color) => ({ width: '100%', padding: '13px', borderRadius: '6px', background: bg || '#c9a84c', color: color || '#0f0f14', border: 'none', fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', marginBottom: '10px' }),
    label: { display: 'block', fontSize: '10px', letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 },
    card: { background: '#13131a', padding: '18px 20px', cursor: 'pointer', borderBottom: '1px solid #1a1a25', display: 'flex', alignItems: 'center', gap: '14px' },
    avatar: (role) => ({ width: 46, height: 46, borderRadius: '50%', background: '#1e1e2c', border: `2px solid ${roleColors[role] || '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, flexShrink: 0, color: roleColors[role] || '#ccc' }),
    badge: (role) => ({ fontSize: '9px', fontFamily: 'sans-serif', letterSpacing: '0.1em', fontWeight: 600, color: roleColors[role] || '#ccc', border: `1px solid ${roleColors[role] || '#555'}`, padding: '2px 6px', borderRadius: '20px', textTransform: 'uppercase' }),
    tab: (active) => ({ flex: 1, padding: '10px', background: active ? '#1e1e2c' : 'transparent', border: 'none', borderBottom: active ? '2px solid #c9a84c' : '2px solid transparent', color: active ? '#c9a84c' : '#555', fontSize: '12px', fontFamily: 'sans-serif', letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }),
    msg: (mine) => ({ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '10px' }),
    msgBubble: (mine) => ({ maxWidth: '75%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#c9a84c' : '#1e1e2c', color: mine ? '#0f0f14' : '#e8e8e0', fontSize: '14px', fontFamily: 'sans-serif', lineHeight: 1.5 }),
    roleBtn: (active, role) => ({ flex: 1, padding: '11px', borderRadius: '6px', fontSize: '13px', fontFamily: 'sans-serif', fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? roleColors[role] : '#1e1e2c'}`, background: active ? '#1e1e2c' : 'transparent', color: active ? roleColors[role] : '#555' }),
    section: { padding: '20px 24px', borderBottom: '1px solid #1a1a25' },
    sLabel: { fontSize: '10px', letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' },
    notif: { position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#c9a84c', color: '#0f0f14', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontFamily: 'sans-serif', fontWeight: 600, zIndex: 100, whiteSpace: 'nowrap' },
  }

  if (screen === 'onboarding') return (
    <div style={s.app}>
      <div style={s.center}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#555', fontFamily: 'sans-serif', marginBottom: '16px', textTransform: 'uppercase' }}>Welcome to</div>
        <h1 style={{ fontSize: '48px', fontWeight: 300, lineHeight: 1.1, marginBottom: '16px', letterSpacing: '0.04em' }}>StrictDom<span style={s.accent}>.</span></h1>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, marginBottom: '40px', maxWidth: 300, fontFamily: 'sans-serif', fontWeight: 300 }}>A private space for Doms and Subs to connect, grow, and maintain their dynamic.</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ padding: '13px 32px', borderRadius: '40px', background: '#c9a84c', color: '#0f0f14', border: 'none', fontFamily: 'sans-serif', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setAuthMode('signup'); setScreen('auth') }}>Get Started</button>
          <button style={{ padding: '13px 32px', borderRadius: '40px', background: 'transparent', color: '#e8e8e0', border: '1px solid #333', fontFamily: 'sans-serif', cursor: 'pointer' }} onClick={() => { setAuthMode('login'); setScreen('auth') }}>Sign In</button>
        </div>
        <p style={{ marginTop: '40px', fontSize: '11px', color: '#333', fontFamily: 'sans-serif' }}>18+ only · Safe, sane & consensual</p>
      </div>
    </div>
  )

  if (screen === 'auth') return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.accent}>.</span></span>
        <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setScreen('onboarding')}>Back</button>
      </nav>
      <div style={{ ...s.body, padding: '40px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 400, marginBottom: '6px' }}>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '28px', fontFamily: 'sans-serif' }}>18+ only. All interactions must be consensual.</p>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        <button style={s.btn()} onClick={handleAuth} disabled={loading}>{loading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        <button style={s.btn('#1e1e2c', '#888')} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
      {notification && <div style={s.notif}>{notification}</div>}
    </div>
  )

  if (screen === 'create') return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.accent}>.</span></span>
      </nav>
      <div style={{ ...s.body, padding: '28px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 400, marginBottom: '6px' }}>Set up your profile</h2>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px', fontFamily: 'sans-serif' }}>This is how others will know you.</p>
        <label style={s.label}>Name</label>
        <input style={s.input} placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label style={s.label}>Age</label>
        <input style={s.input} type="number" placeholder="Must be 18+" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
        <label style={s.label}>I am a</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {['Dom', 'Sub', 'Switch'].map(r => (
            <button key={r} style={s.roleBtn(form.role === r, r)} onClick={() => setForm(f => ({ ...f, role: r }))}>
              {r === 'Dom' ? 'Dominant' : r === 'Sub' ? 'Submissive' : 'Switch'}
            </button>
          ))}
        </div>
        <label style={s.label}>Bio</label>
        <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="A little about yourself..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        <button style={s.btn()} onClick={handleCreateProfile} disabled={loading}>{loading ? 'Saving...' : 'Continue'}</button>
      </div>
      {notification && <div style={s.notif}>{notification}</div>}
    </div>
  )

  if (screen === 'home') return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.accent}>.</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={s.badge(profile?.role)}>{profile?.role}</span>
          <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }} onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </nav>
      <div style={s.body}>
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ fontSize: '20px', fontWeight: 400, marginBottom: '4px' }}>Hey, {profile?.name} 👋</div>
          <div style={{ fontSize: '13px', color: '#555', fontFamily: 'sans-serif' }}>{connections.length} active connection{connections.length !== 1 ? 's' : ''}</div>
        </div>
        {connections.length === 0 && (
          <div style={{ ...s.section, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔗</div>
            <div style={{ fontSize: '15px', marginBottom: '6px' }}>No connections yet</div>
            <div style={{ fontSize: '13px', color: '#555', fontFamily: 'sans-serif', marginBottom: '20px' }}>Invite someone or enter a PIN to connect</div>
          </div>
        )}
        {connections.map(conn => (
          <div key={conn.connId} style={s.card} onClick={() => openConnection(conn)}>
            <div style={s.avatar(conn.otherProfile.role)}>{conn.otherProfile.name?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '16px', fontWeight: 500 }}>{conn.otherProfile.name}</span>
                <span style={s.badge(conn.otherProfile.role)}>{conn.otherProfile.role}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#555', fontFamily: 'sans-serif' }}>{conn.otherProfile.bio?.substring(0, 50)}{conn.otherProfile.bio?.length > 50 ? '...' : ''}</div>
            </div>
            <div style={{ color: '#333', fontSize: '18px' }}>›</div>
          </div>
        ))}
        <div style={{ padding: '24px' }}>
          <div style={s.sLabel}>Invite someone</div>
          <input style={s.input} type="email" placeholder="Their email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <button style={s.btn()} onClick={handleSendInvite} disabled={loading}>Send Invite</button>
          {invitePin && (
            <div style={{ background: '#1e1e2c', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Share this PIN</div>
              <div style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '0.2em', color: '#c9a84c' }}>{invitePin}</div>
              <div style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif', marginTop: '8px' }}>Ask them to enter this PIN in the app</div>
            </div>
          )}
          <div style={{ ...s.sLabel, marginTop: '8px' }}>Have a PIN?</div>
          <input style={s.input} placeholder="Enter PIN code" value={enterPin} onChange={e => setEnterPin(e.target.value)} />
          <button style={s.btn('#1e1e2c', '#e8e8e0')} onClick={handleAcceptInvite} disabled={loading}>Connect</button>
        </div>
      </div>
      {notification && <div style={s.notif}>{notification}</div>}
    </div>
  )

  if (screen === 'dynamic' && selectedConnection) {
    const other = selectedConnection.otherProfile
    const isDom = profile?.role === 'Dom' || profile?.role === 'Switch'

    return (
      <div style={s.app}>
        <nav style={s.nav}>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '13px' }} onClick={() => setScreen('home')}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ ...s.avatar(other.role), width: 32, height: 32, fontSize: '13px' }}>{other.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: '16px', fontWeight: 500 }}>{other.name}</span>
          </div>
          <span style={s.badge(other.role)}>{other.role}</span>
        </nav>

        <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2a', position: 'sticky', top: 57, background: '#0f0f14', zIndex: 9 }}>
          {['messages', 'tasks', 'discipline', 'checkin'].map(tab => (
            <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab === 'messages' ? '💬' : tab === 'tasks' ? '✅' : tab === 'discipline' ? '📓' : '🌡️'}
            </button>
          ))}
        </div>

        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {messages.length === 0 && <div style={{ textAlign: 'center', color: '#444', fontFamily: 'sans-serif', fontSize: '13px', marginTop: '40px' }}>No messages yet. Say hello! 👋</div>}
              {messages.map(m => (
                <div key={m.id} style={s.msg(m.senderId === user.uid)}>
                  <div style={s.msgBubble(m.senderId === user.uid)}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2a', display: 'flex', gap: '8px' }}>
              <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button style={{ ...s.btn(), width: 'auto', padding: '12px 18px', marginBottom: 0 }} onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div style={{ ...s.body, padding: '20px 24px' }}>
            <div style={s.sLabel}>Tasks & Rules</div>
            {isDom && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="Add a task or rule..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
                <button style={{ ...s.btn(), width: 'auto', padding: '12px 18px', marginBottom: 0 }} onClick={addTask}>Add</button>
              </div>
            )}
            {tasks.length === 0 && <div style={{ color: '#444', fontFamily: 'sans-serif', fontSize: '13px' }}>No tasks yet.</div>}
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #1a1a25', cursor: 'pointer' }} onClick={() => toggleTask(t)}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.completed ? '#c9a84c' : '#333'}`, background: t.completed ? '#c9a84c' : 'transparent', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontFamily: 'sans-serif', color: t.completed ? '#555' : '#e8e8e0', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'discipline' && (
          <div style={{ ...s.body, padding: '20px 24px' }}>
            <div style={s.sLabel}>Discipline Log</div>
            {isDom && (
              <div style={{ marginBottom: '20px' }}>
                <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} />
                <button style={s.btn()} onClick={addDisciplineNote}>Add Note</button>
              </div>
            )}
            {disciplineLog.length === 0 && <div style={{ color: '#444', fontFamily: 'sans-serif', fontSize: '13px' }}>No notes yet.</div>}
            {disciplineLog.map(d => (
              <div key={d.id} style={{ background: '#13131a', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif', marginBottom: '6px' }}>{d.addedByName}</div>
                <div style={{ fontSize: '14px', fontFamily: 'sans-serif', color: '#bbb', lineHeight: 1.6 }}>{d.note}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'checkin' && (
          <div style={{ ...s.body, padding: '20px 24px' }}>
            <div style={s.sLabel}>Mood Check-in</div>
            {!isDom ? (
              <>
                <p style={{ fontSize: '13px', color: '#666', fontFamily: 'sans-serif', marginBottom: '20px' }}>How are you feeling today?</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {['😊 Happy', '😌 Calm', '😔 Sad', '😤 Frustrated', '🥰 Loved', '😰 Anxious'].map(m => (
                    <button key={m} style={{ padding: '10px 16px', borderRadius: '20px', border: `1px solid ${mood === m ? '#c9a84c' : '#222'}`, background: mood === m ? '#1e1e2c' : 'transparent', color: mood === m ? '#c9a84c' : '#666', fontFamily: 'sans-serif', fontSize: '13px', cursor: 'pointer' }} onClick={() => setMood(m)}>{m}</button>
                  ))}
                </div>
                <button style={s.btn()} onClick={submitMood}>Submit Check-in</button>
              </>
            ) : (
              <Checkins connId={selectedConnection.connId} />
            )}
          </div>
        )}
        {notification && <div style={s.notif}>{notification}</div>}
      </div>
    )
  }

  return <div style={s.app}><div style={s.center}>Loading...</div></div>
}
