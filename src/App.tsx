import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Library,
  CalendarDays,
  Globe2,
  StickyNote,
  BookOpen,
  Settings,
  Plus,
  Search,
  X,
  LogOut,
  LockKeyhole,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'

type Page = 'dashboard' | 'motions' | 'conferences' | 'passport' | 'notes' | 'community' | 'settings'
type AuthMode = 'login' | 'signup' | 'forgot' | 'update-password'
type MotionRecord = {
  id: string
  user_id: string
  title: string
  explanation: string
  category: string
  motion_text: string | null
  speaking_time_seconds: number | null
  voting_threshold: string | null
  precedence: string | null
  source_url: string | null
  personal_notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}
type MotionForm = { title: string; explanation: string; category: string; motion_text: string; speaking_time_seconds: string; voting_threshold: string; precedence: string; source_url: string; personal_notes: string }
const emptyMotionForm: MotionForm = { title: '', explanation: '', category: 'General Procedure', motion_text: '', speaking_time_seconds: '', voting_threshold: '', precedence: '', source_url: '', personal_notes: '' }
const motionCategories = ['General Procedure', 'Debate', 'Caucus', 'Voting', 'Resolution', 'Points', 'Other']

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'motion' | 'conference' | 'note' | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [motions, setMotions] = useState<MotionRecord[]>([])
  const [motionsLoading, setMotionsLoading] = useState(false)
  const [motionsError, setMotionsError] = useState('')
  const [motionSearch, setMotionSearch] = useState('')
  const [motionCategoryFilter, setMotionCategoryFilter] = useState('All categories')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [editingMotionId, setEditingMotionId] = useState<string | null>(null)
  const [motionForm, setMotionForm] = useState<MotionForm>(emptyMotionForm)
  const [motionSaving, setMotionSaving] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setAuthMode('update-password')
      if (nextSession) setAuthError('')
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user.id || !supabase) {
      setMotions([])
      setMotionsLoading(false)
      return
    }
    let active = true
    const loadMotions = async () => {
      setMotionsLoading(true)
      setMotionsError('')
      const { data, error } = await supabase!
        .from('motions')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })
      if (!active) return
      if (error) {
        setMotionsError(error.message.includes('relation') || error.message.includes('does not exist')
          ? 'The motions table is not set up yet. Run the SQL migration included with this project in Supabase.'
          : error.message)
        setMotions([])
      } else {
        setMotions((data ?? []) as MotionRecord[])
      }
      setMotionsLoading(false)
    }
    void loadMotions()
    return () => { active = false }
  }, [session?.user.id])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'motions', label: 'Motions Library', icon: Library },
    { id: 'conferences', label: 'My Conferences', icon: CalendarDays },
    { id: 'passport', label: 'MUN Passport', icon: Globe2 },
    { id: 'notes', label: 'My Notes', icon: StickyNote },
    { id: 'community', label: 'Community Resources', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const openModal = (type: 'motion' | 'conference' | 'note') => {
    setModalType(type)
    if (type === 'motion') {
      setEditingMotionId(null)
      setMotionForm(emptyMotionForm)
    }
    setIsModalOpen(true)
  }

  const editMotion = (motion: MotionRecord) => {
    setEditingMotionId(motion.id)
    setMotionForm({
      title: motion.title,
      explanation: motion.explanation,
      category: motion.category,
      motion_text: motion.motion_text ?? '',
      speaking_time_seconds: motion.speaking_time_seconds == null ? '' : String(motion.speaking_time_seconds),
      voting_threshold: motion.voting_threshold ?? '',
      precedence: motion.precedence ?? '',
      source_url: motion.source_url ?? '',
      personal_notes: motion.personal_notes ?? '',
    })
    setModalType('motion')
    setIsModalOpen(true)
  }

  const saveMotion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !session?.user.id) {
      setMotionsError('Please sign in before saving a motion.')
      return
    }
    setMotionSaving(true)
    setMotionsError('')
    const payload = {
      title: motionForm.title.trim(),
      explanation: motionForm.explanation.trim(),
      category: motionForm.category,
      motion_text: motionForm.motion_text.trim() || null,
      speaking_time_seconds: motionForm.speaking_time_seconds ? Number(motionForm.speaking_time_seconds) : null,
      voting_threshold: motionForm.voting_threshold.trim() || null,
      precedence: motionForm.precedence.trim() || null,
      source_url: motionForm.source_url.trim() || null,
      personal_notes: motionForm.personal_notes.trim() || null,
    }
    try {
      if (editingMotionId) {
        const { data, error } = await supabase.from('motions').update(payload).eq('id', editingMotionId).select('*').single()
        if (error) throw error
        setMotions(current => current.map(item => item.id === editingMotionId ? data as MotionRecord : item))
      } else {
        const { data, error } = await supabase.from('motions').insert({ ...payload, user_id: session.user.id }).select('*').single()
        if (error) throw error
        setMotions(current => [data as MotionRecord, ...current])
      }
      setIsModalOpen(false)
      setEditingMotionId(null)
      setMotionForm(emptyMotionForm)
    } catch (error) {
      setMotionsError(error instanceof Error ? error.message : 'Could not save this motion. Please try again.')
    } finally {
      setMotionSaving(false)
    }
  }

  const deleteMotion = async (motion: MotionRecord) => {
    if (!supabase || !window.confirm(`Delete “${motion.title}”? This cannot be undone.`)) return
    setMotionsError('')
    const { error } = await supabase.from('motions').delete().eq('id', motion.id)
    if (error) setMotionsError(error.message)
    else setMotions(current => current.filter(item => item.id !== motion.id))
  }

  const toggleMotionFavorite = async (motion: MotionRecord) => {
    if (!supabase) return
    const nextValue = !motion.is_favorite
    setMotions(current => current.map(item => item.id === motion.id ? { ...item, is_favorite: nextValue } : item))
    const { error } = await supabase.from('motions').update({ is_favorite: nextValue }).eq('id', motion.id)
    if (error) {
      setMotions(current => current.map(item => item.id === motion.id ? { ...item, is_favorite: motion.is_favorite } : item))
      setMotionsError(`Could not update favorite: ${error.message}`)
    }
  }

  const resetAuthMessages = () => {
    setAuthError('')
    setAuthMessage('')
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetAuthMessages()
    if (!supabase) {
      setAuthError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file, then restart the development server.')
      return
    }
    setSubmitting(true)
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (data.session) setAuthMessage('Your account has been created.')
        else setAuthMessage('Check your email for the confirmation link to finish creating your account.')
      } else if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        })
        if (error) throw error
        setAuthMessage('If an account exists for that email, a password-reset link will be sent.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setAuthMessage('Password updated successfully. You can continue using MUN Helper.')
        setAuthMode('login')
        setPassword('')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(error.message)
    else {
      setCurrentPage('dashboard')
      setPassword('')
      setAuthMessage('')
    }
  }

  const renderAuth = () => {
    const isSignup = authMode === 'signup'
    const isForgot = authMode === 'forgot'
    const isUpdatePassword = authMode === 'update-password'
    const title = isSignup ? 'Create your account' : isForgot ? 'Reset your password' : isUpdatePassword ? 'Choose a new password' : 'Welcome back'
    const subtitle = isSignup
      ? 'Create an account to keep your MUN preparation together.'
      : isForgot
        ? 'We’ll send you a link to reset your password.'
        : isUpdatePassword
          ? 'Choose a new password for your account.'
          : 'Sign in to continue to your MUN workspace.'

    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-charcoal">
              <Globe2 className="text-accent" size={30} />
              <span className="text-2xl font-bold tracking-tight">MUN Helper</span>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-7 sm:p-8">
            <div className="mb-6">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-accent flex items-center justify-center mb-4">
                {isForgot || isUpdatePassword ? <LockKeyhole size={21} /> : <Mail size={21} />}
              </div>
              <h1 className="text-2xl font-semibold text-charcoal">{title}</h1>
              <p className="text-sm text-gray-500 mt-2 leading-6">{subtitle}</p>
            </div>

            {!supabaseConfigured && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Supabase setup needed.</strong>
                <p className="mt-1">Add your Supabase URL and publishable key to a <code>.env</code> file in the project root, then restart the app.</p>
              </div>
            )}

            {authError && <div role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{authError}</div>}
            {authMessage && <div role="status" className="mb-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5 text-sm text-green-800 flex gap-2"><CheckCircle2 size={18} className="shrink-0 mt-0.5" /><span>{authMessage}</span></div>}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
                  <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required maxLength={80} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="Your name" />
                </div>
              )}
              {!isUpdatePassword && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="you@example.com" />
                </div>
              )}
              {!isForgot && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">{isUpdatePassword ? 'New password' : 'Password'}</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isUpdatePassword ? 'new-password' : isSignup ? 'new-password' : 'current-password'} minLength={6} required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder={isUpdatePassword ? 'At least 6 characters' : 'Enter your password'} />
                </div>
              )}
              {authMode === 'login' && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => { resetAuthMessages(); setAuthMode('forgot') }} className="text-sm text-accent hover:underline">Forgot password?</button>
                </div>
              )}
              <button type="submit" disabled={submitting || !supabaseConfigured} className="w-full flex justify-center items-center gap-2 bg-accent text-white rounded-lg py-2.5 font-medium hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting && <Loader2 className="animate-spin" size={17} />}
                {submitting ? 'Please wait…' : isSignup ? 'Create account' : isForgot ? 'Send reset link' : isUpdatePassword ? 'Update password' : 'Sign in'}
              </button>
            </form>

            {!isForgot && !isUpdatePassword && (
              <p className="text-sm text-center text-gray-500 mt-6">
                {isSignup ? 'Already have an account?' : 'New to MUN Helper?'}{' '}
                <button onClick={() => { resetAuthMessages(); setPassword(''); setAuthMode(isSignup ? 'login' : 'signup') }} className="font-medium text-accent hover:underline">
                  {isSignup ? 'Sign in' : 'Create an account'}
                </button>
              </p>
            )}
            {(isForgot || isUpdatePassword) && (
              <button onClick={() => { resetAuthMessages(); setPassword(''); setAuthMode('login') }} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 mx-auto mt-6">
                <ArrowLeft size={15} /> Back to sign in
              </button>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Your MUN workspace, all in one place.</p>
        </div>
      </div>
    )
  }

  const renderModal = () => {
    if (!isModalOpen) return null
    const isMotion = modalType === 'motion'
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false) }}>
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 id="modal-title" className="text-lg font-semibold text-charcoal">
              {isMotion ? (editingMotionId ? 'Edit Motion' : 'Add Motion of Procedure') : modalType === 'conference' ? 'New Conference' : 'New Note'}
            </h3>
            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close dialog"><X size={20} /></button>
          </div>
          {isMotion ? (
            <form onSubmit={saveMotion} className="space-y-4">
              <div>
                <label htmlFor="motion-title" className="block text-sm font-medium text-gray-700 mb-1">Motion name *</label>
                <input id="motion-title" required maxLength={160} value={motionForm.title} onChange={e => setMotionForm(v => ({ ...v, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="e.g. Motion for a moderated caucus" />
              </div>
              <div>
                <label htmlFor="motion-category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select id="motion-category" value={motionForm.category} onChange={e => setMotionForm(v => ({ ...v, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent">{motionCategories.map(category => <option key={category}>{category}</option>)}</select>
              </div>
              <div>
                <label htmlFor="motion-explanation" className="block text-sm font-medium text-gray-700 mb-1">Explanation *</label>
                <textarea id="motion-explanation" required rows={3} maxLength={8000} value={motionForm.explanation} onChange={e => setMotionForm(v => ({ ...v, explanation: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="What does this motion do, and when should you use it?" />
              </div>
              <div>
                <label htmlFor="motion-wording" className="block text-sm font-medium text-gray-700 mb-1">Suggested wording <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea id="motion-wording" rows={2} maxLength={4000} value={motionForm.motion_text} onChange={e => setMotionForm(v => ({ ...v, motion_text: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="The delegate of… moves for…" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="motion-speaking-time" className="block text-sm font-medium text-gray-700 mb-1">Speaking time (seconds)</label>
                  <input id="motion-speaking-time" type="number" min="1" max="3600" value={motionForm.speaking_time_seconds} onChange={e => setMotionForm(v => ({ ...v, speaking_time_seconds: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="e.g. 60" />
                </div>
                <div>
                  <label htmlFor="motion-voting" className="block text-sm font-medium text-gray-700 mb-1">Voting threshold</label>
                  <input id="motion-voting" maxLength={120} value={motionForm.voting_threshold} onChange={e => setMotionForm(v => ({ ...v, voting_threshold: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="e.g. Simple majority" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="motion-precedence" className="block text-sm font-medium text-gray-700 mb-1">Precedence</label>
                  <input id="motion-precedence" maxLength={120} value={motionForm.precedence} onChange={e => setMotionForm(v => ({ ...v, precedence: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="e.g. Before other motions" />
                </div>
                <div>
                  <label htmlFor="motion-source" className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
                  <input id="motion-source" type="url" maxLength={2000} value={motionForm.source_url} onChange={e => setMotionForm(v => ({ ...v, source_url: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="https://…" />
                </div>
              </div>
              <div>
                <label htmlFor="motion-notes" className="block text-sm font-medium text-gray-700 mb-1">My notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea id="motion-notes" rows={2} maxLength={8000} value={motionForm.personal_notes} onChange={e => setMotionForm(v => ({ ...v, personal_notes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="Notes for your own preparation…" />
              </div>
              {motionsError && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{motionsError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={motionSaving} className="min-w-32 flex justify-center items-center gap-2 bg-accent text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-60">{motionSaving && <Loader2 size={16} className="animate-spin" />}{motionSaving ? 'Saving…' : editingMotionId ? 'Save changes' : 'Save motion'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false) }} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{modalType === 'conference' ? 'Conference Name' : 'Note Title'}</label><input required type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" placeholder="Enter details..." /></div>
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Saving conferences and notes will be implemented in a later step. This form does not save data yet.</p>
              <button type="submit" className="w-full bg-accent text-white rounded-lg py-2 font-medium hover:bg-blue-900 transition-colors">Close</button>
            </form>
          )}
        </div>
      </div>
    )
  }


  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="animate-fade-in-up space-y-8">
            <header>
              <h1 className="text-2xl font-semibold text-charcoal">Welcome to MUN Helper</h1>
              <p className="text-gray-500 mt-1">Your workspace for MUN preparation.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => openModal('motion')} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm hover:border-gray-200 transition-all smooth"><div className="p-2 bg-blue-50 text-accent rounded-lg"><Plus size={20} /></div><span className="font-medium text-gray-700">New Motion</span></button>
              <button onClick={() => openModal('conference')} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm hover:border-gray-200 transition-all smooth"><div className="p-2 bg-blue-50 text-accent rounded-lg"><CalendarDays size={20} /></div><span className="font-medium text-gray-700">New Conference</span></button>
              <button onClick={() => openModal('note')} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm hover:border-gray-200 transition-all smooth"><div className="p-2 bg-blue-50 text-accent rounded-lg"><StickyNote size={20} /></div><span className="font-medium text-gray-700">New Note</span></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white p-6 rounded-xl border border-gray-100"><h2 className="text-lg font-medium text-charcoal mb-4">Upcoming Conferences</h2><div className="text-center py-8 text-gray-400 text-sm">No upcoming conferences scheduled.</div></section>
              <section className="bg-white p-6 rounded-xl border border-gray-100"><h2 className="text-lg font-medium text-charcoal mb-4">Preparation Checklist</h2><div className="text-center py-8 text-gray-400 text-sm">Add a conference to generate checklists.</div></section>
            </div>
          </div>
        )
      case 'motions': {
        const normalizedSearch = motionSearch.trim().toLowerCase()
        const visibleMotions = motions.filter(motion => {
          const matchesSearch = !normalizedSearch || [motion.title, motion.explanation, motion.category, motion.motion_text ?? '', motion.personal_notes ?? ''].some(value => value.toLowerCase().includes(normalizedSearch))
          const matchesCategory = motionCategoryFilter === 'All categories' || motion.category === motionCategoryFilter
          return matchesSearch && matchesCategory && (!favoritesOnly || motion.is_favorite)
        })
        return <div className="animate-fade-in-up space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"><div><h1 className="text-2xl font-semibold text-charcoal">Motions Library</h1><p className="text-sm text-gray-500 mt-1">Your personal collection of motions and procedure notes.</p></div><button onClick={() => openModal('motion')} className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> New Motion</button></div>
          {motionsError && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{motionsError}</div>}
          <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input type="search" value={motionSearch} onChange={e => setMotionSearch(e.target.value)} placeholder="Search motions..." aria-label="Search motions" className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition-colors" /></div><select value={motionCategoryFilter} onChange={e => setMotionCategoryFilter(e.target.value)} aria-label="Filter by category" className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option>All categories</option>{motionCategories.map(category => <option key={category}>{category}</option>)}</select><button onClick={() => setFavoritesOnly(value => !value)} aria-pressed={favoritesOnly} className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${favoritesOnly ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{favoritesOnly ? '★ Favorites only' : '☆ Favorites'}</button></div>
          {motionsLoading ? <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500"><Loader2 className="mx-auto animate-spin mb-3" size={24} />Loading your motions…</div> : visibleMotions.length === 0 ? <div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><Library className="mx-auto text-gray-300 mb-3" size={44} /><h3 className="text-gray-700 font-medium">{motions.length === 0 ? 'No motions yet' : 'No matching motions'}</h3><p className="text-gray-400 text-sm mt-1">{motions.length === 0 ? 'Add your first motion of procedure to get started.' : 'Try another search or clear your filters.'}</p>{motions.length === 0 && <button onClick={() => openModal('motion')} className="mt-4 inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add your first motion</button>}</div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{visibleMotions.map(motion => <article key={motion.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex rounded-full bg-blue-50 text-accent px-2.5 py-1 text-xs font-medium">{motion.category}</span><h2 className="font-semibold text-charcoal mt-3 break-words">{motion.title}</h2></div><button onClick={() => void toggleMotionFavorite(motion)} aria-label={motion.is_favorite ? 'Remove from favorites' : 'Add to favorites'} title={motion.is_favorite ? 'Remove favorite' : 'Add favorite'} className={`text-xl leading-none ${motion.is_favorite ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>{motion.is_favorite ? '★' : '☆'}</button></div><p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{motion.explanation}</p>{motion.motion_text && <div className="mt-3 rounded-lg bg-gray-50 p-3"><p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Suggested wording</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{motion.motion_text}</p></div>}<div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">{motion.speaking_time_seconds != null && <span className="rounded-md bg-gray-50 px-2 py-1">{motion.speaking_time_seconds}s speaking time</span>}{motion.voting_threshold && <span className="rounded-md bg-gray-50 px-2 py-1">{motion.voting_threshold}</span>}{motion.precedence && <span className="rounded-md bg-gray-50 px-2 py-1">{motion.precedence}</span>}</div>{motion.personal_notes && <p className="text-sm text-gray-500 mt-3"><span className="font-medium text-gray-600">Your notes: </span>{motion.personal_notes}</p>}<div className="flex items-center justify-between border-t border-gray-100 mt-4 pt-3">{motion.source_url ? <a href={motion.source_url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">View source ↗</a> : <span className="text-xs text-gray-400">Personal motion</span>}<div className="flex gap-3"><button onClick={() => editMotion(motion)} className="text-sm font-medium text-gray-600 hover:text-accent">Edit</button><button onClick={() => void deleteMotion(motion)} className="text-sm font-medium text-red-600 hover:text-red-700">Delete</button></div></div></article>)}</div>}
        </div>
      }
      case 'conferences':
        return <div className="animate-fade-in-up space-y-6"><div className="flex justify-between items-center"><h1 className="text-2xl font-semibold text-charcoal">My Conferences</h1><button onClick={() => openModal('conference')} className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900 transition-colors flex items-center gap-2"><Plus size={16} /> New Conference</button></div><div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><CalendarDays className="mx-auto text-gray-300 mb-3" size={48} /><h3 className="text-gray-600 font-medium">No conferences planned</h3><p className="text-gray-400 text-sm mt-1">Start organizing your next MUN experience.</p></div></div>
      case 'passport':
        return <div className="animate-fade-in-up space-y-6"><h1 className="text-2xl font-semibold text-charcoal">MUN Passport</h1><div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><Globe2 className="mx-auto text-gray-300 mb-3" size={48} /><h3 className="text-gray-600 font-medium">Your timeline is empty</h3><p className="text-gray-400 text-sm mt-1">Record your past conferences to build your passport.</p></div></div>
      case 'notes':
        return <div className="animate-fade-in-up space-y-6"><div className="flex justify-between items-center"><h1 className="text-2xl font-semibold text-charcoal">My Notes</h1><button onClick={() => openModal('note')} className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-900 transition-colors flex items-center gap-2"><Plus size={16} /> New Note</button></div><div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><StickyNote className="mx-auto text-gray-300 mb-3" size={48} /><h3 className="text-gray-600 font-medium">No notes available</h3><p className="text-gray-400 text-sm mt-1">Write down your speeches, research, and ideas.</p></div></div>
      case 'community':
        return <div className="animate-fade-in-up space-y-6"><h1 className="text-2xl font-semibold text-charcoal">Community Resources</h1><p className="text-gray-500">Discover public guides and motions shared by other delegates.</p><div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><BookOpen className="mx-auto text-gray-300 mb-3" size={48} /><h3 className="text-gray-600 font-medium">Library is loading...</h3><p className="text-gray-400 text-sm mt-1">Community features will be available after Phase 2.</p></div></div>
      case 'settings':
        return <div className="animate-fade-in-up space-y-6"><h1 className="text-2xl font-semibold text-charcoal">Settings</h1><div className="bg-white border border-gray-100 rounded-xl p-6"><h2 className="text-lg font-medium text-charcoal mb-4">Profile Information</h2><div className="space-y-4 max-w-md"><div><label className="block text-sm font-medium text-gray-700 mb-1">Email address</label><input disabled type="text" value={session?.user.email ?? ''} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label><input disabled type="text" value={session?.user.user_metadata?.display_name ?? 'Delegate'} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500" /></div><p className="text-xs text-gray-400">Your account is managed securely by Supabase.</p></div></div></div>
      default:
        return null
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-gray-500"><Loader2 className="animate-spin mr-2" size={20} /> Loading your workspace…</div>
  }

  if (!session || authMode === 'forgot' || authMode === 'update-password') {
    return renderAuth()
  }

  return (
    <div className="min-h-screen flex bg-[#f9fafb]">
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col">
        <div className="p-6"><div className="text-xl font-bold tracking-tight text-charcoal flex items-center gap-2"><Globe2 className="text-accent" />MUN Helper</div></div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentPage(item.id as Page)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all smooth text-sm font-medium ${currentPage === item.id ? 'bg-blue-50 text-accent' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <item.icon size={18} className={currentPage === item.id ? 'text-accent' : 'text-gray-400'} />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 truncate px-2 mb-2">{session.user.email}</div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 md:hidden">
          <div className="text-lg font-bold text-charcoal flex items-center gap-2"><Globe2 className="text-accent" size={24} />MUN Helper</div>
          <button onClick={handleSignOut} aria-label="Sign out" className="p-2 text-gray-500"><LogOut size={19} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10"><div className="max-w-5xl mx-auto">{renderPageContent()}</div></div>
      </main>
      {renderModal()}
    </div>
  )
}
