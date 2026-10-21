import { aestheticOptions } from '../data/aesthetics.js'

export default function AestheticSelector({ value, onChange }) {
  return (
    <div className="settings-card space-y-3">
      <h3 className="text-lg font-semibold">Aesthetic</h3>
      <p className="text-sm text-slate-600">Your favorite look, used for the “In your favorite aesthetic” picks.</p>
      <div className="flex flex-wrap gap-2">
        {aestheticOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.id ? 'pill active' : 'pill'}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}