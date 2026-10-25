import { useEffect, useState } from 'react'
import AuthFlow from './components/AuthFlow.jsx'
import Onboarding from './components/Onboarding.jsx'
import Today from './pages/Today.jsx'
import Wardrobe from './pages/Wardrobe.jsx'
import Explore from './pages/Explore.jsx'
import Preferences from './pages/Preferences.jsx'
import MyProfile from './pages/MyProfile.jsx'
import { loadFromStorage, saveToStorage, storageKeys } from './utils/storage.js'
import { createDefaultProfile, normalizeProfile } from './utils/bodyProfile.js'
import { generateOutfits } from './engine/index.js'
import guestWardrobeSeed from './data/guestWardrobe.json'
import { exportWardrobePayload, importWardrobeRecords } from './utils/wardrobeStorage.js'
import { apiRequest, authApi, setUnauthorizedHandler } from './utils/api.js'
import { loadUserSession, syncUserData } from './utils/syncData.js'
import { outfitTemplates } from './data/outfitTemplates.js'
import { syncQueuedOperations } from './utils/offlineSync.js'

const demoAccount = { id: 'demo-guest', name: 'Rael', email: 'guest@fitzii.local', guest: true }
const demoPreferences = {
  styles: ['minimal', 'classic'],
  colors: ['ivory', 'navy', 'olive'],
  materials: ['cotton', 'linen', 'denim'],
  formalityBias: 3,
}

const defaultPreferences = demoPreferences

const navItems = [
  ['today', 'Today'],
  ['wardrobe', 'Wardrobe'],
  ['explore', 'Explore'],
  ['profile', 'My Profile'],
  ['preferences', 'Preferences'],
]

const navIcons = {
  today: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
  wardrobe: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  explore: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z',
  profile: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  preferences: 'M4 6h16M4 12h16M4 18h16M9 4v4m7 2v4m-5 2v4',
}

function NavIcon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{name === 'explore' ? <path d={navIcons[name]} fill="currentColor" stroke="none" /> : <path d={navIcons[name]} />}</svg>
}

function App() {
  const [garments, setGarments] = useState([])
  const [page, setPage] = useState('today')
  const [context, setContext] = useState('casual')
  const [aesthetic, setAesthetic] = useState('minimal')
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [savedOutfits, setSavedOutfits] = useState([])
  const [history, setHistory] = useState([])
  const [selectedGarment, setSelectedGarment] = useState(null)
  const [profile, setProfile] = useState(createDefaultProfile())
  const [account, setAccount] = useState(() => loadFromStorage(storageKeys.account, null))
  const [stage, setStage] = useState(() => {
    const activeAccount = loadFromStorage(storageKeys.account, null)
    const guestMode = loadFromStorage('fitzii.guest', false)
    return activeAccount || guestMode ? 'app' : 'auth'
  })
  const [showTutorial, setShowTutorial] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isOffline, setIsOffline] = useState(typeof navigator === 'undefined' ? false : !navigator.onLine)
  const [isLoading, setIsLoading] = useState(true)
  const [recommendedOutfits, setRecommendedOutfits] = useState([])
  const [aestheticOutfits, setAestheticOutfits] = useState([])
  const [template, setTemplate] = useState(null)

  const hydrateAuthenticatedSession = async (activeAccount) => {
    if (!activeAccount) return

    setAccount(activeAccount)
    saveToStorage(storageKeys.account, activeAccount)

    try {
      const syncResult = await loadUserSession(activeAccount)
      const wardrobe = Array.isArray(syncResult?.wardrobe) ? syncResult.wardrobe : loadFromStorage(storageKeys.wardrobe, guestWardrobeSeed)
      const profile = normalizeProfile(syncResult?.profile && Object.keys(syncResult.profile).length ? syncResult.profile : loadFromStorage(storageKeys.profile, createDefaultProfile()))
      const preferences = syncResult?.preferences && Object.keys(syncResult.preferences).length ? syncResult.preferences : loadFromStorage(storageKeys.preferences, defaultPreferences)

      setGarments(wardrobe)
      setProfile(profile)
      setPreferences(preferences)
      saveToStorage(storageKeys.wardrobe, wardrobe)
      saveToStorage(storageKeys.profile, profile)
      saveToStorage(storageKeys.preferences, preferences)
    } catch (error) {
      console.warn('Could not hydrate backend session data, keeping local data as fallback.', error)
      const localWardrobe = loadFromStorage(storageKeys.wardrobe, guestWardrobeSeed)
      const localProfile = loadFromStorage(storageKeys.profile, createDefaultProfile())
      const localPreferences = loadFromStorage(storageKeys.preferences, defaultPreferences)
      setGarments(localWardrobe)
      setProfile(localProfile)
      setPreferences(localPreferences)
      saveToStorage(storageKeys.wardrobe, localWardrobe)
      saveToStorage(storageKeys.profile, localProfile)
      saveToStorage(storageKeys.preferences, localPreferences)
    }
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccount(null)
      saveToStorage(storageKeys.account, null)
      setStage('auth')
    })
  }, [])

  useEffect(() => {
    const storedSaved = loadFromStorage(storageKeys.outfits, [])
    const existingHistory = loadFromStorage(storageKeys.history, [])
    const activeAccount = loadFromStorage(storageKeys.account, null)
    const localWardrobe = loadFromStorage(storageKeys.wardrobe, guestWardrobeSeed)
    const localProfile = loadFromStorage(storageKeys.profile, createDefaultProfile())
    const localPreferences = loadFromStorage(storageKeys.preferences, defaultPreferences)

    setAccount(activeAccount)
    setSavedOutfits(storedSaved)
    setGarments(localWardrobe)
    setProfile(localProfile)
    setPreferences(localPreferences)
    setHistory(existingHistory)
    setApiError('')

    const bootstrap = async () => {
      try {
        const currentUser = activeAccount ? activeAccount : await authApi.me()
        if (!currentUser) {
          setStage('auth')
          setIsLoading(false)
          return
        }

        const nextAccount = {
          id: currentUser.id,
          name: currentUser.displayName || currentUser.name || currentUser.username,
          username: currentUser.username,
          password: activeAccount?.password || '',
        }

        saveToStorage(storageKeys.account, nextAccount)
        setAccount(nextAccount)
        setStage('app')
        const remoteData = await syncUserData(nextAccount, {
          wardrobe: localWardrobe,
          profile: localProfile,
          preferences: localPreferences,
          history: existingHistory,
        })

        const wardrobe = Array.isArray(remoteData?.wardrobe) ? remoteData.wardrobe : localWardrobe
        const profile = normalizeProfile(remoteData?.profile && Object.keys(remoteData.profile).length ? remoteData.profile : localProfile)
        const preferences = remoteData?.preferences && Object.keys(remoteData.preferences).length ? remoteData.preferences : localPreferences

        setGarments(wardrobe)
        setProfile(profile)
        setPreferences(preferences)
        setHistory(Array.isArray(remoteData?.history) ? remoteData.history : existingHistory)
        saveToStorage(storageKeys.wardrobe, wardrobe)
        saveToStorage(storageKeys.profile, profile)
        saveToStorage(storageKeys.preferences, preferences)
        saveToStorage(storageKeys.history, Array.isArray(remoteData?.history) ? remoteData.history : existingHistory)
      } catch (error) {
        console.warn('App bootstrap could not reach the backend; using local data instead.', error)
        setStage(activeAccount ? 'app' : 'auth')
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    saveToStorage(storageKeys.outfits, savedOutfits)
  }, [savedOutfits])

  useEffect(() => {
    if (!garments.length) return
    const base = { garments, context, history, profile, limit: 6, template }
    const general = generateOutfits({ ...base, preferences: { ...preferences, aesthetic } })
    const favorite = generateOutfits({ ...base, preferences: { ...preferences, aesthetic, styles: [aesthetic] } })
    setRecommendedOutfits(general)
    setAestheticOutfits(favorite)
  }, [aesthetic, context, garments, preferences, profile, history, template])

  useEffect(() => {
    if (!isOffline && account) syncQueuedOperations(apiRequest).catch(() => { })
  }, [isOffline, account])

  const persistPreferences = (next) => {
    setPreferences(next)
    saveToStorage(storageKeys.preferences, next)
    apiRequest('/preferences', { method: 'PUT', body: JSON.stringify(next) }).catch(() => { })
    setApiError('')
  }

  const handleSaveOutfit = (entry) => {
    const newSaved = [
      {
        id: `saved-${Date.now()}`,
        createdAt: new Date().toISOString(),
        outfit: entry.outfit,
        score: entry.score,
      },
      ...savedOutfits,
    ].slice(0, 8)

    setSavedOutfits(newSaved)
    const timestamp = Date.now()
    setHistory((current) => [{ items: entry.outfit, timestamp }, ...current].slice(0, 12))
    saveToStorage(storageKeys.history, [{ items: entry.outfit, timestamp }, ...history].slice(0, 12))
    apiRequest('/history', { method: 'POST', body: JSON.stringify({ id: `saved-${timestamp}`, garmentIds: entry.outfit.map((item) => item.id), context, score: entry.score }) }).catch(() => { })
  }

  const handleSignUp = async ({ name, username, password }) => {
    const cleanedUsername = String(username || name || '').trim()
    const displayName = String(name || '').trim() || cleanedUsername

    try {
      const remoteUser = await authApi.register({
        username: cleanedUsername,
        password,
        name: displayName,
      })

      const remoteAccount = {
        id: remoteUser.id,
        name: remoteUser.displayName || displayName,
        username: remoteUser.username || cleanedUsername,
        password,
      }

      const saved = loadFromStorage(storageKeys.accounts, [])
      const nextAccounts = [...(Array.isArray(saved) ? saved : []), remoteAccount]
      saveToStorage(storageKeys.accounts, nextAccounts)
      saveToStorage(storageKeys.account, remoteAccount)
      setAccount(remoteAccount)
      await hydrateAuthenticatedSession(remoteAccount)
      setStage('onboarding')
      return true
    } catch (error) {
      console.warn('Backend account creation failed, falling back to local storage.', error)
      if (Number(error?.status) > 0) throw error
    }

    const localAccount = {
      id: crypto.randomUUID?.() || `account-${Date.now()}`,
      name: displayName,
      username: cleanedUsername,
      password,
    }
    const saved = loadFromStorage(storageKeys.accounts, [])
    const nextAccounts = [...(Array.isArray(saved) ? saved : []), localAccount]
    saveToStorage(storageKeys.accounts, nextAccounts)
    saveToStorage(storageKeys.account, localAccount)
    setAccount(localAccount)
    setStage('onboarding')
    return true
  }

  const handleLogin = async (identifier, password) => {
    const trimmedIdentifier = String(identifier || '').trim()
    const normalizedPassword = String(password || '')

    try {
      const remoteUser = await authApi.login({
        username: trimmedIdentifier,
        password: normalizedPassword,
      })

      const nextAccount = {
        id: remoteUser.id,
        name: remoteUser.displayName || remoteUser.name || trimmedIdentifier,
        username: remoteUser.username || trimmedIdentifier,
        password: normalizedPassword,
      }

      saveToStorage(storageKeys.account, nextAccount)
      setAccount(nextAccount)
      await hydrateAuthenticatedSession(nextAccount)
      setStage('app')
      setPage('today')
      return true
    } catch (error) {
      console.warn('Backend login failed, falling back to local storage only if a matching offline record exists.', error)
    }

    const saved = loadFromStorage(storageKeys.accounts, [])
    const found = (Array.isArray(saved) ? saved : []).find((account) => {
      const accountUsername = String(account.username || account.name || account.email || '').trim().toLowerCase()
      const accountName = String(account.name || '').trim().toLowerCase()
      const accountEmail = String(account.email || '').trim().toLowerCase()
      const storedPassword = String(account.password || '')

      const matchesIdentifier = accountUsername === trimmedIdentifier.toLowerCase() || accountName === trimmedIdentifier.toLowerCase() || accountEmail === trimmedIdentifier.toLowerCase()
      const matchesPassword = !storedPassword || storedPassword === normalizedPassword

      return matchesIdentifier && matchesPassword
    })

    if (!found) return false

    const nextAccount = { ...found, password: found.password || normalizedPassword }
    saveToStorage(storageKeys.account, nextAccount)
    setAccount(nextAccount)
    setStage('app')
    setPage('today')
    return true
  }

  const handleResetPassword = ({ username, password }) => {
    const saved = loadFromStorage(storageKeys.accounts, [])
    const normalizedUsername = String(username || '').trim().toLowerCase()
    const nextAccounts = (Array.isArray(saved) ? saved : []).map((account) => {
      const accountUsername = String(account.username || account.name || account.email || '').trim().toLowerCase()
      if (accountUsername === normalizedUsername) {
        return { ...account, password }
      }
      return account
    })

    if (!nextAccounts.some((account) => {
      const accountUsername = String(account.username || account.name || account.email || '').trim().toLowerCase()
      return accountUsername === normalizedUsername
    })) {
      return false
    }

    saveToStorage(storageKeys.accounts, nextAccounts)
    const active = loadFromStorage(storageKeys.account, null)
    if (active) {
      const activeUsername = String(active.username || active.name || active.email || '').trim().toLowerCase()
      if (activeUsername === normalizedUsername) {
        saveToStorage(storageKeys.account, { ...active, password })
      }
    }
    return true
  }

  const handleGuest = () => {
    saveToStorage('fitzii.guest', true)
    setStage('app')
    setPage('today')
  }

  const handleOnboardingFinish = ({ aesthetic: nextAesthetic, preferences: nextPrefs }) => {
    setAesthetic(nextAesthetic)
    persistPreferences(nextPrefs)
    setStage('app')
    setShowTutorial(true)
    setPage('today')
  }

  const handleSignOut = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Logout from the server failed, continuing with local session reset.', error)
    }

    saveToStorage(storageKeys.account, null)
    saveToStorage('fitzii.guest', false)
    setAccount(null)
    setStage('auth')
  }

  const handleOpenApp = () => {
    saveToStorage(storageKeys.introSeen, true)
    setPage('today')
  }

  const handleAddGarment = async (garment) => {
    const normalized = { status: 'available', ...garment }
    const saved = { ...normalized, id: normalized.id || `g-${Date.now()}` }
    setGarments((current) => [saved, ...current])
    saveToStorage(storageKeys.wardrobe, [saved, ...garments])
    apiRequest('/wardrobe', { method: 'POST', body: JSON.stringify(saved) }).catch(() => { })
    setApiError('')
    return saved
  }

  const handleUpdateGarment = async (garment) => {
    const saved = { ...garment, status: garment.status || 'available' }
    setGarments((current) => current.map((item) => item.id === saved.id ? saved : item))
    saveToStorage(storageKeys.wardrobe, garments.map((item) => item.id === saved.id ? saved : item))
    apiRequest(`/wardrobe/${encodeURIComponent(saved.id)}`, { method: 'PATCH', body: JSON.stringify(saved) }).catch(() => { })
    setApiError('')
    return saved
  }

  const handleDeleteGarment = async (garmentId) => {
    setGarments((current) => current.filter((item) => item.id !== garmentId))
    saveToStorage(storageKeys.wardrobe, garments.filter((item) => item.id !== garmentId))
    apiRequest(`/wardrobe/${encodeURIComponent(garmentId)}`, { method: 'DELETE' }).catch(() => { })
    setApiError('')
    setSavedOutfits((current) => current.filter((entry) => !entry.outfit?.some((item) => item.id === garmentId)))
  }

  const toggleGarmentAvailability = (garmentId, available = true) => {
    const item = garments.find((entry) => entry.id === garmentId)
    if (item) handleUpdateGarment({ ...item, status: available ? 'available' : 'unavailable' })
  }

  const handleExportWardrobe = () => {
    const payload = exportWardrobePayload(garments)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wardrobe-export.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportWardrobe = async (event) => {
    const [file] = event.target.files || []
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const imported = Array.isArray(parsed?.garments) ? parsed.garments : Array.isArray(parsed) ? parsed : []
      if (!imported.length) {
        window.alert('Import failed: the selected file is not a valid wardrobe export.')
        return
      }

      const merge = window.confirm(`Import ${imported.length} garments? Existing records with matching IDs will be kept.`)
      if (!merge) return

      const currentIds = new Set(garments.map((item) => item.id))
      const next = [...garments]
      for (const garment of imported) {
        if (!currentIds.has(garment.id)) {
          next.push({ ...garment, status: garment.status || 'available' })
        }
      }

      setGarments(next)
      saveToStorage(storageKeys.wardrobe, next)
    } catch (error) {
      console.error(error)
      window.alert('Import failed: the selected file is not a valid wardrobe export.')
    } finally {
      event.target.value = ''
    }
  }

  const notice = 'rounded-xl border px-4 py-3 text-sm'
  const savedAccounts = loadFromStorage(storageKeys.accounts, [])

  if (stage === 'auth') {
    return <AuthFlow accounts={savedAccounts} onSignUp={handleSignUp} onLogin={handleLogin} onResetPassword={handleResetPassword} onGuest={handleGuest} />
  }

  if (stage === 'onboarding') {
    return (
      <Onboarding
        name={account?.name || 'there'}
        initialPreferences={preferences}
        initialAesthetic={aesthetic}
        onFinish={handleOnboardingFinish}
        onSkip={() => {
          setStage('app')
          setPage('today')
          setShowTutorial(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden flex-col gap-5 border-r border-[#e8e2dc] bg-[#fffdfa] p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div>
          <p className="text-sm font-medium text-accent">Fitzii</p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Dress with more ease</h1>
        </div>

        <div className="rounded-xl bg-accent-soft p-4">
          <span className="text-xs font-medium text-accent">Account</span>
          <strong className="block text-base">{account?.name || 'Guest'}</strong>
          <small className="text-slate-600">{account?.email || 'Local profile'}</small>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Main">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPage(key)}
              aria-current={page === key ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${page === key ? 'bg-ink text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-2">
          <button type="button" className="rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-violet-200" onClick={account ? handleSignOut : () => setStage('auth')}>
            {account ? 'Log out' : 'Create account'}
          </button>
        </div>

        <div className="card !p-4 lg:mt-auto">
          <h3 className="text-sm font-medium text-slate-500">Saved picks</h3>
          <strong className="block text-3xl font-bold">{savedOutfits.length}</strong>
          <span className="text-sm text-slate-500">Curated outfits</span>
        </div>

        {selectedGarment ? (
          <div className="card !p-4">
            <h3 className="text-sm font-medium text-slate-500">Selected item</h3>
            <strong className="block">{selectedGarment.name}</strong>
            <span className="text-sm capitalize text-slate-500">
              {selectedGarment.visual_attributes?.primary_colors?.[0] || selectedGarment.color || 'unknown'} · {selectedGarment.style_associations?.possible_aesthetics?.[0] || selectedGarment.style || 'varied'}
            </span>
          </div>
        ) : null}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#eee8e2] bg-[#f8f6f2]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setPage('today')} className="flex min-h-11 items-center gap-2 text-left" aria-label="Fitzii home">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent text-sm font-bold text-white">f.</span>
          <span><strong className="block text-sm leading-4">Fitzii</strong><small className="text-[11px] text-slate-500">Your personal stylist</small></span>
        </button>
        <div className="flex items-center gap-2">
          {isOffline ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">Offline</span> : null}
          <button type="button" onClick={account ? handleSignOut : () => setStage('auth')} className="grid h-10 w-10 place-items-center rounded-full border border-[#e8e2dc] bg-white text-sm font-bold text-accent" aria-label={account ? 'Log out' : 'Create account'}>
            {(account?.name || 'G').trim().charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="page-bottom-safe mx-auto w-full max-w-6xl space-y-5 px-4 pt-4 sm:px-8 sm:pt-8 lg:space-y-6 lg:px-8 lg:pb-8">
        {!account ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <span>Guest mode is active. Your data stays in this browser.</span>
            <button type="button" className="rounded-full bg-violet-600 px-3 py-1.5 font-semibold text-white" onClick={() => setStage('auth')}>Create account</button>
          </div>
        ) : null}
        {showTutorial ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Quick start</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {['Pick your context', 'Tune your aesthetic', 'Save your favorite outfits'].map((item, index) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{index + 1}</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {apiError ? <div className={`${notice} border-rose-200 bg-rose-50 text-rose-800`} role="alert">{apiError}</div> : null}
        {isOffline ? <div className={`${notice} border-amber-200 bg-amber-50 text-amber-900`} role="status">Offline mode is on. Your changes will sync automatically when the connection returns.</div> : null}
        {isLoading ? <div className={`${notice} border-slate-200 bg-white text-slate-600`} role="status">Connecting to your wardrobe…</div> : null}

        {page === 'today' ? (
          <>
            <div className="relative overflow-hidden rounded-[26px] bg-[#352631] px-5 py-5 text-white shadow-[0_15px_35px_rgba(53,38,49,0.14)] sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -right-2 -top-7 h-32 w-32 rounded-full border border-white/10" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e4bdc8]">A little help getting dressed</p>
              <h2 className="mt-2 max-w-xl text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] sm:text-3xl">Good to see you, {account?.name?.split(' ')[0] || 'there'}.</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/70">Let’s make something great from the clothes you already own.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1.5">{garments.length} pieces in your closet</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{savedOutfits.length} saved looks</span>
              </div>
            </div>
            <Today
              outfits={recommendedOutfits}
              aestheticOutfits={aestheticOutfits}
              currentContext={context}
              currentAesthetic={aesthetic}
              templates={outfitTemplates}
              currentTemplate={template}
              onTemplateChange={setTemplate}
              formalityBias={preferences.formalityBias || 3}
              onContextChange={setContext}
              onAestheticChange={setAesthetic}
              onFormalityChange={(value) => persistPreferences({ ...preferences, formalityBias: value })}
              onSaveOutfit={handleSaveOutfit}
              savedCount={savedOutfits.length}
            />
          </>
        ) : null}
        {page === 'wardrobe' ? (
          <Wardrobe
            garments={garments}
            onSelectGarment={setSelectedGarment}
            onAddGarment={handleAddGarment}
            onUpdateGarment={handleUpdateGarment}
            onImageUpdate={(saved) => setGarments((current) => current.map((item) => item.id === saved.id ? saved : item))}
            onDeleteGarment={handleDeleteGarment}
            onToggleGarmentAvailability={toggleGarmentAvailability}
            onExportWardrobe={handleExportWardrobe}
            onImportWardrobe={handleImportWardrobe}
          />
        ) : null}
        {page === 'explore' ? <Explore outfits={recommendedOutfits} onSaveOutfit={handleSaveOutfit} /> : null}
        {page === 'profile' ? (
          <MyProfile
            profile={profile}
            onProfileChange={(nextProfile) => {
              setProfile(nextProfile)
              saveToStorage(storageKeys.profile, nextProfile)
              apiRequest('/profile', { method: 'PUT', body: JSON.stringify(nextProfile) }).catch(() => { })
            }}
            onSaveProfile={() => {
              saveToStorage(storageKeys.profile, profile)
              setApiError('')
            }}
            onClearProfile={() => {
              const confirmClear = window.confirm('Clear the entire profile?')
              if (confirmClear) {
                const nextProfile = createDefaultProfile()
                setProfile(nextProfile)
                saveToStorage(storageKeys.profile, nextProfile)
              }
            }}
          />
        ) : null}
        {page === 'preferences' ? (
          <Preferences
            context={context}
            aesthetic={aesthetic}
            preferences={preferences}
            onContextChange={setContext}
            onAestheticChange={setAesthetic}
            onPreferencesChange={persistPreferences}
          />
        ) : null}
      </main>

      <nav className="mobile-nav-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#e8e2dc] bg-[#fffdfa]/95 px-2 pt-2 shadow-[0_-8px_28px_rgba(42,31,35,0.07)] backdrop-blur lg:hidden" aria-label="Main navigation">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {navItems.map(([key, label]) => <button key={key} type="button" onClick={() => setPage(key)} aria-current={page === key ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition ${page === key ? 'text-accent' : 'text-slate-500'}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full transition ${page === key ? 'bg-accent-soft' : ''}`}><NavIcon name={key} /></span>
            {label === 'Preferences' ? 'Style' : label === 'Wardrobe' ? 'Closet' : label}
          </button>)}
        </div>
      </nav>

    </div>
  )
}

export default App
