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
      <aside className="flex flex-col gap-5 border-b border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
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

      <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
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
            <div className="rounded-2xl bg-ink p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-violet-300">Built for real life</p>
              <h2 className="mt-1 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Not everyone has the fashion sense to dress their best.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                So I built Fitzii for myself: a personal styling companion that turns my wardrobe into better decisions,
                fewer random outfit guesses, and more confidence before I leave the house.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Closet-aware', 'Body-aware', 'Offline-ready'].map((item) => (
                  <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{item}</span>
                ))}
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

    </div>
  )
}

export default App
