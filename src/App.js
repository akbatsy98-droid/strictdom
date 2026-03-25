import { useState, useEffect } from 'react'
import { auth, db } from './firebaseClient'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  where
} from 'firebase/firestore'

const KINKS = [
  "Bondage", "Discipline", "Dominance", "Submission",
  "Sadism", "Masochism", "Role Play", "Sensation Play",
  "Power Exchange", "Service", "Praise Kink", "Impact Play",
  "Pet Play", "Age Play", "Exhibitionism", "Voyeurism"
]

const roleColors = {
  Dom: { accent: "#c9a84c" },
  Sub: { accent: "#8b5cf6" },
  Switch: { accent: "#06b6d4" },
}

export default function App() {
  const [screen, setScreen] = useState('onboarding')
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [filterRole, setFilterRole] = useState('All')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({
    name: '', age: '', role: 'Sub', bio: '', location: '',
    kinks: [], tasks: [], is_private: false
  })
  const [taskInput, setTaskInput] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) { setScreen('browse'); fetchProfiles() }
    })
    return () => unsub()
  }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'profiles'), where('is_private', '==', false))
      const snapshot = await getDocs(q)
      setProfiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleAuth = async () => {
    setLoading(true)
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
        setScreen('create')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        setScreen('browse')
        fetchProfiles()
      }
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleCreateProfile = async () => {
    setLoading(true)
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        name: form.name,
        age: parseInt(form.age),
        role: form.role,
        bio: form.bio,
        location: form.location,
        kinks: form.kinks,
        tasks: form.tasks,
        is_private: form.is_private,
        createdAt: new Date()
      })
      setScreen('browse')
      fetchProfiles()
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut(auth)
    setUser(null)
    setScreen('onboarding')
    setProfiles([])
  }

  const toggleKink = (kink) => {
    setForm(f => ({
      ...f,
      kinks: f.kinks.includes(kink) ? f.kinks.filter(k => k !== kink) : [...f.kinks, kink]
    }))
  }

  const addTask = () => {
    if (taskInput.trim()) {
      setForm(f => ({ ...f, tasks: [...f.tasks, taskInput.trim()] }))
      setTaskInput('')
    }
  }

  const filteredProfiles = profiles.filter(p =>
    filterRole === 'All' || p.role === filterRole
  )

  const s = {
    app: { minHeight: '100vh', background: '#0f0f14', color: '#e8e8e0', fontFamily: 'Georgia, serif' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #1e1e2a', position: 'sticky', top: 0, background: '#0f0f14', zIndex: 10 },
    logo: { fontSize: '22px', fontWeight: 600, letterSpacing: '0.12em' },
    logoAccent: { color: '#c9a84c' },
    body: { maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 0 60px' },
    center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '88vh', padding: '0 28px', textAlign: 'center' },
    heroTitle: { fontSize: '52px', fontWeight: 300, lineHeight: 1.1, marginBottom: '16px', letterSpacing: '0.04em' },
    heroSub: { fontSize: '16px', color: '#888', lineHeight: 1.7, marginBottom: '44px', maxWidth: 320, fontFamily: 'sans-serif', fontWeight: 300 },
    pillBtn: (active) => ({ padding: '13px 32px', borderRadius: '40px', fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 500, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s', border: active ? 'none' : '1px solid #333', background: active ? '#c9a84c' : 'transparent', color: active ? '#0f0f14' : '#e8e8e0' }),
    input: { width: '100%', background: '#13131a', border: '1px solid #1e1e2c', borderRadius: '6px', padding: '12px 14px', color: '#e8e8e0', fontSize: '15px', fontFamily: 'Georgia, serif', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' },
    btn: (color) => ({ width: '100%', padding: '14px', borderRadius: '6px', background: color || '#c9a84c', color: color ? '#e8e8e0' : '#0f0f14', border: 'none', fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: '10px' }),
    label: { display: 'block', fontSize: '10px', letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 },
    card: { background: '#13131a', padding: '22px 20px', cursor: 'pointer', borderBottom: '1px solid #1a1a25', display: 'flex', alignItems: 'flex-start', gap: '16px' },
    avatar: (role) => ({ width: 52, height: 52, borderRadius: '50%', background: '#1e1e2c', border: `2px solid ${roleColors[role]?.accent || '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, flexShrink: 0, color: roleColors[role]?.accent || '#ccc' }),
    badge: (role) => ({ fontSize: '10px', fontFamily: 'sans-serif', letterSpacing: '0.1em', fontWeight: 600, color: roleColors[role]?.accent || '#ccc', border: `1px solid ${roleColors[role]?.accent || '#555'}`, padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase' }),
    kinkPill: (on) => ({ padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontFamily: 'sans-serif', border: on ? '1px solid #c9a84c' : '1px solid #222', color: on ? '#c9a84c' : '#666', background: 'transparent', cursor: 'pointer', margin: '3px' }),
    section: { padding: '20px 24px', borderBottom: '1px solid #1a1a25' },
    sectionLabel: { fontSize: '10px', letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' },
    roleBtn: (active, role) => ({ flex: 1, padding: '11px 6px', borderRadius: '6px', fontSize: '13px', fontFamily: 'sans-serif', fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? roleColors[role]?.accent : '#1e1e2c'}`, background: active ? '#1e1e2c' : 'transparent', color: active ? roleColors[role]?.accent : '#555' }),
    toggle: (on) => ({ width: 40, height: 22, borderRadius: '11px', background: on ? '#c9a84c' : '#1e1e2c', position: 'relative', cursor: 'pointer', border: 'none' }),
    toggleThumb: (on) => ({ position: 'absolute', top: 3, left: on ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }),
    stepDot: (active) => ({ width: active ? 20 : 6, height: 6, borderRadius: '3px', background: active ? '#c9a84c' : '#222', transition: 'all 0.2s' }),
    filterBtn: (active) => ({ padding: '7px 18px', borderRadius: '30px', fontSize: '13px', fontFamily: 'sans-serif', cursor: 'pointer', border: active ? 'none' : '1px solid #2a2a38', background: active ? '#c9a84c' : '#16161f', color: active ? '#0f0f14' : '#888' }),
  }

  // ONBOARDING
  if (screen === 'onboarding') return (
    <div style={s.app}>
      <div style={s.center}>
        <div style={{ fontSize: '13px', letterSpacing: '0.2em', color: '#555', fontFamily: 'sans-serif', marginBottom: '20px', textTransform: 'uppercase' }}>Welcome to</div>
        <h1 style={s.heroTitle}>StrictDom<span style={s.logoAccent}>.</span></h1>
        <p style={s.heroSub}>A quiet space to find your dynamic. Built on consent, communication, and compatibility.</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={s.pillBtn(true)} onClick={() => setScreen('auth')}>Get Started</button>
          <button style={s.pillBtn(false)} onClick={() => { setScreen('browse'); fetchProfiles() }}>Browse</button>
        </div>
        <p style={{ marginTop: '40px', fontSize: '11px', color: '#3a3a4a', fontFamily: 'sans-serif' }}>18+ only · Safe, sane & consensual</p>
      </div>
    </div>
  )

  // AUTH
  if (screen === 'auth') return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.logoAccent}>.</span></span>
        <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setScreen('onboarding')}>Back</button>
      </nav>
      <div style={{ ...s.body, padding: '40px 28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 400, marginBottom: '6px' }}>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '28px', fontFamily: 'sans-serif' }}>18+ only. All interactions must be consensual.</p>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        <button style={s.btn()} onClick={handleAuth} disabled={loading}>
          {loading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        <button style={s.btn('#1e1e2c')} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )

  // PROFILE CREATION
  if (screen === 'create') return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.logoAccent}>.</span></span>
        <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setScreen('browse')}>Cancel</button>
      </nav>
      <div style={{ ...s.body, padding: '24px 28px 60px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 400, marginBottom: '6px' }}>Your profile</h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', fontFamily: 'sans-serif' }}>Handled with care and discretion.</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2, 3].map(n => <div key={n} style={s.stepDot(step === n)} />)}
        </div>
        {step === 1 && <>
          <label style={s.label}>Name</label>
          <input style={s.input} placeholder="How should others address you?" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <label style={s.label}>Age</label>
          <input style={s.input} type="number" placeholder="Must be 18+" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
          <label style={s.label}>Location</label>
          <input style={s.input} placeholder="City or region" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <label style={s.label}>Your role</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {['Dom', 'Sub', 'Switch'].map(r => (
              <button key={r} style={s.roleBtn(form.role === r, r)} onClick={() => setForm(f => ({ ...f, role: r }))}>
                {r === 'Dom' ? 'Dominant' : r === 'Sub' ? 'Submissive' : 'Switch'}
              </button>
            ))}
          </div>
          <button style={s.btn()} onClick={() => form.name && form.age >= 18 && setStep(2)}>Continue →</button>
        </>}
        {step === 2 && <>
          <label style={s.label}>About you</label>
          <textarea style={{ ...s.input, resize: 'vertical', minHeight: 90 }} placeholder="Describe yourself and what you're looking for..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          <label style={s.label}>Interests</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '24px' }}>
            {KINKS.map(k => <button key={k} style={s.kinkPill(form.kinks.includes(k))} onClick={() => toggleKink(k)}>{k}</button>)}
          </div>
          <button style={s.btn()} onClick={() => setStep(3)}>Continue →</button>
        </>}
        {step === 3 && <>
          <label style={s.label}>Task style (optional)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="e.g. Daily check-ins" value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
            <button style={{ ...s.btn(), width: 'auto', padding: '12px 18px', marginBottom: 0 }} onClick={addTask}>Add</button>
          </div>
          {form.tasks.map(t => <div key={t} style={{ fontSize: '14px', color: '#aaa', padding: '8px 0', borderBottom: '1px solid #1a1a25', fontFamily: 'sans-serif' }}>· {t}</div>)}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0' }}>
            <div>
              <div style={s.label}>Private profile</div>
              <div style={{ fontSize: '12px', color: '#555', fontFamily: 'sans-serif' }}>Only visible to approved connections</div>
            </div>
            <button style={s.toggle(form.is_private)} onClick={() => setForm(f => ({ ...f, is_private: !f.is_private }))}>
              <div style={s.toggleThumb(form.is_private)} />
            </button>
          </div>
          <button style={s.btn()} onClick={handleCreateProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Create Profile'}
          </button>
        </>}
      </div>
    </div>
  )

  // PROFILE DETAIL
  if (screen === 'profile' && selectedProfile) {
    const p = selectedProfile
    return (
      <div style={s.app}>
        <nav style={s.nav}>
          <span style={s.logo}>StrictDom<span style={s.logoAccent}>.</span></span>
          <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setScreen('browse')}>← Back</button>
        </nav>
        <div style={{ ...s.body, padding: '28px 24px 60px' }}>
          <div style={{ ...s.avatar(p.role), width: 72, height: 72, fontSize: '28px', marginBottom: '14px' }}>{p.name?.[0]?.toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 400 }}>{p.name}</span>
            <span style={s.badge(p.role)}>{p.role}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#555', fontFamily: 'sans-serif', marginBottom: '20px' }}>{p.age} · {p.location}</div>
          <div style={s.section}>
            <div style={s.sectionLabel}>About</div>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#bbb', margin: 0 }}>{p.bio}</p>
          </div>
          {p.kinks?.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Interests</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {p.kinks.map(k => <span key={k} style={{ ...s.kinkPill(true), cursor: 'default' }}>{k}</span>)}
              </div>
            </div>
          )}
          {p.tasks?.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Task Style</div>
              {p.tasks.map(t => <div key={t} style={{ fontSize: '14px', color: '#aaa', padding: '8px 0', borderBottom: '1px solid #1a1a25', fontFamily: 'sans-serif' }}>· {t}</div>)}
            </div>
          )}
          {user && (
            <button style={{ ...s.btn(), margin: '24px 0 0' }}>Request Connection</button>
          )}
        </div>
      </div>
    )
  }

  // BROWSE
  return (
    <div style={s.app}>
      <nav style={s.nav}>
        <span style={s.logo}>StrictDom<span style={s.logoAccent}>.</span></span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user ? (
            <>
              <button style={{ background: 'none', border: '1px solid #222', color: '#888', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }} onClick={() => setScreen('create')}>+ Profile</button>
              <button style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }} onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <button style={{ background: 'none', border: '1px solid #222', color: '#888', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }} onClick={() => setScreen('auth')}>Sign in</button>
          )}
        </div>
      </nav>
      <div style={s.body}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1a1a25' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', textTransform: 'uppercase', marginBottom: '14px' }}>
            {loading ? 'Loading...' : `${filteredProfiles.length} profiles`}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Dom', 'Sub', 'Switch'].map(r => (
              <button key={r} style={s.filterBtn(filterRole === r)} onClick={() => setFilterRole(r)}>{r}</button>
            ))}
          </div>
        </div>
        {filteredProfiles.length === 0 && !loading && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#444', fontFamily: 'sans-serif', fontSize: '14px' }}>
            No profiles yet. Be the first to create one!
          </div>
        )}
        {filteredProfiles.map(p => (
          <div key={p.id} style={s.card} onClick={() => { setSelectedProfile(p); setScreen('profile') }}>
            <div style={s.avatar(p.role)}>{p.name?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '17px', fontWeight: 500 }}>{p.name}</span>
                <span style={s.badge(p.role)}>{p.role}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.55, fontFamily: 'sans-serif', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.bio}</p>
              <div style={{ fontSize: '12px', color: '#555', fontFamily: 'sans-serif' }}>{p.age} · {p.location}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
