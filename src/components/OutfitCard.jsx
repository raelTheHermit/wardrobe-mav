import { buildExplanation } from '../utils/explanation.js'
import { getCategoryFamily } from '../utils/garmentHelpers.js'

export default function OutfitCard({ outfit, score, breakdown, onSave }) {
  return (
    <article className="outfit-card">
      <div className="outfit-tiles">
        {outfit.map((item) => (
          <div key={item.id} className="tile" style={{ background: item.hex || item.visual_attributes?.primary_colors?.[0] ? '#dfeaf6' : '#cfd8dc' }} title={item.name}>
            <span>{getCategoryFamily(item.category)}</span>
          </div>
        ))}
      </div>
      <div className="outfit-summary">
        <div>
          <h3>{outfit.map((item) => item.name).join(' + ')}</h3>
          <p>{buildExplanation(outfit, breakdown)}</p>
        </div>
        <div className="outfit-meta">
          <strong>{Math.round(score * 100)}%</strong>
          <button type="button" onClick={onSave}>Save</button>
        </div>
      </div>
    </article>
  )
}
