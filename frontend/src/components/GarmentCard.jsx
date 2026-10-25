import { getCategoryLabel, getPrimaryColor, getStyleLabel } from '../utils/garmentHelpers.js'
import { mediaUrl } from '../utils/api.js'
import { useResolvedImageSource } from '../utils/imageCache.js'

export default function GarmentCard({ garment, onSelect, onEdit, onToggleAvailability, onDelete }) {
  const available = (garment.status || 'available') === 'available'
  const imageSrc = useResolvedImageSource(garment.image_path ? mediaUrl(garment.image_path) : null)

  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#e8e2dc] bg-white shadow-[0_8px_22px_rgba(42,31,35,0.045)]">
      <button
        type="button"
        onClick={() => onSelect?.(garment)}
        className="flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-accent"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${garment.name} garment`}
            loading="lazy"
            className="aspect-[4/3] w-full bg-[#f0ece7] object-cover"
          />
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: `linear-gradient(145deg, ${garment.hex || '#d9d9d9'}, color-mix(in srgb, ${garment.hex || '#d9d9d9'} 68%, #352631))` }} aria-hidden="true"><span className="absolute -right-4 -top-8 h-28 w-28 rounded-full border border-white/30" /><span className="absolute bottom-3 left-3 rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">{getCategoryLabel(garment.category)}</span></div>
        )}
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <strong className="line-clamp-2 text-sm leading-snug text-ink sm:text-base">{garment.name}</strong>
          <small className="line-clamp-1 text-[10px] capitalize text-slate-500 sm:text-xs">{getPrimaryColor(garment)} · {getStyleLabel(garment)}</small>
          <small
            className={`mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {garment.status || 'available'}
          </small>
        </div>
      </button>

      <div className="flex gap-1.5 border-t border-[#f0ece7] p-2 sm:gap-2 sm:p-3">
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
