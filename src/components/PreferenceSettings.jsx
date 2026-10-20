export default function PreferenceSettings({ preferences, onChange }) {
  const update = (field, value) => onChange({ ...preferences, [field]: value })

  return (
    <div className="settings-card">
      <h3>Preference tuning</h3>
      <label>
        Preferred style
        <input
          type="text"
          value={preferences.styles?.join(', ') || 'minimal'}
          onChange={(event) => update('styles', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))}
        />
      </label>
      <label>
        Favorite colors
        <input
          type="text"
          value={preferences.colors?.join(', ') || 'ivory, navy'}
          onChange={(event) => update('colors', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))}
        />
      </label>
      <label>
        Formality bias
        <input
          type="range"
          min="1"
          max="5"
          value={preferences.formalityBias || 3}
          onChange={(event) => update('formalityBias', Number(event.target.value))}
        />
      </label>
    </div>
  )
}
