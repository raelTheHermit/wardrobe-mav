import AestheticSelector from '../components/AestheticSelector.jsx'
import ContextSelector from '../components/ContextSelector.jsx'
import PreferenceSettings from '../components/PreferenceSettings.jsx'

export default function Preferences({ context, aesthetic, preferences, onContextChange, onAestheticChange, onPreferencesChange }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Personal style tuning</h2>
        </div>
      </div>

      <div className="settings-grid">
        <ContextSelector value={context} onChange={onContextChange} />
        <AestheticSelector value={aesthetic} onChange={onAestheticChange} />
        <PreferenceSettings preferences={preferences} onChange={onPreferencesChange} />
      </div>
    </section>
  )
}
