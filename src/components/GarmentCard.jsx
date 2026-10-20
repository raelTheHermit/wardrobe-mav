import { getCategoryLabel, getPrimaryColor, getStyleLabel } from '../utils/garmentHelpers.js'
import { mediaUrl } from '../utils/api.js'

export default function GarmentCard({ garment, onSelect, onEdit, onToggleAvailability, onDelete }) {
  return (
    <div className="garment-card-shell">
      <button type="button" className="garment-card" onClick={() => onSelect?.(garment)}>
        {garment.image_path ? <img className="garment-image" src={mediaUrl(garment.image_path)} alt={`${garment.name} garment`} loading="lazy" /> : <div className="swatch" style={{ background: garment.hex || '#d9d9d9' }} aria-hidden="true" />}
        <div className="garment-meta">
          <strong>{garment.name}</strong>
          <span>{getCategoryLabel(garment.category)}</span>
          <small>{getPrimaryColor(garment)} · {getStyleLabel(garment)}</small>
          <small className="status-pill">{garment.status || 'available'}</small>
        </div>
      </button>
      <div className="card-actions">
        <button type="button" onClick={() => onEdit?.(garment)}>Edit</button>
        <button type="button" onClick={() => onToggleAvailability?.(garment.id, (garment.status || 'available') !== 'available')}>{(garment.status || 'available') === 'available' ? 'Mark unavailable' : 'Mark available'}</button>
        <button type="button" className="danger-button" onClick={() => {
          if (window.confirm(`Delete ${garment.name}? This cannot be undone.`)) onDelete?.(garment.id)
        }}>Delete</button>
      </div>
    </div>
  )
}
