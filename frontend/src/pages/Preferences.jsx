import AestheticSelector from '../components/AestheticSelector.jsx'
import ContextSelector from '../components/ContextSelector.jsx'
import PreferenceSettings from '../components/PreferenceSettings.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function Preferences({ context, aesthetic, preferences, onContextChange, onAestheticChange, onPreferencesChange }) {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Preferences" title="Personal style tuning" />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ContextSelector value={context} onChange={onContextChange} />
        <AestheticSelector value={aesthetic} onChange={onAestheticChange} />
        <div className="lg:col-span-2">
          <PreferenceSettings preferences={preferences} onChange={onPreferencesChange} />
        </div>
      </div>
    </section>
  )
}