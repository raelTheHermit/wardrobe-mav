export default function PreferenceSettings({ preferences, onChange }) {
  const update = (field, value) => onChange({ ...preferences, [field]: value })
  const toList = (text) => text.split(',').map((entry) => entry.trim()).filter(Boolean)

  return (
    <div className="settings-card space-y-4">
      <h3 className="text-lg font-semibold">Preference tuning</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Preferred styles
          <input
            className="input"
            type="text"
            value={preferences.styles?.join(', ') || 'minimal'}
            onChange={(event) => update('styles', toList(event.target.value))}
          />
          <span className="text-xs font-normal text-slate-500">Separate with commas</span>
        </label>
        <label className="field">
          Favorite colors
          <input
            className="input"
            type="text"
            value={preferences.colors?.join(', ') || 'ivory, navy'}
            onChange={(event) => update('colors', toList(event.target.value))}
          />
          <span className="text-xs font-normal text-slate-500">Separate with commas</span>
        </label>
        <label className="field sm:col-span-2">
          <span className="flex justify-between">
            Formality bias <span className="text-slate-500">{preferences.formalityBias || 3} of 5</span>
          </span>
          <input
            type="range"
            min="1"
            max="5"
            className="w-full accent-accent"
            value={preferences.formalityBias || 3}
            onChange={(event) => update('formalityBias', Number(event.target.value))}
          />
          <span className="flex justify-between text-xs font-normal text-slate-500"><span>Relaxed</span><span>Dressy</span></span>
        </label>
      </div>
    </div>
  )
}