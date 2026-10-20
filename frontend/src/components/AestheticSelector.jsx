import { aestheticOptions } from '../data/aesthetics.js'

export default function AestheticSelector({ value, onChange }) {
  return (
    <div className="selector-group">
      <label>Aesthetic</label>
      <div className="pill-row">
        {aestheticOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.id ? 'pill active' : 'pill'}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
