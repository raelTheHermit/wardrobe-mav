import { getCategoryLabel, getPrimaryColor, getStyleLabel } from '../utils/garmentHelpers.js'
import { mediaUrl } from '../utils/api.js'

export default function GarmentCard({ garment, onSelect, onEdit, onToggleAvailability, onDelete }) {
  const available = (garment.status || 'available') === 'available'

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onSelect?.(garment)}
        className="flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-accent"
      >
        {garment.image_path ? (
          <img
            src={mediaUrl(garment.image_path)}
            alt={`${garment.name} garment`}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="aspect-[4/3] w-full" style={{ background: garment.hex || '#d9d9d9' }} aria-hidden="true" />
        )}
        <div className="flex flex-1 flex-col gap-1 p-4">
          <strong className="line-clamp-2 leading-snug">{garment.name}</strong>
          <span className="text-sm text-slate-500">{getCategoryLabel(garment.category)}</span>
          <small className="text-xs capitalize text-slate-500">{getPrimaryColor(garment)} · {getStyleLabel(garment)}</small>
          <small
            className={`mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {garment.status || 'available'}
          </small>
        </div>
      </button>

      <div className="flex gap-2 border-t border-slate-100 p-3">
        <button type="button" className="btn-secondary flex-1 !px-2" onClick={() => onEdit?.(garment)}>Edit</button>
        <button
          type="button"
          className="btn-secondary flex-1 !px-2"
          onClick={() => onToggleAvailability?.(garment.id, !available)}
        >
          {available ? 'Hide' : 'Restore'}
        </button>
        <button
          type="button"
          className="btn-danger !px-3"
          onClick={() => {
            if (window.confirm(`Delete ${garment.name}? This cannot be undone.`)) onDelete?.(garment.id)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}