import { useEffect, useState } from 'react'
import Today from './pages/Today.jsx'
import Wardrobe from './pages/Wardrobe.jsx'
import Explore from './pages/Explore.jsx'
import Preferences from './pages/Preferences.jsx'
import MyProfile from './pages/MyProfile.jsx'
import { loadFromStorage, saveToStorage, storageKeys } from './utils/storage.js'
import { createDefaultProfile } from './utils/bodyProfile.js'
import guestWardrobeSeed from './data/guestWardrobe.json'
import { exportWardrobePayload, importWardrobeRecords } from './utils/wardrobeStorage.js'

const demoAccount = { id: 'demo-guest', name: 'Rael', email: 'guest@fitzii.local', guest: true }
const demoPreferences = {
  styles: ['minimal', 'classic'],
  colors: ['ivory', 'navy', 'olive'],
  materials: ['cotton', 'linen', 'denim'],
  formalityBias: 3,
}

const defaultPreferences = demoPreferences

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
        const layers = [...outerwear.slice(0, 2), ...[]]
        const outfit = [top, bottom, shoe, ...layers].slice(0, 4)
        const base = {
          style: preferences.styles?.includes(top.style) ? 0.22 : 0.08,
          color: preferences.colors?.includes(top.color) || preferences.colors?.includes(bottom.color) ? 0.18 : 0.07,
          material: preferences.materials?.includes(top.material) || preferences.materials?.includes(bottom.material) ? 0.17 : 0.06,
          context: (top.occasion === context || bottom.occasion === context || shoe.occasion === context) ? 0.18 : 0.08,
          aesthetic: top.aesthetic === aesthetic || bottom.aesthetic === aesthetic ? 0.18 : 0.06,
          fit: profile?.fitPreferences?.tops === 'regular' && top.fit === 'regular' ? 0.12 : 0.07,
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
  const [account, setAccount] = useState(() => loadFromStorage(storageKeys.account, demoAccount))
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => !loadFromStorage(storageKeys.introSeen, false))
  const [apiError, setApiError] = useState('')
  const [isOffline, setIsOffline] = useState(typeof navigator === 'undefined' ? false : !navigator.onLine)
  const [isLoading, setIsLoading] = useState(true)
  const [recommendedOutfits, setRecommendedOutfits] = useState([])
  const [aestheticOutfits, setAestheticOutfits] = useState([])

  useEffect(() => {
    const storedSaved = loadFromStorage(storageKeys.outfits, [])
    const existingHistory = loadFromStorage(storageKeys.history, [])
    const activeAccount = loadFromStorage(storageKeys.account, demoAccount)
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
    setIsLoading(false)

    saveToStorage(storageKeys.account, activeAccount)
    saveToStorage(storageKeys.profile, localProfile)
    saveToStorage(storageKeys.wardrobe, localWardrobe)
    saveToStorage(storageKeys.preferences, localPreferences)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    handleOnline()

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
    const general = generateLocalOutfits(garments, context, preferences, aesthetic, profile)
    const favorite = generateLocalOutfits(garments, context, { ...preferences, styles: [aesthetic] }, aesthetic, profile)
    setRecommendedOutfits(general)
    setAestheticOutfits(favorite)
  }, [aesthetic, context, garments, preferences, profile])

  const persistPreferences = (next) => {
    setPreferences(next)
    saveToStorage(storageKeys.preferences, next)
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
  }

  const handleOpenApp = () => {
    saveToStorage(storageKeys.introSeen, true)
    setShowWelcomeModal(false)
    setPage('today')
  }

  const handleAddGarment = async (garment) => {
    const normalized = { status: 'available', ...garment }
    const saved = { ...normalized, id: normalized.id || `g-${Date.now()}` }
    setGarments((current) => [saved, ...current])
    saveToStorage(storageKeys.wardrobe, [saved, ...garments])
    setApiError('')
    return saved
  }

  const handleUpdateGarment = async (garment) => {
    const saved = { ...garment, status: garment.status || 'available' }
    setGarments((current) => current.map((item) => item.id === saved.id ? saved : item))
    saveToStorage(storageKeys.wardrobe, garments.map((item) => item.id === saved.id ? saved : item))
    setApiError('')
    return saved
  }

  const handleDeleteGarment = async (garmentId) => {
    setGarments((current) => current.filter((item) => item.id !== garmentId))
    saveToStorage(storageKeys.wardrobe, garments.filter((item) => item.id !== garmentId))
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
          <button type="button" className="rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-violet-200" onClick={() => setShowWelcomeModal(true)}>
            Show welcome note
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
              preferences={preferences}
              onSaveOutfit={handleSaveOutfit}
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
            onProfileChange={setProfile}
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

      {showWelcomeModal ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 p-3 sm:p-6" onClick={() => setShowWelcomeModal(false)}>
          <div className="flex h-full w-full max-w-md items-center" onClick={(event) => event.stopPropagation()}>
            <div className="w-full rounded-[28px] border border-violet-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Fitzii</span>
                <button type="button" className="text-sm font-medium text-slate-500 hover:text-slate-700" onClick={() => setShowWelcomeModal(false)}>Close</button>
              </div>

              <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">Welcome in.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Not everyone has the fashion sense to dress their best, so I built Fitzii for myself: a personal styling helper that turns a messy closet into easy outfit decisions.
              </p>

              <div className="mt-5 space-y-2 text-sm text-slate-700">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">• See what fits your style on the Today page.</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">• Browse your local wardrobe and saved outfit ideas.</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">• Use the body profile and preferences to tune your fit.</div>
              </div>

              <button type="button" className="btn-primary mt-6 w-full" onClick={handleOpenApp}>Enter the app</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App