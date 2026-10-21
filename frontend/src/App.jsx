import { useEffect, useState } from 'react'
import Today from './pages/Today.jsx'
import Wardrobe from './pages/Wardrobe.jsx'
import Explore from './pages/Explore.jsx'
import Preferences from './pages/Preferences.jsx'
import MyProfile from './pages/MyProfile.jsx'
import { loadFromStorage, saveToStorage, storageKeys } from './utils/storage.js'
import { createDefaultProfile } from './utils/bodyProfile.js'
import { exportWardrobePayload, importWardrobeRecords, loadProfile, loadExistingWardrobe } from './utils/wardrobeStorage.js'
import { wardrobeApi } from './utils/api.js'
import { syncQueuedOperations } from './utils/offlineSync.js'
import './App.css'

const defaultPreferences = {
  styles: ['minimal'],
  colors: ['ivory', 'navy'],
  materials: ['cotton', 'linen'],
  formalityBias: 3,
}

const tutorialSteps = [
  {
    page: 'today',
    title: 'Welcome to Wardrobe AI',
    description: 'This quick tour shows the basics of building outfits, managing your closet, and personalizing the AI suggestions.',
    points: ['Start on the Today page to see your outfit recommendations.', 'Use the score and details to compare the strongest looks.', 'Save a look whenever you want to keep it for later.'],
  },
  {
    page: 'wardrobe',
    title: 'Manage your closet',
    description: 'Your wardrobe is the source of truth for every outfit recommendation, so keep it stocked with everything you actually wear.',
    points: ['Add clothing with the Add Clothing button.', 'Filter by category or availability to focus on what you can wear now.', 'Edit or remove items if the fit, style, or season changes.'],
  },
  {
    page: 'profile',
    title: 'Fine-tune your body profile',
    description: 'A realistic profile helps the engine propose garments that fit your proportions and feel more personal.',
    points: ['Update your measurements and body profile under My Profile.', 'Use the saved profile to improve outfit fit and balance.', 'Refresh it whenever your wardrobe or preferences change.'],
  },
  {
    page: 'preferences',
    title: 'Set your style preferences',
    description: 'The AI becomes more useful when you tell it what fabrics, colors, and moods you want to emphasize.',
    points: ['Choose a context such as casual, work, or event-ready.', 'Adjust your aesthetic and material preferences.', 'Revisit the settings after you discover what fits you best.'],
  },
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
  const [showAccountSetup, setShowAccountSetup] = useState(() => !loadFromStorage(storageKeys.account, null))
  const [accountForm, setAccountForm] = useState({ name: '', email: '' })
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const [apiError, setApiError] = useState('')
  const [isOffline, setIsOffline] = useState(typeof navigator === 'undefined' ? false : !navigator.onLine)
  const [isLoading, setIsLoading] = useState(true)
  const [recommendedOutfits, setRecommendedOutfits] = useState([])
  const [aestheticOutfits, setAestheticOutfits] = useState([])

  useEffect(() => {
    const storedSaved = loadFromStorage(storageKeys.outfits, [])
    const legacyHistory = loadFromStorage(storageKeys.history, [])
    const hasSeenTutorial = loadFromStorage(storageKeys.tutorialSeen, false)
    const activeAccount = loadFromStorage(storageKeys.account, null)

    setAccount(activeAccount)
    setShowAccountSetup(!activeAccount)
    setSavedOutfits(storedSaved)
    if (activeAccount && !hasSeenTutorial) {
      setShowTutorial(true)
    }
    let active = true
    Promise.all([wardrobeApi.list(), wardrobeApi.profile(), wardrobeApi.preferences(), wardrobeApi.history()])
      .then(async ([items, remoteProfile, remotePreferences, remoteHistory]) => {
        if (!active) return
        if (!items.length) {
          const legacy = await loadExistingWardrobe()
          if (legacy.length) {
            for (const item of legacy) await wardrobeApi.create(item)
            items = await wardrobeApi.list()
          }
        }
        setGarments(items)
        const migratedProfile = Object.keys(remoteProfile || {}).length ? remoteProfile : loadProfile() || createDefaultProfile()
        const migratedPreferences = Object.keys(remotePreferences || {}).length ? remotePreferences : loadFromStorage(storageKeys.preferences, defaultPreferences)
        setProfile(migratedProfile)
        setPreferences(migratedPreferences)
        if (!Object.keys(remoteProfile || {}).length) await wardrobeApi.saveProfile(migratedProfile)
        if (!Object.keys(remotePreferences || {}).length) await wardrobeApi.savePreferences(migratedPreferences)
        if (!remoteHistory.length && legacyHistory.length) {
          for (const entry of legacyHistory) {
            const ids = (entry.items || []).map((item) => typeof item === 'string' ? item : item?.id).filter(Boolean)
            if (ids.length) await wardrobeApi.saveHistory({ garmentIds: ids, context: entry.context || 'casual', mode: 'legacy' })
          }
        }
        const historyRecords = remoteHistory.length ? remoteHistory : (legacyHistory.length ? await wardrobeApi.history() : [])
        setHistory(historyRecords.map((row) => ({ items: row.garmentIds, timestamp: new Date(row.createdAt).getTime() })))
        setApiError('')
        setIsLoading(false)
      })
      .catch((error) => { if (active) { setApiError(error.message); setIsLoading(false) } })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!showTutorial) return
    const currentStep = tutorialSteps[tutorialIndex]
    if (currentStep) {
      setPage(currentStep.page)
    }
  }, [showTutorial, tutorialIndex])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      syncQueuedOperations(wardrobeApi).catch(() => undefined)
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
    if (!garments.length && !apiError) return
    let active = true
    Promise.all([
      wardrobeApi.recommendations({ context, preferences, limit: 6 }),
      wardrobeApi.recommendations({ context, preferences: { ...preferences, aesthetic }, limit: 6 }),
    ])
      .then(([general, favorite]) => { if (active) { setRecommendedOutfits(general); setAestheticOutfits(favorite) } })
      .catch((error) => { if (active) setApiError(error.message) })
    return () => { active = false }
  }, [aesthetic, apiError, context, garments, preferences, profile, history])

  const persistPreferences = async (next) => {
    setPreferences(next)
    try { await wardrobeApi.savePreferences(next); setApiError('') } catch (error) { setApiError(error.message) }
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
    wardrobeApi.saveHistory({ garmentIds: entry.outfit.map((item) => item.id), context, mode: 'selected', score: entry.score, scoreComponents: entry.breakdown }).catch((error) => setApiError(error.message))
  }

  const currentTutorialStep = tutorialSteps[tutorialIndex] || tutorialSteps[0]
  const isLastTutorialStep = tutorialIndex === tutorialSteps.length - 1

  const finishTutorial = () => {
    saveToStorage(storageKeys.tutorialSeen, true)
    setTutorialIndex(0)
    setShowTutorial(false)
  }

  const openTutorial = () => {
    setTutorialIndex(0)
    setShowTutorial(true)
    setPage('today')
  }

  const handleCreateAccount = (event) => {
    event.preventDefault()
    const name = accountForm.name.trim() || 'Style explorer'
    const email = accountForm.email.trim()
    const nextAccount = { id: crypto.randomUUID ? crypto.randomUUID() : `account-${Date.now()}`, name, email }
    const savedAccounts = Array.isArray(loadFromStorage(storageKeys.accounts, [])) ? loadFromStorage(storageKeys.accounts, []) : []
    saveToStorage(storageKeys.accounts, [...savedAccounts.filter((entry) => entry.email !== email), nextAccount])
    saveToStorage(storageKeys.account, nextAccount)
    setAccount(nextAccount)
    setShowAccountSetup(false)
    setShowTutorial(true)
    setPage('today')
  }

  const handleAddGarment = async (garment) => {
    const normalized = { status: 'available', ...garment }
    try { const saved = await wardrobeApi.create(normalized); setGarments((current) => [saved, ...current]); setApiError(''); return saved }
    catch (error) { setApiError(error.message) }
  }

  const handleUpdateGarment = async (garment) => {
    try { const saved = await wardrobeApi.update(garment); setGarments((current) => current.map((item) => item.id === saved.id ? saved : item)); setApiError(''); return saved }
    catch (error) { setApiError(error.message) }
  }

  const handleDeleteGarment = async (garmentId) => {
    try { await wardrobeApi.remove(garmentId); setGarments((current) => current.filter((item) => item.id !== garmentId)); setApiError('') }
    catch (error) { setApiError(error.message) }
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
      const { garments: imported } = await importWardrobeRecords(parsed)
      const merge = window.confirm(`Import ${imported.length} garments? Existing records with matching IDs will be kept.`)
      if (!merge) return
      const currentIds = new Set(garments.map((item) => item.id))
      for (const garment of imported) if (!currentIds.has(garment.id)) await wardrobeApi.create(garment)
      setGarments(await wardrobeApi.list())
    } catch (error) {
      console.error(error)
      window.alert('Import failed: the selected file is not a valid wardrobe export.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Wardrobe AI</p>
          <h1>Style engine</h1>
        </div>

        <div className="account-badge">
          <span className="badge-label">Account</span>
          <strong>{account?.name || 'Guest'}</strong>
          <small>{account?.email || 'Local profile'}</small>
        </div>

        <nav className="nav">
          {[
            ['today', 'Today'],
            ['wardrobe', 'Wardrobe'],
            ['explore', 'Explore'],
            ['profile', 'My Profile'],
            ['preferences', 'Preferences'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={page === key ? 'nav-link active' : 'nav-link'}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <button type="button" className="tutorial-button" onClick={openTutorial}>
          {showTutorial ? 'Resume tour' : 'Show tutorial'}
        </button>
        <button type="button" className="secondary-button full-width" onClick={() => setShowAccountSetup(true)}>
          {account ? 'Switch account' : 'Create account'}
        </button>

        <div className="stats-card">
          <h3>Saved picks</h3>
          <strong>{savedOutfits.length}</strong>
          <span>Curated outfits</span>
        </div>

        {selectedGarment ? (
          <div className="stats-card detail">
            <h3>Selected item</h3>
            <strong>{selectedGarment.name}</strong>
            <span>{selectedGarment.visual_attributes?.primary_colors?.[0] || selectedGarment.color || 'unknown'} · {selectedGarment.style_associations?.possible_aesthetics?.[0] || selectedGarment.style || 'varied'}</span>
          </div>
        ) : null}
      </aside>

      <main className="main-panel">
        {apiError ? <div className="notice error" role="alert">{apiError}</div> : null}
        {isOffline ? <div className="notice" role="status">Offline mode is on. Your changes will sync automatically when the connection returns.</div> : null}
        {isLoading ? <div className="notice" role="status">Connecting to your wardrobe…</div> : null}
        {page === 'today' ? (
          <Today
            outfits={recommendedOutfits}
            aestheticOutfits={aestheticOutfits}
            currentContext={context}
            preferences={preferences}
            onSaveOutfit={handleSaveOutfit}
          />
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
        {page === 'explore' ? (
          <Explore outfits={recommendedOutfits} onSaveOutfit={handleSaveOutfit} />
        ) : null}
        {page === 'profile' ? (
          <MyProfile
            profile={profile}
            onProfileChange={setProfile}
            onSaveProfile={async () => { try { setProfile(await wardrobeApi.saveProfile(profile)); setApiError('') } catch (error) { setApiError(error.message) } }}
            onClearProfile={() => {
              const confirmClear = window.confirm('Clear the entire profile?')
              if (confirmClear) {
                setProfile(createDefaultProfile())
                wardrobeApi.saveProfile(createDefaultProfile()).catch((error) => setApiError(error.message))
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

      {showAccountSetup ? (
        <div className="modal-backdrop account-backdrop" onClick={() => account && setShowAccountSetup(false)}>
          <form className="modal-panel account-panel" onClick={(event) => event.stopPropagation()} onSubmit={handleCreateAccount}>
            <div className="tutorial-header">
              <div>
                <p className="eyebrow">Create your account</p>
                <h2>Welcome to Wardrobe AI</h2>
              </div>
            </div>

            <p className="tutorial-description">Keep your profile, wardrobe setup, and saved outfit history attached to your own account while you explore the dashboard.</p>

            <div className="form-grid">
              <label className="full-width">
                Name
                <input type="text" value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" />
              </label>
              <label className="full-width">
                Email
                <input type="email" value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" />
              </label>
            </div>

            <div className="tutorial-actions">
              <button type="button" className="secondary-button" onClick={() => setShowAccountSetup(false)}>
                {account ? 'Close' : 'Skip for now'}
              </button>
              <button type="submit" className="primary-button">Create account</button>
            </div>
          </form>
        </div>
      ) : null}

      {showTutorial && account ? (
        <div className="tutorial-tray">
          <div className="tutorial-header">
            <div>
              <p className="eyebrow">Dashboard guide</p>
              <h2>{currentTutorialStep.title}</h2>
            </div>
            <span className="tutorial-step-indicator">{tutorialIndex + 1}/{tutorialSteps.length}</span>
          </div>

          <p className="tutorial-description">{currentTutorialStep.description}</p>

          <ul className="tutorial-list">
            {currentTutorialStep.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="tutorial-actions">
            <button type="button" className="secondary-button" onClick={finishTutorial}>Skip</button>
            <div className="button-row">
              {tutorialIndex > 0 ? (
                <button type="button" className="secondary-button" onClick={() => setTutorialIndex((current) => Math.max(current - 1, 0))}>Back</button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (isLastTutorialStep) {
                    finishTutorial()
                    return
                  }
                  setTutorialIndex((current) => current + 1)
                }}
              >
                {isLastTutorialStep ? 'Start exploring' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
