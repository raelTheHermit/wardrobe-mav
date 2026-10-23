import { useEffect, useState } from 'react'
import AuthFlow from './components/AuthFlow.jsx'
import Onboarding from './components/Onboarding.jsx'
import Today from './pages/Today.jsx'
import Wardrobe from './pages/Wardrobe.jsx'
import Explore from './pages/Explore.jsx'
import Preferences from './pages/Preferences.jsx'
import MyProfile from './pages/MyProfile.jsx'
import { buildFitCompatibility, createDefaultProfile } from './utils/bodyProfile.js'
import { exportWardrobePayload } from './utils/wardrobeStorage.js'
import { authApi, wardrobeApi, setUnauthorizedHandler } from './utils/api.js'
import { pendingCount } from './utils/offlineSync.js'
import {
  clearUserData,
  forgetUser,
  getRememberedUser,
  getStorageUser,
  loadScoped,
  rememberUser,
  saveScoped,
  setStorageUser,
} from './utils/userStorage.js'
import { readCache, syncNow } from './utils/syncData.js'

const defaultPreferences = {
  styles: ['minimal', 'classic'],
  colors: ['ivory', 'navy', 'olive'],
  materials: ['cotton', 'linen', 'denim'],
  formalityBias: 3,
}

function generateLocalOutfits(garments, context, preferences, aesthetic, profile) {
  const available = garments.filter((item) => (item.status || 'available') === 'available')
  const tops = available.filter((item) => item.category === 'top')
  const bottoms = available.filter((item) => item.category === 'bottom')
  const shoes = available.filter((item) => item.category === 'shoe' || item.category === 'footwear')
  const outerwear = available.filter((item) => item.category === 'outerwear')

  const outfitSet = []

  for (const top of tops.slice(0, 5)) {
    for (const bottom of bottoms.slice(0, 5)) {
      const shoeOptions = shoes.slice(0, 3)
      for (const shoe of shoeOptions.length ? shoeOptions : available.slice(0, 1)) {
        const layers = [...outerwear.slice(0, 2)]
        const outfit = [top, bottom, shoe, ...layers].slice(0, 4)
        const fitScore = buildFitCompatibility(outfit, profile)
        const base = {
          style: preferences.styles?.includes(top.style) ? 0.22 : 0.08,
          color: preferences.colors?.includes(top.color) || preferences.colors?.includes(bottom.color) ? 0.18 : 0.07,
          material: preferences.materials?.includes(top.material) || preferences.materials?.includes(bottom.material) ? 0.17 : 0.06,
          context: (top.occasion === context || bottom.occasion === context || shoe.occasion === context) ? 0.18 : 0.08,
          aesthetic: top.aesthetic === aesthetic || bottom.aesthetic === aesthetic ? 0.18 : 0.06,
          fit: fitScore,
        }

        const score = Math.min(0.99, 0.38 + Object.values(base).reduce((sum, value) => sum + value, 0))
        outfitSet.push({
          id: `${top.id}-${bottom.id}-${shoe.id}`,
          outfit,
          score: Number(score.toFixed(2)),
          breakdown: base,
        })
      }
    }
  }

  return outfitSet.sort((a, b) => b.score - a.score).slice(0, 6)
}

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
  const [account, setAccount] = useState(null)
  const [stage, setStage] = useState('booting') // booting | auth | syncing | onboarding | app
  const [hydrated, setHydrated] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isOffline, setIsOffline] = useState(typeof navigator === 'undefined' ? false : !navigator.onLine)
  const [recommendedOutfits, setRecommendedOutfits] = useState([])
  const [aestheticOutfits, setAestheticOutfits] = useState([])

  const applyData = (d = {}) => {
    setGarments(d.garments || [])
    if (d.profile && Object.keys(d.profile).length) setProfile(d.profile)
    if (d.preferences && Object.keys(d.preferences).length) setPreferences(d.preferences)
    setHistory(
      (d.history || []).map((row) => ({
        items: row.garmentIds || row.items || [],
        timestamp: new Date(row.createdAt || row.timestamp || Date.now()).getTime(),
      })),
    )
  }

  const runSync = async () => {
    try {
      const result = await syncNow()
      if (result.data) applyData(result.data)
    } catch (error) {
      if (typeof navigator === 'undefined' || navigator.onLine) setApiError(error.message)
    }
  }

  // Puts a logged-in user's cached data on screen, then syncs with the server.
  // background=true (app start): show the cache immediately and sync behind it.
  // background=false (login / sign-up): show the "Syncing" screen until done.
  const enterAccount = async (user, { background = false } = {}) => {
    rememberUser(user)
    setStorageUser(user.id)
    setAccount(user)
    setSavedOutfits(loadScoped('savedOutfits', []))
    applyData(readCache())
    setHydrated(true)

    if (background) {
      setStage('app')
      runSync()
    } else {
      setStage('syncing')
      await runSync()
    }
  }

  useEffect(() => {
    let active = true

    setUnauthorizedHandler(() => {
      setApiError('Your session expired. Log in again to sync your changes.')
      setStage('auth')
    })

    ;(async () => {
      let user = null
      try {
        user = await authApi.me()
      } catch {
        user = getRememberedUser() // offline: reopen as the last user
      }
      if (!active) return
      if (!user) {
        setStage('auth')
        return
      }
      await enterAccount(user, { background: true })
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      if (getStorageUser() === 'guest') return // nobody logged in yet
      runSync()
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Keep the local cache current. Guarded by `hydrated` so boot never overwrites it with empty state.
  useEffect(() => { if (hydrated) saveScoped('wardrobe', garments) }, [garments, hydrated])
  useEffect(() => { if (hydrated) saveScoped('profile', profile) }, [profile, hydrated])
  useEffect(() => { if (hydrated) saveScoped('preferences', preferences) }, [preferences, hydrated])
  useEffect(() => { if (hydrated) saveScoped('savedOutfits', savedOutfits) }, [savedOutfits, hydrated])

  useEffect(() => {
    if (stage !== 'app') return
    if (!garments.length) {
      setRecommendedOutfits([])
      setAestheticOutfits([])
      return
    }
    setRecommendedOutfits(generateLocalOutfits(garments, context, preferences, aesthetic, profile))
    setAestheticOutfits(generateLocalOutfits(garments, context, { ...preferences, styles: [aesthetic] }, aesthetic, profile))
  }, [aesthetic, context, garments, preferences, profile, stage])

  const persistPreferences = (next) => {
    setPreferences(next)
    wardrobeApi.savePreferences(next).then(() => setApiError('')).catch((error) => setApiError(error.message))
  }

  const handleSaveOutfit = (entry) => {
    setSavedOutfits((current) => [
      { id: `saved-${Date.now()}`, createdAt: new Date().toISOString(), outfit: entry.outfit, score: entry.score },
      ...current,
    ].slice(0, 8))
    setHistory((current) => [{ items: entry.outfit.map((item) => item.id), timestamp: Date.now() }, ...current].slice(0, 12))
    wardrobeApi
      .saveHistory({
        garmentIds: entry.outfit.map((item) => item.id),
        context,
        mode: 'selected',
        score: entry.score,
        scoreComponents: entry.breakdown,
      })
      .catch((error) => setApiError(error.message))
  }

  const handleSignUp = async ({ name, email, password }) => {
    const user = await authApi.register({ name, email, password })
    await enterAccount(user)
    setStage('onboarding')
  }

  const handleLogin = async ({ email, password }) => {
    const user = await authApi.login({ email, password })
    await enterAccount(user)
    setStage('app')
  }

  const handleOnboardingFinish = ({ aesthetic: nextAesthetic, preferences: nextPrefs }) => {
    setAesthetic(nextAesthetic)
    persistPreferences(nextPrefs)
    setStage('app')
    setShowTutorial(true)
    setPage('today')
  }

  const handleSignOut = async () => {
    const pending = pendingCount()
    if (pending && !window.confirm(`You have ${pending} unsynced change(s). Log out and discard them?`)) return

    const uid = getStorageUser()
    try {
      await authApi.logout()
    } catch {
      // offline or already expired: still log out locally
    }

    clearUserData(uid)
    forgetUser()
    setStorageUser(null)
    setHydrated(false)
    setGarments([])
    setHistory([])
    setSavedOutfits([])
    setRecommendedOutfits([])
    setAestheticOutfits([])
    setSelectedGarment(null)
    setProfile(createDefaultProfile())
    setPreferences(defaultPreferences)
    setAccount(null)
    setApiError('')
    setPage('today')
    setStage('auth')
  }

  // Garment writes: update the screen first, send to the API (queued automatically when offline),
  // and roll back if the server rejects the change.
  const handleAddGarment = async (garment) => {
    const item = { status: 'available', ...garment, id: garment.id || `g-${Date.now()}` }
    setGarments((current) => [item, ...current])
    try {
      const saved = await wardrobeApi.create(item)
      setGarments((current) => current.map((g) => (g.id === item.id ? saved : g)))
      setApiError('')
      return saved
    } catch (error) {
      if (error.status !== 401) setGarments((current) => current.filter((g) => g.id !== item.id))
      setApiError(error.message)
    }
  }

  const handleUpdateGarment = async (garment) => {
    const previous = garments.find((g) => g.id === garment.id)
    const next = { ...garment, status: garment.status || 'available' }
    setGarments((current) => current.map((g) => (g.id === next.id ? next : g)))
    try {
      const saved = await wardrobeApi.update(next)
      setApiError('')
      return saved
    } catch (error) {
      if (error.status !== 401 && previous) setGarments((current) => current.map((g) => (g.id === previous.id ? previous : g)))
      setApiError(error.message)
    }
  }

  const handleDeleteGarment = async (garmentId) => {
    const previous = garments.find((g) => g.id === garmentId)
    setGarments((current) => current.filter((g) => g.id !== garmentId))
    setSavedOutfits((current) => current.filter((entry) => !entry.outfit?.some((item) => item.id === garmentId)))
    try {
      await wardrobeApi.remove(garmentId)
      setApiError('')
    } catch (error) {
      if (error.status !== 401 && previous) setGarments((current) => [previous, ...current])
      setApiError(error.message)
    }
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
      const parsed = JSON.parse(await file.text())
      const imported = Array.isArray(parsed?.garments) ? parsed.garments : Array.isArray(parsed) ? parsed : []
      if (!imported.length) {
        window.alert('Import failed: the selected file is not a valid wardrobe export.')
        return
      }
      if (!window.confirm(`Import ${imported.length} garments? Existing records with matching IDs will be kept.`)) return

      const currentIds = new Set(garments.map((item) => item.id))
      for (const garment of imported) {
        if (currentIds.has(garment.id)) continue
        await handleAddGarment({ ...garment, status: garment.status || 'available' })
      }
    } catch (error) {
      console.error(error)
      window.alert('Import failed: the selected file is not a valid wardrobe export.')
    } finally {
      event.target.value = ''
    }
  }

  const notice = 'rounded-xl border px-4 py-3 text-sm'

  if (stage === 'booting' || stage === 'syncing') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600" role="status">
        {stage === 'syncing' ? 'Syncing your closet…' : 'Loading…'}
      </div>
    )
  }

  if (stage === 'auth') {
    return <AuthFlow onSignUp={handleSignUp} onLogin={handleLogin} />
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
          <strong className="block text-base">{account?.name || 'User'}</strong>
          <small className="text-slate-600">{account?.email || 'Connected account'}</small>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Main">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPage(key)}
              aria-current={page === key ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${page === key ? 'bg-violet-100 text-violet-900' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-2">
          <button type="button" className="rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-violet-200" onClick={handleSignOut}>
            Log out
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
              {selectedGarment.visual_attributes?.primary_colors?.[0] || selectedGarment.color || 'unknown'} · {selectedGarment.style_associations?.possible_aesthetics?.[0] || selectedGarment.style || 'style'}
            </span>
          </div>
        ) : null}
      </aside>

      <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
        {showTutorial ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Quick start</p>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-900" onClick={() => setShowTutorial(false)} aria-label="Dismiss quick start">
                Dismiss
              </button>
            </div>
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

        {page === 'today' ? (
          <>
            <div className="rounded-2xl bg-ink p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-violet-300">Built for real life</p>
              <h2 className="mt-1 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Not everyone has the fashion sense to dress their best.</h2>
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
            onImageUpdate={(saved) => setGarments((current) => current.map((item) => (item.id === saved.id ? saved : item)))}
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
            onProfileChange={setProfile}
            onSaveProfile={() =>
              wardrobeApi
                .saveProfile(profile)
                .then((saved) => { setProfile(saved); setApiError('') })
                .catch((error) => setApiError(error.message))
            }
            onClearProfile={() => {
              if (!window.confirm('Clear the entire profile?')) return
              const nextProfile = createDefaultProfile()
     setProfile(nextProfile)
              wardrobeApi.saveProfile(nextProfile).catch((error) => setApiError(error.message))
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
